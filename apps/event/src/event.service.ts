import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';
import { Observable } from 'rxjs';

@Injectable()
export class EventService {
  constructor(private readonly httpService: HttpService) {}

  getHello(): string {
    return 'Hello World from Repository Service!';
  }

  async publishNotification(
    bid: JSON,
    ip: String,
    event: String,
  ): Promise<any> {
    console.log(`${ip}/event`);
    return this.httpService.post(
      `${ip}/event`,
      { data: bid, event: event },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
  }
}
