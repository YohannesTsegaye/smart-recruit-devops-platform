import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RedisCacheService } from './cache/redis-cache.service';

describe('AppController', () => {
  let appController: AppController;
  let dataSource: { query: jest.Mock };
  let redisCache: { ping: jest.Mock };

  beforeEach(async () => {
    dataSource = { query: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };
    redisCache = { ping: jest.fn().mockResolvedValue(undefined) };
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        { provide: DataSource, useValue: dataSource },
        { provide: RedisCacheService, useValue: redisCache },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('reports healthy database and Redis dependencies', async () => {
    await expect(appController.healthCheck()).resolves.toEqual({
      status: 'ok',
      dependencies: { database: 'ok', redis: 'ok' },
    });
  });

  it('reports service unavailable if a dependency check fails', async () => {
    redisCache.ping.mockRejectedValue(new Error('Redis unavailable'));

    await expect(appController.healthCheck()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
