import { HttpModule, HttpService } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';

@Module({
  imports: [HttpModule],
  controllers: [ClientController],
  providers: [ClientService],
})
export class ClientModule {}
