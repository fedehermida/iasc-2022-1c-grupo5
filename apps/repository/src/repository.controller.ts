import { Controller, Get, Param } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RepositoryService } from './repository.service';
import { Cron, Interval } from '@nestjs/schedule';

@Controller()
export class RepositoryController {
  constructor(private readonly repositoryService: RepositoryService) {}

  @Get('/bids/:id')
  async getBid(@Param('id') id: string) {
    return await this.repositoryService.findBidById(id);
  }

  @Get('/bids')
  async getBids() {
    return await this.repositoryService.findAllBids();
  }

  @Get('/reset')
  async reset() {
    this.repositoryService.bids = [];
    this.repositoryService.buyers = [];
    return;
  }

  @Get('/buyers')
  async getBuyers() {
    return await this.repositoryService.findAllBuyers();
  }

  /* Mensajes que recibe desde "bids service" */

  @MessagePattern({ cmd: 'create_buyer' })
  async createBuyer(dto) {
    return await this.repositoryService.createBuyer(dto.buyer);
  }

  @MessagePattern({ cmd: 'get_bids_by_tag' })
  async getBidsByTag(@Payload() dto) {
    return await this.repositoryService.findOpenBidsForTags(dto.tags);
  }

  @MessagePattern({ cmd: 'get_current_price' })
  async getCurrentBidPrice(@Payload() dto) {
    return await this.repositoryService.getCurrentBidPrice(dto.id);
  }

  @MessagePattern({ cmd: 'create_bid' })
  async createBid(@Payload() dto) {
    return await this.repositoryService.createBid(dto.bid);
  }

  @MessagePattern({ cmd: 'cancel_bid' })
  async cancelBid(@Payload() dto) {
    return await this.repositoryService.cancelBid(dto.id);
  }

  @MessagePattern({ cmd: 'end_bid' })
  async endBid(@Payload() dto) {
    return await this.repositoryService.finishBid(dto.id);
  }

  @MessagePattern({ cmd: 'register_offer' })
  async registerOffer(@Payload() dto) {
    return await this.repositoryService.registerOffer(dto.id, dto.offer);
  }

  @Interval(1000)
  async handleCron() {
    console.log('Called when the current minute is 1');
    return this.repositoryService.endBidExpired();
  }
}
