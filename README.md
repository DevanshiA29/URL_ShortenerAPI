# Resilient URL Shortener API

A production-conscious, high-throughput URL shortener and redirect telemetry service built with **NestJS**, **MongoDB**, **Redis**, **BullMQ**, and **Prometheus**.

Designed with strict resilience boundaries: cache-aside redirection, decoupled asynchronous telemetry processing, circuit breakers with exponential backoff, privacy-preserving IP hashing, ReDoS-safe search, and fail-fast startup configuration validation.

---

## Architecture Overview

```
                      ┌────────────────────────────────────────┐
                      │              Client                    │
                      └───────┬────────────────────────▲───────┘
                              │                        │
                    1. GET /r/:code         302 Redirect (Location)
                              │                        │
                              ▼                        │
                      ┌────────────────────────────────┴───────┐
                      │          Redirect Controller           │
                      └───────┬────────────────────────▲───────┘
                              │                        │
                    Cache GET │              Cache HIT │
                              ▼                        │
                      ┌───────────────┐                │
                      │  Redis Cache  ├────────────────┘
                      └───────┬───────┘
                              │
                    Cache MISS│ (Fallback)
                              ▼
                      ┌───────────────┐   Cache Populate (TTL 300s)
                      │    MongoDB    ├──────────────────────────┐
                      └───────┬───────┘                          │
                              │                                  ▼
                              │                         ┌────────────────┐
                              │                         │  Redis Cache   │
                              │                         └────────────────┘
                              │
                    Async Telemetry Enqueue (Non-blocking)
                              ▼
                      ┌───────────────┐
                      │ BullMQ Queue  │  (analytics-clicks)
                      └───────┬───────┘
                              │
                      Worker Ingestion
                              ▼
                      ┌───────────────┐
                      │ Redis Dedup   │  (analytics:dedup:<request_id>)
                      └───────┬───────┘
                              │
                    SHA-256 IP Hashed Document
                              ▼
                      ┌───────────────┐
                      │ MongoDB Clicks│  (Unique request_id index)
                      └───────────────┘
```

### Core Hot Path (Redirect)
1. **Cache-Aside Lookup**: Incoming `GET /r/:code` checks Redis (`link:redirect:<code>`).
2. **Instant Redirect**: If found (cache HIT), immediately issues HTTP 302 with the `Location` header.
3. **Database Fallback & Cache Warming**: If absent (cache MISS), queries MongoDB through a circuit breaker, populates Redis with a 300-second TTL, and redirects.
4. **Decoupled Telemetry**: Click telemetry is asynchronously enqueued to BullMQ without adding latency to the redirect response. If Redis is unavailable, telemetry safely falls back to direct async writes without crashing.

---

## Key Architectural Decisions

| Decision | Implementation | Why It Was Chosen |
| :--- | :--- | :--- |
| **Decoupled Telemetry** | BullMQ + Redis Queue | Ingestion spikes during marketing campaigns do not degrade redirect latency or overwhelm the primary database. |
| **Worker Deduplication** | `analytics:dedup:<request_id>` & Unique MongoDB Index | Guarantees exactly-once click counting even if workers retry failed jobs or clients replay network requests. |
| **Resilience & Fault Tolerance** | `opossum` Circuit Breaker + Jittered Backoff | Trips after database timeouts (1000ms threshold) to prevent cascading thread starvation and retry storms. |
| **Privacy by Design** | SHA-256 IP Hashing (`ip_hash`) | Zero raw IP addresses are persisted. Complies with GDPR/CCPA data minimization requirements while preserving unique visitor analytics. |
| **ReDoS Prevention** | Sanitized Regex Search | Strips and escapes user query inputs before running substring matches against MongoDB to prevent catastrophic backtracking. |
| **Deterministic Pagination** | Explicit `created_at: -1` sort with bounds checks | Enforces max page size (100) and deterministic sorting so records do not shift or duplicate across page boundaries. |
| **Fail-Fast Startup** | Zod Schema Validation (`src/config.ts`) | Validates all environment variables before booting NestJS. Crashes immediately with explicit error details if misconfigured. |
| **Observability & Tracing** | Prometheus `prom-client` + Structured JSON Logs | Normalized route metrics (`/r/:code`, `/links/:id`) prevent high-cardinality label explosion; `X-Request-ID` correlates every log line. |

---

## Tech Stack

- **Runtime**: Node.js 22 LTS
- **Language**: TypeScript 6.0
- **Framework**: NestJS 12 (Express platform)
- **Primary Datastore**: MongoDB (via Mongoose 9)
- **Cache & Message Broker**: Redis 7+ (via `ioredis` & BullMQ)
- **Resilience**: Opossum (Circuit Breaker)
- **Validation**: Zod (environment) & Class-Validator (DTOs)
- **Metrics**: Prometheus (`prom-client`)
- **Testing**: Jest (ESM mode with `--experimental-vm-modules`) & Supertest

---

## File & Module Inventory

