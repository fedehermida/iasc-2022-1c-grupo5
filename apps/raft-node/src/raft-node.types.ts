export enum NodeState {
  CANDIDATE = 'CANDIDATE',
  LEADER = 'LEADER',
  FOLLOWER = 'FOLLOWER',
}

export enum RPC_TYPE {
  REQUEST_VOTE = 'REQUEST_VOTE',
  REQUEST_VOTE_REPLY = 'REQUEST_VOTE_REPLY',
  APPEND_ENTRIES = 'APPEND_ENTRIES',
  APPEND_ENTRIES_REPLY = 'APPEND_ENTRIES_REPLY',
  APPEND_ENTRY = 'APPEND_ENTRY',
  DISPATCH = 'DISPATCH',
  DISPATCH_SUCCESS = 'DISPATCH_SUCCESS',
  DISPATCH_ERROR = 'DISPATCH_ERROR',
}

export type VoteRequest = {
  term: number;
  candidateId: string;
  lastLogIndex: number;
  lastLogTerm: number;
};

export type VoteReply = {
  term: number;
  voteGranted: boolean;
  nodeId: string;
  votedFor: string;
};

export type LogEntry = {
  term: number
};

export type AppendEntriesRequest = {
  nodeId: string;
  term: number;
  leaderId: string;
  prevLogIndex: number;
  prevLogTerm: number;
  entries: LogEntry[];
  leaderCommit: number;
};

export type AppendEntriesReply = {
  term: number;
  success: boolean;
}