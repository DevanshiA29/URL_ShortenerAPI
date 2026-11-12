import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry: client.Registry;
  public readonly httpRequestsTotal: client.Counter<string>;
  public readonly httpRequestDurationSeconds: client.Histogram<string>;

  constructor() {
    this.registry = new client.Registry();

    // Default Node.js process / memory / CPU metrics
    client.collectDefaultMetrics({ register: this.registry, prefix: 'node_' });

    // Request total counter
    this.httpRequestsTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests processed',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });

    // Request duration histogram
    this.httpRequestDurationSeconds = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
      registers: [this.registry],
    });
  }

  onModuleInit() {}

  recordRequest(method: string, path: string, status: number, durationSeconds: number) {
    const normalizedPath = this.normalizePath(path);
    const statusStr = String(status);

    this.httpRequestsTotal.inc({
      method,
      path: normalizedPath,
      status: statusStr,
    });

    this.httpRequestDurationSeconds.observe(
      {
        method,
        path: normalizedPath,
        status: statusStr,
      },
      durationSeconds,
    );
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  private normalizePath(path: string): string {
    if (path.startsWith('/r/')) return '/r/:code';
    if (path.startsWith('/links/') && path.includes('/analytics')) return '/links/:id/analytics';
    if (path.startsWith('/links/')) return '/links/:id';
    return path;
  }
}

