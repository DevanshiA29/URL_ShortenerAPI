# Incident Runbooks: URL Shortener API

This document provides step-by-step operational runbooks for the top 3 production failure modes identified in our Failure Mode Analysis.

> [!NOTE]
> All runbooks use standardized container targeting: `CONTAINER_NAME=$(docker ps -a --filter "name=myservice" --format "{{.Names}}" | grep -E "api|prod" | head -n 1)` with default fallback to `myservice-api-prod`. Ingress proxy sidecar is `myservice-proxy` (port 3000 -> 8080).

---

## Runbook: Database Connection Pool Exhaustion & Database Failure

### Alert / Detection
- **Alert Name:** `HighErrorRate`
- **Symptoms:**
  - Alert fired: Error rate exceeds 5% over 5 minutes.
  - Endpoints returning HTTP 500 or 503 Service Unavailable on write paths (`POST /links`).
  - Grafana shows `http_requests_total{status=~"5.."}` surging while database connection count reaches maximum configured pool limit (100).

### Triage (First 5 Minutes)
1. **Discover active container and check application logs**:
   ```bash
   CONTAINER=$(docker ps -a --filter "name=myservice" --format "{{.Names}}" | grep -E "api|prod" | head -n 1)
   docker logs --tail 100 "$CONTAINER" | grep -E "MongooseServerSelectionError|ECONNREFUSED|pool exhausted"
   ```
   - **Positive case (problem confirmed):** Output displays `MongooseServerSelectionError: connection timed out` or `MongoPoolClearedError`. Proceed to mitigation.
   - **Negative case (not database connection):** Output is empty. Investigate other causes (check memory/CPU saturation via `docker stats`).

2. **Verify database process health and active connection counts**:
   ```bash
   docker exec -it upsk-sdf-mongo mongosh --eval "db.serverStatus().connections"
   ```
   - **Positive case (pool exhausted):** `current` is equal to or approaching `available` (e.g. `current: 100, available: 0`).
   - **Negative case (healthy connections):** `current: 12, available: 88`.

3. **Verify network reachability from container to database**:
   ```bash
   CONTAINER=$(docker ps -a --filter "name=myservice" --format "{{.Names}}" | grep -E "api|prod" | head -n 1)
   docker exec -it "$CONTAINER" nc -zv upsk-sdf-mongo 27017
   ```
   - **Positive case (healthy network):** `Connection to upsk-sdf-mongo 27017 port [tcp/*] succeeded!`
   - **Negative case (network partition):** `nc: connect to upsk-sdf-mongo port 27017 (tcp) failed: Connection refused` or command hangs.

### Mitigation (Immediate Relief)
1. **Restart the application and proxy sidecar to drain saturated pools**:
   ```bash
   CONTAINER=$(docker ps -a --filter "name=myservice" --format "{{.Names}}" | grep -E "api|prod" | head -n 1)
   docker restart "$CONTAINER" myservice-proxy
   ```
   - **Expected Output:** Names of restarted containers printed within 3 seconds.
2. **If database daemon crashed or was unreachable, start MongoDB container**:
   ```bash
   docker start upsk-sdf-mongo
   ```
   - **Expected Output:** `upsk-sdf-mongo`
3. **Verify service recovery via readiness endpoint**:
   ```bash
   curl -s http://localhost:3000/ready
   ```
   - **Expected Output:** `{"status":"ok","checks":{"database":"connected"}}` (HTTP 200).

### Root Cause Investigation (Post-Mitigation)
1. Query MongoDB slow query logs for unindexed full collection scans:
   ```bash
   docker exec -it upsk-sdf-mongo mongosh --eval "db.system.profile.find({millis:{$gt:1000}}).pretty()"
   ```
2. Inspect connection leaks in connection lifecycle modules (`src/database/`).
3. Correlate with recent deployments or traffic spikes in Prometheus.

### Escalation Path
- **Timeline:** If service readiness does not recover within 10 minutes of container restart.
- **Contact:** Page Database Reliability Engineer (`@dba-oncall` via PagerDuty Level 2) and notify `#incident-room`.

---

## Runbook: Cache Stampede / High Latency Degradation

### Alert / Detection
- **Alert Name:** `HighLatency`
- **Symptoms:**
  - Alert fired: 95th percentile latency exceeds 2 seconds over 3 minutes.
  - Users experience slow redirect resolution (>2000ms).
  - Grafana shows p95 `http_request_duration_seconds` spike on `GET /links/:code`.
  - Redis cache hit ratio drops below 60%.

### Triage (First 5 Minutes)
1. **Check Redis status and responsiveness**:
   ```bash
   docker exec -it upsk-sdf-redis redis-cli ping
   ```
   - **Positive case (healthy Redis):** Returns `PONG` within 5ms.
   - **Negative case (Redis hung/down):** Returns `Could not connect to Redis at 127.0.0.1:6379: Connection refused` or hangs.

