import { NestFactory } from '@nestjs/core';
import { SubscriberModule } from './subscriber.module';

async function bootstrap() {
  const app = await NestFactory.create(SubscriberModule);
  await app.listen(3000);
}
bootstrap();
