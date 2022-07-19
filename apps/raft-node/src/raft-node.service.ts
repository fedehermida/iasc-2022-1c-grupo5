import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';
import { Raft } from './constants';
import {
  AppendEntriesRequest,
  Message,
  NodeState,
  PayloadType,
  RPC_TYPE,
  VoteReply,
  VoteRequest,
} from './raft-node.types';

const randomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

@Injectable()
export class RaftNodeService {
  private id: Readonly<string> = Object.freeze(`node-${uuidv4().slice(0, 8)}`);
  state: NodeState;
  clusterSize: number;
  heartbeatIntervalMs: number;
  currentTerm: number;
  votedFor: string | null;
  leader: string | null;

  electionTimeout: NodeJS.Timeout;
  heartbeatInterval: NodeJS.Timer;

  // volatile state on LEADERS
  nextIndex = {};
  matchIndex = {};

  // volatile state on CANDIDATES
  votes = {};

  log = [];

  commitIndex: number;
  lastApplied: number;

  private randomElectionTimeout() {
    return randomInt(Raft.ELECTION_TIMEOUT_MIN, Raft.ELECTION_TIMEOUT_MAX);
  }

  constructor(
    @Inject('RAFT_SERVICE') private readonly redisService: ClientProxy,
  ) {
    this.state = NodeState.FOLLOWER;
    this.clusterSize = Raft.CLUSTER_SIZE;
    this.heartbeatIntervalMs = Raft.HEARTBEAT_INTERVAL;
    this.currentTerm = 0;
    this.votedFor = null;
    this.leader = null;

    this.commitIndex = -1;
    this.lastApplied = -1;

    console.log(`${this.id} starting`);

    this.resetElectionTimeout();
  }

  /* * */
  private send<T extends RPC_TYPE, U extends PayloadType>(
    to: string,
    type: T,
    payload: U,
  ) {
    this.redisService.emit<T, Message>(type, {
      from: this.id,
      to,
      payload,
    });
  }

  private broadcast<T extends RPC_TYPE, U extends PayloadType>(
    type: T,
    payload: U,
  ) {
    this.redisService.emit<T, Message>(type, {
      from: this.id,
      payload,
    });
  }

  async handleMessage(message: Message) {
    if (message.to === undefined || message.to === this.id) {
      this.resetElectionTimeout();

      // Check term
      if (message.payload.term > this.currentTerm) {
        this.currentTerm = message.payload.term;
        this.leader = null;
        this.votedFor = null;
        this.state = NodeState.FOLLOWER;
        clearInterval(this.heartbeatInterval);
      }

      // Handle message
      switch (message.payload.type) {
        case RPC_TYPE.REQUEST_VOTE:
          this.handleVoteRequest(message.payload);
          break;
        case RPC_TYPE.REQUEST_VOTE_REPLY:
          this.handleVoteReply(message.payload, message.from);
          break;
        case RPC_TYPE.APPEND_ENTRIES:
          this.handleAppendEntriesRequest(message.payload, message.from);
          break;
        case RPC_TYPE.APPEND_ENTRIES_REPLY: {
          if (
            this.state === NodeState.LEADER &&
            this.currentTerm === message.payload.term
          ) {
            if (message.payload.success && message.payload.lastLogIndex > -1) {
              this.nextIndex[message.from] = message.payload.lastLogIndex + 1;
              this.matchIndex[message.from] = message.payload.lastLogIndex;
            } else {
              if (this.nextIndex[message.from] == null) {
                this.nextIndex[message.from] = this.log.length;
              }
              this.nextIndex[message.from] = Math.max(
                this.nextIndex[message.from] - 1,
                0,
              );
            }
          }
          break;
        }
      }
    }
  }
  /* * */
  async beginHeartbeat() {
    Object.keys(this.votes).forEach((node) => {
      this.send(node, RPC_TYPE.APPEND_ENTRIES, {
        type: RPC_TYPE.APPEND_ENTRIES,
        term: this.currentTerm,
        leaderId: this.id,
        prevLogIndex: -1,
        prevLogTerm: -1,
        entries: [],
        leaderCommit: this.commitIndex,
      });
    });

    clearInterval(this.heartbeatInterval);

    const sendHeartbeat = () => {
      Object.keys(this.votes).forEach((node) => {
        const entriesToSend = [];
        let prevLogIndex = -1;
        let prevLogTerm = -1;

        const logLength = this.log.length;

        if (this.nextIndex[node] > 0) {
          this.nextIndex[node] = logLength;
        }

        for (let i = this.nextIndex[node]; i < logLength; i++) {
          entriesToSend.push({ index: i, ...this.log[i] });
        }

        if (entriesToSend.length > 0) {
          prevLogIndex = entriesToSend[0].index - 1;

          if (prevLogIndex > -1) {
            prevLogTerm = this.log[prevLogIndex].term;
          }
        }

        this.send(node, RPC_TYPE.APPEND_ENTRIES, {
          type: RPC_TYPE.APPEND_ENTRIES,
          term: this.currentTerm,
          leaderId: this.id,
          prevLogIndex,
          prevLogTerm,
          entries: entriesToSend,
          leaderCommit: this.commitIndex,
        });
      });
    };

    this.heartbeatInterval = setInterval(
      sendHeartbeat,
      this.heartbeatIntervalMs,
    );
  }

