# Module 06 Context: Multi-Layer System Boundaries & Assumptions

## Boundary Analysis

### Boundary 1: HTTP API Handlers <-> Redis Cache (`GET /:code`)
- **Sender/Receiver**: Cache layer returns cached record to the HTTP Fastify route handler.
- **Assumed Contract**: The receiver assumes that any cached key represents an active, non-expired, non-revoked short URL that precisely mirrors the current state of the database.
- **Enforcement Status**: Merely *believed*. Invalidation is asynchronous or missing during soft-deletes/expiry updates. If the database deletes or flags a URL as expired, the cache continues serving stale redirects until TTL expiration, creating silent inconsistency.

### Boundary 2: Async Analytics/Queue Workers <-> Shared Database Connection Pool
- **Sender/Receiver**: Background worker threads dispatching click event writes into MongoDB/Postgres via the shared connection pool.
- **Assumed Contract**: The receiver (API request lifecycle) assumes background workers will not exhaust available database connection slots (`maxPoolSize`).
- **Enforcement Status**: Merely *believed*. Without segregated connection pools or semaphore backpressure, a traffic spike or aggressive retry loop in the worker pool starves the API threads of database connections, causing cascading 504 timeouts across unrelated endpoints.

### Boundary 3: Ingestion Gateway <-> Rate Limiter / In-Memory Counter
- **Sender/Receiver**: Client requests passing through rate limiting middleware to backend controllers.
- **Assumed Contract**: The rate limiter assumes distributed instances share an atomic, synchronized counter and that network latency to the rate limiter store is bounded under sub-millisecond timeouts.
- **Enforcement Status**: Partially enforced via Redis, but falls back to open bypass (fail-open) or thread-blocking latency under network degradation.

