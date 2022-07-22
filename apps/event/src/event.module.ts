import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { EventController } from './event.controller';
import { EventService } from './event.service';
@Module({
  imports: [HttpModule],
  controllers: [EventController],
  providers: [EventService],
})
export class EventModule {}
