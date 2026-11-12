import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('links/:id/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  async getAnalytics(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getAnalytics(id, from, to);
  }

  @Post('purge')
  async purgeOldClicks(
    @Query('days') days?: string,
  ) {
    const retentionDays = days ? Number(days) : 30;
    const purged = await this.analyticsService.purgeOldClicks(retentionDays);
    return {
      message: `Purged click records older than ${retentionDays} days`,
      deleted_count: purged,
    };
  }
}

