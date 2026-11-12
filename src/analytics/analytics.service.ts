import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Click, ClickDocument } from './click.schema';

export interface RecordClickPayload {
  link_id: string;
  code: string;
  request_id: string;
  ip_hash: string;
  user_agent: string;
  referrer: string;
  timestamp: string | Date;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(Click.name)
    private readonly clickModel: Model<ClickDocument>,
  ) {}

  async recordClick(payload: RecordClickPayload): Promise<boolean> {
    try {
      await this.clickModel.create({
        link_id: new Types.ObjectId(payload.link_id),
        code: payload.code,
        request_id: payload.request_id,
        ip_hash: payload.ip_hash,
        user_agent: payload.user_agent,
        referrer: payload.referrer,
        timestamp: new Date(payload.timestamp),
      });
      this.logger.log(`Recorded click for link=${payload.link_id}, request_id=${payload.request_id}`);
      return true;
    } catch (err: any) {
      if (err.code === 11000) {
        // Duplicate request_id — idempotent replay, ignore safely
        this.logger.warn(`Idempotent duplicate click ignored for request_id=${payload.request_id}`);
        return false;
      }
      this.logger.error(`Failed to record click: ${err.message}`, err.stack);
      throw err;
    }
  }

  async getAnalytics(linkId: string, fromStr?: string, toStr?: string) {
    const fromDate = fromStr ? new Date(fromStr) : new Date(0);
    const toDate = toStr ? new Date(toStr) : new Date();

    const query: any = {
      link_id: new Types.ObjectId(linkId),
      timestamp: { $gte: fromDate, $lte: toDate },
    };

    const [total, lastClick] = await Promise.all([
      this.clickModel.countDocuments(query),
      this.clickModel.findOne(query).sort({ timestamp: -1 }).lean(),
    ]);

    return {
      link_id: linkId,
      click_count: total,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      last_clicked_at: lastClick?.timestamp ?? null,
    };
  }

  async purgeOldClicks(retentionDays: number): Promise<number> {
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await this.clickModel.deleteMany({
      timestamp: { $lt: cutoff },
    });
    this.logger.log(`Purged ${result.deletedCount} clicks older than ${cutoff.toISOString()}`);
    return result.deletedCount;
  }
}

