import { Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { EventService } from './event.service';

@Controller()
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  getHello(): string {
    return this.eventService.getHello();
  }

  @Post()
  postEvent(): string {
    return 'POST Event';
  }

  @Patch()
  patchEvent(): string {
    return 'PATCH EVENT';
  }

  @Delete()
  deleteEvent(): string {
    return 'DELETE event';
  }
}
