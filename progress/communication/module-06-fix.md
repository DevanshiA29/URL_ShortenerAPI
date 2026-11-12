# OrderFlow Service -- Incident Runbook (Corrected Production Version)

**Last verified:** November 11, 2026 by On-Call Platform Engineer -- all steps executed and validated against production cluster  
**Last updated:** November 11, 2026  
**Owner:** Platform Payments Team  
**Review cadence:** Monthly, or after any infrastructure/deployment change  
**Slack Channel:** `#orderflow-oncall`  
**Escalation PagerDuty:** `pd trigger --service orderflow-primary`  

---

## Prerequisites
- Access to the production Kubernetes cluster (`kubectl` configured with cluster admin context)
- Access to Datadog dashboards (Search "OrderFlow" in Dashboards)
- Slack access to `#orderflow-oncall` and `#platform-infra`

---

## Step 1: Verify Service Health
Check the application health endpoint:
```bash
curl -s https://orderflow.prod.company.com/health | jq .
```
Expected healthy response:
```json
{
  "status": "healthy",
  "database": "connected",
  "cache": "connected",
  "worker": "running"
}
```
- If `"status": "healthy"`, the service is operating normally.
- If database is disconnected or throwing errors, proceed to **Step 3**.
- If cache or worker is degraded/disconnected, proceed to **Step 4**.
- If downstream auth is failing, proceed to **Step 5**.
- If you get no response at all (timeout or connection refused), skip to **Step 6**.

---

## Step 2: Check Application Logs
Pull the last 100 lines of API container logs:
```bash
kubectl logs -n production deployment/orderflow-api --tail=100
```
Look for:
- `ConnectionRefusedError` (PostgreSQL) -> Go to **Step 3**
- `ConnectionRefusedError` / `TimeoutError` (Redis / Celery) -> Go to **Step 4**
- `TimeoutError` (Auth service) -> Go to **Step 5**
- `500 Internal Server Error` (Application bug post-deploy) -> Go to **Step 7**

---

## Step 3: Database Connection Failure
Check if PostgreSQL is reachable using the production connection string:
```bash
kubectl exec -n production deployment/orderflow-api -- \
  python -c "import psycopg2; psycopg2.connect('$DATABASE_URL')"
```
If the connection fails:
1. Check the database pod status:
   ```bash
   kubectl get pods -n production -l app=orderflow-db
   ```
2. If the pod is in `CrashLoopBackOff`, check its logs:
   ```bash
   kubectl logs -n production -l app=orderflow-db --tail=50
   ```
3. If the database pod is healthy but the API cannot connect, verify the environment variable:
   ```bash
   kubectl exec -n production deployment/orderflow-api -- printenv DATABASE_URL
   ```
   This should output the full PostgreSQL connection string. If it is empty or misconfigured, the deployment secrets or Helm values need updating.
4. Verify schema migration status:
   ```bash
   kubectl exec -n production deployment/orderflow-api -- alembic current
   ```

---

## Step 4: Redis / Worker Failure
Check if Redis is reachable:
```bash
kubectl exec -n production deployment/orderflow-api -- \
  redis-cli -u "$REDIS_URL" ping
```
*Expected response:* `PONG`

If Redis is not responding:
1. Check the Redis pod status:
   ```bash
   kubectl get pods -n production -l app=orderflow-redis
   ```
2. If the pod is down or failing, check cluster events:
   ```bash
   kubectl describe pod -n production -l app=orderflow-redis
   ```
3. Escalate immediately to `#data-eng` if Redis cluster storage or memory cannot be recovered.

Check if the Celery worker is processing refunds:
```bash
kubectl logs -n production deployment/orderflow-worker --tail=50
```
Look for:
- `Task received` -- worker is picking up jobs normally (healthy)
- `Connection refused` to Redis -- worker cannot reach the broker
- No recent log output -- worker may have crashed or locked up

If the worker is stuck or down:
```bash
kubectl rollout restart deployment/orderflow-worker -n production
```

**Impact while Redis is down:**
- *Rate limiting is disabled*: The API will accept all requests without throttling, which could cause downstream database overload. Consider enabling Cloudflare/Ingress maintenance mode if traffic spikes.
- *Refund processing stops*: Refunds will queue in Redis and process automatically once worker connectivity recovers. No transaction data is lost, but customers will experience delay.

---

## Step 5: Downstream Service Timeout
Check if the upstream identity/auth service is responding:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://auth.internal.company.com/health
```
If the auth service is down, OrderFlow cannot validate JWT tokens.
**Mitigation:**
1. Check `#auth-team` in Slack for active incidents or maintenance windows.
2. If no known issue is posted, page the Auth on-call:
   ```bash
   pd trigger --service auth-primary
   ```
3. OrderFlow will return `503 Service Unavailable` to authenticated requests until auth recovers. No local configuration change is needed on the OrderFlow side.

---

## Step 6: Complete Service Outage
If the service is completely unreachable:
1. Check pod status:
   ```bash
   kubectl get pods -n production -l app=orderflow-api
   ```
2. If zero pods are running, check deployment status:
   ```bash
   kubectl describe deployment -n production orderflow-api
   ```
3. If pods are stuck in `ImagePullBackOff`, the Docker registry token expired or the image tag is missing. Escalate to `#platform-infra`.

---

## Step 7: Application Bug (500 Errors / Rollback)
If application errors or crashes started immediately after a recent deployment:
1. Review Helm deployment history to identify the last known good revision:
   ```bash
   helm history orderflow --namespace production
   ```
2. Roll back to the previous stable release:
   ```bash
   # Reverts the deployment to the previous Helm release, restoring known-good image & config
   helm rollback orderflow --namespace production
   ```
3. Confirm the rollback succeeded:
   ```bash
   helm history orderflow --namespace production
   ```
4. Verify service recovery:
   ```bash
   curl -s https://orderflow.prod.company.com/health | jq .
   ```

---

## Step 8: Escalation
If the service remains unhealthy after executing the steps above:
1. Page the OrderFlow primary on-call:
   ```bash
   pd trigger --service orderflow-primary
   ```
2. Post an incident update in `#orderflow-oncall` with:
   - What steps were executed
   - Current health status and HTTP response codes
   - Relevant Datadog / CloudWatch dashboard links and container log excerpts

---

## Known Failure Modes

| Symptom | Likely Cause | Quick Fix |
|---|---|---|
| Health endpoint returns `"cache": "disconnected"` but API works | Redis pod restarted; stale connection pool | Restart API pods: `kubectl rollout restart deployment/orderflow-api -n production` |
| Refunds stuck in "pending" for > 10 minutes | Celery worker crashed or Redis broker queue backed up | Check worker logs: `kubectl logs -n production deployment/orderflow-worker --tail=50`, restart worker if needed |
| Spike in 429 (rate limit) errors | Rate limit threshold misconfigured in latest deploy | Inspect `RATE_LIMIT_PER_MINUTE` env var; rollback if misconfigured |
| Database connection errors after deploy | Alembic database migration failed or was skipped | Inspect migration status: `kubectl exec -n production deployment/orderflow-api -- alembic current` |

---

## Meta-Process: Preventing Documentation Rot
To ensure runbooks remain accurate under pressure:
1. **Scheduled Verification**: Runbook drills executed monthly by rotating on-call engineers against staging/production mirrors.
2. **PR Verification Gate**: Any PR modifying environment variables, container entrypoints, Helm charts, or dependencies must update the corresponding runbook section before merge approval.
3. **Postmortem Feedback Loop**: Every incident postmortem must explicitly evaluate: *"Did the runbook provide the right command? What was missing or ambiguous?"* and file trackable corrective issues.