```
src/
├── config.ts                          # Startup env validation with Zod (fails fast on boot)
├── main.ts                            # Application entry point with global pipes, filters, hooks
├── worker.ts                          # Standalone background worker process for BullMQ jobs
├── app.module.ts                      # Root NestJS module wiring feature modules & middleware
├── app.controller.ts                  # Liveness (/live), Readiness (/ready), Health (/health)
├── redirect.controller.ts             # High-speed public redirect hot path (GET /r/:code)
│
├── links/                             # URL Shortener Core Domain
│   ├── link.schema.ts                 # Link model (code unique index, created_by, tags, expires_at)
│   ├── links.controller.ts            # CRUD & Search endpoints (/links)
│   ├── links.service.ts               # Short code generator (base64url), circuit-breaker queries
│   ├── pagination.spec.ts             # Unit tests for pagination determinism & ReDoS resistance
│   └── dto/
│       ├── create-link.dto.ts         # URL validation, protocol check, future expiration check
│       └── update-link.dto.ts         # Partial update DTO
│
├── analytics/                         # Click Telemetry & Event Ingestion
│   ├── click.schema.ts                # Click model (link_id + timestamp compound index, unique request_id)
│   ├── analytics.controller.ts        # Query analytics & retention purges (/links/:id/analytics)
│   ├── analytics.service.ts           # Aggregations, retention cleanup, idempotent click writes
│   └── analytics.queue.ts             # BullMQ queue & worker with namespaced deduplication
│
├── cache/                             # Cache-aside Layer
│   ├── cache.module.ts                # Exported CacheModule
│   └── cache.service.ts               # Redis operations (TTL, invalidation, dedup keys, fallback)
│
├── database/                          # Database Connection
│   └── database.module.ts             # Mongoose connection with connection pooling & timeouts
│
├── metrics/                           # Prometheus Telemetry
│   ├── metrics.controller.ts          # GET /metrics scrape endpoint
│   ├── metrics.service.ts             # HTTP counter, duration histogram, path normalization
│   └── metrics.module.ts              # Global metrics provider
│
└── common/                            # Cross-Cutting Infrastructure
    ├── filters/
    │   └── http-exception.filter.ts   # Unified error envelope, 503/504 mapping, request_id logging
    ├── middleware/
    │   └── request-id.middleware.ts   # X-Request-ID propagation, duration tracking, structured JSON
    └── resilience/
        └── resilience.ts              # Circuit breaker factories & exponential backoff with jitter
```

---

## Database Schemas & Indexes

### 1. `links` Collection
| Field | Type | Attributes | Defensible Purpose |
| :--- | :--- | :--- | :--- |
| `code` | `String` | Required, Unique, Indexed | Primary lookup key for redirect hot path (`/r/:code`). |
| `long_url` | `String` | Required | Destination target URL to redirect clients to. |
| `created_by` | `String` | Required, Indexed | Multi-tenant isolation; links filtered by creator ID. |
| `expires_at` | `Date` | Optional | Supports temporary links; evaluated during lookup. |
| `tags` | `[String]` | Default: `[]` | Categorization and filtering in search queries. |
| `created_at` | `Date` | Auto Timestamp | Deterministic ordering for pagination (`{ created_at: -1 }`). |

### 2. `clicks` Collection
| Field | Type | Attributes | Defensible Purpose |
| :--- | :--- | :--- | :--- |
| `link_id` | `ObjectId` | Required, Ref `Link`, Indexed | Relates telemetry record to parent shortened link. |
| `code` | `String` | Required, Indexed | Diagnostic queries by short code. |
| `request_id` | `String` | Required, Unique, Indexed | **Idempotency key**. Replayed requests or retry attempts are rejected safely via E11000 duplicate key handling. |
| `ip_hash` | `String` | Required | Truncated SHA-256 hash. Preserves privacy (no raw IP stored). |
| `user_agent` | `String` | Optional | Device and browser analytics. |
| `referrer` | `String` | Optional | Traffic source attribution. |
| `timestamp` | `Date` | Required, Indexed | Time-window queries and retention policy purges. |

**Compound Index**: `{ link_id: 1, timestamp: 1 }`
- Powers `GET /links/:id/analytics?from=...&to=...`. The prefix `link_id` narrows to the target link immediately, while `timestamp` provides an index scan over the time interval.

---

## API Reference

### 1. Create Short Link
```bash
curl -X POST http://localhost:3000/links \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev-token" \
  -d '{
    "long_url": "https://example.com/deep/path?ref=campaign",
    "tags": ["marketing", "q4"]
  }'
```
**Response (201 Created)**:
```json
{
  "id": "6733918a992bc...",
  "code": "aB3x9Z",
  "short_url": "http://localhost:3000/r/aB3x9Z",
  "long_url": "https://example.com/deep/path?ref=campaign",
  "created_at": "2026-11-12T20:00:00.000Z"
}
```

