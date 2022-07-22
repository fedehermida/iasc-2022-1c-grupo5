import {
  CancelBidMessage,
  CreateBidMessage,
  CreateBuyerMessage,
  EndBidMessage,
  GetBidPriceMessage,
  GetBidsByTagsMessage,
  RegisterOfferMessage,
} from '@iasc/types/messages';
import { RepositoryPattern } from '@iasc/types/patterns';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { Interval } from '@nestjs/schedule';
import { RepositoryService } from './repository.service';

@Controller()
export class RepositoryController {
  constructor(private readonly repositoryService: RepositoryService) {}

  @MessagePattern({ cmd: RepositoryPattern.GetBids })
  async getBids() {
    return await this.repositoryService.findAllBids();
  }

  @MessagePattern({ cmd: RepositoryPattern.GetBuyers })
  async getBuyers() {
    return await this.repositoryService.findAllBuyers();
  }

  @MessagePattern({ cmd: RepositoryPattern.CreateBuyer })
  async createBuyer(@Payload() { buyer }: CreateBuyerMessage) {
    return await this.repositoryService.createBuyer(buyer);
  }

  @MessagePattern({ cmd: RepositoryPattern.GetBidsByTags })
  async getBidsByTag(@Payload() { tags }: GetBidsByTagsMessage) {
    return await this.repositoryService.findOpenBidsForTags(tags);
  }

  @MessagePattern({ cmd: RepositoryPattern.GetBidPrice })
  async getCurrentBidPrice(@Payload() { id }: GetBidPriceMessage) {
    return await this.repositoryService.getCurrentBidPrice(id);
  }

  @MessagePattern({ cmd: RepositoryPattern.CreateBid })
  async createBid(@Payload() { bid }: CreateBidMessage) {
    return await this.repositoryService.createBid(bid);
  }

  @MessagePattern({ cmd: RepositoryPattern.CancelBid })
  async cancelBid(@Payload() { id }: CancelBidMessage) {
    return await this.repositoryService.cancelBid(id);
  }

  @MessagePattern({ cmd: RepositoryPattern.EndBid })
  async endBid(@Payload() { id }: EndBidMessage) {
    return await this.repositoryService.finishBid(id);
  }

  @MessagePattern({ cmd: RepositoryPattern.RegisterOffer })
  async registerOffer(@Payload() { id, offer }: RegisterOfferMessage) {
    return await this.repositoryService.registerOffer(id, offer);
  }

  @Interval(1000)
  async handleCron() {
    return this.repositoryService.endBidExpired();
  }
}
