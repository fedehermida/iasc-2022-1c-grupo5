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
  events: String[] = []

  @Post('/register/buyer')
  async registerBuyer(
    @Query('tags', new ParseArrayPipe({ items: String, separator: ',' }))
    tags: string[],
  ) {
    console.log("RECIBI PEDIDO DE REGISTRO A TAGS")
    const res = await this.clientService.register(tags);
    console.log("RESPUESTA")
    console.log(JSON.stringify(res))
    this.events.push("RECIBI PEDIDO DE REGISTRO A TAGS: " + JSON.stringify(res))
  }

  @Put('/offer/:id')
  async registerOffer(@Param('id') id: string) {
    console.log("RECIBI PEDIDO DE REGISTRO A OFERTA")
    this.clientService.registerOffer(id);
    this.events.push("RECIBI PEDIDO DE REGISTRO A OFERTA: "+id)
  }

  @Post('/event')
  async bidsHook(@Body() event: any) {
    console.log("Recibi un evento")
    console.log(JSON.stringify(event))
    this.events.push("Recibi un evento: "+ JSON.stringify(event))
    //if (event.type === 'bid_created') {
    //  this.clientService.newBid(event.bid);
     // setTimeout(() => {
     //   this.clientService.registerOffer(event.bid.id);
    //  }, Math.round(Math.random() * 5000));
    //}
  }

  // Tiene hooks para ciertos eventos
  // nueva subasta
  // nueva oferta en subasta
  // se termino la subasta (resultado)
  // se cancelo la subasta
}
