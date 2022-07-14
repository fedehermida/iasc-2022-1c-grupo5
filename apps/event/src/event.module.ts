import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { EventController } from './event.controller';
import { EventService } from './event.service';

@Module({
  imports: [],
  controllers: [EventController],
  providers: [EventService],
})
export class EventModule {}
