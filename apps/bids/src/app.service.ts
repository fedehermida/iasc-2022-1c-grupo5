import {
  Bid,
  BidState,
  Buyer,
  CreateBidDto,
  CreateBuyerDto,
  CreateOfferDto,
} from '@iasc/types';
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
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';

import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class AppService {
  constructor(
    private readonly httpService: HttpService,
    @Inject('BIDS_QUEUE_SERVICE') private readonly bidsQueueClient: ClientProxy,
  ) {}

  async getBuyers() {
    return await lastValueFrom(
      this.bidsQueueClient.send<Buyer[]>({ cmd: RepositoryPattern.GetBuyers }, {}),
      { defaultValue: [] as Buyer[] },
    );
  }

  async getBids() {
    return await lastValueFrom(
      this.bidsQueueClient.send<Bid[]>({ cmd: RepositoryPattern.GetBuyers }, {}),
      { defaultValue: [] as Bid[] },
    );
  }

  async registerBuyer(buyer: CreateBuyerDto) {
    // comunicación con servicio repositorio para crear comprador
    const buyerCreated = await lastValueFrom(
      this.bidsQueueClient.send<Buyer, CreateBuyerMessage>(
        { cmd: RepositoryPattern.CreateBuyer },
        { buyer },
      ),
    );

    // comunicación con servicio repositorio para buscar
    // subastas que le interesen a este comprador
    const bids = await lastValueFrom(
      this.bidsQueueClient.send<Bid[], GetBidsByTagsMessage>(
        { cmd: RepositoryPattern.GetBidsByTags },
        { tags: buyer.tags },
      ),
      { defaultValue: [] as Bid[] },
    );

    // devolver el comprador creado y las subastas que le interesen
    return { buyer: buyerCreated, bids };
  }

  async createBid(bid: CreateBidDto) {
    // comunicación con servicio repositorio para crear subasta
    return await lastValueFrom(
      this.bidsQueueClient.send<Bid, CreateBidMessage>(
        { cmd: RepositoryPattern.CreateBid },
        { bid: { ...bid, state: BidState.OPEN } },
      ),
    );
  }

  async cancelBid(id: string) {
    // comunicación con servicio repositorio para cancelar subasta
    return await lastValueFrom(
      this.bidsQueueClient.send<Bid, CancelBidMessage>(
        { cmd: RepositoryPattern.CancelBid },
        { id },
      ),
    );
  }

  async endBid(id: string) {
    // comunicación con servicio repositorio para finalizar subasta
    return await lastValueFrom(
      this.bidsQueueClient.send<{ bid: Bid; winner?: string }, EndBidMessage>(
        { cmd: RepositoryPattern.EndBid },
        { id },
      ),
    );
  }

  async registerOffer(id: string, offer: CreateOfferDto) {
    const currentPrice = await lastValueFrom(
      this.bidsQueueClient.send<number, GetBidPriceMessage>(
        { cmd: RepositoryPattern.GetBidPrice },
        { id },
      ),
    );

    if (offer.price > currentPrice) {
      // actualizar subasta con oferta
      const bidUpdated = await lastValueFrom(
        this.bidsQueueClient.send<Bid, RegisterOfferMessage>(
          { cmd: RepositoryPattern.RegisterOffer },
          { id, offer: { ...offer, createdAt: Date.now() } },
        ),
      );

      // devolver la subasta actualizada con la nueva oferta
      if (bidUpdated) {
        return { bid: bidUpdated };
      }
    } else {
      // 'El precio de la oferta no es mayor que el actual'
    }
  }
}
