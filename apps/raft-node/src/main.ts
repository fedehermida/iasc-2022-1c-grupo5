import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { RaftNodeModule } from './raft-node.module';

async function bootstrap() {
  const app = await NestFactory.create(RaftNodeModule);
  app.connectMicroservice<MicroserviceOptions>({
    // @ts-ignore
    transport: Transport.REDIS,
    options: {
      host: 'localhost',
      port: 6379,
    },
  });

  await app.startAllMicroservices();
  if (process.env.PORT !== '') {
    await app.listen(process.env.PORT || 3000);
  }
}
bootstrap();
