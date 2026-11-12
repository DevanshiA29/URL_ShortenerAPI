import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import * as crypto from 'node:crypto';

import { ApiTags } from '@nestjs/swagger';
import { LinksService } from './links/links.service';
import { CacheService } from './cache/cache.service';
import { AnalyticsQueueService } from './analytics/analytics.queue';

@ApiTags('redirect')
@Controller('r')
export class RedirectController {
  private readonly logger = new Logger(RedirectController.name);

  constructor(
    private readonly linksService: LinksService,
    private readonly cacheService: CacheService,
    private readonly analyticsQueue: AnalyticsQueueService,
  ) {}

  @Get(':code')
  async redirect(
    @Param('code') code: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const requestId = (res.locals.requestId as string) || crypto.randomUUID();

    // Cache-aside: check cache first
    let longUrl = await this.cacheService.getRedirectTarget(code);

    if (longUrl) {
      this.logger.log(`Cache HIT for code=${code}`);
      // Find link id for telemetry asynchronously (or from cached payload)
      this.linksService.findByCode(code).then((link) => {
        this.enqueueTelemetry(link._id.toString(), code, requestId, req);
      }).catch(() => {});

      return res.redirect(302, longUrl);
    }

    // Cache miss: load from DB
    this.logger.log(`Cache MISS for code=${code} — loading from DB`);
    const link = await this.linksService.findByCode(code);
    longUrl = link.long_url;

    // Populate cache asynchronously
    this.cacheService.setRedirectTarget(code, longUrl).catch(() => {});

    // Enqueue analytics asynchronously (zero-delay on redirect)
    this.enqueueTelemetry(link._id.toString(), code, requestId, req);

    return res.redirect(302, longUrl);
  }

  private enqueueTelemetry(linkId: string, code: string, requestId: string, req: Request) {
    const rawIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    // Privacy protection: store SHA-256 hash, NEVER store raw IP address
    const ipHash = crypto.createHash('sha256').update(rawIp).digest('hex').substring(0, 16);
    const userAgent = (req.headers['user-agent'] as string) || '';
    const referrer = (req.headers['referer'] as string) || '';

    this.analyticsQueue.enqueueClick({
      link_id: linkId,
      code,
      request_id: requestId,
      ip_hash: ipHash,
      user_agent: userAgent,
      referrer: referrer,
      timestamp: new Date(),
    }).catch((err) => {
      this.logger.warn(`Failed to enqueue click for code=${code}: ${err.message}`);
    });
  }
}
