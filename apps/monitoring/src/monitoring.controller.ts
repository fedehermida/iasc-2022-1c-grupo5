import {
    Body,
    Controller,
    Get,
    Param,
    ParseArrayPipe,
    Post,
    Put,
    Query,
    Req,
    Res,
    Render
  } from '@nestjs/common';
  import { ClientService } from './monitoring.service';
  
  @Controller()
  export class ClientController {
    constructor(private readonly clientService: ClientService) {}
    @Get("/service")
    @Render("index")
    getService() {
        return {};
      }
    @Get("/bids")
    @Render("index")
    getBids() {
      return {};
    }
  }