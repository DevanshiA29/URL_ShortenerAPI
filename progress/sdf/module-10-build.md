# Module 10 BUILD Evidence: Production Deployment, Multi-Stage Container & CI/CD Pipeline

## 1. Container Architecture (`Dockerfile`)
- **Multi-Stage Build**:
  - Stage 1 (`deps`): `node:22-alpine` runs `npm ci --omit=dev --no-audit --no-fund`.
  - Stage 2 (`runner`): Minimal `alpine:3.21` with lightweight Node 22 runtime (<150MB image size).
  - Security: Non-root execution under unprivileged `appuser:appgroup`.
  - Networking: Binds to `0.0.0.0` on dynamically injected `PORT`.

## 2. Health & Readiness Observability (`src/app.controller.ts`)
- `GET /health` (Liveness): Returns `200 OK` with timestamp to verify the Node process is active and not hung.
- `GET /ready` (Readiness): Verifies Mongoose and Redis connectivity before admitting ingress traffic.
- Graceful Shutdown: `app.enableShutdownHooks()` active in `src/main.ts` ensuring `SIGTERM` and `SIGINT` drain in-flight connections without abrupt connection resets.

## 3. GitHub Actions CI Pipeline (`.github/workflows/ci.yml`)
- Automated execution on push/PR to `main`:
  - Ephemeral service containers: `mongo:7` and `redis:7-alpine`.
  - Quality gates: `npm run lint`, `npm test`, `npm run build`.
  - Container buildx validation: Builds `myservice:${{ github.sha }}` and enforces 200MB maximum image size budget.
  - Automated smoke test verification: Verifies container boot and `/live` health check response before registry publish.

## 4. Migration Strategy & Rollback Plan
- **Migration Strategy**: `one_off` (Run migrations as a discrete one-off job or pre-deploy hook rather than on multi-instance pod startup to avoid race conditions and schema deadlocks).
- **Rollback Plan**:
  - Kubernetes / Railway zero-downtime rolling deploys with automated rollbacks if `/ready` probes fail.
  - Immutable Docker tags (`ghcr.io/...:<git-sha>`) allow instant one-command traffic rollbacks to the previous verified release artifact.

