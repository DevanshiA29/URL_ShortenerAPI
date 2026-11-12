import { Controller, Get, HttpStatus, HttpException } from '@nestjs/common';
import { AppService } from './app.service';
import { CacheService } from './cache/cache.service';
import { InjectConnection } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly cacheService: CacheService,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('live')
  getLive(): { ok: boolean; status: string } {
    return { ok: true, status: 'ok' };
  }

  @Get('health')
  getHealth(): { status: string; timestamp: string } {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  async getReady(): Promise<{ ok: boolean; checks: Record<string, any> }> {
    const checks: Record<string, any> = {};
    let ready = true;

    // Check database connectivity
    try {
      if (this.connection && this.connection.readyState === 1) {
        checks.database = 'connected';
      } else {
        checks.database = 'disconnected';
        ready = false;
      }
    } catch {
      checks.database = 'disconnected';
      ready = false;
    }

    // Check cache connectivity
    try {
      const cacheOk = await this.cacheService.ping();
      checks.cache = cacheOk ? 'connected' : 'disconnected';
      if (!cacheOk && process.env.REQUIRE_CACHE === 'true') {
        ready = false;
      }
    } catch {
      checks.cache = 'disconnected';
      if (process.env.REQUIRE_CACHE === 'true') {
        ready = false;
      }
    }

    checks.uptime_seconds = Math.floor(process.uptime());

    if (!ready) {
      throw new HttpException(
        { ok: false, checks },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return {
      ok: true,
      checks,
    };
  }
}
