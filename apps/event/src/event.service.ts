import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { Message } from '../../repository/src/raft/raft.types';

@Injectable()
export class EventService {
  constructor(private readonly httpService: HttpService) {}

  getHello(): string {
    return 'Hello World from Repository Service!';
  }

  async publishNotification(
    bid: JSON,
    ip: string,
    event: string,
  ): Promise<any> {
    console.log(`${ip}/event`);
    try {
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
    } catch (error) {
      console.log(error);
    }
  }
}
