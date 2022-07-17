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
    String((data["ip"])).toString().split(",").forEach(element => {
      this.eventService.publishNotification(data["bid"],  data["ip"], "publish")
    });
    return 'POST Event';
  }

  @EventPattern('close-notification')
  patchEvent(data: string): string {
    console.log(`Bid ${data} has been closed`);
    String((data["ip"])).toString().split(",").forEach(element => {
      this.eventService.publishNotification(data["bid"],  data["ip"], "close")
    });
    return 'PATCH EVENT';
  }

  @EventPattern('offer-notification')
  deleteEvent(data: string): string {
    console.log(`A new offer has been placed for Bid: ${data}`);

    String((data["ip"])).toString().split(",").forEach(element => {
      this.eventService.publishNotification(data["bid"],  data["ip"], "offer")
    });
    return 'DELETE event';
  }
}
