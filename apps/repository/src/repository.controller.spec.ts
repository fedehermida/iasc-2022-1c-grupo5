import { Test, TestingModule } from '@nestjs/testing';
import { RepositoryController } from './repository.controller';
import { RepositoryService } from './repository.service';

describe('RepositoryController', () => {
  let repositoryController: RepositoryController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [RepositoryController],
      providers: [RepositoryService],
    }).compile();

    repositoryController = app.get<RepositoryController>(RepositoryController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(repositoryController.getHello()).toBe('Hello World!');
    });
  });
});
