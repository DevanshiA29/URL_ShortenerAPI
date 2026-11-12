# Module 07 Context: Operational Runbooks & 3 AM Triage

## Micro-Exercise 1: Environment Variables & External Dependencies (From Memory)

### External Dependencies
1. **PostgreSQL Database**: Primary relational datastore for links, clicks, users, and audit logs.
2. **Redis**: In-memory cache for hot link resolution and backing store for BullMQ asynchronous jobs.

### Critical Environment Variables
- `PORT`: HTTP listener port (e.g., `3000`).
- `DATABASE_URL`: Connection string (`postgresql://postgres:postgres@localhost:5432/link_shortener`).
- `REDIS_URL` or `REDIS_HOST` / `REDIS_PORT`: Redis cache and queue connection endpoints.
- `JWT_SECRET`: Signing secret for authentication tokens.
- `APP_ENV`: Environment identifier (`development`, `staging`, `production`).
- `LOG_LEVEL`: Log verbosity level (`debug`, `info`, `warn`, `error`).

---

## Micro-Exercise 2: 3 AM "Service is Slow" Initial Triage Commands

If paged at 3 AM for high latency / service slow degradation, run three exact, non-destructive diagnostic commands:

1. **Check process and container health & resource saturation**:
   ```bash
   docker stats --no-stream myservice-prod
   ```
   *(Checks whether CPU is pinned at 100%, memory is swapping, or network I/O is saturated.)*

2. **Inspect recent error logs and latency telemetry**:
   ```bash
   docker logs --tail 200 myservice-prod | grep -E "ERROR|WARN|duration|timeout"
   ```
   *(Surfaces immediate database query timeouts, pool exhaustion, or external network failures.)*

3. **Verify connectivity and query latency to downstream dependencies (Postgres/Redis)**:
   ```bash
   docker exec -it myservice-prod sh -c "nc -zv \$DB_HOST \$DB_PORT && nc -zv \$REDIS_HOST \$REDIS_PORT"
   ```
   *(Confirms network reachability and socket establishment to dependent datastores without modifying state.)*

