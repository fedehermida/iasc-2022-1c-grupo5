import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';
import { Raft } from './raft.constants';
import {
  AppendEntriesReply,
  AppendEntriesRequest,
  AppendEntry,
  LogEntry,
  Message,
  NodeState,
  PayloadType,
  RPC_TYPE,
  VoteReply,
  VoteRequest,
} from './raft.types';

@Injectable()
export class RaftService {
  private id: Readonly<string> = Object.freeze(`node-${uuidv4()}`);
  state: NodeState;
  clusterSize: number;
  currentTerm: number = 0;
  votedFor: string | null = null;
  leader: string | null = null;

  heartbeatIntervalMs: number;
  electionTimeoutMs: { min: number; max: number };

  electionTimeout: NodeJS.Timeout;
  heartbeatInterval: NodeJS.Timer;

  // estado de LEADER
  nextIndex: Record<string, number> = {};
  matchIndex: Record<string, number> = {};

  // estado en CANDIDATE
  votes: Record<string, boolean> = {};

  commitIndex: number;
  lastApplied: number;

  log: LogEntry[] = [];

  constructor(
    @Inject('RAFT_SERVICE') private readonly redisService: ClientProxy,
  ) {
    console.log(`[${this.id}] starting`);

    this.clusterSize = Raft.CLUSTER_SIZE;
    this.heartbeatIntervalMs = Raft.HEARTBEAT_INTERVAL;
    this.electionTimeoutMs = {
      min: Raft.ELECTION_TIMEOUT_MIN,
      max: Raft.ELECTION_TIMEOUT_MAX,
    };

    this.state = NodeState.FOLLOWER;
    this.commitIndex = -1;
    this.lastApplied = -1;

    this.resetElectionTimeout();
  }

  private resetElectionTimeout() {
    const ms = this.randomElectionTimeout();
    if (this.electionTimeout !== null) {
      clearTimeout(this.electionTimeout);
    }

    this.electionTimeout = setTimeout(() => {
      this.resetElectionTimeout();
      this.beginElection();
    }, ms);
  }

