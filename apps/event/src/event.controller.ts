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

  @EventPattern('bid-created')
  async bidCreated(data: string) {
    console.log(`Bid ${data} has been recently published`);
  }

  @EventPattern('bid-ended')
  async bidEnded(data: string) {
    console.log(`Bid ${data} has ended`);
  }

  @EventPattern('bid-closed')
  async bidClosed(data: string) {
    console.log(`Bid ${data} has been closed`);
  }

  @EventPattern('offer-placed')
  async offerPlaced(data: string) {
    console.log(`Bid ${data} has a new offer`);
  }
}
