export interface CreateBuyerDto {
  name: string;
  ip: string;
  tags: string[];
}

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

type JSONObject = { [x: string]: JSONValue };
type JSONValue = string | number | boolean | JSONObject | JSONValue[];
