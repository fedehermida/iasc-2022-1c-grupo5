import { Inject, Injectable } from '@nestjs/common';
import { Bid, BidState, Buyer, Offer } from './types';
import { v4 as uuidv4 } from 'uuid';
import { ClientProxy } from '@nestjs/microservices';

@Injectable()
export class RepositoryService {
  bids: Bid[] = [];
  buyers: Buyer[] = [];

  constructor(
    @Inject('EVENT_QUEUE_SERVICE')
    private readonly eventQueueClient: ClientProxy,
  ) {}

  getHello(): string {
    return 'Hello World from Repository Service!';
  }

  async getBid(id: string) {
    return await this.bids.find((bid) => bid.id === id);
  }

  async getBidsByTags(tags: string[]) {
    return await this.bids.filter((bid) => {
      return bid.tags.some((tag) => tags.includes(tag));
    });
  }

  async createBuyer(buyer: Buyer) {
    await this.buyers.push(buyer);
    return buyer;
  }

  async createBid(bid: Omit<Bid, 'id' | 'offers' | 'state'>) {
    const newBid = { ...bid, id: uuidv4(), state: BidState.OPEN, offers: [] };
    await this.bids.push(newBid);

    this.eventQueueClient.emit('publish-notification', newBid.id);

    return { bid: newBid };
  }

  async cancelBid(id: string) {
    this.bids = this.bids.map((bid) => {
      if (bid.id === id) {
        return { ...bid, state: BidState.CANCELED };
      }
      return bid;
    });

    this.eventQueueClient.emit('close-notification', id);

    return await this.getBid(id);
  }

  async registerOffer(id: string, offer: Offer) {
    const bid = await this.getBid(id);
    if (bid) {
      bid.offers.push(offer);
    }

    this.eventQueueClient.emit('offer-notification', bid.id);

    return bid;
  }
}
