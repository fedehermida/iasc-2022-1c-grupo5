import { Injectable } from '@nestjs/common';

@Injectable()
export class SubscriberService {
  getHello(): string {
    return 'Hello World!';
  }
}
