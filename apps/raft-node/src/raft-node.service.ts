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
  heartbeatTimeoutMs: number;
  currentTerm: number;
  votedFor: string | null;
  leader: string | null;

  electionTimeout: NodeJS.Timeout;
  heartbeatTime: NodeJS.Timer;

  votes = {};

  log = [];

  constructor(
    @Inject('RAFT_SERVICE') private readonly redisService: ClientProxy,
  ) {
    this.id = `node-${uuidv4()}`;
    this.state = NodeState.FOLLOWER;
    this.electionTimeoutMs = randomInt(300, 500);
    this.clusterSize = 3;
    this.heartbeatTimeoutMs = 50;
    this.currentTerm = 1;
    this.votedFor = null;
    this.leader = null;

    console.log(`${this.id} starting`);
    console.log(
      `${this.id} first election timeout: ${this.electionTimeoutMs}ms`,
    );

    this.startElectionTimeout();
  }

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

  async handleVoteRequest({ candidateId, term }: VoteRequest) {
    this.checkTerm(term);

    if (candidateId === this.id) {
      // recibe el pedido de voto de si mismo nodo
      return;
    }

    if (term < this.currentTerm) {
      // recibe el pedido de voto de un nodo con un term menor
      return;
    }

    // el nodo no votó o votó por quien le está pidiendo un voto
    // falta chequear el estado del log
    if (this.votedFor === null || this.votedFor === candidateId) {
      this.votedFor = candidateId;
      this.redisService.emit(RPC_TYPE.REQUEST_VOTE_REPLY, {
        nodeId: this.id,
        term,
        voteGranted: true,
        votedFor: candidateId,
      });
    }

    this.clearElectionTimeout();
    console.log(`${this.id} received vote request from ${candidateId}`);
  }

  async handleVoteReply({ term, voteGranted, nodeId, votedFor }: VoteReply) {
    if (votedFor === this.id) {
      if (term < this.currentTerm) {
        return;
      }

      if (voteGranted) {
        console.log(`${this.id} received vote from ${nodeId}`);
        this.votes[nodeId] = true;
        if (this.state === NodeState.CANDIDATE && this.hasMajority()) {
          this.state = NodeState.LEADER;
          this.leader = this.id;
          console.log(`${this.id} is now leader`);
          this.clearElectionTimeout();
          this.startHeartbeat();
          // this.sendAppendEntries();
        }
      } else {
        console.log(`${this.id} received vote rejection from ${nodeId}`);
      }
    }
  }

  startHeartbeat() {
    this.heartbeatTime = setInterval(() => {
      this.sendHeartbeat();
    }, 100);
  }

  async handleAppendEntriesRequest({
    term,
    nodeId,
    entries,
  }: AppendEntriesRequest) {
    if (nodeId === this.id) {
      return;
    }

    if (entries.length === 0) {
      // is heartbeat
      console.log(`${this.id} received heartbeat from ${nodeId}`);
    } else {
      console.log(`${this.id} received append entries request`);
    }
    this.checkTerm(term);

    // §5.1
    if (term < this.currentTerm) {
      return;
    }

    this.resetElectionTimeout();
    // chequear §5.3
  }

  // async handleAppendEntriesReply({ term }: AppendEntriesReply) {}

  async sendHeartbeat() {
    console.log(`${this.id} sending heartbeat`);
    this.redisService.emit<RPC_TYPE.APPEND_ENTRIES, AppendEntriesRequest>(
      RPC_TYPE.APPEND_ENTRIES,
      {
        nodeId: this.id,
        term: this.currentTerm,
        leaderId: this.leader,
        prevLogIndex: 0,
        prevLogTerm: 0,
        entries: [],
        leaderCommit: 0,
      },
    );
  }

  checkTerm(term: number) {
    if (term > this.currentTerm) {
      this.currentTerm = term;
      this.votedFor = null;
      this.votes = {};
      this.state = NodeState.FOLLOWER;
      // falta decir a que lider sigue?
    }
  }

  hasMajority() {
    const votes = Object.keys(this.votes).length;
    return votes > this.clusterSize / 2;
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
