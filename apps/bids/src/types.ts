export type Buyer = {
  name: string;
  ip: string;
  tags: string[];
};

export type Bid = {
  id: string;
  tags: string[];
  basePrice: number;
  duration: number;
  item: JSONObject;
  offers: Offer[];
  state: BidState;
};

export enum BidState {
  OPEN = 'open',
  ENDED = 'ended',
  CANCELED = 'cancled',
}

export type Offer = {
  ip: string;
  price: number;
};

export type JSONObject = { [x: string]: JSONValue };
export type JSONValue = string | number | boolean | JSONObject | JSONValue[];
