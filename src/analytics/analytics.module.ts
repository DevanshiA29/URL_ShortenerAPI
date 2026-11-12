import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Click, ClickSchema } from './click.schema';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueueService } from './analytics.queue';
import { AnalyticsController } from './analytics.controller';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    CacheModule,
    MongooseModule.forFeature([
      {
        name: Click.name,
        schema: ClickSchema,
      },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsQueueService],
  exports: [AnalyticsService, AnalyticsQueueService],
})
export class AnalyticsModule {}
