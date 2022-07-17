import {
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway()
export class ClientGateway {
  @WebSocketServer()
  server: Server;

  @SubscribeMessage('ping')
  handleMessage(@MessageBody() message: string): void {
    console.log('received message: ', message);
    this.server.emit('pong', message);
  }
}
