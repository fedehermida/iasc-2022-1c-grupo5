import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class EventService {
  constructor(private readonly httpService: HttpService) {}

  getHello(): string {
    return 'Hello World from Repository Service!';
  }


   async publishNotification(bid: JSON, ip: String, event:String): Promise<String> {
    console.log(`${ip}/event`)
    const response = await this.httpService.post(`${ip}/event`,
       {'data':bid,
        'event': event 
      }, {
      headers: {
      'Content-Type': 'application/json'
      }
    });
    const data = (await lastValueFrom(response)).data;
    console.log(data)
    return 'Hello World from Event Service!';
  }
}
