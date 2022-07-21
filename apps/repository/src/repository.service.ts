import { Bid, BidState, Buyer, Offer } from '@iasc/types';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RepositoryService {
  bids: Bid[] = [];
  buyers: Buyer[] = [];

  constructor(
    @Inject('EVENT_QUEUE_SERVICE')
    private readonly eventQueueClient: ClientProxy,
  ) {}

  getHello(): string {
    return 'Hello World from Repository Service!';
  }

  async getBid(id: string) {
    return await this.bids.find((bid) => bid.id === id);
  }

  async getBidsByTags(tags: string[]) {
    return await this.bids.filter((bid) => {
      return bid.tags.some((tag) => tags.includes(tag));
    });
  }

  async createBuyer(buyer: Buyer) {
    await this.buyers.push(buyer);
    return buyer;
  }

  async createBid(bid: Omit<Bid, 'id' | 'offers' | 'state'>) {
    const newBid = { ...bid, id: uuidv4(), state: BidState.OPEN, offers: [] };
    newBid.date_create = Date.now();
    await this.bids.push(newBid);
    var buyers = await this.buyers.filter(buyer => newBid["tags"].filter(bid=>buyer["tags"].includes(bid)).length>0)
    var ips = await buyers.map(buyer =>  buyer["ip"])
    if (ips.length>0){
      ips.forEach(ip =>{
      this.eventQueueClient.emit('publish-notification', {"bid":{"id": newBid.id,"basePrice": newBid.basePrice, "duration":newBid.duration, "item": newBid.item}, "ip":ip});})
    }
      return { bid: newBid };
  }

  async cancelBid(id: string) {
    this.bids = this.bids.map((bid) => {
      if (bid.id == id && bid.state == 'open') {
        return { ...bid, state: BidState.CANCELED };
      }
      return bid;
    });
    var bid= this.bids.filter(bid => bid["id"] == id)[0]
    var buyers = await this.buyers.filter(buyer => bid["tags"].filter(bid=>buyer["tags"].includes(bid)).length>0)
    var ips = await buyers.map(buyer =>  buyer["ip"])
    if (ips.length>0){
      ips.forEach(ip =>{
    this.eventQueueClient.emit('close-notification', {"bid": id, ip: ip});})
    }
    return await this.getBid(id);
  }
  async finishBid(id: string) {
    this.bids = this.bids.map((bid) => {
      if (bid.id === id) {
        return { ...bid, state: BidState.ENDED };
      }
      return bid;
    });
    var bid= this.bids.filter(bid => bid["id"] == id)[0]
    var buyers = await this.buyers.filter(buyer => bid["tags"].filter(bid=>buyer["tags"].includes(bid)).length>0)
    var ips = await buyers.map(buyer =>  buyer["ip"])
    if (ips.length>0){
      if (bid.offers.length>0){
        ips.forEach(ip =>{
          this.eventQueueClient.emit('finish-notification', {"bid": {"id": id, "winner": bid.offers[bid.offers.length-1].ip, "price": bid.offers[bid.offers.length-1].price }, ip: ip});
        }
          )
        
      }else{
        ips.forEach(ip =>{
          this.eventQueueClient.emit('finish-notification', {"bid": {"id": id, "winner": "Sin ofertas", "price": "Sin ofertas" }, ip: ip});
        })
      }
    }
    return await this.getBid(id);
  }

  async registerOffer(id: string, offer: Offer) {
    const bid = await this.getBid(id);
    if (bid &&  bid.state=='open') {
      if (offer.price> bid.basePrice && (bid.offers.length == 0 || offer.price> bid.offers[bid.offers.length-1].price)){
        bid.offers.push(offer);
        var buyers = await this.buyers.filter(buyer => bid["tags"].filter(bid=>buyer["tags"].includes(bid)).length>0)
        var ips = await buyers.map(buyer =>  buyer["ip"])
        if (ips.length>0){
          ips.forEach(ip =>{
          this.eventQueueClient.emit('offer-notification', {"bid": {"id":bid.id, "offer": offer}, ip:ip});
          })
        }
      }
    }
    return bid;
  }
  async endBidExpired(){
    const bidsExpired = this.bids.filter(bid => (bid.date_create + bid.duration*1000)<= Date.now() && bid.state=='open')
    console.log("Expiro")
    console.log(Array(bidsExpired).toString())
    bidsExpired.forEach(bid =>
        this.finishBid(bid.id)
      );
  }
}
