import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class AppService {
  constructor(private readonly httpService: HttpService) {}

  getHello(): string {
    return 'Hello World from bids!';
  }

  async getEventHealth(): Promise<string> {
    const pingRepository = await lastValueFrom(
      this.httpService.get<string>(`${process.env.EVENT_URL}`),
    );
    return await pingRepository.data;
  }

  async getQueueHealth(): Promise<string> {
    const pingRepository = await lastValueFrom(
      this.httpService.get<string>(`${process.env.QUEUE_URL}`),
    );
    return await pingRepository.data;
  }

  async getRepositoryHealth(): Promise<string> {
    const pingRepository = await lastValueFrom(
      this.httpService.get<string>(`${process.env.REPOSITORY_URL}`),
    );
    return await pingRepository.data;
  }

  async getSubscriberHealth(): Promise<string> {
    const pingRepository = await lastValueFrom(
      this.httpService.get<string>(`${process.env.SUBSCRIBER_URL}`),
    );
    return await pingRepository.data;
  }
}
