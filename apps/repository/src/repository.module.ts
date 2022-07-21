import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { RepositoryController } from './repository.controller';
import { RepositoryService } from './repository.service';
import { ScheduleModule } from '@nestjs/schedule';
import { RaftModule } from './raft/raft.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ClientsModule.register([
      {
        name: 'EVENT_QUEUE_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [`amqp://${process.env.RABBITMQ_URL}`],
          queue: 'event-queue',
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
    RaftModule,
  ],
  controllers: [RepositoryController],
  providers: [RepositoryService],
})
export class RepositoryModule {}
