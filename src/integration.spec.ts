import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import mongoose from 'mongoose';
import * as crypto from 'node:crypto';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AnalyticsService } from './analytics/analytics.service';
import { Link, LinkDocument } from './links/link.schema';
import { Click, ClickDocument } from './analytics/click.schema';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';

describe('System Design Integration & Security Test Suite', () => {
  let app: INestApplication;
  let analyticsService: AnalyticsService;
  let linkModel: Model<LinkDocument>;
  let clickModel: Model<ClickDocument>;

  beforeAll(async () => {
    // Explicit environment isolation guard
    process.env.NODE_ENV = 'test';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/bootcamp_test';
    delete process.env.REDIS_URL;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();

    analyticsService = moduleFixture.get<AnalyticsService>(AnalyticsService);
    linkModel = moduleFixture.get<Model<LinkDocument>>(getModelToken(Link.name));
    clickModel = moduleFixture.get<Model<ClickDocument>>(getModelToken(Click.name));
  });

  beforeEach(async () => {
    // Complete per-test state isolation: wipe collections between test runs
    if (mongoose.connection.readyState === 1) {
      await linkModel.deleteMany({});
      await clickModel.deleteMany({});
    }
  });

  afterAll(async () => {
    // Clean up test database entirely
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.dropDatabase();
      await mongoose.disconnect();
    }
    await app.close();
  });

  describe('1. Link Creation & Retrieval', () => {
    it('creates a link with valid URL and returns short code', async () => {
      const response = await request(app.getHttpServer())
        .post('/links')
        .send({
          long_url: 'https://example.com/system-design/testing',
          tags: ['test', 'systems'],
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('code');
      expect(response.body.short_url).toContain(`/r/${response.body.code}`);
      expect(response.body.long_url).toBe('https://example.com/system-design/testing');
    });
  });

  describe('2. Public Redirect Hot Path', () => {
    it('returns HTTP 302 redirect with Location header pointing to long URL', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/links')
        .send({ long_url: 'https://example.com/destination-target' })
        .expect(201);

      const code = createRes.body.code;
      expect(code).toBeDefined();

      const redirectRes = await request(app.getHttpServer())
        .get(`/r/${code}`)
        .expect(302);

      expect(redirectRes.headers.location).toBe('https://example.com/destination-target');
    });
  });

  describe('3. Authentication Behavior (Protected Routes)', () => {
    it('returns HTTP 401 when accessing protected route without credentials', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app.getHttpServer())
        .delete(`/links/${fakeId}`)
        .expect(401);

      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('4. Owner Scoping & IDOR Prevention', () => {
    it('prevents Principal B from reading or deleting a link owned by Principal A', async () => {
      const alicePrincipal = `alice_${crypto.randomUUID()}`;
      const bobPrincipal = `bob_${crypto.randomUUID()}`;

      // Principal A creates link
      const createRes = await request(app.getHttpServer())
        .post('/links')
        .set('x-principal-id', alicePrincipal)
        .send({
          long_url: 'https://example.com/confidential-alice-doc',
          tags: ['private'],
        })
        .expect(201);

      const linkId = createRes.body.id;

      // Principal B attempts to read Alice's link -> HTTP 403 Forbidden
      const readRes = await request(app.getHttpServer())
        .get(`/links/${linkId}`)
        .set('x-principal-id', bobPrincipal)
        .expect(403);

      expect(readRes.body.error.code).toBe('FORBIDDEN');

      // Principal B attempts to delete Alice's link -> HTTP 403 Forbidden
      const deleteRes = await request(app.getHttpServer())
        .delete(`/links/${linkId}`)
        .set('x-principal-id', bobPrincipal)
        .expect(403);

      expect(deleteRes.body.error.code).toBe('FORBIDDEN');

      // Principal A can access and delete their own link
      await request(app.getHttpServer())
        .get(`/links/${linkId}`)
        .set('x-principal-id', alicePrincipal)
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/links/${linkId}`)
        .set('x-principal-id', alicePrincipal)
        .expect(200);
    });
  });

  describe('5. URL Validation & Injection Defense', () => {
    it('rejects URL bypass attempts with HTTP 400', async () => {
      const bypassPayloads = [
        'http%3A%2F%2Fevil.example.com',
        'javascript:alert(1)',
        'ftp://evil.com/payload',
        'not-a-valid-url',
      ];

      for (const payload of bypassPayloads) {
        const res = await request(app.getHttpServer())
          .post('/links')
          .send({ long_url: payload })
          .expect(400);

        expect(res.body.error.code).toBe('BAD_REQUEST');
      }
    });
  });

  describe('6. Retention Enforcement (Purge Old Telemetry)', () => {
    it('purges clicks older than retention cutoff', async () => {
      const linkId = new mongoose.Types.ObjectId().toString();
      const code = `ret_${crypto.randomUUID().slice(0, 8)}`;
      const reqId = `req_ret_${crypto.randomUUID()}`;

      // Seed an old click directly
      await analyticsService.recordClick({
        link_id: linkId,
        code,
        request_id: reqId,
        ip_hash: 'abc123hash',
        user_agent: 'JestRunner',
        referrer: '',
        timestamp: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days old
      });

      // Purge records older than 30 days
      const purged = await analyticsService.purgeOldClicks(30);
      expect(purged).toBeGreaterThanOrEqual(1);

      // Verify analytics query returns 0
      const analytics = await analyticsService.getAnalytics(linkId);
      expect(analytics.click_count).toBe(0);
    });
  });

  describe('7. Async Queue Worker Idempotency', () => {
    it('deduplicates duplicate click payloads sharing the same request_id', async () => {
      const linkId = new mongoose.Types.ObjectId().toString();
      const duplicateRequestId = `idem_${crypto.randomUUID()}`;
      const code = `c_${crypto.randomUUID().slice(0, 8)}`;

      const payload = {
        link_id: linkId,
        code,
        request_id: duplicateRequestId,
        ip_hash: '9f8e7d6c',
        user_agent: 'TestAgent',
        referrer: 'https://referrer.test',
        timestamp: new Date(),
      };

      // First execution
      const firstResult = await analyticsService.recordClick(payload);
      expect(firstResult).toBe(true);

      // Duplicate replay execution with identical request_id
      const secondResult = await analyticsService.recordClick(payload);
      expect(secondResult).toBe(false); // Handled safely as idempotent duplicate

      // Ensure click count is exactly 1, not double-counted
      const analytics = await analyticsService.getAnalytics(linkId);
      expect(analytics.click_count).toBe(1);
    });
  });
});
