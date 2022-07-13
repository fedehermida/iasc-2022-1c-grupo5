import { NestFactory } from '@nestjs/core';
import { RepositoryModule } from './repository.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

async function bootstrap() {
  const app = await NestFactory.create(RepositoryModule);

  app.enableCors({
    origin: '*',
  });

  const microservice = app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.REDIS,
    options: {
      url: 'redis://redis:6379',
    },
  });

  await app.startAllMicroservices();
  await app.listen(2000);
}
bootstrap();
