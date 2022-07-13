import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AppController } from './app.controller';
import { AppService } from './app.service';

const REPOSITORY_CLIENT = ClientsModule.register([
  {
    name: 'REPOSITORY_CLIENT',
    transport: Transport.REDIS,
    options: {
      url: 'redis://redis:6379',
    },
  },
]);

@Module({
  imports: [HttpModule, REPOSITORY_CLIENT],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