### 2. Redirect Short Code
```bash
curl -i http://localhost:3000/r/aB3x9Z
```
**Response (302 Found)**:
```http
HTTP/1.1 302 Found
Location: https://example.com/deep/path?ref=campaign
X-Request-ID: 7a94a50f-2b58-4501-8b01-e7811f599dc2
```

### 3. List Links (Paginated)
```bash
curl -X GET "http://localhost:3000/links?page=1&limit=20"
```

### 4. Search Links (ReDoS Safe)
```bash
curl -X GET "http://localhost:3000/links/search?q=example&tag=marketing" \
  -H "Authorization: Bearer dev-token"
```

### 5. Update Link Target or Tags
```bash
curl -X PATCH http://localhost:3000/links/6733918a992bc... \
  -H "Content-Type: application/json" \
  -d '{
    "long_url": "https://example.com/new-destination",
    "tags": ["updated"]
  }'
```
*Note: Automatically evicts the cached entry in Redis to prevent stale redirects.*

### 6. Delete Link
```bash
curl -X DELETE http://localhost:3000/links/6733918a992bc... \
  -H "Authorization: Bearer dev-token"
```

### 7. Link Analytics
```bash
curl -X GET "http://localhost:3000/links/6733918a992bc.../analytics?from=2026-11-01T00:00:00Z"
```
**Response (200 OK)**:
```json
{
  "link_id": "6733918a992bc...",
  "click_count": 1420,
  "from": "2026-11-01T00:00:00.000Z",
  "to": "2026-11-12T20:00:00.000Z",
  "last_clicked_at": "2026-11-12T19:58:12.000Z"
}
```

### 8. Operational Probes
- `GET /live`: Liveness probe (`{"ok": true, "status": "ok"}`).
- `GET /ready`: Readiness probe. Validates MongoDB connection (`readyState === 1`) and Redis ping. Returns 503 if disconnected.
- `GET /metrics`: Prometheus metric scrape endpoint.

---

## Local Setup & Development

### Prerequisites
- Node.js 22 LTS
- MongoDB 6+ (local or container)
- Redis 7+ (optional; app degrades gracefully without Redis)

### Installation
```bash
# 1. Clone the repository
git clone <repo-url>
cd api

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your local MongoDB connection string

# 4. Start in development watch mode
npm run start:dev

# 5. Start standalone worker (optional, in separate terminal)
npm run worker
```

### Verification & Testing
```bash
# Run unit & integration tests (runs in < 1s)
npm test

# Run end-to-end tests
npm run test:e2e

# Run linter
npm run lint

# Build production bundle
npm run build
```

---

## Docker Deployment

The application includes a production-optimized multi-stage `Dockerfile`:
- Stage 1: Dependency resolution with clean dev-dependency omission.
- Stage 2: Ultra-lightweight Alpine runtime running as a dedicated non-root user (`appuser`).

```bash
# Build production Docker image (< 150MB)
docker build -t url-shortener-api:latest .

# Run container
docker run -d \
  --name shortener-api \
  -p 3000:3000 \
  --env-file .env \
  url-shortener-api:latest
```

---

## Interview Defense Guide (FAQ)

### Q: Why base64url for short codes instead of incremental counter or MD5?
> **Answer**: MD5/SHA produces 32+ character hashes, requiring arbitrary truncation which causes high collision rates. Incremental IDs (e.g. `1, 2, 3`) allow competitors to scrape links sequentially or predict business metrics. Using 6 bytes of cryptographically secure random bytes encoded with `base64url` produces an 8-character URL-safe string ($64^8 \approx 2.8 \times 10^{14}$ permutations). A 5-attempt retry loop checks for uniqueness before persisting, making collision probability negligible.

### Q: Why use Redis cache-aside if MongoDB is already indexed?
> **Answer**: Redirect endpoints typically experience a 99:1 read-to-write ratio with high locality (a few viral links receive 90%+ of traffic). Serving reads directly from Redis drops p99 redirect latency from 15-20ms to under 2ms while offloading tens of thousands of read QPS from the primary database cluster.

### Q: What happens if Redis crashes?
> **Answer**: The application is built with graceful degradation:
> 1. In `CacheService`, connection errors are trapped and cache calls return `null`, seamlessly falling back to MongoDB.
> 2. In `AnalyticsQueueService`, if Redis is unavailable, click events fall back to direct asynchronous MongoDB persistence.
> 3. The service does not crash; read and redirect traffic continues unimpeded.

### Q: Why use BullMQ instead of writing clicks directly to MongoDB?
> **Answer**: If a link goes viral on social media, a sudden spike of 20,000 clicks per second would saturate database connection pools and degrade the redirect response time. BullMQ acts as an ingestion buffer: the redirect handler finishes in microseconds, while background workers drain the queue at a steady, controlled concurrency (bulkheading).

### Q: Why hash IP addresses instead of storing them?
> **Answer**: Storing raw IP addresses violates privacy regulations (GDPR, CCPA) without providing business value. We hash the IP with SHA-256 (`ip_hash`), allowing the analytics service to count unique visitors while ensuring zero personally identifiable information (PII) is stored in the database.
