# Module 06 Verification: Runbook Stress-Test & Copy-Paste Audit

## 1. Copy-Paste Command Audit
Three sample commands audited directly from [`progress/communication/module-06-runbook.md`](file:///Users/devanshiawasthi/api/progress/communication/module-06-runbook.md):
- **Command 1**: `curl -i --max-time 3 https://orderflow.internal.company.com/health`
  - *Audit*: PASS. Standalone, bounded with `--max-time 3` so it never hangs in an incident, exact internal DNS hostname, zero placeholder tokens.
- **Command 2**: `kubectl exec -it -n production deploy/redis -- redis-cli -n 1 LLEN celery`
  - *Audit*: PASS. Fully qualified with `-n production`, explicit database index `-n 1`, exact queue key `celery`. Returns integer directly.
- **Command 3**: `helm rollback orderflow -n production`
  - *Audit*: PASS. Validated against official Helm CLI syntax, targeting release `orderflow` in namespace `production`.

## 2. Duplication Check
- Service names (`orderflow`), ports (`8080`, `5432`, `6379`), and namespaces (`production`) are declared explicitly in header metadata and standard kubectl selectors (`app.kubernetes.io/name=orderflow`).
- Zero scattered or contradicting port references.

## 3. The 3 AM On-Call Stress Test
- **Cognitive Load Minimization**:
  - Step 1 immediately assesses health within 120 seconds using unambiguous HTTP codes and pod states.
  - Numbered sequential procedures for the top three failure scenarios (DB pool starvation, Celery worker hangs, bad rollouts).
- **Zero Silent Failure Traps**:
  - Every diagnostic step includes a clear threshold (e.g. `LLEN celery > 500 = backlog stall`).
  - Every recovery procedure includes an explicit verification step (e.g. `rollout status ... --timeout=120s`).

## 4. Red Flag Scan
- No vague prose or hand-waving instructions.
- Includes exact escalation policy names (`OrderFlow Primary`, `Data Infrastructure On-Call`, `Kubernetes Platform Lead`) with a 15-minute SLA.

