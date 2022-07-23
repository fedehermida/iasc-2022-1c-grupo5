import { Controller, Get } from '@nestjs/common';
import { Ctx, EventPattern, RmqContext } from '@nestjs/microservices';
import { EventService } from './event.service';

@Controller()
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  getHello(): string {
    return this.eventService.getHello();
  }

  @EventPattern('publish-notification')
  postEvent(data: JSON, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();
    try {
      console.log(JSON.stringify(data));
      console.log(
        `Bid ${JSON.stringify(data['bid'])} -  ${
          data['ip']
        } has been recently published`,
      );
      this.eventService.publishNotification(data['bid'], data['ip'], 'publish');

      channel.ack(originalMsg);
    } catch (error) {
      console.log(error);
      channel.ack(originalMsg);
    }
  }

  @EventPattern('bid-ended')
  async bidEnded(data: string, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    console.log(`Bid ${data} has ended`);
    channel.ack(originalMsg);
  }

  @EventPattern('bid-closed')
  async bidClosed(data: string, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    console.log(`Bid ${data} has been closed`);
    this.eventService.publishNotification(data['bid'], data['ip'], 'close');
    channel.ack(originalMsg);
  }

  @EventPattern('offer-notification')
  deleteEvent(data: string, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    console.log(`A new offer has been placed for Bid: ${data}`);
    this.eventService.publishNotification(data['bid'], data['ip'], 'offer');
    channel.ack(originalMsg);
  }

  @EventPattern('finish-notification')
  endEvent(data: string, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    console.log(`A new offer has been placed for Bid: ${data}`);
    this.eventService.publishNotification(data['bid'], data['ip'], 'finish');
    channel.ack(originalMsg);
  }
}
