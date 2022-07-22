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
  item: {
    title: string;
    description: string;
    image?: string;
  };
  offers: Offer[];
  state: BidState;
  date_create: number;
};

export enum BidState {
  OPEN = 'open',
  ENDED = 'ended',
  CANCELED = 'canceled',
}

export type Offer = {
  ip: string;
  price: number;
};
