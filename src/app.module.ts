import {
  Module,
  MiddlewareConsumer,
  NestModule,
} from '@nestjs/common';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { DatabaseModule } from './database/database.module';
import { LinksModule } from './links/links.module';
import { CacheModule } from './cache/cache.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MetricsModule } from './metrics/metrics.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RedirectController } from './redirect.controller';

@Module({
  imports: [
    DatabaseModule,
    CacheModule,
    AnalyticsModule,
    MetricsModule,
    LinksModule,
  ],
  controllers: [AppController, RedirectController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
