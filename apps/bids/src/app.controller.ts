import {
  Body,
  Controller,
  Delete,
  Get, Param,
  Post,
  Put
} from '@nestjs/common';
import { AppService } from './app.service';
import { CreateBidDto, CreateBuyerDto, CreateOfferDto } from './dto';
import { BidState } from './types';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/buyers')
  async registerBuyer(@Body() buyer: CreateBuyerDto) {
    console.log('POST /buyers');
    return await this.appService.registerBuyer(buyer);
  }

  @Post('/bids')
  async createBid(@Body() bid: CreateBidDto) {
    console.log('POST /bids');
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
