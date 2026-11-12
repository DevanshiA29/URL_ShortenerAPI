# Module 08 Break: The Triple Production Anomaly

## 1. Symptom Overview
- Ingress dashboard shows 100% green; `GET /live` and `GET /ready` return HTTP 200.
- Customer-facing business endpoints (`POST /links` or `GET /links/:code`) return HTTP 500 errors.
- Telemetry shows gradual memory growth over time (`nodejs_heap_size_used_bytes` trending monotonically upward).
- A configuration variable was found mutated out-of-band directly on the platform host.

---

## 2. Diagnosis of the Three Issues

### Issue 1: Shallow Readiness vs Deep Business Route Failure
- **Root Cause:** `GET /ready` validated simple socket connectivity to MongoDB and Redis, but did NOT validate query execution, collection write permissions, or schema compatibility.
- **Why It Failed in Production:** An unapplied database migration or missing write permission on the `links` collection resulted in `MongoError: unauthorized / permission denied` on `POST /links`. Because `/ready` only checked `connection.readyState === 1`, it was blind to authorization and schema failures.

### Issue 2: Unbounded In-Memory Accumulation (Memory Leak)
- **Root Cause:** An in-process logging or metric accumulator (such as an unevicted array storing recent request traces or high-cardinality Prometheus labels) retains references in the V8 heap on every request.
- **Impact:** Garbage collection cannot reclaim these retained references. Heap usage climbs from 60MB to 450MB, eventually triggering an OS kernel OOM kill (`SIGKILL` / exit code 137).

### Issue 3: Out-of-Band Configuration Drift (Click-Ops)
- **Root Cause:** A developer altered a production secret/environment variable (e.g. `JWT_SECRET` or `CACHE_TTL`) directly via the platform web console during an ad-hoc debugging session rather than updating the declarative CI/CD configuration.
- **Impact:** Configuration in the repository no longer matches production. Subsequent automated pipeline deploys will unknowingly overwrite the console change or inherit inconsistent state, violating the principle of reproducible deployments.

