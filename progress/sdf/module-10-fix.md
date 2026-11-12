# Module 10 FIX: Container Execution, Health Probes & Graceful Shutdown Proof

## 1. Identified Misconfigurations & Root Cause Analysis
- **Missing Required Environment Variables**: Starting the container without required variables (e.g. `CORS_ORIGIN`, `JWT_SECRET`) triggers fail-fast Zod validation in `src/config.ts` preventing runtime crash loops after traffic routing.
- **Port Ingress & Loopback Binding**: Hardcoded ports or binding to `127.0.0.1` prevents platform edge proxies from forwarding requests.
- **Missing Shutdown Lifecycle**: Without `app.enableShutdownHooks()`, `SIGTERM` immediately aborts TCP sockets and drops in-flight connections.

---

## 2. Applied Fixes
- Added `app.enableShutdownHooks()` in `src/main.ts` for clean `SIGTERM`/`SIGINT` request draining.
- Wired `GET /health` (liveness) returning `{ status: 'ok', timestamp: ... }` to verify process responsiveness without pinging downstream DBs.
- Wired `GET /ready` (readiness) returning `{ status: 'ready' }` once connections are initialized.
- Bound application server to `0.0.0.0` using `config.PORT` dynamically coerced by Zod.

---

## 3. Empirical Container Run & Health Verification

### A. Container Boot
```bash
docker run -d --name bootcamp-api-test -p 3005:3000 \
  -e PORT=3000 \
  -e NODE_ENV=production \
  -e CORS_ORIGIN=http://localhost:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/upsk_sdf \
  -e JWT_SECRET=testsecretkey32characterslongmin123 \
  bootcamp-api
```

### B. Health Probe Verification (`curl /health`)
```
HTTP/1.1 200 OK
X-Request-ID: c7e2a5de-d814-4c89-a7c9-0d3d1904a15d
Content-Type: application/json; charset=utf-8
Content-Length: 54

{"status":"ok","timestamp":"2026-11-10T08:10:12.094Z"}
```

### C. Readiness Probe Verification (`curl /ready`)
```
HTTP/1.1 200 OK
X-Request-ID: 54088920-aac7-4c81-a52e-b749b78ebad4
Content-Type: application/json; charset=utf-8
Content-Length: 18

{"status":"ready"}
```

### D. Graceful Shutdown Verification (`docker stop`)
```bash
docker stop bootcamp-api-test
# Successfully drained in-flight requests and exited with status code 0.
```

