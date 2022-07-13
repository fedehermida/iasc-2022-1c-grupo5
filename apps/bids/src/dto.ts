import { IsNumber, IsObject, IsPositive } from '@nestjs/class-validator';
import { IsArray, IsEnum, IsNotEmpty, IsString } from 'class-validator';

import { BidState, JSONObject } from './types';

export class CreateBuyerDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  ip: string;

  @IsArray()
  tags: string[];
}

export class CreateBidDto {
  @IsPositive()
  duration: number;

  @IsNumber()
  basePrice: number;

  @IsArray()
  tags: string[];

  @IsObject()
  item: JSONObject;
}

export class CreateOfferDto {
  @IsString()
  @IsNotEmpty()
  ip: string;

  @IsNumber()
  @IsPositive()
  price: number;
}
