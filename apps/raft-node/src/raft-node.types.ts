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
};

export type VoteReply = {
  term: number;
  voteGranted: boolean;
  nodeId: string;
  votedFor: string;
};