  private beginLeaderHeartbeat() {
    Object.keys(this.votes).forEach((node) => {
      this.send(node, {
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

    this.heartbeatInterval = setInterval(() => {
      Object.keys(this.votes).forEach((node) => {
        const entries = [];
        let prevLogIndex = -1;
        let prevLogTerm = -1;

        const logLength = this.log.length;

        if (this.nextIndex[node] == null) {
          this.nextIndex[node] = logLength;
        }

        for (let i = this.nextIndex[node]; i < logLength; ++i) {
          entries.push({ index: i, ...this.log[i] });
        }

        if (entries.length > 0) {
          prevLogIndex = entries[0].index - 1;

          if (prevLogIndex > -1) {
            prevLogTerm = this.log[prevLogIndex].term;
          }
        }

        this.send(node, {
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

  handleMessage(message: Message) {
    const { to, payload, from } = message;
    if (to === undefined || to === this.id) {
      this.resetElectionTimeout();

      // Check term
      if (payload.term > this.currentTerm) {
        this.currentTerm = payload.term;
        this.leader = null;
        this.votedFor = null;
        this.state = NodeState.FOLLOWER;
        clearInterval(this.heartbeatInterval);
      }

      switch (payload.type) {
        case RPC_TYPE.REQUEST_VOTE: {
          this.handleRequestVote(payload, from);
          break;
        }
        case RPC_TYPE.REQUEST_VOTE_REPLY: {
          this.handleRequestVoteReply(payload, from);
          break;
        }
        case RPC_TYPE.APPEND_ENTRIES: {
          this.handleAppendEntries(payload, from);
          break;
        }
        case RPC_TYPE.APPEND_ENTRIES_REPLY: {
          this.handleAppendEntriesReply(payload, from);
          break;
        }
        case RPC_TYPE.APPEND_ENTRY: {
          this.handleAppendEntry(payload, from);
          break;
        }
      }

      if (this.isLeader()) {
        let highestPossibleCommitIndex = -1;
        const logLength = this.log.length;
        for (let i = this.commitIndex + 1; i < logLength; ++i) {
          if (
            this.log[i].term === this.currentTerm &&
            // And there must be a majority of matchIndexes >= i
            Object.values(this.matchIndex).filter((v) => v >= i).length >
              Math.ceil(this.clusterSize / 2)
          ) {
            highestPossibleCommitIndex = i;
          }
        }

        if (highestPossibleCommitIndex > this.commitIndex) {
          this.commitIndex = highestPossibleCommitIndex;
        }
      }

      // All nodes should commit entries between lastApplied and commitIndex
      const ii = this.commitIndex;
      for (let i = this.lastApplied + 1; i <= ii; ++i) {
        this.lastApplied = i;
      }
    }
  }

  private handleRequestVote(
    {
      candidateId,
      term,
      lastLogTerm: candidateLastLogTerm,
      lastLogIndex: candidateLastLogIndex,
    }: VoteRequest,
    from: string,
  ) {
    console.log(`[${this.id}] received vote request from ${from}`);
    if (term >= this.currentTerm) {
      let lastLogEntry = this.log[this.lastLogIndex()];
      let lastLogTerm = lastLogEntry != null ? lastLogEntry.term : -1;
      let candidateIsUpToDate =
        candidateLastLogTerm > lastLogTerm ||
        (candidateLastLogTerm === lastLogTerm &&
          candidateLastLogIndex >= this.lastLogIndex());

      if (
        (this.votedFor === null || this.votedFor === candidateId) &&
        candidateIsUpToDate
      ) {
        this.votedFor = candidateId;
        this.send(candidateId, {
          type: RPC_TYPE.REQUEST_VOTE_REPLY,
          term: this.currentTerm,
          voteGranted: true,
        });
        console.log(`[${this.id}] voted for ${candidateId}`);
        return;
      }
    }
    this.send(candidateId, {
      type: RPC_TYPE.REQUEST_VOTE_REPLY,
      term: this.currentTerm,
      voteGranted: false,
    });
  }

  private handleRequestVoteReply(
    { term, voteGranted }: VoteReply,
    from: string,
  ) {
    console.log(`[${this.id}] received vote reply from ${from}`);
    if (term === this.currentTerm && voteGranted) {
      this.votes[from] = true;
      if (this.isCandidate() && this.hasMajority()) {
        this.state = NodeState.LEADER;
        this.nextIndex = {};
        this.matchIndex = {};
        this.beginLeaderHeartbeat();
        console.log(`[${this.id}] became leader`);
      }
    }
  }

  private handleAppendEntries(
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
    if (term >= this.currentTerm && !this.isLeader()) {
      this.state = NodeState.FOLLOWER;
      this.leader = leaderId;
    }

    if (term < this.currentTerm) {
      this.send(from, {
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
      this.send(from, {
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
      this.commitIndex = Math.min(leaderCommit, this.lastLogIndex());
    }

    this.send(from, {
      type: RPC_TYPE.APPEND_ENTRIES_REPLY,
      success: true,
      term: this.currentTerm,
      lastLogIndex: this.lastLogIndex(),
    });
  }

  private handleAppendEntriesReply(
    { term, success, lastLogIndex }: AppendEntriesReply,
    from: string,
  ) {
    if (this.isLeader() && this.currentTerm === term) {
      if (success && lastLogIndex > -1) {
        this.nextIndex[from] = lastLogIndex + 1;
        this.matchIndex[from] = lastLogIndex;
      } else {
        if (this.nextIndex[from] == null) {
          this.nextIndex[from] = this.log.length;
        }
        this.nextIndex[from] = Math.max(this.nextIndex[from] - 1, 0);
      }
    }
  }

  private handleAppendEntry({ id, data }: AppendEntry, from: string) {
    if (this.state === NodeState.LEADER) {
      const entry: LogEntry = { id, data, term: this.currentTerm };
      this.log.push(entry);
    }
  }

  /* * */

  private beginElection() {
    console.log(`[${this.id}] starting election`);
    this.state = NodeState.CANDIDATE;
    this.leader = null;
    this.votes = {};
    this.currentTerm += 1;

    const lastLogIndex = this.lastLogIndex();
    this.broadcast({
      type: RPC_TYPE.REQUEST_VOTE,
      candidateId: this.id,
      term: this.currentTerm,
      lastLogIndex,
      lastLogTerm: lastLogIndex > -1 ? this.log[lastLogIndex].term : -1,
    });
  }

  private randomElectionTimeout() {
    const { min, max } = this.electionTimeoutMs;
    return Math.floor(Math.random() * (max - min)) + min;
  }

  /* AUX */
  private isLeader() {
    return this.state === NodeState.LEADER;
  }
  private isCandidate() {
    return this.state === NodeState.CANDIDATE;
  }
  private hasMajority() {
    return (
      Object.values(this.votes).filter((v) => v).length >= this.clusterSize / 2
    );
  }
  private lastLogIndex() {
    return this.log.length - 1;
  }

  /* Redis service broadcast and send */
  private broadcast(payload: PayloadType) {
    this.redisService.emit(payload.type, {
      from: this.id,
      payload,
    });
  }

  private send(to: string, payload: PayloadType) {
    this.redisService.emit(payload.type, {
      from: this.id,
      to,
      payload,
    });
  }
  /* * */

  append(data: LogEntry['data']) {
    const id = `${this.id}_${uuidv4()}`;

    if (this.isLeader()) {
      console.log(`[${this.id}] is leader saving entry`);
      const entry: LogEntry = {
        id,
        term: this.currentTerm,
        data,
      };
      this.log.push(entry);
    } else if (this.state === NodeState.FOLLOWER && this.leader !== null) {
      console.log(`[${this.id}] is not leader sending entry to ${this.leader}`);
      this.send(this.leader, {
        type: RPC_TYPE.APPEND_ENTRY,
        id,
        data,
        term: this.currentTerm,
      });
    }

    // this.pendingEntries.push(performRequest);
  }
}
