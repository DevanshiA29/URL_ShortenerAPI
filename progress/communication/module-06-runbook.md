# OrderFlow On-Call Runbook (3 AM Incident Response)

**Service**: `orderflow` (E-Commerce Order & Refund Processing Engine)  
**Primary Escalation Policy**: PagerDuty: `OrderFlow Primary`  
**War Room Channel**: Slack: `#orderflow-oncall`  
**Secondary Team Contacts**: Database: `#data-eng` | Infrastructure: `#platform-infra`  

---

## 1. Quick Triage & Health Assessment (First 2 Minutes)

Execute these checks immediately upon being paged:

### 1.1 Verify API Service Liveness & Readiness
```bash
# Check HTTP Status (Expect: 200 OK)
curl -i --max-time 3 https://orderflow.internal.company.com/health
curl -i --max-time 3 https://orderflow.internal.company.com/ready
```
- **Healthy Output**: `{"status":"ok","database":"connected","redis":"connected"}` (HTTP 200).
- **Unhealthy Symptoms**:
  - `HTTP 502 / 503`: Pods crashed or Kubernetes ingress cannot reach service.
  - `HTTP 504 Gateway Timeout`: Database lock contention or slow upstream authentication service.
  - Connection Refused: Container process terminated.

### 1.2 Inspect Live Kubernetes Pod Health
```bash
# List OrderFlow API and Worker pods
kubectl get pods -n production -l app.kubernetes.io/name=orderflow

# View last 100 log lines with errors
kubectl logs -n production -l app.kubernetes.io/name=orderflow --tail=100 --since=15m | grep -E "ERROR|CRITICAL|Traceback"
```

---

## 2. Recovery Procedures for Common Failure Modes

### Scenario A: API Returning 5xx Errors / Database Connection Pool Exhausted
**Symptoms**: Logs show `OperationalError: connection to server at "localhost" (5432) failed` or `asyncpg.exceptions.TooManyConnectionsError`.

1. **Check PostgreSQL Database Status**:
   ```bash
   # Verify PostgreSQL container / cluster status
   kubectl get pods -n production -l app=postgresql-15
   
   # Check active database connection count
   kubectl exec -it -n production deploy/postgresql -- psql -U orderflow -d orderflow -c "SELECT count(*) FROM pg_stat_activity;"
   ```
2. **Restart Hung API Pods (Graceful Rolling Restart)**:
   ```bash
   # Restart API deployments to cycle connection pools
   kubectl rollout restart deployment/orderflow-api -n production
   
   # Monitor rollout completion
   kubectl rollout status deployment/orderflow-api -n production --timeout=120s
   ```
3. **Escalation**: If connections immediately saturate again, page `#data-eng` to increase pool headroom or terminate idle transaction locks.

---

### Scenario B: Celery Worker Stopped / Refund Queue Backlog Spiking
**Symptoms**: Customers report refunds not processing. Alert `CeleryQueueDepthHigh` firing.

1. **Inspect Celery Queue Backlog in Redis**:
   ```bash
   # Connect to Redis CLI and check queue length
   kubectl exec -it -n production deploy/redis -- redis-cli -n 1 LLEN celery
   ```
   *Threshold*: Normal is `< 50`. If `> 500`, queue is stalling.

2. **Check Celery Worker Process Logs**:
   ```bash
   # Check worker container logs for memory crash (OOM) or unhandled exceptions
   kubectl logs -n production -l app=orderflow-worker --tail=50
   ```

3. **Restart the Celery Worker Process**:
   ```bash
   # Restart worker deployment
   kubectl rollout restart deployment/orderflow-worker -n production
   
   # Verify new worker pods register and start consuming
   kubectl logs -n production -l app=orderflow-worker -f
   ```

4. **Verify Queue Drainage**:
   Re-run `LLEN celery`. Verify that the queue count decreases steadily.

---

### Scenario C: Bad Deployment / Rollout Failure
**Symptoms**: Paged within 30 minutes of a new release; error rates jumped immediately post-deploy.

1. **Trigger Immediate Production Rollback**:
   ```bash
   # Execute immediate Helm rollback to previous revision
   helm rollback orderflow -n production
   
   # Confirm rollback status
   helm status orderflow -n production
   ```
2. **Verify Pod Stabilization Post-Rollback**:
   ```bash
   kubectl get pods -n production -l app.kubernetes.io/name=orderflow -w
   ```
3. **Broadcast Rollback Notification**:
   Post in `#orderflow-oncall`:  
   `"Incident Update: Bad deployment detected. Rolled back orderflow to previous release via Helm. Health checks returning 200 OK. Investigating root cause."`

---

## 3. Escalation Ladder

If the incident is not mitigated within **15 minutes**:
1. **SEV1 / Critical Revenue Outage (Orders Failing)**:
   - Page **Incident Commander** via PagerDuty service `Core Incident Command`.
   - Post in Slack `#incident-room` with BLUF status.
2. **Database Hardware / Cluster Outage**:
   - Escalate to `#data-eng` and page PagerDuty policy `Data Infrastructure On-Call`.
3. **Cluster / Network / Cloud Provider Failure**:
   - Escalate to `#platform-infra` and page PagerDuty policy `Kubernetes Platform Lead`.

