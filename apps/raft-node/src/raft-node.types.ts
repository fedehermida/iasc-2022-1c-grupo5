export type LogEntry = {
  term: number;
  data: any;
  index?: number;
  id: string;
};

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
  // APPEND_ENTRY = 'APPEND_ENTRY',
  // DISPATCH = 'DISPATCH',
  // DISPATCH_SUCCESS = 'DISPATCH_SUCCESS',
  // DISPATCH_ERROR = 'DISPATCH_ERROR',
}

export type VoteRequest = {
  type: RPC_TYPE.REQUEST_VOTE;
  term: number;
  candidateId: string;
  lastLogIndex: number;
  lastLogTerm: number;
};

export type VoteReply = {
  type: RPC_TYPE.REQUEST_VOTE_REPLY;
  term: number;
  voteGranted: boolean;
};

export type AppendEntriesRequest = {
  type: RPC_TYPE.APPEND_ENTRIES;
  term: number;
  leaderId: string;
  prevLogIndex: number;
  prevLogTerm: number;
  entries: LogEntry[];
  leaderCommit: number;
};

export type AppendEntriesReply = {
  type: RPC_TYPE.APPEND_ENTRIES_REPLY;
  term: number;
  success: boolean;
  lastLogIndex: number;
};

export type PayloadType =
  | VoteRequest
  | VoteReply
  | AppendEntriesRequest
  | AppendEntriesReply;

export type Message = {
  payload: PayloadType;
  from: string;
  to?: string;
};