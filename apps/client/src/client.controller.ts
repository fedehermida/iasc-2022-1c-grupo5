import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ClientService } from './client.service';

@Controller()
export class ClientController {
  constructor(private readonly clientService: ClientService) {}

  @Get('/register')
  async registerBuyer() {
    return await this.clientService.register();
  }

  @Post('/event')
  async bidsHook(@Body() event: any) {
    if (event.type === 'bids_available' && event.bids.length > 0) {
      const firstBidId = event.bids[0].id;
      setTimeout(() => {
        this.clientService.registerOffer(firstBidId);
      }, Math.round(Math.random() * 5000));
    }
    if (event.type === 'bid_created') {
      setTimeout(() => {
        this.clientService.registerOffer(event.bid.id);
      }, Math.round(Math.random() * 5000));
    }
    console.log(event);
  }

  // Tiene hooks para ciertos eventos
  // nueva subasta
  // nueva oferta en subasta
  // se termino la subasta (resultado)
  // se cancelo la subasta
}
