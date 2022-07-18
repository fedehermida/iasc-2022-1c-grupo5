import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';
import {
  AppendEntriesReply,
  AppendEntriesRequest,
  NodeState,
  RPC_TYPE,
  VoteReply,
  VoteRequest,
} from './raft-node.types';

const randomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

@Injectable()
export class RaftNodeService {
  id: string;
  state: NodeState;
  clusterSize: number;
  electionTimeoutMs: number;
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
    return randomInt(300, 500);
  }

  constructor(
    @Inject('RAFT_SERVICE') private readonly redisService: ClientProxy,
  ) {
    this.id = `node-${uuidv4()}`;
    this.state = NodeState.FOLLOWER;
    this.electionTimeoutMs = randomInt(300, 500);
    this.clusterSize = 3;
    this.heartbeatIntervalMs = 50;
    this.currentTerm = 0;
    this.votedFor = null;
    this.leader = null;

    this.commitIndex = -1;
    this.lastApplied = -1;

    console.log(`${this.id} starting`);
    console.log(
      `${this.id} first election timeout: ${this.electionTimeoutMs}ms`,
    );

    this.startElectionTimeout();
  }

  async beginHeartbeat() {
    // initial entry
    Object.keys(this.votes).forEach((nodeId) => {
      this.redisService.send<RPC_TYPE.APPEND_ENTRIES, AppendEntriesRequest>(
        RPC_TYPE.APPEND_ENTRIES,
        {
          term: this.currentTerm,
          leaderId: this.id,
          prevLogIndex: -1,
          prevLogTerm: -1,
          entries: [],
          leaderCommit: this.commitIndex,
          nodeId,
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

        this.redisService.send<RPC_TYPE.APPEND_ENTRIES, AppendEntriesRequest>(
          RPC_TYPE.APPEND_ENTRIES,
          {
            term: this.currentTerm,
            leaderId: this.id,
            prevLogIndex,
            prevLogTerm,
            entries,
            leaderCommit: this.commitIndex,
            nodeId,
          },
        );
      });
    }, this.heartbeatIntervalMs);
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
  }

  async requestVote() {
    console.log(`${this.id} requesting vote`);
    this.redisService.emit<RPC_TYPE.REQUEST_VOTE, VoteRequest>(
      RPC_TYPE.REQUEST_VOTE,
      {
        candidateId: this.id,
        term: this.currentTerm,
        lastLogIndex: 0, // no deberían ser siempre 0
        lastLogTerm: 0, // no deberían ser siempre 0
      },
    );
    this.startElectionTimeout();
  }

  async sendAppendEntries() {
    // console.log(`${this.id} sending append entries`);
    // this.redisService.emit<RPC_TYPE.APPEND_ENTRIES, AppendEntriesRequest>(
    //   RPC_TYPE.APPEND_ENTRIES,
    //   {
    //     nodeId: this.id,
    //     term: this.currentTerm,
    //     leaderId: this.leader,
    //     prevLogIndex: 0,
    //     prevLogTerm: 0,
    //     entries: [],
    //     leaderCommit: 0,
    //   },
    // );
  }

  async handleVoteRequest({
    candidateId,
    term,
    lastLogTerm: candidateLastLogTerm,
    lastLogIndex: candidateLastLogIndex,
  }: VoteRequest) {
    this.checkTerm(term);
    this.resetElectionTimeout();

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
        this.redisService.send<RPC_TYPE.REQUEST_VOTE_REPLY, VoteReply>(
          RPC_TYPE.REQUEST_VOTE_REPLY,
          {
            term: this.currentTerm,
            voteGranted: true,
            votedFor: candidateId,
            nodeId: this.id,
          },
        );
      }
    } else {
      this.redisService.send<RPC_TYPE.REQUEST_VOTE_REPLY, VoteReply>(
        RPC_TYPE.REQUEST_VOTE_REPLY,
        {
          term: this.currentTerm,
          voteGranted: false,
          nodeId: this.id,
          votedFor: '',
        },
      );
    }
  }

  async handleVoteReply({ term, voteGranted, nodeId, votedFor }: VoteReply) {
    if (votedFor === this.id) {
      if (term === this.currentTerm && voteGranted) {
        this.votes[nodeId] = true;
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
  }

  async handleAppendEntriesRequest({
    term,
    nodeId,
    entries,
    leaderId,
  }: AppendEntriesRequest) {
    this.resetElectionTimeout();
    if (nodeId !== this.id) {
      return;
    }

    if (term >= this.currentTerm && this.state !== NodeState.LEADER) {
      this.state = NodeState.FOLLOWER;
      this.leader = leaderId;
    }

    if (entries.length === 0) {
      // is heartbeat
      console.log(`${this.id} received heartbeat from ${nodeId}`);
    } else {
      console.log(`${this.id} received append entries request`);
    }
    this.checkTerm(term);
    // chequear §5.3
  }

  // async handleAppendEntriesReply({ term }: AppendEntriesReply) {}

  checkTerm(term: number) {
    if (term > this.currentTerm) {
      this.currentTerm = term;
      this.leader = null;
      this.votedFor = null;
      this.state = NodeState.FOLLOWER;
      this.votes = {};
      clearInterval(this.heartbeatInterval);
    }
  }

  hasMajority() {
    const votes = Object.keys(this.votes).length;
    return votes > Math.ceil(this.clusterSize / 2);
  }

  startElectionTimeout() {
    this.electionTimeoutMs = randomInt(300, 500);
    this.electionTimeout = setTimeout(() => {
      this.beginElection();
    }, this.electionTimeoutMs);
  }

  clearElectionTimeout() {
    clearTimeout(this.electionTimeout);
  }

  resetElectionTimeout() {
    this.clearElectionTimeout();
    this.startElectionTimeout();
  }
}
