import { NestFactory } from '@nestjs/core';
import { ClientModule } from './monitoring.module';

async function bootstrap() {
  const app = await NestFactory.create(ClientModule);
  app.enableCors({ origin: '*' });
  await app.listen(process.env.PORT || 5000);
}
bootstrap();
