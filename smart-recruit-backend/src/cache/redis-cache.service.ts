import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisCacheService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisCacheService.name);
  private readonly client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST ?? 'localhost',
      port: Number(process.env.REDIS_PORT ?? 6379),
      password: process.env.REDIS_PASSWORD || undefined,
      connectTimeout: 2000,
      maxRetriesPerRequest: 1,
      retryStrategy: (attempt) => Math.min(attempt * 100, 1000),
    });
    this.client.on('error', (error: Error) => {
      this.logger.warn(`Redis connection error: ${error.message}`);
    });
  }

  async ping(): Promise<void> {
    await this.client.ping();
  }

  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    load: () => Promise<T>,
  ): Promise<T> {
    try {
      const cached = await this.client.get(key);
      if (cached !== null) {
        try {
          return JSON.parse(cached) as T;
        } catch (error) {
          this.logger.warn(
            `Ignoring invalid cache entry "${key}": ${this.errorMessage(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        `Redis cache read failed for "${key}": ${this.errorMessage(error)}`,
      );
    }

    const value = await load();
    try {
      const serialized = JSON.stringify(value);
      if (serialized !== undefined) {
        await this.client.set(key, serialized, 'EX', ttlSeconds);
      }
    } catch (error) {
      this.logger.warn(
        `Redis cache write failed for "${key}": ${this.errorMessage(error)}`,
      );
    }
    return value;
  }

  async invalidateByPrefix(prefix: string): Promise<void> {
    try {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          `${prefix}*`,
          'COUNT',
          100,
        );
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
        cursor = nextCursor;
      } while (cursor !== '0');
    } catch (error) {
      this.logger.warn(
        `Redis cache invalidation failed for "${prefix}": ${this.errorMessage(error)}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Unknown Redis error';
  }
}
