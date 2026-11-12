# Service Overview: URL Shortener API

## 1. Purpose
The URL Shortener API is a high-throughput redirection service that converts long URLs into compact aliases and tracks link telemetry. It resolves shortened links via low-latency in-memory caching and stores link persistence and analytics in MongoDB.

---

## 2. Dependencies

| Dependency | Type | What Happens Without It | Fallback / Mitigation |
| :--- | :--- | :--- | :--- |
| **MongoDB** | Primary Datastore | Complete write outage; uncached reads fail with 503 Service Unavailable | Fail-closed: Mongoose fails fast with `serverSelectionTimeoutMS: 5000`; returns 503 with `Retry-After: 30`. |
| **Redis** | In-Memory Cache & Queue | Degraded read latency; telemetry buffered or delayed | Fail-open: Cache misses fall back directly to MongoDB; telemetry falls back to in-memory ring buffer. |
| **DNS Resolver** | Network Infrastructure | Outage connecting to external managed databases or webhooks | Internal DNS caching; container restarts if IP resolution completely stalls. |

---

## 3. Endpoints

### Operational Endpoints
- `GET /live`: Liveness probe. Returns HTTP 200 `{"status":"ok"}` indicating process event loop is active.
- `GET /ready`: Readiness probe. Returns HTTP 200 only if MongoDB and Redis connections are established; returns 503 if critical downstream dependencies are disconnected.
- `GET /metrics`: Prometheus telemetry scrape endpoint. Exposes standard Node.js V8 runtime metrics and custom HTTP latency/error counters.

### Business Endpoints
- `POST /links`: Creates a new short URL alias for a provided target URL. Requires valid payload; returns shortened URL entity.
- `GET /links/:code`: Redirect resolution endpoint. Fetches target URL from cache (or MongoDB fallback), records click event asynchronously, and returns HTTP 302 redirect.
- `GET /links/:code/stats`: Retrieves aggregated click analytics, referrer breakdowns, and access counts for a given link alias.

---

## 4. Configuration

Reference configuration template: [.env.example](file:///Users/devanshiawasthi/api/.env.example)

### Operational Controls
| Environment Variable | Operational Purpose | Default | Runtime Safe vs Requires Restart |
| :--- | :--- | :--- | :--- |
| `PORT` | HTTP server binding port | `3000` | Requires Restart |
| `MONGODB_URI` | Mongo connection string and replica credentials | `mongodb://localhost:27017/shortener` | Requires Restart |
| `REDIS_URL` | Redis cache and queue endpoint | `redis://localhost:6379` | Requires Restart |
| `DB_TIMEOUT_MS` | Maximum query execution timeout | `2000` | Requires Restart |
| `CIRCUIT_BREAKER_THRESHOLD` | Consecutive failures before tripping fallback | `5` | Requires Restart |
| `LOG_LEVEL` | Logging verbosity (`debug`, `info`, `warn`, `error`) | `info` | Safe via SIGHUP / Requires Restart |

---

## 5. Deployment Procedures

Automated CD deploys on merge to `main`. To execute or verify manual deployment:

```bash
# 1. Build and verify image locally or via container registry
docker build -t myservice-prod:latest .

# 2. Tag and deploy to container runner / Railway / Kubernetes
docker stop myservice-prod || true
docker run -d --name myservice-prod --restart unless-stopped -p 3000:3000 --env-file .env myservice-prod:latest

# 3. Verify deployment health immediately
curl -f -s http://localhost:3000/live || echo "Liveness FAILED"
curl -f -s http://localhost:3000/ready || echo "Readiness FAILED"
```

---

## 6. Rollback Procedures

If a deployment introduces regressions, execute immediate non-destructive rollback:

```bash
# 1. Roll back to the previous stable release tag
docker stop myservice-prod
docker run -d --name myservice-prod --restart unless-stopped -p 3000:3000 --env-file .env myservice-prod:previous-stable

# 2. Confirm rollback health
curl -f -s http://localhost:3000/live && curl -f -s http://localhost:3000/ready
```

---

## 7. Ownership & Escalation

- **Owning Team:** Core Platform & Reliability Engineering
- **Slack Channel:** `#team-platform-alerts` / `#incident-room`
- **Primary On-Call:** Platform Rotation Engineer (`@oncall-platform`)
- **Secondary On-Call:** Engineering Lead (`@tech-lead-platform`)
- **Escalation Threshold:** If no response or mitigation is achieved within 15 minutes of paging, escalate directly to the Engineering Director via PagerDuty Level 2 escalation.

