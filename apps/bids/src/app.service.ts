import { Injectable } from '@nestjs/common';
import { Bid, Buyer, Offer } from './types';

import { v4 as uuidv4 } from 'uuid';

type Event =
  | { type: 'bid_created'; bid: Bid }
  | { type: 'bid_deleted'; bid: Bid }
  | { type: 'bid_offer'; bid: Bid; offer: Offer }
  | { type: 'bid_ended'; bid: Bid };

@Injectable()
export class AppService {
  buyers: Buyer[] = [];
  bids: Bid[] = [];

  async handleEvent(event: Event) {
    const bid = await this.getBid(event.bid.id);
    switch (event.type) {
      case 'bid_created': {
        this.buyers
          .filter((buyer) => buyer.tags.some((tag) => bid.tags.includes(tag)))
          .forEach((buyer) => {
            console.log(`${buyer.name} has been notified about ${bid.id}`);
          });
        break;
      }
      case 'bid_deleted': {
        this.getBiddersForBid(bid.id).then((bidders) => {
          bidders.forEach((buyer) => {
            console.log(
              `${buyer.name} has been notified about ${bid.id} deletion`,
            );
          });
        });
        break;
      }
      case 'bid_offer': {
        this.getBiddersForBid(bid.id).then((bidders) => {
          bidders
            .filter((buyer) => buyer.ip !== event.offer.ip)
            .forEach((buyer) => {
              console.log(
                `${buyer.name} has been notified about ${bid.id} offer`,
              );
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
                console.log(`${buyer.name} has won ${bid.id}`);
              } else {
                console.log(
                  `${buyer.name} has lost ${bid.id}, ${winnerOffer.ip} won`,
                );
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
    return this.bids.filter((bid) =>
      bid.tags.some((tag) => tags.includes(tag)),
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
    await this.getBidsByTags(buyer.tags).then((bids) => {
      bids.forEach((bid) => {
        console.log(`${buyer.name} has been notified about ${bid.id}`);
      });
    });
    return buyer;
  }

  async createBid(bid: Omit<Bid, 'id' | 'offers'>) {
    const newBid = { ...bid, id: uuidv4(), offers: [] };
    this.bids.push(newBid);
    this.handleEvent({
      type: 'bid_created',
      bid: newBid,
    });
    setTimeout(() => {
      this.endBid(newBid.id);
    }, newBid.duration);
    return newBid;
  }

  async endBid(id: string) {
    const bid = await this.getBid(id);
    this.handleEvent({
      type: 'bid_ended',
      bid,
    });
    console.log(`bid: ${id} has ended`);
  }

  async registerOffer(id: string, offer: Offer) {
    const bid = await this.getBid(id);
    this.handleEvent({
      type: 'bid_offer',
      bid,
      offer,
    });
    bid.offers.push(offer);
    console.log(`${offer.ip} has offered ${offer.price}`);
  }

  async deleteBid(id: string) {
    const bid = await this.getBid(id);
    this.handleEvent({
      type: 'bid_deleted',
      bid,
    });
    this.bids = this.bids.filter((bid) => bid.id !== id);
  }
}
