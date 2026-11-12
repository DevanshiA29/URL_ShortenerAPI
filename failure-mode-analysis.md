# Production Failure Mode Analysis (FMA)

**Service:** URL Shortener API (`url-shortener`)  
**Environment:** Containerized Node.js (NestJS) on Alpine Linux  
**Author:** Production Engineering  
**Default Failure Stance:** `fail_closed` (Conservative baseline prioritizing data consistency, security, and schema integrity, with isolated `fail_open` fallbacks for non-critical reads/caches).

---

## 1. Executive Summary & Stance Rationale

Distributed microservices operate in an environment where failure is continuous rather than exceptional. Networks partition, connection pools saturate, and dependencies experience latency spikes. 

Our baseline architectural stance is **Fail-Closed**:
- **Critical Write Paths & Identity:** If MongoDB or authentication verification fails, requests are rejected immediately with structured error codes (`503 Service Unavailable` or `401/403`). We refuse to guess, omit integrity constraints, or permit unauthenticated access.
- **Selective Fail-Open Exceptions:** For non-critical reads, Redis cache misses degrade directly to the primary database. For telemetry (analytics event logging), ingestion queues buffer in-memory or drop non-blocking events rather than blocking user redirection.

---

## 2. Dependency Inventory

| Dependency | Category | Connection Method | Configured Timeout | Retry Behavior | Blast Radius if Down |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MongoDB** | Primary Persistence | TCP / Mongoose Connection Pool | `serverSelectionTimeoutMS: 5000` | Mongoose auto-reconnect (up to 30s) | Total outage for link creation, updates, and un-cached lookups |
| **Redis** | In-Memory Cache | TCP / `ioredis` Client | `connectTimeout: 2000ms`, `commandTimeout: 1000ms` | Exponential backoff (retry 3x, then trip fallback) | Cache misses fall through to MongoDB; increases DB query load |
| **BullMQ / Queue** | Async Telemetry | Redis PubSub / Lists | `timeout: 3000ms` | Job retry with exponential backoff (attempts: 3) | Analytics tracking delayed; redirection unaffected |
| **DNS Resolver** | Network Identity | OS `getaddrinfo` (libuv threadpool) | OS resolver default (often 5s-30s) | OS resolver retry | Cryptic `ENOTFOUND` or `ETIMEDOUT` across all remote endpoints |
| **Filesystem** | Local Storage | POSIX syscalls (`fs`) | N/A (synchronous / async non-blocking) | None | Log drops or process crashes if disk reaches 100% |
| **Node.js V8 Runtime** | Host Process | In-process event loop & heap | N/A | Process exits on unhandled rejection / OOM | Hard process termination (`SIGABRT` / `SIGKILL`) |

---

## 3. Failure Mode Matrix

| Dependency | Failure Mode | Probability | User Impact | Current Handling | Desired Handling |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MongoDB** | Connection refused / Down | Medium | All URL creation and uncached lookups fail. | Service throws `MongooseServerSelectionError`; returns 500. | Fail-closed: Return `503 Service Unavailable` with `Retry-After: 30` header. Alert on-call. |
| **MongoDB** | Slow queries / Pool exhaustion | High | Latency skyrockets (>5s); Node.js event loop blocks; incoming requests queue until crash. | Queries wait indefinitely; connections saturate until pool runs dry. | Enforce strict query timeout (`maxTimeMS: 2000`). Return `504 Gateway Timeout` and log slow query. |
| **Redis** | Unreachable / Connection timeout | Medium | Redirection queries bypass cache; MongoDB load spikes. | `ioredis` emits error event; fallback logic serves from Mongo. | Fail-open: Catch Redis connection error, log `warn`, query Mongo, trip local cache circuit breaker. |
| **Redis** | Cache stampede / Key eviction | High | Sudden thundering herd hits MongoDB on viral link invalidation. | All concurrent requests hit MongoDB simultaneously. | Implement probabilistic early expiration (XFetch) or mutex lock on key refill. |
| **External Webhook / API** | Third-party endpoint down | Medium | Async webhook notification or metadata unfurling fails. | Request blocks or logs uncaught Axios error. | Circuit breaker trips after 5 consecutive failures; fallback to dead-letter queue. |
| **External Webhook / API** | High latency (100x slower) | High | Sockets held open; worker threadpool / sockets exhausted; cascade failure. | Service waits up to default 60s timeout, starving other requests. | Strict timeout (`timeout: 1500ms`) with `AbortSignal`. Circuit breaker opens if p95 > 2s. |
| **Filesystem** | Disk 100% full | Low-Medium | Structured JSON logs fail to flush; Docker logging driver blocks stdout. | Output blocked or process killed by system. | Container stdout streaming with logrotate limit (10MB x 3 files); metric alert at 85% disk usage. |
| **V8 Runtime** | Out of Memory (OOM) | Low-Medium | Process terminated by OS kernel (`SIGKILL`); in-flight requests dropped. | Unhandled memory leak terminates Node process immediately. | Enforce Docker `--memory=512m` and `--max-old-space-size=400`. Prometheus `nodejs_heap_size_used_bytes` alert at 80%. |
| **DNS Resolver** | Resolution failure / split-brain | Low | All hostnames fail to resolve (`ENOTFOUND`). Cryptic connection failures. | Requests hang until OS socket timeout, then return unstructured 500. | Cache resolved IP addresses in-memory; use internal container DNS with fallback. |
| **System Clock** | NTP drift / Clock skew | Low | JWT auth tokens fail validation prematurely or allow expired tokens. | Cryptic 401 Unauthorized errors on valid tokens. | Container host synchronizes with chrony/NTP; alert if offset exceeds 500ms. |

