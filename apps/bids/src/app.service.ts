import { Bid, Buyer, CreateBuyerDto, Offer } from '@iasc/types';
import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';

import { ClientProxy } from '@nestjs/microservices';
import { lastValueFrom, timeout } from 'rxjs';

@Injectable()
export class AppService {
  constructor(
    private readonly httpService: HttpService,
    @Inject('BIDS_QUEUE_SERVICE') private readonly bidsQueueClient: ClientProxy,
  ) {}

  async registerBuyer(buyer: CreateBuyerDto) {
    // comunicación con servicio repositorio para crear comprador
    const buyerCreated = await lastValueFrom(
      this.bidsQueueClient
        .send<Buyer>({ cmd: 'create_buyer' }, { buyer })
        .pipe(timeout(1000)),
    ).catch((err) => {
      console.log(err);
    });
    // comunicación con servicio repositorio para buscar
    // subastas que le interesen a este comprador
    const bids = await lastValueFrom(
      this.bidsQueueClient.send<Bid[]>(
        { cmd: 'get_bids_by_tag' },
        { tags: buyer.tags },
      ),
      { defaultValue: [] as Bid[] },
    ).catch((err) => {
      console.log(err);
    });
    // devolver el comprador creado y las subastas que le interesen
    return { buyer: buyerCreated, bids };
  }

  async createBid(bid: Omit<Bid, 'offers' | 'id'>) {
    // comunicación con servicio repositorio para crear subasta
    const bidCreated = await lastValueFrom(
      this.bidsQueueClient
        .send<Bid>({ cmd: 'create_bid' }, { bid: { ...bid, offers: [] } })
        .pipe(timeout(1000)),
    ).catch((err) => {
      console.log(err);
    });

    if (bidCreated) {
      // timeout para terminar la subasta
      setTimeout(() => {
        this.endBid(bidCreated.id);
      }, bid.duration);
      // devuelve la subasta creada
      return { bid: bidCreated };
    }
  }

  async cancelBid(id: string) {
    // comunicación con servicio repositorio para cancelar subasta
    const bidCanceled = await lastValueFrom(
      this.bidsQueueClient
        .send<Bid>({ cmd: 'cancel_bid' }, { id })
        .pipe(timeout(1000)),
    ).catch((err) => {
      console.log(err);
    });
    // devuelve la subasta cancelada
    return { bid: bidCanceled };
  }

  async endBid(id: string) {
    // comunicación con servicio repositorio para finalizar subasta
    const bidEnded = await lastValueFrom(
      this.bidsQueueClient.send<{ bid: Bid; winner?: Buyer }>(
        { cmd: 'end_bid' },
        { id },
      ),
    ).catch((err) => {
      console.log(err);
    });
    // devuelve la subasta finalizada
    return bidEnded;
  }

  async registerOffer(bidId: string, offer: Offer) {
    const currentPrice = await lastValueFrom(
      this.bidsQueueClient.send<number>(
        { cmd: 'get_current_price' },
        { id: bidId },
      ),
    );
    if (offer.price > currentPrice) {
      // actualizar subasta con oferta
      const bidUpdated = await lastValueFrom(
        this.bidsQueueClient.send<Bid>(
          { cmd: 'register_offer' },
          { id: bidId, offer },
        ),
      ).catch((err) => {
        console.log(err);
      });

      // devolver la subasta actualizada con la nueva oferta
      if (bidUpdated) {
        return { bid: bidUpdated };
      }
    } else {
      // 'El precio de la oferta no es mayor que el actual'
    }
  }

  /* HEALTH */

  getHello(): string {
    return 'Hello World from bids!';
  }

  async getEventHealth(): Promise<string> {
    const pingRepository = await lastValueFrom(
      this.httpService.get<string>(`${process.env.EVENT_URL}`),
    );
    return await pingRepository.data;
  }

  async getRepositoryHealth(): Promise<string> {
    const pingRepository = await lastValueFrom(
      this.httpService.get<string>(`${process.env.REPOSITORY_URL}`),
    );
    return await pingRepository.data;
  }
}
