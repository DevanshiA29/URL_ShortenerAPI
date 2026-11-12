import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Queue, Worker, Job } from 'bullmq';
import { AnalyticsService, RecordClickPayload } from './analytics.service';
import { CacheService } from '../cache/cache.service';

export const ANALYTICS_QUEUE_NAME = 'analytics-clicks';

@Injectable()
export class AnalyticsQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AnalyticsQueueService.name);
  private queue: Queue | null = null;
  private worker: Worker | null = null;

  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly cacheService: CacheService,
  ) {}

  onModuleInit() {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
      this.logger.warn('REDIS_URL not set — asynchronous BullMQ queue disabled, using direct async fallback');
      return;
    }

    try {
      const url = new URL(redisUrl);
      const connection = {
        host: url.hostname || 'localhost',
        port: Number(url.port) || 6379,
        maxRetriesPerRequest: null,
      };

      this.queue = new Queue(ANALYTICS_QUEUE_NAME, {
        connection,
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 1000 },
          removeOnComplete: true,
          removeOnFail: false, // Dead-letter retention
        },
      });
      this.queue.on('error', (err) => {
        this.logger.warn(`BullMQ Queue error: ${err.message}`);
      });

      // Background worker with distinct analytics:dedup:<job_id> key isolation
      this.worker = new Worker(
        ANALYTICS_QUEUE_NAME,
        async (job: Job<RecordClickPayload>) => {
          const dedupJobId = job.data.request_id || job.id || 'unknown';

          // Isolated deduplication check using analytics:dedup namespace
          const alreadyProcessed = await this.cacheService.isAnalyticsJobProcessed(dedupJobId);
          if (alreadyProcessed) {
            this.logger.warn(`Job ${job.id} already processed (dedup hit). Skipping.`);
            return;
          }

          this.logger.log(`Worker processing job ${job.id} for link ${job.data.link_id} (attempt ${job.attemptsMade + 1})`);
          await this.analyticsService.recordClick(job.data);

          // Mark job processed in dedicated analytics namespace
          await this.cacheService.markAnalyticsJobProcessed(dedupJobId);
        },
        {
          connection,
          concurrency: 5, // Bulkhead resource isolation
        },
      );

      this.worker.on('error', (err) => {
        this.logger.warn(`BullMQ Worker connection error: ${err.message}`);
      });

      this.worker.on('failed', (job, err) => {
        this.logger.error(`Job ${job?.id} failed on attempt ${job?.attemptsMade}: ${err.message}. DLQ retained.`);
      });

      this.logger.log('Analytics BullMQ queue and worker initialized with namespaced deduplication.');
    } catch (err: any) {
      this.logger.warn(`Failed to initialize BullMQ queue: ${err.message}`);
    }
  }

  async enqueueClick(payload: RecordClickPayload): Promise<boolean> {
    if (!this.queue) {
      this.logger.warn('Queue unavailable, direct async fallback');
      this.analyticsService.recordClick(payload).catch(() => {});
      return false;
    }

    try {
      // jobId ensures queue-level idempotency
      await this.queue.add('record_click', payload, {
        jobId: payload.request_id,
      });
      this.logger.log(`Enqueued click job with jobId=${payload.request_id}`);
      return true;
    } catch (err: any) {
      this.logger.warn(`Failed to enqueue click (non-blocking fallback): ${err.message}`);
      return false;
    }
  }

  async onModuleDestroy() {
    if (this.worker) await this.worker.close();
    if (this.queue) await this.queue.close();
  }
}
