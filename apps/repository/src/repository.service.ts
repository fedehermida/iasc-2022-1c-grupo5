import { Bid, BidState, Buyer, Offer } from '@iasc/types';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';

type BidCondition = (bid: Bid) => boolean;

const bidHasTags =
  (tags: string[]): BidCondition =>
  ({ tags: bidTags }) =>
    tags.some((tag) => bidTags.includes(tag));

const bidStateIs =
  (state: BidState): BidCondition =>
  ({ state: bidState }) =>
    bidState === state;

@Injectable()
export class RepositoryService {
  bids: Bid[] = [];
  buyers: Buyer[] = [];

  constructor(
    @Inject('EVENT_QUEUE_SERVICE')
    private readonly eventQueueClient: ClientProxy,
  ) {}

  async findBidsByConditions(...conditions: BidCondition[]) {
    return this.bids.filter((bid) =>
      conditions.every((condition) => condition(bid)),
    );
  }

  /* BUYERS */

  async createBuyer(buyer: Buyer) {
    await this.buyers.push(buyer);
    return buyer;
  }

  async findBuyerById(ip: string) {
    return await this.buyers.find((buyer) => buyer.ip === ip);
  }

  async findAllBuyers() {
    return await this.buyers;
  }

  /* BIDS */

  async createBid(bid: Omit<Bid, 'id' | 'offers' | 'state'>) {
    const newBid = { ...bid, id: uuidv4(), state: BidState.OPEN, offers: [] };
    await this.bids.push(newBid);

    this.eventQueueClient.emit('bid-created', newBid.id);

    return newBid;
  }

  async findAllBids() {
    return await this.bids;
  }

  async findBidById(id: string) {
    return await this.bids.find((bid) => bid.id === id);
  }

  async findBidsByTags(tags: string[]) {
    return await this.findBidsByConditions(bidHasTags(tags));
  }

  async findBidsByState(state: BidState) {
    return await this.findBidsByConditions(bidStateIs(state));
  }

  async findOpenBidsForTags(tags: string[]) {
    return await this.findBidsByConditions(
      bidStateIs(BidState.OPEN),
      bidHasTags(tags),
    );
  }

  async getCurrentBidPrice(id: string) {
    const bid = await this.findBidById(id);
    if (bid) {
      const biggestOffer = await this.findBiggestOffer(id);
      return biggestOffer ? biggestOffer.price : bid.basePrice;
    }
  }

  async findBiggestOffer(id: string) {
    const bid = await this.findBidById(id);
    if (bid && bid.offers.length > 0) {
      return bid.offers.reduce((biggest, offer) =>
        offer.price > biggest.price ? offer : biggest,
      );
    }
  }

  async updateBid(id: string, bid: Partial<Bid>) {
    const updatedBid = { ...(await this.findBidById(id)), ...bid };
    this.bids = this.bids.map((b) => (b.id === id ? updatedBid : b));
    return updatedBid;
  }

  /* * */

  async cancelBid(id: string) {
    await this.updateBid(id, { state: BidState.CANCELED });

    this.eventQueueClient.emit('bid.closed', id);

    return await this.findBidById(id);
  }

  async getBidWinner(id: string) {
    const bid = await this.findBidById(id);
    if (bid && bid.state !== BidState.CANCELED) {
      const biggestOffer = await this.findBiggestOffer(id);
      if (biggestOffer) {
        return this.findBuyerById(biggestOffer.ip);
      }
    }
  }

  async endBid(id: string) {
    await this.updateBid(id, { state: BidState.ENDED });
    const winner = await this.getBidWinner(id);
    const bid = await this.findBidById(id);

    if (bid) {
      this.eventQueueClient.emit('bid-ended', bid.id);

      return { bid, winner };
    }
  }

  async registerOffer(id: string, offer: Offer) {
    const bid = await this.findBidById(id);
    if (bid) {
      bid.offers.push(offer);

      this.eventQueueClient.emit('offer-placed', bid.id);

      return bid;
    }
  }

  getHello(): string {
    return 'Hello World from Repository Service!';
  }
}
