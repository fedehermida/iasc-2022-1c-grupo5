import { IsNumber, IsPositive } from '@nestjs/class-validator';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';

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

export class Item {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsUrl()
  @IsOptional()
  image?: string;
}

export class CreateBidDto {
  @IsPositive()
  duration: number;

  @IsNumber()
  basePrice: number;

  @IsArray()
  tags: string[];

  @ValidateNested()
  item: Item;
}

export class CreateOfferDto {
  @IsString()
  @IsNotEmpty()
  ip: string;

  @IsNumber()
  @IsPositive()
  price: number;
}
