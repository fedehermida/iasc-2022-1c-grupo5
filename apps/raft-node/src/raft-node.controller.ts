import { Controller } from '@nestjs/common';

import { EventPattern, Payload } from '@nestjs/microservices';
import { RaftNodeService } from './raft-node.service';
import {
  AppendEntriesRequest,
  RPC_TYPE,
  VoteReply,
  VoteRequest,
} from './raft-node.types';

@Controller()
export class RaftNodeController {
  constructor(private readonly raftNodeService: RaftNodeService) {}
  @EventPattern(RPC_TYPE.REQUEST_VOTE)
  handleRaftNodeEvent(@Payload() data: VoteRequest) {
    this.raftNodeService.handleVoteRequest(data);
  }

  @EventPattern(RPC_TYPE.REQUEST_VOTE_REPLY)
  handeVoteReply(@Payload() data: VoteReply) {
    this.raftNodeService.handleVoteReply(data);
  }

  @EventPattern(RPC_TYPE.APPEND_ENTRIES)
  handleAppendEntries(@Payload() data: AppendEntriesRequest) {
    this.raftNodeService.handleAppendEntriesRequest(data);
  }
}
