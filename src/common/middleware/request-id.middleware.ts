import { Injectable, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Request, Response, NextFunction } from 'express';
import { MetricsService } from '../../metrics/metrics.service';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(private readonly metricsService: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const existingId = req.headers['x-request-id'] as string | undefined;
    const requestId = existingId || randomUUID();
    const startTime = Date.now();

    res.locals.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);

    res.on('finish', () => {
      const durationMs = Date.now() - startTime;
      const durationSeconds = durationMs / 1000;
      const statusCode = res.statusCode;

      // 1. Emit structured JSON log line with all required fields
      const logPayload = {
        timestamp: new Date().toISOString(),
        level: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
        message: 'request completed',
        service_name: 'url-shortener',
        request_id: requestId,
        method: req.method,
        path: req.path,
        status: statusCode,
        duration_ms: durationMs,
      };

      console.log(JSON.stringify(logPayload));

      // 2. Record Prometheus metrics
      this.metricsService.recordRequest(req.method, req.path, statusCode, durationSeconds);
    });

    next();
  }
}