2. **Inspect Redis memory usage and eviction stats**:
   ```bash
   docker exec -it upsk-sdf-redis redis-cli info memory
   docker exec -it upsk-sdf-redis redis-cli info stats | grep -E "evicted_keys|keyspace_misses"
   ```
   - **Positive case (memory pressure / eviction spike):** `used_memory` is at `maxmemory`, and `evicted_keys` is rapidly increasing.
   - **Negative case (normal cache):** `evicted_keys: 0`, `used_memory` well below limits.

3. **Check for slow Redis commands blocking single-threaded event loop**:
   ```bash
   docker exec -it upsk-sdf-redis redis-cli slowlog get 10
   ```
   - **Positive case (blocking operations):** Slowlog entries show `KEYS *` or large range scans taking >50ms.
   - **Negative case (clean operations):** Slowlog is empty (`(empty array)`).

### Mitigation (Immediate Relief)
1. **If Redis is unresponsive or deadlocked, restart the Redis container**:
   ```bash
   docker restart upsk-sdf-redis
   ```
   - **Expected Output:** `upsk-sdf-redis`
2. **Restart API service and warm up critical endpoints**:
   ```bash
   CONTAINER=$(docker ps -a --filter "name=myservice" --format "{{.Names}}" | grep -E "api|prod" | head -n 1)
   docker restart "$CONTAINER"
   curl -s http://localhost:3000/live > /dev/null
   ```
   - **Expected Output:** Container restarted and probe returns 200.
3. **Verify latency reduction and cache warmup**:
   ```bash
   curl -w "HTTP: %{http_code} | Time: %{time_total}s\n" -o /dev/null -s "http://localhost:3000/live"
   ```
   - **Expected Output:** `HTTP: 200 | Time: 0.005s`

### Root Cause Investigation (Post-Mitigation)
1. Audit cache key invalidation patterns (did a bulk purge invalidate viral link keys?).
2. Verify Redis memory limits and eviction policy (`allkeys-lru` vs `noeviction`).
3. Evaluate whether mutex-locking on cache fill (singleflight) is required for hot viral keys.

### Escalation Path
- **Timeline:** If p95 latency remains above 2000ms 10 minutes post-restart.
- **Contact:** Page Cache & Performance Lead (`@perf-oncall` via Slack `#incident-room`) and escalate to Primary On-Call.

---

## Runbook: Service Down / Node.js Runtime Crash (OOM or Port Collision)

### Alert / Detection
- **Alert Name:** `ServiceDown`
- **Symptoms:**
  - Alert fired: `up == 0` for more than 1 minute.
  - Service container is in `Exited (137)` (OOM killed) or `Restarting` loop.
  - All HTTP requests fail immediately (`curl: (7) Failed to connect to localhost port 3000`).

### Triage (First 5 Minutes)
1. **Inspect container state and exit code**:
   ```bash
   docker ps -a --filter "name=myservice" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
   ```
   - **Positive case (crash confirmed):** Status shows `Exited (137)` (OOM) or `Exited (1)` (uncaught exception).
   - **Negative case (container running):** Status shows `Up X minutes`.

2. **Inspect container crash logs**:
   ```bash
   CONTAINER=$(docker ps -a --filter "name=myservice" --format "{{.Names}}" | grep -E "api|prod" | head -n 1)
   docker logs --tail 50 "$CONTAINER"
   ```
   - **Positive case (fatal crash reason visible):** Shows `FATAL ERROR: Ineffective mark-compacts near heap limit Allocation failed - JavaScript heap out of memory` or `Error: listen EADDRINUSE: address already in use :::8080`.
   - **Negative case (clean exit):** Logs show clean shutdown `SIGTERM received`.

3. **Inspect port binding conflicts**:
   ```bash
   lsof -i :3000 && lsof -i :8080
   ```
   - **Positive case (port occupied by rogue process):** Shows another PID holding port 3000 or 8080.
   - **Negative case (port available):** Command produces no output.

### Mitigation (Immediate Relief)
1. **Re-create and launch container with 1GB memory allocation**:
   ```bash
   docker rm -f myservice-api-prod || true
   docker run -d --name myservice-api-prod --restart unless-stopped -p 8080:8080 -m 1g --env-file .env myservice-prod:latest
   ```
   - **Expected Output:** New container hash printed.
2. **Verify container health and liveness probe through proxy**:
   ```bash
   curl -s http://localhost:3000/live
   ```
   - **Expected Output:** `{"status":"ok"}` (HTTP 200).

### Root Cause Investigation (Post-Mitigation)
1. Review Node.js memory profile and heap allocations before crash in Prometheus metrics (`nodejs_heap_size_used_bytes`).
2. Audit recent commits for unbounded in-memory caches, missing pagination, or event listener leaks.
3. Check ingress logs for malicious payloads triggering buffer exhaustion.

### Escalation Path
- **Timeline:** If container exits repeatedly within 5 minutes of restart.
- **Contact:** Page Senior Systems Architect (`@architect-oncall`) and notify Core Platform team.
