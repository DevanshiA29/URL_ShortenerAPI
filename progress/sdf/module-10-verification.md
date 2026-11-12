# Module 10 Verification: Deployment Architecture, Health Probes & Failure Modes

## 1. What Breaks If PORT Is Hardcoded
- Cloud platforms (Railway, Cloud Run, Heroku, AWS ECS) assign dynamic listening ports at runtime via `process.env.PORT`.
- If an application hardcodes `3000`, the platform's edge router attempts to route incoming traffic to the assigned dynamic port. The socket connection is refused, readiness health checks fail, and the platform reports a deployment timeout or 502 Bad Gateway.

## 2. Health (Liveness) vs Readiness Checks
- **Health / Liveness Check (`/health`, `/live`)**:
  - **What it checks**: Process vitality — is the Node.js event loop responsive and able to handle HTTP cycles?
  - **What it MUST NOT check**: Downstream dependencies (MongoDB, Redis, third-party APIs). If a database has a temporary latency spike, failing liveness causes the orchestrator to reboot all healthy containers simultaneously, creating a catastrophic cascading restart storm.
- **Readiness Check (`/ready`)**:
  - **What it checks**: Can this specific replica handle user traffic right now? Verifies that database connection pools and cache connections are established and active.
  - **Why**: Prevents the load balancer from sending traffic to newly starting pods during a rolling update before dependencies are ready.

## 3. What Graceful Shutdown Protects
- When orchestrators issue a `SIGTERM` signal during deployments or autoscaling:
  - Graceful shutdown stops accepting new incoming HTTP connections.
  - Allows in-flight HTTP requests and BullMQ background jobs to complete cleanly within a timeout window (e.g. 15s).
  - Flushes in-memory telemetry batches and cleanly closes MongoDB/Redis connection pools.
  - Prevents socket hang-ups, dropped requests, and corrupted writes during rolling deployments.

## 4. Production Timeout Configuration
- **Database Query Timeout**: `maxTimeMS(1000)` (1 second) prevents unindexed queries or runaway regex from holding database threads indefinitely.
- **Circuit Breaker Timeout**: 3000ms with 50% error threshold prevents upstream thread exhaustion when MongoDB is slow.
- **Server Shutdown Timeout**: 15 seconds grace period before `SIGKILL` ensures hanging connections are terminated cleanly.

## 5. Rollback Strategy for Production Migration Failures
- **Decoupled Execution**: Migrations execute as a one-off pre-deploy task rather than inside multi-replica pod entrypoints.
- **Expand-and-Contract Architecture**: All schema changes must be backward-compatible (e.g. adding new optional fields; never dropping fields still read by running pods).
- **Automated Rollback**: If the migration pre-deploy task exits non-zero, the CI/CD pipeline aborts the deployment before rolling out new containers. Running pods remain healthy and unaffected.
- **Artifact Tagging**: Reverting an application deploy requires only rolling back the container image tag to the previous known-good git commit SHA (`ghcr.io/...:<commit-sha>`).

## 6. Build-Time vs Runtime Configuration
- **Build-Time Configuration**: Compile-time assets baked into the immutable Docker image (e.g. OS dependencies, node modules, compiled TypeScript). Secrets must NEVER be injected at build time, as they persist forever in docker image layers.
- **Runtime Configuration**: Dynamic values supplied at container boot via environment variables (`PORT`, `MONGODB_URI`, `JWT_SECRET`). Enables running the identical container artifact across dev, staging, and production environments.

