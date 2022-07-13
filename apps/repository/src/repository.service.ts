import { Injectable } from '@nestjs/common';
import { Bid, BidState, Buyer, Offer } from './types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RepositoryService {
  bids: Bid[] = [];
  buyers: Buyer[] = [];

  getHello(): string {
    return 'Hello World from Repository Service!';
  }

  getBid(id: string) {
    return this.bids.find((bid) => bid.id === id);
  }

  getBidsByTags(tags: string[]) {
    return this.buyers.filter((buyer) => {
      return buyer.tags.some((tag) => tags.includes(tag));
    });
  }

  createBuyer(buyer: Buyer) {
    this.buyers.push(buyer);

    const bids = this.getBidsByTags(buyer.tags);

    return { buyer, bids };
  }

  createBid(bid: Omit<Bid, 'id' | 'offers' | 'state'>) {
    const newBid = { ...bid, id: uuidv4(), state: BidState.OPEN, offers: [] };
    this.bids.push(newBid);
    return { bid: newBid };
  }

  createOffer(id: string, offer: Offer) {
    const bid = this.getBid(id);
    if (bid) {
      bid.offers.push(offer);
    }
  }
}
