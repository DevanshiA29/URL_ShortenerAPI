import { jest } from '@jest/globals';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CacheService } from './cache/cache.service';
import { getConnectionToken } from '@nestjs/mongoose';

describe('AppController', () => {
  let appController: AppController;

  const mockCacheService = {
    ping: jest.fn<() => Promise<boolean>>().mockResolvedValue(true),
  };

  const mockConnection = {
    readyState: 1,
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        { provide: CacheService, useValue: mockCacheService },
        { provide: getConnectionToken(), useValue: mockConnection },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });

    it('should return live status ok', () => {
      expect(appController.getLive()).toEqual({ ok: true, status: 'ok' });
    });

    it('should return ready status with checks', async () => {
      const res = await appController.getReady();
      expect(res.ok).toBe(true);
      expect(res.checks.database).toBe('connected');
      expect(res.checks.cache).toBe('connected');
    });
  });
});
