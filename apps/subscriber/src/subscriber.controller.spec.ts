import { Test, TestingModule } from '@nestjs/testing';
import { SubscriberController } from './subscriber.controller';
import { SubscriberService } from './subscriber.service';

describe('SubscriberController', () => {
  let subscriberController: SubscriberController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [SubscriberController],
      providers: [SubscriberService],
    }).compile();

    subscriberController = app.get<SubscriberController>(SubscriberController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(subscriberController.getHello()).toBe(
        'Hello World from subscriber service!',
      );
    });
  });
});
