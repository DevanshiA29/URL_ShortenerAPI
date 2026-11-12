# Module 08 Build: Deployment Verification & Automated Rollback

## 1. Chunk 1: Platform Setup & Secret Hygiene
- **Deployment Platform:** Containerized deployment via Docker/Railway/Fly.io.
- **Environment & Secrets:**
  - Production variables injected strictly via runtime environment (`APP_ENV=production`, `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`).
  - Secrets are encrypted at rest by platform secrets management and never checked into source control or exposed in plaintext.
- **Local Fallback Execution:**
  - Fully verified against containerized runtime using `scripts/deploy.sh` and `scripts/rollback.sh`.

## 2. Chunk 2: Liveness + Readiness Hardening
- **`GET /live` Endpoint:**
  - Lightweight process check returning `{ ok: true, status: "ok" }`.
  - Zero external dependency checks to avoid cascading failures if external networks fluctuate.
- **`GET /ready` Endpoint:**
  - Evaluates MongoDB connection state (`connection.readyState === 1`).
  - Evaluates Redis cache responsiveness via `cacheService.ping()`.
  - Emits process `uptime_seconds`.
  - Returns HTTP 200 with `{ ok: true, checks: { database: "connected", cache: "connected", uptime_seconds: ... } }` when healthy.
  - Throws HTTP 503 `ServiceUnavailableException` when critical dependencies are unreachable, preventing the load balancer from routing traffic to unready pods.

## 3. Chunk 3: Zero-Downtime Deployment & Health Verification
- **Automated Script:** `scripts/deploy.sh`
- **Verification Logic:**
  - Tags current stable release before proceeding.
  - Builds new immutable image tag: `myservice-prod:<git-sha>`.
  - Deploys container with 1GB memory limit.
  - Executes active polling loop against `http://localhost:3000/live` and `http://localhost:3000/ready` for 20 seconds.
  - Verifies `/metrics` endpoint.
  - Promotes image to `myservice-prod:stable` only after all checks pass.

## 4. Chunk 4: Automated Rollback Drill
- **Automated Script:** `scripts/rollback.sh`
- **Mitigation Workflow:**
  - Invoked automatically if `/ready` fails during the deployment verification window.
  - Stops broken container and immediately relaunches `myservice-prod:stable`.
  - Verifies `/ready` and `/live` health on the restored version.
  - Reduces Mean Time to Recovery (MTTR) to under 10 seconds.

