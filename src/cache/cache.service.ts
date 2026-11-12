import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

const REDIRECT_TTL_SECONDS = 300; // 5 minutes
const DEDUP_TTL_SECONDS = 86400; // 24 hours

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis | null;

  constructor() {
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 2000,
      });
      this.client.on('error', (err) => {
        this.logger.warn(`Redis connection error (falling back to DB): ${err.message}`);
      });
    } else {
      this.logger.warn('REDIS_URL not set — caching disabled, all redirects go to DB');
      this.client = null;
    }
  }

  async ping(): Promise<boolean> {
    if (!this.client) return false;
    try {
      const res = await this.client.ping();
      return res === 'PONG';
    } catch {
      return false;
    }
  }

  // --- Redirect Cache Namespace: link:redirect:<short_code> ---
  async getRedirectTarget(code: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      return await this.client.get(`link:redirect:${code}`);
    } catch {
      this.logger.warn(`Cache GET failed for code=${code}, falling back to DB`);
      return null;
    }
  }

  async setRedirectTarget(code: string, url: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(`link:redirect:${code}`, url, 'EX', REDIRECT_TTL_SECONDS);
      this.logger.log(`Cache SET link:redirect:${code} (TTL=${REDIRECT_TTL_SECONDS}s)`);
    } catch {
      this.logger.warn(`Cache SET failed for code=${code} (non-fatal)`);
    }
  }

  async invalidateRedirectTarget(code: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.del(`link:redirect:${code}`);
      this.logger.log(`Cache INVALIDATED link:redirect:${code}`);
    } catch {
      this.logger.warn(`Cache DEL failed for code=${code} (non-fatal)`);
    }
  }

  // --- Analytics Deduplication Namespace: analytics:dedup:<job_id> ---
  async isAnalyticsJobProcessed(jobId: string): Promise<boolean> {
    if (!this.client) return false;
    try {
      const exists = await this.client.exists(`analytics:dedup:${jobId}`);
      return exists === 1;
    } catch (err) {
      this.logger.warn(`Dedup check failed for job=${jobId}: ${err}`);
      return false;
    }
  }

  async markAnalyticsJobProcessed(jobId: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.set(`analytics:dedup:${jobId}`, '1', 'EX', DEDUP_TTL_SECONDS);
      this.logger.log(`Set deduplication flag analytics:dedup:${jobId}`);
    } catch (err) {
      this.logger.warn(`Failed to set dedup flag for job=${jobId}: ${err}`);
    }
  }
}
