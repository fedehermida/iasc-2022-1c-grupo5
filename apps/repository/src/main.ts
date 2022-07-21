import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { RepositoryModule } from './repository.module';

async function bootstrap() {
  const app = await NestFactory.create(RepositoryModule);

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [`amqp://${process.env.RABBITMQ_URL}`],
      queue: 'bids-queue',
      noAck: false,
      queueOptions: {
        durable: true,
      },
    },
  });

  app.connectMicroservice<MicroserviceOptions>({
    // @ts-ignore
    transport: Transport.REDIS,
    options: {
      host: process.env.REDIS_HOST,
      port: 6379,
    },
  });

  await app.startAllMicroservices();
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
