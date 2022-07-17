import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';
import { ClientGateway } from './client.gateway';

const names = {
  '3001': 'Alice',
  '3002': 'Bob',
  '3003': 'Charlie',
};

const BIDS_SERVICE = `http://host.docker.internal:6004`;
@Injectable()
export class ClientService {
  ip = `http://host.docker.internal:${process.env.PORT || 8080}`;

  constructor(
    private readonly httpService: HttpService,
    private readonly clientGateway: ClientGateway,
  ) {}

  async register(tags: string[]) {
    const a = await this.httpService.post(
      `${BIDS_SERVICE}/buyers`,
      {
        name: this.ip,
        ip: this.ip,
        tags,
      },
      { headers: { 'Content-Type': 'application/json' } },
    );
    const data = (await lastValueFrom(a)).data;
    return data;
  }

  async registerOffer(id) {
    const data = await lastValueFrom(
      this.httpService.put(`${BIDS_SERVICE}/bids/${id}`, {
        ip: this.ip,
        price: Math.round(Math.random() * 5000),
      }),
    );
  }

  async newBid(bid) {
    this.clientGateway.server.emit('bid_created', bid);
  }
}
