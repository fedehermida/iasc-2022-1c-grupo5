import { CreateBidDto, CreateBuyerDto, CreateOfferDto } from '@iasc/types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/buyers')
  async getBuyers() {
    return await this.appService.getBuyers();
  }

  @Get('/bids')
  async getBids() {
    return await this.appService.getBids();
  }

  @Get('/log')
  async getLog() {
    return await this.appService.getLog();
  }

  /* * */

  @Post('/buyers')
  async registerBuyer(@Body() buyer: CreateBuyerDto) {
    return await this.appService.registerBuyer(buyer);
  }

  @Post('/bids')
  async createBid(@Body() bid: CreateBidDto) {
    return await this.appService.createBid(bid);
  }

  @Delete('/bids/:id')
  async deleteBid(@Param('id') id: string) {
    return await this.appService.cancelBid(id);
  }

  @Put('/bids/:id')
  async registerOffer(@Param('id') id: string, @Body() offer: CreateOfferDto) {
    return await this.appService.registerOffer(id, offer);
  }
}
