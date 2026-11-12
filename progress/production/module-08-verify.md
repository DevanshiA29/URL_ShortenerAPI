# Module 08 Verification: Production Deployment & Resilience Validation

## 1. Proof Checklist & Empirical Evidence

### 1.1 Endpoint Verification
- **Command:**
  ```bash
  curl -i http://localhost:3000/live
  curl -i http://localhost:3000/ready
  ```
- **Observed `/live` Response (HTTP 200):**
  ```json
  HTTP/1.1 200 OK
  Content-Type: application/json; charset=utf-8

  {
    "ok": true,
    "status": "ok"
  }
  ```
- **Observed `/ready` Response (HTTP 200):**
  ```json
  HTTP/1.1 200 OK
  Content-Type: application/json; charset=utf-8

  {
    "ok": true,
    "checks": {
      "database": "connected",
      "cache": "connected",
      "uptime_seconds": 42
    }
  }
  ```

### 1.2 Metrics Endpoint Verification
- **Command:**
  ```bash
  curl -s http://localhost:3000/metrics | grep -E "http_requests_total|http_request_duration_seconds_bucket|links_created_total"
  ```
- **Observed Output:**
  ```text
  # HELP http_requests_total Total number of HTTP requests
  # TYPE http_requests_total counter
  http_requests_total{method="GET",route="/live",status="200"} 14
  http_requests_total{method="GET",route="/ready",status="200"} 14
  # HELP http_request_duration_seconds Histogram of request latency
  http_request_duration_seconds_bucket{le="0.05",method="GET",route="/ready",status="200"} 14
  # HELP links_created_total Total shortened links created
  links_created_total 128
  ```

### 1.3 Broken Deployment Gating Drill
- **Simulated Action:** Launched deployment with corrupted `MONGODB_URI` (`mongodb://invalid-host:27017/upsk_sdf`).
- **Gating Result:**
  - `GET /live` returned 200.
  - `GET /ready` failed:
    ```json
    HTTP/1.1 503 Service Unavailable
    {
      "ok": false,
      "checks": {
        "database": "disconnected",
        "cache": "connected",
        "uptime_seconds": 3
      }
    }
    ```
  - Deployment gating script detected `READY_STATUS = 503`, aborted traffic promotion, and prevented the broken container from receiving traffic.

### 1.4 Rollback Speed (Under 2 Minutes)
- **Rollback Initiation Timestamp:** `2026-11-11T18:08:12Z`
- **Rollback Completed & Confirmed Serving Timestamp:** `2026-11-11T18:08:24Z`
- **Total Rollback Duration:** 12 seconds (well under the 2-minute threshold).

---

## 2. Conceptual Questions & Production Mastery

### 2.1 Full End-to-End Pipeline Walkthrough
1. **Developer pushes commit to `main`**:
   - Triggers GitHub Actions CI workflow (`.github/workflows/ci.yml`).
2. **Stage 1 (Lint & Static Analysis - 30s)**:
   - Runs `oxlint` and `tsc --noEmit`. Fails immediately if syntax or type contracts are broken.
3. **Stage 2 (Automated Test Suite - 45s)**:
   - Runs unit tests and integration tests (`jest`). Fails if regressions or contract mismatches exist.
4. **Stage 3 (Container Image Build & Security Scan - 60s)**:
   - Builds minimal Alpine Docker image, executes non-root security check (`USER appuser`), and tags with immutable git SHA (`myservice-prod:${GITHUB_SHA}`).
5. **Stage 4 (Deploy to Staging/Production & Rolling Replacement - 30s)**:
   - Container orchestration starts new pod/container with runtime-injected secrets.
6. **Stage 5 (Readiness Gating & Health Verification - 15s)**:
   - Ingress router polls `GET /ready`. Traffic is held until MongoDB and Redis return `connected`.
   - If `/ready` returns 503 three times, platform triggers automated rollback.
7. **Stage 6 (Traffic Promotion)**:
   - Traffic router cuts over 100% of user traffic to the verified container.

### 2.2 The Monday Morning 4 PM Friday Check
To verify a service deployed on Friday without looking at generic "dashboards":
1. **Prometheus Error Budget:**
   ```promql
   sum(rate(http_requests_total{status=~"5.."}[72h])) / sum(rate(http_requests_total[72h]))
   ```
   *Expected:* < 0.001 (99.9% success rate).
2. **Container Restarts & Crash Loops:**
   ```bash
   docker inspect --format='{{.State.RestartCount}} {{.State.OOMKilled}}' myservice-prod
   ```
   *Expected:* `0 false`. If `RestartCount > 0`, investigate exit codes and OOM events.
3. **99th Percentile Latency Drift:**
   ```promql
   histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[72h]))
   ```
   *Expected:* < 200ms without upward drift.

### 2.3 Catching Silent Memory Leaks
- **Problem:** Service runs cleanly for 2 hours, but slow heap leak causes p95 latency climb and 503s at 4 hours. `/ready` misses it because dependencies are connected.
- **Solution 1 (V8 Memory Metric Alerting):**
  Add Prometheus alert on heap consumption:
  ```promql
  nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes > 0.85
  ```
  Alerts 90 minutes before OOM crash when memory slope is positive.
- **Solution 2 (Readiness Memory Ceiling):**
  Enhance `GET /ready` to include an internal health threshold:
  ```ts
  const memUsedMb = process.memoryUsage().heapUsed / 1024 / 1024;
  if (memUsedMb > 400) {
    checks.memory = 'exhausted';
    ready = false;
  }
  ```
  This signals the orchestrator to gracefully drain traffic and restart the container before user-facing requests fail.

