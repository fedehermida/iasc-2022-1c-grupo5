import { Controller, Get } from '@nestjs/common';
import { SubscriberService } from './subscriber.service';

@Controller()
export class SubscriberController {
  constructor(private readonly subscriberService: SubscriberService) {}

  @Get()
  getHello(): string {
    return this.subscriberService.getHello();
  }
}
