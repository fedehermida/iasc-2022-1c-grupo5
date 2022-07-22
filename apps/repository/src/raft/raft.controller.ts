import { Body, Controller, Get, Post } from '@nestjs/common';

import { EventPattern, Payload } from '@nestjs/microservices';
import { RaftService } from './raft.service';
import { Message, RPC_TYPE } from './raft.types';

@Controller('raft')
export class RaftController {
  constructor(private readonly raftService: RaftService) {}

  @EventPattern(RPC_TYPE.REQUEST_VOTE)
  handleRaftNodeEvent(@Payload() data: Message) {
    this.raftService.handleMessage(data);
  }

  @EventPattern(RPC_TYPE.REQUEST_VOTE_REPLY)
  handeVoteReply(@Payload() data: Message) {
    this.raftService.handleMessage(data);
  }

  @EventPattern(RPC_TYPE.APPEND_ENTRIES)
  handleAppendEntries(@Payload() data: Message) {
    this.raftService.handleMessage(data);
  }

  @EventPattern(RPC_TYPE.APPEND_ENTRIES_REPLY)
  handleAppendEntriesReply(@Payload() data: Message) {
    this.raftService.handleMessage(data);
  }

  @EventPattern(RPC_TYPE.APPEND_ENTRY)
  handleAppendEntry(@Payload() data: Message) {
    this.raftService.handleMessage(data);
  }

  @Get('/log')
  async getLog() {
    return this.raftService.log;
  }
}
