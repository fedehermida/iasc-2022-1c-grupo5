import { Controller, Delete, Get, Patch, Post } from '@nestjs/common';
import { EventService } from './event.service';

// type BidEvent =
//   | { type: 'bid_created'; bid: Bid }
//   | { type: 'bid_canceled'; bid: Bid }
//   | { type: 'bid_offer'; bid: Bid; offer: Offer }
//   | { type: 'bid_ended'; bid: Bid };

@Controller()
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Get()
  getHello(): string {
    return this.eventService.getHello();
  }

  @Post()
  postEvent(): string {
    return 'POST Event';
  }

  @Patch()
  patchEvent(): string {
    return 'PATCH EVENT';
  }

  @Delete()
  deleteEvent(): string {
    return 'DELETE event';
  }

  // async handleBidEvent(event: BidEvent) {
  //   const bid = event.bid;
  //   const buyers = await this.getBuyersForTags(bid.tags);
  //   switch (event.type) {
  //     case 'bid_created':
  //     case 'bid_canceled': {
  //       buyers.forEach((buyer) => {
  //         lastValueFrom(this.httpService.post(`${buyer.ip}/event`, event));
  //       });
  //       break;
  //     }
  //     case 'bid_ended': {
  //       const winnerOffer = bid.offers.reduce((prev, curr) => {
  //         return prev !== undefined && prev.price > curr.price ? prev : curr;
  //       }, undefined as Offer | undefined);
  //       if (winnerOffer !== undefined) {
  //         buyers.forEach((buyer) => {
  //           if (buyer.ip === winnerOffer.ip) {
  //             lastValueFrom(
  //               this.httpService.post(`${buyer.ip}/event`, {
  //                 type: 'bid_won',
  //                 bid,
  //               }),
  //             );
  //           } else {
  //             lastValueFrom(
  //               this.httpService.post(`${buyer.ip}/event`, {
  //                 type: 'bid_lost',
  //                 bid,
  //               }),
  //             );
  //           }
  //         });
  //       } else {
  //         buyers.forEach((buyer) => {
  //           lastValueFrom(
  //             this.httpService.post(`${buyer.ip}/event`, {
  //               type: 'no_one_won',
  //               bid,
  //             }),
  //           );
  //         });
  //       }
  //       break;
  //     }
  //     case 'bid_offer': {
  //       buyers
  //         .filter((buyer) => buyer.ip !== event.offer.ip)
  //         .forEach((buyer) => {
  //           lastValueFrom(this.httpService.post(`${buyer.ip}/event`, event));
  //         });

  //       const offerer = buyers.find((buyer) => buyer.ip === event.offer.ip);
  //       if (offerer !== undefined) {
  //         lastValueFrom(
  //           this.httpService.post(`${offerer.ip}/event`, {
  //             type: 'bid_offer_accepted',
  //             bid,
  //             offer: event.offer,
  //           }),
  //         );
  //       }
  //       break;
  //     }
  //   }
  // }
}
