import { Bid, BidState, Buyer, Offer } from '@iasc/types';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';
import { RaftService } from './raft/raft.service';

type BidCondition = (bid: Bid) => boolean;

const hasTags =
  (queryTags: string[]) =>
  ({ tags }: Bid | Buyer) =>
    tags.some((tag) => queryTags.includes(tag));

const bidStateIs =
  (state: BidState) =>
  ({ state: bidState }) =>
    bidState === state;

@Injectable()
export class RepositoryService {
  // bids: Bid[] = [];
  // buyers: Buyer[] = [];

  constructor(
    @Inject('EVENT_QUEUE_SERVICE')
    private readonly eventQueueClient: ClientProxy,
    private readonly raftService: RaftService,
  ) {}

  async findBidsByConditions(...conditions: BidCondition[]) {
    return this.findAllBids().filter((bid) =>
      conditions.every((condition) => condition(bid)),
    );
  }

  findAllBids(): Bid[] {
    return this.raftService.log.reduce((prev, curr) => {
      switch (curr.data.type) {
        case 'create_bid': {
          return [...prev, curr.data.bid];
        }
        case 'update_bid': {
          return prev.map((bid) => {
            if (bid.id == curr.data.id) {
              return { ...bid, ...curr.data.bid };
            }
            return bid;
          });
        }
        default:
          break;
      }
      return prev;
    }, [] as Bid[]);
  }

  findAllBuyers(): Buyer[] {
    return this.raftService.log.reduce((prev, curr) => {
      switch (curr.data.type) {
        case 'create_buyer': {
          return [...prev, curr.data.buyer];
        }
        default: {
          return prev;
        }
      }
    }, [] as Buyer[]);
  }

  /* BUYERS */

  async createBuyer(buyer: Buyer) {
    const newBuyer = { ...buyer, id: uuidv4() };
    this.raftService.append({
      type: 'create_buyer',
      buyer: newBuyer,
    });
    return newBuyer;
  }

  async findBuyerById(ip: string) {
    return this.findAllBuyers().filter((buyer) => buyer.ip === ip);
  }

  async buyersForTags(tags: string[]) {
    return this.findAllBuyers().filter(hasTags(tags));
  }

  /* BIDS */

  async createBid(bid: Omit<Bid, 'id' | 'offers' | 'state'>) {
    const newBid = { ...bid, id: uuidv4(), state: BidState.OPEN, offers: [] };
    newBid.date_create = Date.now();

    this.raftService.append({
      type: 'create_bid',
      bid: newBid,
    });

    const buyers = await this.buyersForTags(bid.tags);

    buyers.forEach(({ ip }) => {
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

    return { bid: newBid };
  }

  findBidById(id: string) {
    return this.findAllBids().find((bid) => bid.id === id);
  }

  async findBidsByTags(tags: string[]) {
    return await this.findBidsByConditions(hasTags(tags));
  }

  async findBidsByState(state: BidState) {
    return await this.findBidsByConditions(bidStateIs(state));
  }

  async findOpenBidsForTags(tags: string[]) {
    return await this.findBidsByConditions(
      bidStateIs(BidState.OPEN),
      hasTags(tags),
    );
  }

  findBiggestOffer(id: string): Offer | undefined {
    const bid = this.findBidById(id);
    if (bid && bid.offers.length > 0) {
      return bid.offers.reduce((biggest, offer) =>
        offer.price > biggest.price ? offer : biggest,
      );
    }
  }

  async updateBid(id: string, bid: Partial<Bid>) {
    this.raftService.append({
      type: 'update_bid',
      bid,
      id,
    });

    return this.findBidById(id);
  }

  async getCurrentBidPrice(id: string) {
    const bid = this.findBidById(id);
    if (bid) {
      const biggestOffer = this.findBiggestOffer(id);
      return biggestOffer ? biggestOffer.price : bid.basePrice;
    }
  }

  /* * */

  async cancelBid(id: string) {
    this.raftService.append({
      type: 'update_bid',
      id,
      bid: { state: BidState.CANCELED },
    });

    const bid = this.findBidById(id);
    const buyers = await this.buyersForTags(bid.tags);

    buyers.forEach(({ ip }) => {
      this.eventQueueClient.emit('close-notification', { bid: id, ip: ip });
    });

    return bid;
  }

  async finishBid(id: string) {
    this.raftService.append({
      type: 'update_bid',
      id,
      bid: { state: BidState.ENDED },
    });

    const bid = this.findBidById(id);
    const buyers = await this.buyersForTags(bid.tags);

    const biggest = await this.findBiggestOffer(id);

    if (biggest !== undefined) {
      const { ip: winner, price } = biggest;
      buyers.forEach(({ ip }) => {
        this.eventQueueClient.emit('finish-notification', {
          bid: { id, winner, price },
          ip,
        });
      });
    } else {
      buyers.forEach(({ ip }) => {
        this.eventQueueClient.emit('finish-notification', {
          bid: { id, winner: '', price: 0 },
          ip,
        });
      });
    }

    return bid;
  }

  async registerOffer(id: string, offer: Offer) {
    const bid = await this.findBidById(id);
    if (bid && bid.state == 'open') {
      if (
        offer.price > bid.basePrice &&
        (bid.offers.length == 0 ||
          offer.price > bid.offers[bid.offers.length - 1].price)
      ) {
        this.raftService.append({
          type: 'update_bid',
          id,
          bid: { offers: [...bid.offers, offer] },
        });
        
        const buyers = await this.findAllBuyers().filter(
          (buyer) =>
            bid['tags'].filter((bid) => buyer['tags'].includes(bid)).length > 0,
        );
        const ips = await buyers.map((buyer) => buyer['ip']);
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
    const bidsExpired = this.findAllBids().filter(
      (bid) =>
        bid.date_create + bid.duration * 1000 <= Date.now() &&
        bid.state == 'open',
    );
    bidsExpired.forEach((bid) => this.finishBid(bid.id));
  }
}
