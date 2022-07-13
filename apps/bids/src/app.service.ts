import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { Bid, BidState, Buyer, Offer } from './types';

import { lastValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
;

type Event =
  | { type: 'bid_created'; bid: Bid }
  | { type: 'bid_deleted'; bid: Bid }
  | { type: 'bid_offer'; bid: Bid; offer: Offer }
  | { type: 'bid_ended'; bid: Bid };

@Injectable()
export class AppService {
  constructor(private readonly httpService: HttpService) {}

  buyers: Buyer[] = [];
  bids: Bid[] = [];

  async handleEvent(event: Event) {
    const bid = await this.getBid(event.bid.id);
    switch (event.type) {
      case 'bid_created': {
        this.buyers
          .filter((buyer) => buyer.tags.some((tag) => bid.tags.includes(tag)))
          .forEach((buyer) => {
            lastValueFrom(this.httpService.post(`${buyer.ip}/event`, event))
              .then((res) => {
                console.log(`${buyer.name} has been notified about ${bid.id}`);
              })
              .catch((err) => console.log(err));
          });
        break;
      }
      case 'bid_deleted': {
        this.getBiddersForBid(bid.id).then((bidders) => {
          bidders.forEach((buyer) => {
            lastValueFrom(this.httpService.post(`${buyer.ip}/event`, event))
              .then((res) => {
                console.log(
                  `${buyer.name} has been notified about ${bid.id} deletion`,
                );
              })
              .catch((err) => console.log(err));
          });
        });
        break;
      }
      case 'bid_offer': {
        this.getBiddersForBid(bid.id).then((bidders) => {
          bidders
            .filter((buyer) => buyer.ip !== event.offer.ip)
            .forEach((buyer) => {
              lastValueFrom(this.httpService.post(`${buyer.ip}/event`, event))
                .then((res) => {
                  console.log(
                    `${buyer.name} has been notified about ${bid.id} offer`,
                  );
                })
                .catch((err) => console.log(err));
            });
        });
        break;
      }
      case 'bid_ended': {
        const winnerOffer = bid.offers.reduce((prev, curr) => {
          if (prev === undefined) {
            return curr;
          } else {
            return prev.price > curr.price ? prev : curr;
          }
        }, undefined as Offer | undefined);
        if (winnerOffer) {
          this.getBiddersForBid(bid.id).then((bidders) => {
            bidders.forEach((buyer) => {
              if (buyer.ip === winnerOffer.ip) {
                lastValueFrom(
                  this.httpService.post(`${buyer.ip}/event`, {
                    type: 'bid_won',
                    bid,
                  }),
                )
                  .then((res) => {
                    console.log(`${buyer.name} has won ${bid.id}`);
                  })
                  .catch((err) => console.log(err));
              } else {
                lastValueFrom(
                  this.httpService.post(`${buyer.ip}/event`, {
                    type: 'bid_lost',
                    bid,
                  }),
                )
                  .then((res) => {
                    console.log(`${buyer.name} has lost ${bid.id}`);
                  })
                  .catch((err) => console.log(err));
              }
            });
          });
        } else {
          this.getBiddersForBid(bid.id).then((bidders) => {
            bidders.forEach((buyer) => {
              console.log(
                `${buyer.name} has been notified about ${bid.id}, noone won`,
              );
            });
          });
        }
        break;
      }
    }
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

  async registerBuyer(buyer: Buyer) {
    this.buyers.push(buyer);
    console.log(`${buyer.name} has been registered`);

    const bids = await this.getBidsByTags(buyer.tags);

    await lastValueFrom(
      this.httpService.post(`${buyer.ip}/event`, {
        type: 'bids_available',
        bids,
      }),
    );

    // devuelve las subastas que le interesan a este comprador
    return { buyer, bids };
  }

  async createBid(bid: Omit<Bid, 'id' | 'offers'>) {
    // repository
    const newBid = { ...bid, id: uuidv4(), offers: [] };
    this.bids.push(newBid);

    // event
    this.handleEvent({ type: 'bid_created', bid: newBid });

    setTimeout(() => {
      this.endBid(newBid.id);
    }, newBid.duration);

    return newBid;
  }

  async endBid(id: string) {
    // repository
    const bid = await this.getBid(id);
    this.bids = this.bids.map((bid) =>
      bid.id === id ? { ...bid, state: BidState.ENDED } : bid,
    );

    // event
    this.handleEvent({
      type: 'bid_ended',
      bid,
    });

    console.log(`bid: ${id} has ended`);
  }

  async registerOffer(id: string, offer: Offer) {
    // repository
    const bid = await this.getBid(id);
    bid.offers.push(offer);

    // event
    this.handleEvent({
      type: 'bid_offer',
      bid,
      offer,
    });

    console.log(`${offer.ip} has offered ${offer.price}`);
  }

  async deleteBid(id: string) {
    // repository
    const bid = await this.getBid(id);
    this.bids = this.bids.map((bid) =>
      bid.id === id ? { ...bid, state: BidState.CANCELED } : bid,
    );

    // event
    this.handleEvent({
      type: 'bid_deleted',
      bid,
    });
  }
  
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
