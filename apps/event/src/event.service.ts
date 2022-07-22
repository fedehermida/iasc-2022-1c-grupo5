import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';

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
    return await lastValueFrom(
      this.httpService.post(
        `${ip}/event`,
        { data: bid, event: event },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    );
  }
}
