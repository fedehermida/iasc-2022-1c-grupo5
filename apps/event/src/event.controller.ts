import { Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { EventPattern } from '@nestjs/microservices';
import { EventService } from './event.service';

@Controller()
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  getHello(): string {
    return this.eventService.getHello();
  }

  @EventPattern('publish-notification')
  postEvent(data: string): string {
    console.log(`Bid ${data} has been recently published`);
    return 'POST Event';
  }

  @EventPattern('close-notification')
  patchEvent(data: string): string {
    console.log(`Bid ${data} has been closed`);
    return 'PATCH EVENT';
  }

  @EventPattern('offer-notification')
  deleteEvent(data: string): string {
    console.log(`A new offer has been placed for Bid: ${data}`);
    return 'DELETE event';
  }
}
