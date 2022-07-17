import { HttpModule, HttpService } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ClientController } from './monitoring.controller';
import { ClientService } from './monitoring.service';

@Module({
  imports: [HttpModule],
  controllers: [ClientController],
  providers: [ClientService],
})
export class ClientModule {}