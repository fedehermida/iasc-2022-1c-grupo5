import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';

const names = {
  '3001': 'Alice',
  '3002': 'Bob',
  '3003': 'Charlie',
};

const BIDS_SERVICE = `http://127.0.0.1:3000`;
@Injectable()
export class ClientService {
  ip = `http://127.0.0.1:${process.env.PORT}`;

  constructor(private readonly httpService: HttpService) {}

  async register(tags: string[]) {
    const a = await this.httpService.post(
      `${BIDS_SERVICE}/buyers`,
      {
        name: names[process.env.PORT],
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
}
