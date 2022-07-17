import {
    Body,
    Controller,
    Get,
    Param,
    ParseArrayPipe,
    Post,
    Put,
    Query,
    Res
  } from '@nestjs/common';
  import { ClientService } from './monitoring.service';
  import { Response } from 'express';

  @Controller()
  export class ClientController {
    constructor(private readonly clientService: ClientService) {}
    @Get("/")
    async getReport() {
        console.log("RECIBI PEDIDO DE GETREPORT")
        return "hola"
      }
  }