---

## 4. Failure Simulations & Empirical Verification

### Failure Simulation 1: Database Hard Stop
- **Action:** Executed `docker stop upsk-sdf-mongo` to simulate catastrophic database failure.
- **Expected Behavior:** API fails fast with `503 Service Unavailable` or handled error response without hanging indefinitely.
- **Actual Behavior:** `GET /links/invalid-id` hung for 5000ms until Mongoose `serverSelectionTimeoutMS` expired, returning an unhandled 500 error: `MongooseServerSelectionError: connect ECONNREFUSED 127.0.0.1:27017`.
- **Observed Blast Radius:**
  - Client experience: 5-second frozen spinner followed by generic 500.
  - Telemetry: `http_requests_total{status="500"}` incremented; Prometheus `HighErrorRate` rule triggered.
- **Identified Gap:** The application lacked an immediate health-check circuit breaker to fail fast within 200ms when database connectivity drops.

### Failure Simulation 2: Aggressive 1ms Dependency Timeout
- **Action:** Simulated an ultra-slow external dependency by setting an `AbortSignal.timeout(1)` on network calls.
- **Expected Behavior:** Fast cancellation with clean fallback or handled `504 Gateway Timeout`.
- **Actual Behavior:** An unhandled `AbortError / TimeoutError` was thrown, triggering an internal 500 status rather than a controlled gateway timeout.
- **Observed Blast Radius:**
  - Client experience: Rapid failure, but error response lacked semantic `code` and `Retry-After` headers.
  - Telemetry: Logged as an unexpected exception rather than expected dependency latency shedding.
- **Identified Gap:** Missing error boundary to translate dependency `AbortError` / `ETIMEDOUT` into structured `504` responses with circuit breaker tracking.

---

## 5. Risk Surface & Action Plan

- **Risk Surface Score:** 8 out of 10 identified failure modes currently produce unhandled 500s or thread-starving latency before remediation.
- **Mitigation Deliverables for Module 06:**
  1. **Circuit Breakers:** Implement state machines (Closed, Open, Half-Open) around all external network and database operations.
  2. **Defensive Timeouts:** Set strict SLAs (`timeout: 2000ms`) on all outgoing connections.
  3. **Graceful Fallbacks:** Route cached reads through fail-open fallback paths, while isolating write failures with explicit `503` contracts.

---

## 6. Post-Fix Handling & Re-simulation Validation

### Integrated Handling in `HttpExceptionFilter`
- **DNS Failure Handling:** Catches `ENOTFOUND` and `EAI_AGAIN`, immediately returns `503 Service Unavailable` with `code: DNS_RESOLUTION_FAILURE`, sets `Retry-After: 10`, and logs failure mode `dns_resolution_failure` in JSON format.
- **Database Connection Refusal:** Catches `ECONNREFUSED` and `MongooseServerSelectionError`, returns `503 Service Unavailable` with `code: DEPENDENCY_UNAVAILABLE` and `Retry-After: 5`.
- **Dependency Timeout:** Catches `AbortError`, `TimeoutError`, and `ETIMEDOUT`, returns `504 Gateway Timeout` with `code: GATEWAY_TIMEOUT`.

### Re-simulation Results
1. **Re-simulated DNS Failure (`ENOTFOUND`):**
   - User received clean `503 Service Unavailable` response with `Retry-After: 10` instead of a 5-second hang or raw stack trace.
   - Structured JSON error log contained: `level: error`, `failure_mode: "dns_resolution_failure"`, and matching `request_id`.
2. **Re-simulated 1ms Timeout:**
   - User received `504 Gateway Timeout` with semantic error code `GATEWAY_TIMEOUT`.
   - Telemetry accurately tracked upstream latency degradation without crashing worker processes.

