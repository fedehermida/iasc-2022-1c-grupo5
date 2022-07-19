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
  postEvent(data: JSON): string {
    console.log(JSON.stringify(data))
    console.log(`Bid ${JSON.stringify(data["bid"])} -  ${data["ip"]} has been recently published`);
    data["ip"].forEach(element => {
      this.eventService.publishNotification(data["bid"],  element, "publish")
    });
    return 'POST Event';
  }

  @EventPattern('close-notification')
  patchEvent(data: string): string {
    console.log(`Bid ${data} has been closed`);
    data["ip"].forEach(element => {
      this.eventService.publishNotification(data["bid"],  element, "close")
    });
    return 'PATCH EVENT';
  }

  @EventPattern('offer-notification')
  deleteEvent(data: string): string {
    console.log(`A new offer has been placed for Bid: ${data}`);

    data["ip"].forEach(element => {
      this.eventService.publishNotification(data["bid"],  element, "offer")
    });
    return 'DELETE event';
  }

  @EventPattern('finish-notification')
  endEvent(data: string): string {
    console.log(`A new offer has been placed for Bid: ${data}`);
    data["ip"].forEach(element => {
      this.eventService.publishNotification(data["bid"],  element, "finish")
    });
    return 'DELETE event';
  }
}
