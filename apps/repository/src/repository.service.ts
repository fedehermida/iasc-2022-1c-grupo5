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
    var buyers = await this.buyers.filter(buyer => newBid["tags"].filter(bid=>buyer["tags"].includes(bid)).length>0)
    var ips = await buyers.map(buyer =>  buyer["ip"])
    this.eventQueueClient.emit('publish-notification', {"bid":{"id": newBid.id,"basePrice": newBid.basePrice, "duration":newBid.duration, "item": newBid.item}, "ip":ips});
    return { bid: newBid };
  }

  async cancelBid(id: string) {
    this.bids = this.bids.map((bid) => {
      if (bid.id === id) {
        return { ...bid, state: BidState.CANCELED };
      }
      return bid;
    });
    var bid= this.bids.filter(bid => bid["id"] == id)[0]
    var offer_ip = await bid["offers"].map(offer => offer["ip"])
    this.eventQueueClient.emit('close-notification', {"bid": id, ip: offer_ip});

    return await this.getBid(id);
  }

  async registerOffer(id: string, offer: Offer) {
    const bid = await this.getBid(id);
    if (bid) {
      bid.offers.push(offer);
    }
    var offer_ip = await bid["offers"].map(offer => offer["ip"])
    this.eventQueueClient.emit('offer-notification', {"bid": {"id":bid.id, "offer": offer}, ip:offer_ip});

    return bid;
  }
}
