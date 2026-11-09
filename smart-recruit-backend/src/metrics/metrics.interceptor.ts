import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<{ statusCode: number }>();
    const method = request.method;
    const route = request.route?.path ?? request.url ?? 'unknown';
    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const statusCode = (response.statusCode ?? 200).toString();
          const duration = (Date.now() - start) / 1000;
          this.metricsService.httpRequestsTotal.inc({
            method,
            route,
            status_code: statusCode,
          });
          this.metricsService.httpRequestDuration.observe(
            { method, route, status_code: statusCode },
            duration,
          );
        },
        error: (err: { status?: number }) => {
          const statusCode = (err?.status ?? 500).toString();
          const duration = (Date.now() - start) / 1000;
          this.metricsService.httpRequestsTotal.inc({
            method,
            route,
            status_code: statusCode,
          });
          this.metricsService.httpRequestDuration.observe(
            { method, route, status_code: statusCode },
            duration,
          );
        },
      }),
    );
  }
}
