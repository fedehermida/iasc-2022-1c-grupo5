import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class ClientService {
  private ip = `http://${process.env.SERVICE_NAME}:${process.env.PORT}`;

  constructor(private readonly httpService: HttpService) {}

  async register(tags: string[]) {
    const a = await this.httpService.post(
      `http://${process.env.BIDS_SERVICE}:3000/buyers`,
      {
        name: process.env.CLIENT_NAME,
        ip: this.ip,
        tags,
      },
      { headers: { 'Content-Type': 'application/json' } },
    );
    const data = (await lastValueFrom(a)).data;
    return data;
  }

  async registerOffer(id: string, price: number) {
    const data = await lastValueFrom(
      this.httpService.put(`http://${process.env.BIDS_SERVICE}:3000/bids/${id}`, {
        ip: this.ip,
        price,
      }),
    ).then((res) => {
      console.log(res.data);
      return res;
    });
    return data;
  }
}
