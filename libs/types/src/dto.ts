import { IsNumber, IsPositive } from '@nestjs/class-validator';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsDefined,
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

  @IsNumber()
  @IsOptional()
  createdAt: number;

  @IsArray()
  tags: string[];

  @ValidateNested()
  @IsDefined()
  @Type(() => Item)
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
