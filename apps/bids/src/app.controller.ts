import {
  Body,
  Controller,
  Delete, Param,
  Post,
  Put
} from '@nestjs/common';
import { AppService } from './app.service';
import { CreateBidDto, CreateBuyerDto, CreateOfferDto } from './dto';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post('/buyers')
  async registerBuyer(@Body() buyer: CreateBuyerDto) {
    console.log('POST /buyers');
    console.log({ buyer });
    return await this.appService.registerBuyer(buyer);
  }

  @Post('/bids')
  async createBid(@Body() bid: CreateBidDto) {
    console.log('POST /bids');
    console.log({ bid });
    return await this.appService.createBid(bid);
  }

  @Delete('/bids/:id')
  async deleteBid(@Param('id') id: string) {
    console.log('DELETE /bids/:id');
    console.log({ id });
    return await this.appService.deleteBid(id);
  }

  @Put('/bids/:id')
  async registerOffer(@Param('id') id: string, @Body() offer: CreateOfferDto) {
    console.log('PUT /bids/:id');
    console.log({ id, offer });
    return await this.appService.registerOffer(id, offer);
  }
}
