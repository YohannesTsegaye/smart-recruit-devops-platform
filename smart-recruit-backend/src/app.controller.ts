import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Public } from './auth/decorators/public.decorator';
import { RedisCacheService } from './cache/redis-cache.service';

@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly redisCache: RedisCacheService,
  ) {}

  @Public()
  @Get(['health', 'healthcheck'])
  async healthCheck(): Promise<{
    status: 'ok';
    dependencies: { database: 'ok'; redis: 'ok' };
  }> {
    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);
    if (!database || !redis) {
      throw new ServiceUnavailableException({
        status: 'unhealthy',
        dependencies: {
          database: database ? 'ok' : 'unavailable',
          redis: redis ? 'ok' : 'unavailable',
        },
      });
    }

    return { status: 'ok', dependencies: { database: 'ok', redis: 'ok' } };
  }

  private async checkDatabase(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error: unknown) {
      this.logger.error(
        'Database health check failed',
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      await this.redisCache.ping();
      return true;
    } catch (error: unknown) {
      this.logger.error(
        'Redis health check failed',
        error instanceof Error ? error.stack : undefined,
      );
      return false;
    }
  }
}
