import { Buyer, JSONObject } from './types';

export type CreateBuyerDto = Buyer;

export interface CreateBidDto {
  duration: number;
  basePrice: number;
  tags: string[];
  item: JSONObject;
}

export interface CreateOfferDto {
  ip: string;
  price: number;
}
