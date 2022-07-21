import { Body, Controller, Get, Post } from '@nestjs/common';

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

  @EventPattern(RPC_TYPE.APPEND_ENTRIES_REPLY)
  handleAppendEntriesReply(@Payload() data: Message) {
    this.raftNodeService.handleMessage(data);
  }

  @EventPattern(RPC_TYPE.APPEND_ENTRY)
  handleAppendEntry(@Payload() data: Message) {
    this.raftNodeService.handleMessage(data);
  }

  @Post('/append')
  async append(@Body() data) {
    this.raftNodeService.append(data);
    return data;
  }

  @Get('/log')
  async getLog() {
    return this.raftNodeService.log;
  }
}
