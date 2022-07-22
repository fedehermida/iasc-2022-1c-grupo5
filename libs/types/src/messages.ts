import { CreateBidDto, CreateBuyerDto } from './dto';
import { BidState, Offer } from './types';

export type CreateBuyerMessage = {
  buyer: CreateBuyerDto;
};

export type GetBidsByTagsMessage = {
  tags: string[];
};

export type CreateBidMessage = {
  bid: CreateBidDto & { state: BidState };
};

export type GetBidPriceMessage = { id: string };
export type CancelBidMessage = { id: string };
export type EndBidMessage = { id: string };

export type RegisterOfferMessage = {
  id: string;
  offer: Offer;
};
