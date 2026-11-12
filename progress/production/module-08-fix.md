# Module 08 Fix: Hardening Deployment Verification, Memory Profiling & GitOps Enforcement

## 1. Resolution of the Three Incidents

### Fix 1: Deep Business Route Smoke Testing
- **Problem:** `/ready` only evaluated socket reachability to MongoDB and Redis, blinding operators to broken business routes or collection-level permission errors.
- **Solution:** Updated `scripts/deploy.sh` to execute Stage 5 Business Smoke Check:
  ```bash
  curl -s -X POST "http://localhost:3000/links" \
    -H "Content-Type: application/json" \
    -d '{"originalUrl":"https://example.com/smoke-test","alias":"smoke-test"}'
  ```
- **Rule:** A deployment is only promoted to `stable` if BOTH `/ready` returns 200 AND the business smoke check returns 200/201. If the business smoke test fails, automated rollback is triggered immediately.

### Fix 2: Bounding Memory & Heap Profiling
- **Problem:** Monotonically increasing heap consumption from unbounded cache accumulation.
- **Solution:**
  - Enforced strict LRU eviction policies and TTL expiration across all in-memory cache and Redis mappings.
  - Configured V8 memory bounds in Docker execution (`--max-old-space-size=400` with container limit `-m 1g`).
  - Added Prometheus heap metric alert in `alerts.yml`:
    ```yaml
    - alert: HighMemoryUsage
      expr: nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes > 0.85
      for: 5m
      labels:
        severity: warning
      annotations:
        summary: "Node.js heap memory usage exceeds 85%"
        runbook: "https://wiki.example.com/runbooks/high-memory"
    ```

### Fix 3: GitOps Enforcement & Config Drift Prevention
- **Problem:** Configuration drift caused by direct out-of-band mutations in the cloud platform GUI.
- **Solution:**
  - Established strict GitOps baseline: All environment variables must be declared in `.env.example` and committed to infrastructure repository configs.
  - Restricted console edit permissions via IAM role policies (read-only in console; write access restricted to CI/CD service principal).
  - Added startup configuration integrity validation in `src/main.ts` to log any discrepancies between expected schema and runtime environment.

---

## 2. Updated Runbook Integration
Updated `docs/runbooks.md` with:
- **Runbook: Post-Deploy Business Route Failure (Shallow Readiness Bypass)** detailing exact curl verification steps and rollback protocols.
- **Runbook: Gradual Memory Leak / OOM Risk** detailing heap dump capture via `v8.getHeapSnapshot()` and container memory profiling.

---

## 3. End-to-End Verification
- Re-ran `npm run build`: Exit code 0.
- Executed `scripts/deploy.sh`: Verified all 5 stages passed:
  1. Image build successful.
  2. Stable image preserved.
  3. Container started.
  4. Liveness & readiness probes returned 200.
  5. Post-deploy business smoke test returned HTTP 201/200.
- Result: Promoted to `myservice-prod:stable`.

