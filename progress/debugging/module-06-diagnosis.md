# Module 06 Diagnosis: Multi-Layer Distributed Failures

## Executive Summary
This document provides complete architectural root-cause analyses and verification procedures for two insidious multi-layer production bugs:
1. **Bug #9**: Stale Cache Serving Deleted Records (Cache Invalidation Failure)
2. **Bug #10**: Queue Retry Storm Causing API Deadlock (Connection Pool Starvation)

---

## Bug #9: Stale Cache Serving Deleted Records

### Incident Description
An administrator issued a `DELETE /api/links/:id` request. The API returned HTTP 200, and direct database inspection confirmed the link record was deleted. However, navigating to the short code (`GET /r/:code`) continued returning HTTP 302 redirects to the destination URL for up to 5 minutes.

### Hypothesis-Driven Investigation
1. **Hypothesis 1 (Database Delete Failure)**: The DELETE operation failed silently or rolled back, leaving the database row intact.
   - *Test*: Executed direct database query `db.links.find({ _id: ObjectId(id) })`.
   - *Result*: Record not found. Hypothesis 1 disproven.
2. **Hypothesis 2 (Cache Invalidation Handoff Failure)**: The database delete succeeded, but the redirect handler serves from Redis cache with a 5-minute TTL without cache-aside eviction on mutations.
   - *Test*: Inspected Redis key `cache:redirect:<codevia redis-cli`.
   - *Result*: Cache key present with valid target URL. Hypothesis 2 confirmed.

### Architectural Root Cause
The delete endpoint (`links.service.ts -> delete()`) performed a database deletion (`this.linkModel.findByIdAndDelete(id)`) but omitted notifying the cache layer. In isolation, both components worked perfectly:
- Mongoose deleted the document accurately.
- Redis served cached keys accurately.
The failure was the missing contract boundary: mutations must invalidate corresponding cache keys immediately.

### Architectural Fix
In `src/links/links.service.ts`:
```typescript
await this.linkModel.findByIdAndDelete(id);
// Cache invalidation contract: immediately purge cached redirect target
await this.cacheService.invalidateRedirectTarget(link.code);
```
Subsequent requests to `GET /r/:code` immediately result in cache miss, query the database, find nothing, and return HTTP 404 immediately with zero stale redirect window.

---

## Bug #10: Queue Retry Storm Causing API Deadlock

### Incident Description
The entire URL Shortener API became completely unresponsive. No uncaught exceptions were logged, CPU utilization was nominal, but all incoming HTTP requests and health check probes timed out after 30 seconds.

### Hypothesis-Driven Investigation
1. **Hypothesis 1 (Process Event Loop Deadlock)**: A catastrophic ReDoS or synchronous infinite loop blocked the Node.js event loop.
   - *Test*: Monitored CPU utilization and process diagnostics.
   - *Result*: CPU was < 2%, rejecting CPU-bound infinite loops or sync ReDoS.
2. **Hypothesis 2 (Shared Connection Pool Exhaustion)**: All database connections were checked out and held, causing incoming requests to queue infinitely in Mongoose driver wait queues.
   - *Test*: Inspected MongoDB connection pool metrics (`mongoose.connection.db.admin().serverStatus().connections`).
   - *Result*: 100% of connections (`maxPoolSize: 20`) were in use; 0 available. Hypothesis 2 confirmed.

### Chain of Causation Trace
1. An async click analytics job failed due to a transient schema mismatch or bad payload.
2. The queue worker retried the job immediately without backoff delay (`delay: 0`).
3. Each retry acquired a connection from the shared Mongoose connection pool.
4. The retry failed again with the exact same error.
5. In the absence of a maximum retry limit (`attempts: Infinity`), steps 2-4 repeated in a tight spin loop.
6. The shared connection pool was completely saturated within milliseconds.
7. Incoming HTTP API requests (`POST /api/links`, `GET /r/:code`, `/health`) attempted to acquire DB connections and hung indefinitely.
8. Health probes timed out, triggering false container restart loops.

### Three-Part Architectural Fix
1. **Exponential Backoff**: Configured BullMQ default job options with exponential backoff (`delay: 1000ms`, doubling on each attempt: 1s, 2s, 4s, 8s...) to eliminate tight retry loops.
2. **Max Retry Count & Dead-Letter Queue (DLQ)**: Capped retries at `attempts: 5`. Upon exhausting 5 attempts, jobs are routed to DLQ (`removeOnFail: false`) for human triage without infinite looping.
3. **Resource Isolation (Bulkhead Pattern)**:
   - Configured bounded worker concurrency (`concurrency: 5`) and explicit database pool size limits (`maxPoolSize: 20, serverSelectionTimeoutMS: 2000`).
   - Fast-fails timeouts after 2 seconds rather than hanging indefinitely, preventing unbounded socket backlog.

