import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('AppController', () => {
  let appController: AppController;

  jest.setTimeout(15000);

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('Escenario 1', async () => {
      const buyer1 = await appController.registerBuyer({
        name: 'Juan',
        ip: '127.0.0.1',
        tags: ['tag1', 'tag2'],
      });
      const buyer2 = await appController.registerBuyer({
        name: 'Pedro',
        ip: '127.0.0.2',
        tags: ['tag1'],
      });
      const bid1 = await appController.createBid({
        basePrice: 0,
        duration: 5000,
        item: { name: 'algo a subastar' },
        tags: ['tag1'],
      });
      await appController.registerOffer(bid1.id, {
        ip: buyer1.ip,
        price: 100,
      });
      await sleep(8000);
      expect(bid1.offers.length).toBe(1);
    });
  });
});
