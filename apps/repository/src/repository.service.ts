import { Bid, BidState, Buyer, Offer } from '@iasc/types';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';
import { RaftService } from './raft/raft.service';

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
    private readonly raftService: RaftService,
  ) {}

  async findBidsByConditions(...conditions: BidCondition[]) {
    return this.bids.filter((bid) =>
      conditions.every((condition) => condition(bid)),
    );
  }

  /* BUYERS */

  async createBuyer(buyer: Buyer) {
    // this.raftService.append({ buyer });
    await this.buyers.push(buyer);
    return buyer;
  }

  async findBuyerById(ip: string) {
    return await this.buyers.find((buyer) => buyer.ip === ip);
  }

  async findAllBuyers() {
    // return this.raftService.log;
    return await this.buyers;
  }

  /* BIDS */

  async createBid(bid: Omit<Bid, 'id' | 'offers' | 'state'>) {
    const newBid = { ...bid, id: uuidv4(), state: BidState.OPEN, offers: [] };
    newBid.date_create = Date.now();
    await this.bids.push(newBid);

    var buyers = await this.buyers.filter(
      (buyer) =>
        newBid['tags'].filter((bid) => buyer['tags'].includes(bid)).length > 0,
    );
    var ips = await buyers.map((buyer) => buyer['ip']);
    if (ips.length > 0) {
      ips.forEach((ip) => {
        this.eventQueueClient.emit('publish-notification', {
          bid: {
            id: newBid.id,
            basePrice: newBid.basePrice,
            duration: newBid.duration,
            item: newBid.item,
          },
          ip: ip,
        });
      });
    }
    return { bid: newBid };
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

  async getCurrentBidPrice(id: string) {
    const bid = await this.findBidById(id);
    if (bid) {
      const biggestOffer = await this.findBiggestOffer(id);
      return biggestOffer ? biggestOffer.price : bid.basePrice;
    }
  }

  /* * */

  async cancelBid(id: string) {
    this.bids = this.bids.map((bid) => {
      if (bid.id == id && bid.state == 'open') {
        return { ...bid, state: BidState.CANCELED };
      }
      return bid;
    });
    var bid = this.bids.filter((bid) => bid['id'] == id)[0];
    var buyers = await this.buyers.filter(
      (buyer) =>
        bid['tags'].filter((bid) => buyer['tags'].includes(bid)).length > 0,
    );
    var ips = await buyers.map((buyer) => buyer['ip']);
    if (ips.length > 0) {
      ips.forEach((ip) => {
        this.eventQueueClient.emit('close-notification', { bid: id, ip: ip });
      });
    }
    return await this.findBidById(id);
  }
  async finishBid(id: string) {
    this.bids = this.bids.map((bid) => {
      if (bid.id === id) {
        return { ...bid, state: BidState.ENDED };
      }
      return bid;
    });
    var bid = this.bids.filter((bid) => bid['id'] == id)[0];
    var buyers = await this.buyers.filter(
      (buyer) =>
        bid['tags'].filter((bid) => buyer['tags'].includes(bid)).length > 0,
    );
    var ips = await buyers.map((buyer) => buyer['ip']);
    if (ips.length > 0) {
      if (bid.offers.length > 0) {
        ips.forEach((ip) => {
          this.eventQueueClient.emit('finish-notification', {
            bid: {
              id: id,
              winner: bid.offers[bid.offers.length - 1].ip,
              price: bid.offers[bid.offers.length - 1].price,
            },
            ip: ip,
          });
        });
      } else {
        ips.forEach((ip) => {
          this.eventQueueClient.emit('finish-notification', {
            bid: { id: id, winner: 'Sin ofertas', price: 'Sin ofertas' },
            ip: ip,
          });
        });
      }
    }
    return await this.findBidById(id);
  }

  async registerOffer(id: string, offer: Offer) {
    const bid = await this.findBidById(id);
    if (bid && bid.state == 'open') {
      if (
        offer.price > bid.basePrice &&
        (bid.offers.length == 0 ||
          offer.price > bid.offers[bid.offers.length - 1].price)
      ) {
        bid.offers.push(offer);
        var buyers = await this.buyers.filter(
          (buyer) =>
            bid['tags'].filter((bid) => buyer['tags'].includes(bid)).length > 0,
        );
        var ips = await buyers.map((buyer) => buyer['ip']);
        if (ips.length > 0) {
          ips.forEach((ip) => {
            this.eventQueueClient.emit('offer-notification', {
              bid: { id: bid.id, offer: offer },
              ip: ip,
            });
          });
        }
      }
    }
    return bid;
  }

  async endBidExpired() {
    const bidsExpired = this.bids.filter(
      (bid) =>
        bid.date_create + bid.duration * 1000 <= Date.now() &&
        bid.state == 'open',
    );
    console.log('Expiro');
    console.log(Array(bidsExpired).toString());
    bidsExpired.forEach((bid) => this.finishBid(bid.id));
  }
}
