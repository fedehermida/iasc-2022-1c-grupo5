import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';
import { NodeState, RPC_TYPE, VoteReply, VoteRequest } from './raft-node.types';

const randomInt = (min: number, max: number) => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

@Injectable()
export class RaftNodeService {
  id: string;
  state: NodeState;
  clusterSize: number;
  electionTimeoutMs: number;
  heartbeatTimeout: number;
  currentTerm: number;
  votedFor: string | null;
  leader: string | null;

  electionTimeout: NodeJS.Timeout;

  votes = {};

  constructor(
    @Inject('RAFT_SERVICE') private readonly redisService: ClientProxy,
  ) {
    this.id = `node-${uuidv4()}`;
    this.state = NodeState.FOLLOWER;
    this.electionTimeoutMs = randomInt(300, 500);
    this.clusterSize = 3;
    this.heartbeatTimeout = 50;
    this.currentTerm = 1;
    this.votedFor = null;
    this.leader = null;

    console.log(`${this.id} starting`);
    console.log(`${this.id} election timeout: ${this.electionTimeoutMs}ms`);

    this.electionTimeout = setTimeout(() => {
      this.beginElection();
    }, this.electionTimeoutMs);
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
      { candidateId: this.id, term: this.currentTerm },
    );
  }

  async handleVoteRequest({ candidateId, term }: VoteRequest) {
    if (candidateId === this.id) {
      return;
    }

    if (term < this.currentTerm) {
      return;
    }

    if (this.votedFor === null || this.votedFor === candidateId) {
      this.votedFor = candidateId;
      this.redisService.emit(RPC_TYPE.REQUEST_VOTE_REPLY, {
        nodeId: this.id,
        term,
        voteGranted: true,
        votedFor: candidateId,
      });
    }

    clearTimeout(this.electionTimeout);
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
          // this.sendAppendEntries();
        }
      } else {
        console.log(`${this.id} received vote rejection from ${nodeId}`);
      }
    }
  }

  hasMajority() {
    const votes = Object.keys(this.votes).length;
    return votes > this.clusterSize / 2;
  }
}
