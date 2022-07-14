import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AppService } from './app.service';
import { CreateBidDto, CreateBuyerDto, CreateOfferDto } from './dto';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject('BIDS_QUEUE_SERVICE') private readonly bidsQueueClient: ClientProxy,
  ) {}

  @Get('/health')
  bidsHealth(): string {
    return this.appService.getHello();
  }

  @Get('/message/:id')
  sendMessage(@Param('id') message: string) {
    this.bidsQueueClient.emit('event', message);
  }

  @Post('/buyers')
  async registerBuyer(@Body() buyer: CreateBuyerDto) {
    console.log('POST /buyers');
    console.log({ buyer });
  }

  @Post('/bids')
  async createBid(@Body() bid: CreateBidDto) {
    console.log('POST /bids');
    console.log({ bid });
  }

  @Delete('/bids/:id')
  async deleteBid(@Param('id') id: string) {
    console.log('DELETE /bids/:id');
    console.log({ id });
  }

  @Put('/bids/:id')
  async registerOffer(@Param('id') id: string, @Body() offer: CreateOfferDto) {
    console.log('PUT /bids/:id');
    console.log({ id, offer });
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
