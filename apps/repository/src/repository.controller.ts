import { Controller, Get } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateBuyerDto } from './dto';
import { RepositoryService } from './repository.service';

@Controller()
export class RepositoryController {
  constructor(private readonly repositoryService: RepositoryService) {}

  @Get()
  getHello(): string {
    return this.repositoryService.getHello();
  }

  @MessagePattern({ cmd: 'registerBuyer' })
  async registerBuyer(@Payload() dto) {
    return this.repositoryService.createBuyer(dto.buyer);
  }

  @MessagePattern({ cmd: 'createBid' })
  async createBid(@Payload() dto) {
    return this.repositoryService.createBid(dto.bid);
  }
}
