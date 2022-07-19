import { NestFactory } from '@nestjs/core';
import { ClientModule } from './monitoring.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(ClientModule);
  app.enableCors({ origin: '*' });
  app.setBaseViewsDir(join(__dirname, '../../../apps/monitoring', 'view'));
  app.setViewEngine('hbs');
  await app.listen(process.env.PORT || 5000);
}
bootstrap();
