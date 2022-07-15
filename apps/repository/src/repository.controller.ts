import { Controller, Get, Inject } from '@nestjs/common';
import { ClientProxy, EventPattern } from '@nestjs/microservices';
import { RepositoryService } from './repository.service';
import get_random from '../helper/array-random.helper';
import { BidsEvent } from './../enum/event.enum';
@Controller()
export class RepositoryController {
  constructor(
    private readonly repositoryService: RepositoryService,
    @Inject('EVENT_QUEUE_SERVICE')
    private readonly eventQueueClient: ClientProxy,
  ) {}

  @Get()
  getHello(): string {
    return this.repositoryService.getHello();
  }

  @EventPattern('event')
  async hello(data: string) {
    console.log(`Data from bids service: ${data}`);
    const EVENT_NOTIFIER = [
      'publish-notification',
      'close-notification',
      'offer-notification',
    ];
    const randomEvent = get_random(EVENT_NOTIFIER);
    this.eventQueueClient.emit(randomEvent, data);
    return;
  }
}
