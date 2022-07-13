import { HttpModule, HttpService } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ClientController } from './client.controller';
import { ClientGateway } from './client.gateway';
import { ClientService } from './client.service';

@Module({
  imports: [HttpModule],
  controllers: [ClientController],
  providers: [ClientService, ClientGateway],
})
export class ClientModule {}
