import {
  Body,
  Controller,
  Get,
  Param,
  ParseArrayPipe,
  ParseFloatPipe,
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
    console.log('RECIBI PEDIDO DE REGISTRO A TAGS');
    const res = await this.clientService.register(tags);
    console.log('RESPUESTA');
    console.log(JSON.stringify(res));
    return res;
  }

  @Put('/offer/:id')
  async registerOffer(
    @Param('id') id: string,
    @Body('price', new ParseFloatPipe()) price: number,
  ) {
    return await this.clientService.registerOffer(id, price);
  }

  @Post('/event')
  async bidsHook(@Body() event: any) {
    console.log('Recibi un evento');
    console.log(JSON.stringify(event));
    return;
  }
}
