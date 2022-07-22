import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RaftController } from './raft.controller';
import { RaftService } from './raft.service';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: 'RAFT_SERVICE',
        // @ts-ignore
        transport: Transport.REDIS,
        options: {
          host: process.env.REDIS_HOST,
          port: 6379,
        },
      },
    ]),
  ],
  providers: [RaftService],
  exports: [RaftService],
  controllers: [RaftController],
})
export class RaftModule {}
