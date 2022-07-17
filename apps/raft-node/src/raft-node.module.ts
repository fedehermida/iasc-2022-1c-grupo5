import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RaftNodeController } from './raft-node.controller';
import { RaftNodeService } from './raft-node.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RAFT_SERVICE',
        transport: Transport.REDIS,
        options: {
          url: 'redis://localhost:6379',
        },
      },
    ]),
  ],
  controllers: [RaftNodeController],
  providers: [RaftNodeService],
})
export class RaftNodeModule {}
