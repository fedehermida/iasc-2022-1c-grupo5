import { Controller, Get } from '@nestjs/common';
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
  postEvent(data: JSON) {
    console.log(JSON.stringify(data));
    console.log(
      `Bid ${JSON.stringify(data['bid'])} -  ${
        data['ip']
      } has been recently published`,
    );
    this.eventService.publishNotification(data['bid'], data['ip'], 'publish');
  }

  @EventPattern('bid-ended')
  async bidEnded(data: string) {
    console.log(`Bid ${data} has ended`);
  }

  @EventPattern('bid-closed')
  async bidClosed(data: string) {
    console.log(`Bid ${data} has been closed`);
    this.eventService.publishNotification(data['bid'], data['ip'], 'close');
  }

  @EventPattern('offer-notification')
  deleteEvent(data: string) {
    console.log(`A new offer has been placed for Bid: ${data}`);
    this.eventService.publishNotification(data['bid'], data['ip'], 'offer');
  }

  @EventPattern('finish-notification')
  endEvent(data: string) {
    console.log(`A new offer has been placed for Bid: ${data}`);
    this.eventService.publishNotification(data['bid'], data['ip'], 'finish');
  }
}
