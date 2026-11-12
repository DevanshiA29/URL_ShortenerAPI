# Module 08 Context: Deployment Verification & Zero-Downtime Releases

## Micro-Exercise 1: Liveness vs Readiness Truth

### What `GET /live` and `GET /ready` Check
1. **`GET /live` (Liveness Probe):**
   - **What it checks:** Validates strictly that the Node.js V8 process is running, the event loop is tick-responsive, and HTTP server sockets are accepting connections.
   - **What it misses:** If `/live` blindly returns `{"ok": true}`, it completely misses broken external downstream dependencies (e.g. database unreachable due to typo in connection string, Redis socket dropped, deadlocked connection pools). A service can have a green `/live` while 100% of real user requests fail with 500/503.
2. **`GET /ready` (Readiness Probe):**
   - **What it checks:** Validates that the service has active, functional connections to all critical dependencies (executes a fast `db.admin().ping()` to MongoDB and `redis.ping()` to Redis).
   - **Traffic gating:** If readiness returns non-200, the ingress router/load balancer immediately removes the pod/container from the active traffic pool, preventing users from receiving broken 500 errors during startup or connection partitions.

---

## Micro-Exercise 2: Post-Deploy Error Rate Surge & First Two Minutes Triage

### How Notification Happens
- Prometheus evaluates the alerting rule `HighErrorRate` continuously:
  `rate(http_requests_total{status=~"5.."}[2m]) / rate(http_requests_total[2m]) > 0.05`
- Alertmanager routes this alert to PagerDuty with `severity: critical`, paging the on-call engineer via phone call/SMS and pushing a critical alert notification into Slack `#incident-room`.

### The First Two Minutes Checklist
1. **Minute 0:00 - 0:30 (Acknowledge & Confirm Deployment Correlation):**
   - Acknowledge PagerDuty page so escalation does not trigger.
   - Check deployment timestamp: A deployment occurred 2 minutes ago. Correlation is established immediately.
2. **Minute 0:30 - 1:00 (Halt Traffic Routing / Initiate Rollback):**
   - Immediately trigger automated rollback to the previous known good deployment hash:
     ```bash
     docker stop myservice-api-prod
     docker run -d --name myservice-api-prod --restart unless-stopped -p 8080:8080 --env-file .env myservice-prod:previous-stable
     ```
3. **Minute 1:00 - 2:00 (Verify Recovery):**
   - Run verification probe against live endpoint:
     ```bash
     curl -f -s http://localhost:3000/ready
     ```
   - Confirm error rate in Prometheus drops back to <0.1%.
   - Post incident status update in `#incident-room`: "Rollback completed to tag v1.4.1; error rate normalized. Root cause investigation underway."

