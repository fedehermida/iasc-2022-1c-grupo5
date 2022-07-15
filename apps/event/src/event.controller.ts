import { Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { Ctx, EventPattern, Payload, RmqContext } from '@nestjs/microservices';
import { EventService } from './event.service';
import { RmqService } from '@app/common';

@Controller()
export class EventController {
  constructor(private readonly eventService: EventService, private readonly rmqService: RmqService) { }

  @Get()
  getHello(): string {
    return this.eventService.getHello();
  }

  @EventPattern('publish-notification')
  handlePublishNotification(@Payload() data: any, @Ctx() context: RmqContext): string {
    console.log(`Bid ${data} has been recently published`);
    this.rmqService.ack(context);
    return 'POST Event';
  }

  @EventPattern('close-notification')
  handleCloseNotification(@Payload() data: any, @Ctx() context: RmqContext): string {
    console.log(`Bid ${data} has been closed`);
    this.rmqService.ack(context);
    return 'PATCH EVENT';
  }

  @EventPattern('offer-notification')
  handleOfferNotification(@Payload() data: any, @Ctx() context: RmqContext): string {
    console.log(`A new offer has been placed for Bid: ${data}`);
    this.rmqService.ack(context);
    return 'DELETE event';
  }
}
