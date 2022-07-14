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

  async getBid(id: string) {
    return await this.bids.find((bid) => bid.id === id);
  }

  async getBidsByTags(tags: string[]) {
    return await this.buyers.filter((buyer) => {
      return buyer.tags.some((tag) => tags.includes(tag));
    });
  }

  async createBuyer(buyer: Buyer) {
    await this.buyers.push(buyer);
    return buyer;
  }

  async createBid(bid: Omit<Bid, 'id' | 'offers' | 'state'>) {
    const newBid = { ...bid, id: uuidv4(), state: BidState.OPEN, offers: [] };
    await this.bids.push(newBid);
    console.log(newBid);
    return { bid: newBid };
  }

  async cancelBid(id: string) {
    this.bids = this.bids.map((bid) => {
      if (bid.id === id) {
        return { ...bid, state: BidState.CANCELED };
      }
      return bid;
    });
    return await this.getBid(id);
  }

  async registerOffer(id: string, offer: Offer) {
    const bid = await this.getBid(id);
    if (bid) {
      bid.offers.push(offer);
    }
    return bid;
  }
}
