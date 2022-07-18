import { Controller } from '@nestjs/common';

import { EventPattern, Payload } from '@nestjs/microservices';
import { RaftNodeService } from './raft-node.service';
import { Message, RPC_TYPE } from './raft-node.types';

@Controller()
export class RaftNodeController {
  constructor(private readonly raftNodeService: RaftNodeService) {}

  @EventPattern(RPC_TYPE.REQUEST_VOTE)
  handleRaftNodeEvent(@Payload() data: Message) {
    this.raftNodeService.handleMessage(data);
  }

  @EventPattern(RPC_TYPE.REQUEST_VOTE_REPLY)
  handeVoteReply(@Payload() data: Message) {
    this.raftNodeService.handleMessage(data);
  }

  @EventPattern(RPC_TYPE.APPEND_ENTRIES)
  handleAppendEntries(@Payload() data: Message) {
    this.raftNodeService.handleMessage(data);
  }
}
