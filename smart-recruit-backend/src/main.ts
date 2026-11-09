import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { MetricsInterceptor } from './metrics/metrics.interceptor';
import { MetricsService } from './metrics/metrics.service';
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get MetricsService instance and apply interceptor globally
  const metricsService = app.get(MetricsService);
  app.useGlobalInterceptors(new MetricsInterceptor(metricsService));

  const configuredOrigins = (process.env.FRONTEND_URL ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: [
      ...new Set([
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:8080',
        ...configuredOrigins,
      ]),
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Accept', 'X-Debug', 'Authorization'],
    credentials: true,
  });

  const port = Number(process.env.PORT ?? 5000);
  await app.listen(port);
  console.log(`Application is running on port ${port}`);
  console.log(`Health endpoint available at http://localhost:${port}/health`);
  console.log(`Metrics endpoint available at http://localhost:${port}/metrics`);
}
void bootstrap();
