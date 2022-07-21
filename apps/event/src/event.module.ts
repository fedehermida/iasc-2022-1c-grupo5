import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { HttpModule } from '@nestjs/axios';
@Module({
  imports: [HttpModule],
  controllers: [EventController],
  providers: [EventService],
})
export class EventModule {}
