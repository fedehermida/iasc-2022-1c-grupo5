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
  private id: Readonly<string> = Object.freeze(`node-${uuidv4()}`);
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
        this.votes = {};
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
      }
    }
  }
  /* * */

  async beginHeartbeat() {
    // initial entry
    Object.keys(this.votes).forEach((nodeId) => {
      this.redisService.send<RPC_TYPE.APPEND_ENTRIES, AppendEntriesRequest>(
        RPC_TYPE.APPEND_ENTRIES,
        {
          type: RPC_TYPE.APPEND_ENTRIES,
          term: this.currentTerm,
          leaderId: this.id,
          prevLogIndex: -1,
          prevLogTerm: -1,
          entries: [],
          leaderCommit: this.commitIndex,
        },
      );
    });

    clearInterval(this.heartbeatInterval);

    this.heartbeatInterval = setInterval(() => {
      Object.keys(this.votes).forEach((nodeId) => {
        let entries = [];
        let prevLogIndex = -1;
        let prevLogTerm = -1;

        const logLength = this.log.length;

        if (this.nextIndex[nodeId] == null) {
          this.nextIndex[nodeId] = logLength;
        }

        for (let i = this.nextIndex[nodeId]; i < logLength; i++) {
          entries.push({ index: 1, ...this.log[i] });
        }

        if (entries.length > 0) {
          prevLogIndex = entries[0].index - 1;
          if (prevLogIndex > -1) {
            prevLogTerm = this.log[prevLogIndex].term;
          }
        }

        this.send(nodeId, RPC_TYPE.APPEND_ENTRIES, {
          type: RPC_TYPE.APPEND_ENTRIES,
          term: this.currentTerm,
          leaderId: this.id,
          prevLogIndex,
          prevLogTerm,
          entries,
          leaderCommit: this.commitIndex,
        });
      });
    }, this.heartbeatIntervalMs);
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
      let lastLogTerm = lastLogEntry ? lastLogEntry.term : -1;
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
      }
    } else {
      this.send(candidateId, RPC_TYPE.REQUEST_VOTE_REPLY, {
        type: RPC_TYPE.REQUEST_VOTE_REPLY,
        term: this.currentTerm,
        voteGranted: false,
      });
      console.log(`${this.id} rejected the vote request from ${candidateId}`);
    }
  }

  /* * */

  async beginElection() {
    // Para empezar una eleccion incrementa el term
    // pasa a estado candidato y solicita votos
    this.state = NodeState.CANDIDATE;
    this.leader = null;
    this.votedFor = this.id;
    this.votes = {};
    this.currentTerm += 1;
    this.requestVote();
    // this.startElectionTimeout();
  }

  async requestVote() {
    console.log(`${this.id} requesting vote`);
    this.broadcast(RPC_TYPE.REQUEST_VOTE, {
      type: RPC_TYPE.REQUEST_VOTE,
      candidateId: this.id,
      term: this.currentTerm,
      lastLogIndex: 0, // no deberían ser siempre 0
      lastLogTerm: 0, // no deberían ser siempre 0
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
        // emit leader elected
      }
    }
  }

  async handleAppendEntriesRequest(
    { term, entries, leaderId }: AppendEntriesRequest,
    from: string,
  ) {
    if (term >= this.currentTerm && this.state !== NodeState.LEADER) {
      this.state = NodeState.FOLLOWER;
      this.leader = leaderId;
    }

    if (entries.length === 0) {
      // is heartbeat
      // console.log(`${this.id} received heartbeat from ${from}`);
    } else {
      console.log(`${this.id} received append entries request`);
    }
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
