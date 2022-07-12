import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/event-health')
  async getEventHello(): Promise<string> {
    return await this.appService.getEventHealth();
  }

  @Get('/subscriber-health')
  async getSubscriberHello(): Promise<string> {
    return await this.appService.getSubscriberHealth();
  }

  @Get('/queue-health')
  async getQueueHello(): Promise<string> {
    return await this.appService.getQueueHealth();
  }

  @Get('/repository-health')
  async getRepositoryHello(): Promise<string> {
    return await this.appService.getRepositoryHealth();
  }
}
