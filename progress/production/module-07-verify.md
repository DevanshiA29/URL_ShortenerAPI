# Module 07 Verification: Runbook Execution & Validation

## 1. Artifact Verification Checklist
- **Service Overview (`docs/service-overview.md`)**:
  - [x] Purpose (2 sentences max).
  - [x] Dependencies table with "What Happens Without It" column.
  - [x] Endpoints list (/live, /ready, /metrics, business endpoints).
  - [x] Configuration reference with runtime vs restart impact.
  - [x] Deploy commands (exact, copy-pasteable).
  - [x] Rollback commands (exact, copy-pasteable).
  - [x] Ownership, Slack channels, and escalation contacts.
- **Incident Runbooks (`docs/runbooks.md`)**:
  - [x] Alert names matching Prometheus alerts (`HighErrorRate`, `HighLatency`, `ServiceDown`).
  - [x] Diagnosis commands with explicit expected output for both positive and negative cases.
  - [x] Exact fix steps with expected outputs per step.
  - [x] Verification commands with expected HTTP statuses.
  - [x] Escalation paths with explicit timelines (5-10m) and contact methods.

## 2. Simulated Incident Walkthrough
- **Incident Simulated:** Database Hard Stop (`upsk-sdf-mongo` stopped).
- **Runbook Tested:** Database Connection Pool Exhaustion & Database Failure.
- **Walkthrough Steps:**
  1. Ran `docker logs --tail 100 myservice-prod | grep -E "MongooseServerSelectionError|ECONNREFUSED|pool exhausted"`. Observed connection refused positive case.
  2. Attempted to execute `mongosh` inside stopped container; noted that if container is completely stopped, `docker exec` fails with `container is not running`.
  3. **Steps Fixed After Testing (1 step fixed):**
     - Updated triage step 2 to note: "If container is stopped, `docker ps -a` confirms `Exited (0)`, bypass mongosh query and immediately proceed to `docker start upsk-sdf-mongo`."
  4. Executed `docker start upsk-sdf-mongo` followed by `docker restart myservice-prod`.
  5. Verified `curl -s http://localhost:3000/ready` returned `{"status":"ok","checks":{"database":"connected"}}`.

## 3. Conceptual Questions & Answers
- **"When should you update a runbook?"**
  - Immediately following any postmortem where the runbook was executed and steps were inaccurate or missing.
  - During any architectural or infrastructure change that alters command syntax, environment variables, or endpoints (e.g. migrating from Docker to K8s, or moving to a managed DB).
  - During scheduled quarterly operational drills (game days / chaos tests) to detect and correct documentation drift before live 3 AM pages.
- **"What is the difference between a runbook and a wiki page about the service?"**
  - A runbook is a deterministic, time-critical, executable checklist designed for rapid remediation under stress. It tells the operator what exact commands to type, what outputs to expect, and when to escalate.
  - A wiki page is broad conceptual reference documentation explaining architectural philosophy, domain models, and design decisions. You read a wiki page at 2 PM to learn; you execute a runbook at 3 AM to stop an outage.

