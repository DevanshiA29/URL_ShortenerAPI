# Module 06 Break Analysis: 3 AM Runbook Failures

## Overview
A critical audit of the `OrderFlow Service -- Incident Runbook` revealed three severe, latent failure modes that would mislead, delay, or actively worsen an outage during an on-call incident response at 3 AM.

---

## Failure 1: Stale Environment Variable & Shell Quoting Bug

### Location
- **Step 3 ("Database Connection Failure")**, command:
  ```bash
  kubectl exec -n production deployment/orderflow-api -- \
    python -c "import psycopg2; psycopg2.connect('$DB_CONNECTION_STRING')"
  ```
  and diagnostic check:
  ```bash
  kubectl exec -n production deployment/orderflow-api -- printenv DB_CONNECTION_STRING
  ```

### What Happens to the On-Call Engineer
1. **Quoting Trap**: In the Python one-liner, `'$DB_CONNECTION_STRING'` is wrapped in single quotes inside double quotes. The bash shell does not expand variables inside single quotes, and Python receives the literal string `"$DB_CONNECTION_STRING"`. `psycopg2` attempts to resolve `"$DB_CONNECTION_STRING"` as a DNS hostname, immediately throwing `psycopg2.OperationalError: could not translate host name "$DB_CONNECTION_STRING" to address: nodename nor servname provided, or not known`. Even if the database is 100% healthy, the test command always fails!
2. **Variable Mismatch**: Per the OrderFlow service specification, the actual database connection string variable is **`DATABASE_URL`**, not `DB_CONNECTION_STRING`.
3. **Misdirected Triage**: When the engineer executes `printenv DB_CONNECTION_STRING`, it outputs empty. The engineer will conclude that the deployment secrets/env vars have been wiped, initiate an unnecessary escalation to `#platform-infra`, or attempt a bogus configuration redeploy while the real incident continues unmitigated.

### Correct Fix
Use `DATABASE_URL` and safely read from `os.environ`:
```bash
kubectl exec -n production deployment/orderflow-api -- \
  python -c "import os, psycopg2; psycopg2.connect(os.environ['DATABASE_URL'])"
```
And check variable presence:
```bash
kubectl exec -n production deployment/orderflow-api -- printenv DATABASE_URL
```

---

## Failure 2: Dangerous Fake Rollback Command

### Location
- **Step 6 ("Application Bug (500 Errors)")**, line 2:
  ```bash
  helm upgrade orderflow deploy/charts/orderflow --namespace production --set image.tag=latest
  ```

### What Happens to the On-Call Engineer
1. **Rolling Forward into Broken Code**: The runbook claims to "roll back", but `helm upgrade ... --set image.tag=latest` does NOT roll back. It pulls and deploys `latest`. In modern CI/CD, the broken commit was just tagged and pushed to `latest`. Running this command redeploys the broken build that caused the 500 errors in the first place!
2. **Missing Local Chart Dependency**: `deploy/charts/orderflow` assumes the on-call engineer has the application git repository cloned locally, is on the correct branch, has a clean working directory, and has helm chart dependencies fetched (`helm dep up`). At 3 AM on an on-call laptop or bastion host, this local path will frequently fail with `Error: directory "deploy/charts/orderflow" not found`.
3. **History Destruction**: Performing an `upgrade` instead of a `rollback` increments the release revision with unverified parameters and overwrites the desired state without restoring the previous known-good deployment artifact.

### Correct Fix
Use Helm's native cluster rollback command, which references the cluster's internal release history and requires zero local repo files:
```bash
# 1. View recent releases to identify the last known stable revision:
helm history orderflow --namespace production

# 2. Roll back immediately to the previous revision (or specify revision number e.g., 4):
helm rollback orderflow --namespace production
```

---

## Failure 3: Missing Triage for Redis & Celery Worker Backlog

### Location
- **Entire Document (Step 1 through Step 7)** completely lacks any Redis or Celery diagnostics.

### What Happens to the On-Call Engineer
1. **Critical Architectural Blind Spot**: OrderFlow depends on Redis for rate limiting (HTTP 429) and as the Celery message broker for asynchronous refund processing (`redis:6379/1`).
2. **False Diagnostic Direction**: If Step 1 returns `{"status":"degraded", "cache":"disconnected", "worker":"stalled"}`, the engineer reads Step 2:
   - `ConnectionRefusedError -- database or cache is down (go to Step 3)`
   When the engineer jumps to Step 3, Step 3 ONLY covers PostgreSQL! There are zero instructions for Redis.
3. **Undetected Revenue/Customer Impact**: If Redis runs out of memory (OOM), hits connection limits, or the Celery worker deployment crashes, the API may still serve reads, but refund tasks queue endlessly or fail silently. The runbook provides no commands to inspect the worker pod (`orderflow-worker`), check queue depth, or restart worker instances. An on-call engineer would exhaust the runbook, find nothing about Redis or workers, and remain helpless until cascading timeouts take down the entire API.

### Correct Fix
Add dedicated triage steps for Cache (Redis) and Worker (Celery):
```bash
# Verify Redis Connectivity from API pod:
kubectl exec -n production deployment/orderflow-api -- \
  python -c "import os, redis; r = redis.from_url(os.environ['REDIS_URL']); print('Redis Ping:', r.ping())"

# Check Celery Worker Pods and Queue Depth:
kubectl get pods -n production -l app=orderflow-worker
kubectl logs -n production deployment/orderflow-worker --tail=100

# Inspect Queue Length directly in Redis:
kubectl exec -n production deployment/orderflow-api -- \
  python -c "import os, redis; r = redis.from_url(os.environ['REDIS_URL']); print('Pending refunds:', r.llen('celery'))"
```
