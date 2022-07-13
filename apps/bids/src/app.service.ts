import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { Bid, BidState, Buyer, Offer } from './types';

import { ClientRedis } from '@nestjs/microservices';
import { firstValueFrom, lastValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';

type BidEvent =
  | { type: 'bid_created'; bid: Bid }
  | { type: 'bid_canceled'; bid: Bid }
  | { type: 'bid_offer'; bid: Bid; offer: Offer }
  | { type: 'bid_ended'; bid: Bid };

@Injectable()
export class AppService {
  constructor(
    private readonly httpService: HttpService,
    @Inject('REPOSITORY_CLIENT') private readonly repositoryClient: ClientRedis,
  ) {}

  buyers: Buyer[] = [];
  bids: Bid[] = [];

  async handleBidEvent(event: BidEvent) {
    const bid = event.bid;
    const buyers = await this.getBuyersForTags(bid.tags);
    switch (event.type) {
      case 'bid_created':
      case 'bid_canceled': {
        buyers.forEach((buyer) => {
          lastValueFrom(this.httpService.post(`${buyer.ip}/event`, event));
        });
        break;
      }
      case 'bid_ended': {
        const winnerOffer = bid.offers.reduce((prev, curr) => {
          return prev !== undefined && prev.price > curr.price ? prev : curr;
        }, undefined as Offer | undefined);
        if (winnerOffer !== undefined) {
          buyers.forEach((buyer) => {
            if (buyer.ip === winnerOffer.ip) {
              lastValueFrom(
                this.httpService.post(`${buyer.ip}/event`, {
                  type: 'bid_won',
                  bid,
                }),
              );
            } else {
              lastValueFrom(
                this.httpService.post(`${buyer.ip}/event`, {
                  type: 'bid_lost',
                  bid,
                }),
              );
            }
          });
        } else {
          buyers.forEach((buyer) => {
            lastValueFrom(
              this.httpService.post(`${buyer.ip}/event`, {
                type: 'no_one_won',
                bid,
              }),
            );
          });
        }
        break;
      }
      case 'bid_offer': {
        buyers
          .filter((buyer) => buyer.ip !== event.offer.ip)
          .forEach((buyer) => {
            lastValueFrom(this.httpService.post(`${buyer.ip}/event`, event));
          });

        const offerer = buyers.find((buyer) => buyer.ip === event.offer.ip);
        if (offerer !== undefined) {
          lastValueFrom(
            this.httpService.post(`${offerer.ip}/event`, {
              type: 'bid_offer_accepted',
              bid,
              offer: event.offer,
            }),
          );
        }
        break;
      }
    }
  }

  async getBuyersForTags(tags: string[]) {
    return await this.buyers.filter((buyer) => {
      return buyer.tags.some((tag) => tags.includes(tag));
    });
  }

  async getBiddersForBid(bidId: string) {
    const bid = await this.getBid(bidId);
    const biddersIps = new Set(bid.offers.map((offer) => offer.ip));
    return Array.from(biddersIps).map((ip) =>
      this.buyers.find((buyer) => buyer.ip === ip),
    );
  }

  async getBidsByTags(tags: string[]) {
    return this.bids.filter(
      (bid) =>
        bid.tags.some((tag) => tags.includes(tag)) &&
        bid.state === BidState.OPEN,
    );
  }

  async getBid(id: string) {
    const bid = this.bids.find((bid) => bid.id === id);
    if (bid !== undefined) {
      return bid;
    } else {
      throw new Error(`Bid with id ${id} not found`);
    }
  }

  /* *** */

  async registerBuyer(buyer: Buyer) {
    // así se lo manda al servicio repositorio
    // firstValueFrom(
    //   this.repositoryClient.send({ cmd: 'registerBuyer' }, { buyer }),
    // )
    //   .then((res) => {
    //     console.log(res);
    //   })
    //   .catch((err) => console.log(err));

    this.buyers.push(buyer);

    const bids = await this.getBidsByTags(buyer.tags);

    // devuelve las subastas que le interesan a este comprador
    return { buyer, bids };
  }

  async createBid(bid: Omit<Bid, 'id' | 'offers'>) {
    // repository
    const newBid = { ...bid, id: uuidv4(), offers: [] };
    this.bids.push(newBid);

    setTimeout(() => {
      this.endBid(newBid.id);
    }, newBid.duration);

    this.handleBidEvent({ type: 'bid_created', bid: newBid });
    return newBid;
  }

  async endBid(id: string) {
    // repository
    const bid = await this.getBid(id);
    this.bids = this.bids.map((bid) =>
      bid.id === id ? { ...bid, state: BidState.ENDED } : bid,
    );

    // event bid ended
    this.handleBidEvent({ type: 'bid_ended', bid });
  }

  async registerOffer(id: string, offer: Offer) {
    // repository
    const bid = await this.getBid(id);
    bid.offers.push(offer);

    // event bid offer
    this.handleBidEvent({ type: 'bid_offer', bid, offer });
  }

  async cancelBid(id: string) {
    // repository
    const bid = await this.getBid(id);
    this.bids = this.bids.map((bid) =>
      bid.id === id ? { ...bid, state: BidState.CANCELED } : bid,
    );

    // event bid_canceled
    this.handleBidEvent({ type: 'bid_canceled', bid });
  }

  /* HEALTH */

  getHello(): string {
    return 'Hello World from bids!';
  }

  async getEventHealth(): Promise<string> {
    const pingRepository = await lastValueFrom(
      this.httpService.get<string>(`${process.env.EVENT_URL}`),
    );
    return await pingRepository.data;
  }

  async getQueueHealth(): Promise<string> {
    const pingRepository = await lastValueFrom(
      this.httpService.get<string>(`${process.env.QUEUE_URL}`),
    );
    return await pingRepository.data;
  }

  async getRepositoryHealth(): Promise<string> {
    const pingRepository = await lastValueFrom(
      this.httpService.get<string>(`${process.env.REPOSITORY_URL}`),
    );
    return await pingRepository.data;
  }

  async getSubscriberHealth(): Promise<string> {
    const pingRepository = await lastValueFrom(
      this.httpService.get<string>(`${process.env.SUBSCRIBER_URL}`),
    );
    return await pingRepository.data;
  }
}
