import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, isValidObjectId } from 'mongoose';
import CircuitBreaker from 'opossum';

import { CreateLinkDto } from './dto/create-link.dto';
import { UpdateLinkDto } from './dto/update-link.dto';
import { Link, LinkDocument } from './link.schema';
import { CacheService } from '../cache/cache.service';
import {
  createResilientCircuitBreaker,
  retryWithBackoff,
} from '../common/resilience/resilience';

export interface LinkResult {
  _id: any;
  code: string;
  long_url: string;
  created_by?: string;
  expires_at?: Date;
  tags?: string[];
  created_at?: Date;
  status?: string;
}

@Injectable()
export class LinksService implements OnModuleInit {
  private dbBreaker!: CircuitBreaker;

  constructor(
    @InjectModel(Link.name)
    private readonly linkModel: Model<LinkDocument>,
    private readonly cacheService: CacheService,
  ) {}

  onModuleInit() {
    this.dbBreaker = createResilientCircuitBreaker(
      async (operation: () => Promise<any>) => {
        return await operation();
      },
      {
        name: 'database',
        timeout: 1000,
        errorThresholdPercentage: 50,
        resetTimeout: 10000,
        volumeThreshold: 3,
      },
    );
  }

  async create(dto: CreateLinkDto, principalId = 'anonymous') {
    if (this.dbBreaker?.opened) {
      console.warn(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          event: 'circuit_open_fallback',
          service_name: 'url-shortener',
          dependency: 'database',
          operation: 'create',
        }),
      );
      throw new ServiceUnavailableException({
        code: 'CIRCUIT_OPEN',
        message: 'Primary database circuit breaker is open. Creation unavailable.',
      });
    }

    const code = await this.generateUniqueCode();

    const link = (await this.dbBreaker.fire(async () => {
      return await retryWithBackoff(async () => {
        return await this.linkModel.create({
          code,
          long_url: dto.long_url,
          created_by: principalId,
          expires_at: dto.expires_at ? new Date(dto.expires_at) : undefined,
          tags: dto.tags ?? [],
        });
      });
    })) as LinkDocument;

    return {
      id: link._id.toString(),
      code: link.code,
      short_url: `http://localhost:3000/r/${link.code}`,
      long_url: link.long_url,
      created_at: link.created_at,
    };
  }

  async update(id: string, dto: UpdateLinkDto) {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid link id');
    }

    if (this.dbBreaker?.opened) {
      throw new ServiceUnavailableException({
        code: 'CIRCUIT_OPEN',
        message: 'Primary database circuit breaker is open. Update unavailable.',
      });
    }

    const link = (await this.dbBreaker.fire(async () => {
      return await retryWithBackoff(async () => {
        return await this.linkModel.findById(id).maxTimeMS(1000);
      });
    })) as LinkDocument | null;

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    link.long_url = dto.long_url;
    if (dto.tags) {
      link.tags = dto.tags;
    }
    await link.save();

    // Cache invalidation: ensure cached redirect for this code is evicted
    await this.cacheService.invalidateRedirectTarget(link.code);

    return {
      id: link._id.toString(),
      code: link.code,
      short_url: `http://localhost:3000/r/${link.code}`,
      long_url: link.long_url,
      updated_at: new Date(),
    };
  }

  async findAll(page = 1, limit = 20) {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const skip = (safePage - 1) * safeLimit;

    if (this.dbBreaker?.opened) {
      console.warn(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          event: 'circuit_open_fallback',
          service_name: 'url-shortener',
          dependency: 'database',
          operation: 'findAll',
        }),
      );
      return {
        items: [],
        page: safePage,
        limit: safeLimit,
        total: 0,
        status: 'degraded',
      };
    }

    try {
      const result = (await this.dbBreaker.fire(async () => {
        return await Promise.all([
          this.linkModel
            .find()
            .sort({ created_at: -1 })
            .skip(skip)
            .limit(safeLimit)
            .maxTimeMS(1000)
            .lean(),
          this.linkModel.countDocuments().maxTimeMS(1000),
        ]);
      })) as [any[], number];

      const [items, total] = result;

      return {
        items,
        page: safePage,
        limit: safeLimit,
        total,
      };
    } catch (err: any) {
      if (this.dbBreaker?.opened) {
        console.warn(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'warn',
            event: 'circuit_open_fallback',
            service_name: 'url-shortener',
            dependency: 'database',
            operation: 'findAll',
          }),
        );
        return {
          items: [],
          page: safePage,
          limit: safeLimit,
          total: 0,
          status: 'degraded',
        };
      }
      throw err;
    }
  }

  async search(
    query?: string,
    tag?: string,
    page = 1,
    pageSize = 20,
    principalId?: string,
  ) {
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(Math.max(1, pageSize), 100);
    const skip = (safePage - 1) * safePageSize;

    const filter: any = {};
    if (tag && tag.trim()) {
      filter.tags = tag.trim();
    }
    if (query && query.trim()) {
      const sanitized = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.long_url = { $regex: sanitized, $options: 'i' };
    }
    if (principalId && principalId !== 'anonymous') {
      filter.created_by = principalId;
    }

    const [items, total] = await Promise.all([
      this.linkModel
        .find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(safePageSize)
        .maxTimeMS(1000)
        .lean(),
      this.linkModel.countDocuments(filter).maxTimeMS(1000),
    ]);

    return {
      items,
      page: safePage,
      page_size: safePageSize,
      total,
      total_pages: Math.ceil(total / safePageSize) || 1,
    };
  }

  async findById(id: string, principalId?: string): Promise<LinkResult> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid link id');
    }

    if (this.dbBreaker?.opened) {
      console.warn(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          event: 'circuit_open_fallback',
          service_name: 'url-shortener',
          dependency: 'database',
          operation: 'findById',
          id,
        }),
      );
      return {
        _id: id,
        code: 'degraded',
        long_url: 'https://status.example.com',
        created_by: 'system',
        tags: ['fallback'],
        status: 'degraded',
      };
    }

    try {
      const link = (await this.dbBreaker.fire(async () => {
        return await this.linkModel.findById(id).maxTimeMS(1000).lean();
      })) as LinkResult | null;

      if (!link) {
        throw new NotFoundException('Link not found');
      }

      if (
        principalId &&
        principalId !== 'anonymous' &&
        link.created_by &&
        link.created_by !== 'anonymous' &&
        link.created_by !== principalId
      ) {
        throw new ForbiddenException('Access denied: You do not own this link');
      }

      return link;
    } catch (err: any) {
      if (err instanceof ForbiddenException || err instanceof NotFoundException || err instanceof BadRequestException) {
        throw err;
      }
      if (this.dbBreaker?.opened) {
        console.warn(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'warn',
            event: 'circuit_open_fallback',
            service_name: 'url-shortener',
            dependency: 'database',
            operation: 'findById',
            id,
          }),
        );
        return {
          _id: id,
          code: 'degraded',
          long_url: 'https://status.example.com',
          created_by: 'system',
          tags: ['fallback'],
          status: 'degraded',
        };
      }
      throw err;
    }
  }

  async delete(id: string, principalId: string): Promise<boolean> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid link id');
    }

    const link = (await this.dbBreaker.fire(async () => {
      return await this.linkModel.findById(id).maxTimeMS(1000);
    })) as LinkDocument | null;

    if (!link) {
      throw new NotFoundException('Link not found');
    }

    if (
      principalId &&
      principalId !== 'anonymous' &&
      link.created_by &&
      link.created_by !== 'anonymous' &&
      link.created_by !== principalId
    ) {
      throw new ForbiddenException('Access denied: You do not own this link');
    }

    await this.linkModel.findByIdAndDelete(id);
    await this.cacheService.invalidateRedirectTarget(link.code);
    return true;
  }

  async findByCode(code: string): Promise<LinkResult> {
    if (this.dbBreaker?.opened) {
      console.warn(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: 'warn',
          event: 'circuit_open_fallback',
          service_name: 'url-shortener',
          dependency: 'database',
          operation: 'findByCode',
          code,
        }),
      );
      return {
        _id: 'fallback',
        code,
        long_url: 'https://status.example.com',
        created_by: 'system',
        tags: ['fallback'],
        status: 'degraded',
      };
    }

    try {
      const link = (await this.dbBreaker.fire(async () => {
        return await this.linkModel.findOne({ code }).maxTimeMS(1000).lean();
      })) as LinkResult | null;

      if (!link) {
        throw new NotFoundException('Link not found');
      }

      if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) {
        throw new NotFoundException('Link has expired');
      }

      return link;
    } catch (err: any) {
      if (this.dbBreaker?.opened) {
        console.warn(
          JSON.stringify({
            timestamp: new Date().toISOString(),
            level: 'warn',
            event: 'circuit_open_fallback',
            service_name: 'url-shortener',
            dependency: 'database',
            operation: 'findByCode',
            code,
          }),
        );
        return {
          _id: 'fallback',
          code,
          long_url: 'https://status.example.com',
          created_by: 'system',
          tags: ['fallback'],
          status: 'degraded',
        };
      }
      throw err;
    }
  }

  private async generateUniqueCode(): Promise<string> {
    const crypto = await import('node:crypto');

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = crypto.randomBytes(6).toString('base64url');

      const existing = await this.dbBreaker.fire(async () => {
        return await this.linkModel.exists({ code }).maxTimeMS(1000);
      });

      if (!existing) {
        return code;
      }
    }

    throw new Error('Unable to generate a unique link code');
  }
}