  /* * */

  async handleVoteRequest({
    candidateId,
    term,
    lastLogTerm: candidateLastLogTerm,
    lastLogIndex: candidateLastLogIndex,
  }: VoteRequest) {
    console.log(`${this.id} received vote request from ${candidateId}`);

    if (term >= this.currentTerm) {
      let lastLogEntry = this.log[this.log.length - 1];
      let lastLogTerm = lastLogEntry != null ? lastLogEntry.term : -1;
      let candidateIsUpToDate =
        candidateLastLogTerm > lastLogTerm ||
        (candidateLastLogTerm === lastLogTerm &&
          candidateLastLogIndex >= this.log.length - 1);

      if (
        (this.votedFor === null || this.votedFor === candidateId) &&
        candidateIsUpToDate
      ) {
        this.votedFor = candidateId;
        this.send(candidateId, RPC_TYPE.REQUEST_VOTE_REPLY, {
          type: RPC_TYPE.REQUEST_VOTE_REPLY,
          term: this.currentTerm,
          voteGranted: true,
        });
        console.log(`${this.id} voted for ${candidateId}`);
        return;
      }
    }
    this.send(candidateId, RPC_TYPE.REQUEST_VOTE_REPLY, {
      type: RPC_TYPE.REQUEST_VOTE_REPLY,
      term: this.currentTerm,
      voteGranted: false,
    });
  }

  /* * */

  async beginElection() {
    console.log(`${this.id} starting election`);
    this.state = NodeState.CANDIDATE;
    this.leader = null;
    this.votedFor = this.id;
    this.votes = {};
    this.currentTerm += 1;

    this.votedFor = this.id;
    this.votes[this.id] = true;
    const lastLogIndex = this.log.length - 1;
    this.broadcast(RPC_TYPE.REQUEST_VOTE, {
      type: RPC_TYPE.REQUEST_VOTE,
      candidateId: this.id,
      term: this.currentTerm,
      lastLogIndex: lastLogIndex,
      lastLogTerm: lastLogIndex > -1 ? this.log[lastLogIndex].term : -1,
    });
  }

  async handleVoteReply({ term, voteGranted }: VoteReply, from: string) {
    console.log(`${this.id} received vote reply from ${from}`);
    if (term === this.currentTerm && voteGranted) {
      this.votes[from] = true;
      console.log(`${this.id} votes: ${JSON.stringify(this.votes, null, 2)}`);
      if (this.state === NodeState.CANDIDATE && this.hasMajority()) {
        this.state = NodeState.LEADER;
        this.nextIndex = {};
        this.matchIndex = {};
        this.beginHeartbeat();
        console.log(`${this.id} is now leader`);
      }
    }
  }

  async handleAppendEntriesRequest(
    {
      term,
      entries,
      leaderId,
      leaderCommit,
      prevLogIndex,
      prevLogTerm,
    }: AppendEntriesRequest,
    from: string,
  ) {
    if (term >= this.currentTerm && this.state !== NodeState.LEADER) {
      this.state = NodeState.FOLLOWER;
      this.leader = leaderId;
    }

    if (term < this.currentTerm) {
      this.send(from, RPC_TYPE.APPEND_ENTRIES_REPLY, {
        type: RPC_TYPE.APPEND_ENTRIES_REPLY,
        term: this.currentTerm,
        success: false,
        lastLogIndex: -1,
      });
      return;
    }

    if (
      prevLogIndex > -1 &&
      (this.log[prevLogIndex] == null ||
        this.log[prevLogIndex].term !== prevLogTerm)
    ) {
      this.send(from, RPC_TYPE.APPEND_ENTRIES_REPLY, {
        type: RPC_TYPE.APPEND_ENTRIES_REPLY,
        term: this.currentTerm,
        success: false,
        lastLogIndex: -1,
      });
      return;
    }

    let confictedAt = -1;

    entries.forEach((entry) => {
      const { index } = entry;
      if (this.log[index] != null && this.log[index].term !== entry.term) {
        confictedAt = index;
      }
    });

    if (confictedAt > 0) {
      this.log = this.log.slice(0, confictedAt);
    }

    entries.forEach((entry) => {
      const { index, ...rest } = entry;
      if (this.log[index] == null) {
        this.log[index] = rest;
      }
    });

    if (leaderCommit > this.commitIndex) {
      this.commitIndex = Math.min(leaderCommit, this.log.length - 1);
    }

    this.send(from, RPC_TYPE.APPEND_ENTRIES_REPLY, {
      type: RPC_TYPE.APPEND_ENTRIES_REPLY,
      success: true,
      term: this.currentTerm,
      lastLogIndex: this.log.length - 1,
    });
  }

  /* * */
  hasMajority() {
    const votes = Object.keys(this.votes).length;
    return votes > Math.ceil(this.clusterSize / 2);
  }

  private resetElectionTimeout() {
    const timeout = this.randomElectionTimeout();
    if (this.electionTimeout !== null) {
      clearTimeout(this.electionTimeout);
    }

    this.electionTimeout = setTimeout(() => {
      this.resetElectionTimeout();
      this.beginElection();
    }, timeout);
  }
}
