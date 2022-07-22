import { Bid, BidState, Buyer } from '@iasc/types';

export const hasTags =
  (queryTags: string[]) =>
  ({ tags }: Bid | Buyer) =>
    tags.some((tag) => queryTags.includes(tag));

export const bidStateIs =
  (state: BidState) =>
  ({ state: bidState }) =>
    bidState === state;

export const bidExpired = ({ state, createdAt, duration }: Bid) =>
  state === BidState.OPEN && createdAt + duration <= Date.now();
