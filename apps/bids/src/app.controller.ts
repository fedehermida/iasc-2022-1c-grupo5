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
import { BidState } from './types';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    @Inject('BIDS_QUEUE_SERVICE') private readonly bidsQueueClient: ClientProxy,
  ) {}

  @Get('/message/:id')
  sendMessage(@Param('id') message: string) {
    this.bidsQueueClient.emit('event', message);
  }

  @Post('/buyers')
  async registerBuyer(@Body() buyer: CreateBuyerDto) {
    console.log('POST /buyers');
    // console.log({ buyer });
    return await this.appService.registerBuyer(buyer);
  }

  @Post('/bids')
  async createBid(@Body() bid: CreateBidDto) {
    console.log('POST /bids');
    // console.log({ bid });
    return await this.appService.createBid({ ...bid, state: BidState.OPEN });
  }

  @Delete('/bids/:id')
  async deleteBid(@Param('id') id: string) {
    console.log(`DELETE /bids/${id}`);
    return await this.appService.cancelBid(id);
  }

  @Put('/bids/:id')
  async registerOffer(@Param('id') id: string, @Body() offer: CreateOfferDto) {
    console.log(`PUT /bids/${id}`);
    // console.log({ offer });
    return await this.appService.registerOffer(id, offer);
  }

  /* HEALTH */

  @Get('/health')
  bidsHealth(): string {
    return this.appService.getHello();
  }

  @Get('/event-health')
  async getEventHello(): Promise<string> {
    return await this.appService.getEventHealth();
  }

  @Get('/repository-health')
  async getRepositoryHello(): Promise<string> {
    return await this.appService.getRepositoryHealth();
  }
}
