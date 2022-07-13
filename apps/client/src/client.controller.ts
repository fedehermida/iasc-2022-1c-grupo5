import {
  Body,
  Controller,
  Get,
  Param,
  ParseArrayPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ClientService } from './client.service';

@Controller()
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get('/register')
  async registerBuyer(
    @Query('tags', new ParseArrayPipe({ items: String, separator: ',' }))
    tags: string[],
  ) {
    const res = await this.clientService.register(tags);
    if (res.bids.length !== 0) {
      this.clientService.registerOffer(res.bids[0].id);
    }
  }

  @Post('/event')
  async bidsHook(@Body() event: any) {
    console.log(event);
    if (event.type === 'bid_created') {
      setTimeout(() => {
        this.clientService.registerOffer(event.bid.id);
      }, Math.round(Math.random() * 5000));
    }
  }

  // Tiene hooks para ciertos eventos
  // nueva subasta
  // nueva oferta en subasta
  // se termino la subasta (resultado)
  // se cancelo la subasta
}
