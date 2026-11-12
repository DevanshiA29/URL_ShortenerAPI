# Rewritten Production Postmortem: Unindexed Migration Outage (March 15)

## 1. Rewritten Systemic Root Cause
> *"A database migration script dropped the secondary B-tree index `idx_users_email` during deployment. In the production environment, user authentication queries perform lookups by email; without the index, each authentication request triggered a sequential scan of 2.4 million rows. Under peak Friday traffic, concurrent full table scans exhausted the PostgreSQL connection pool within 90 seconds, causing all incoming API requests to time out with HTTP 504. The deployment pipeline permitted the migration to execute directly against production without automated pre-merge schema linting or staging validation against production-scale data volumes."*

---

## 2. Rewritten Contributing Factors (System Gaps, Not Human Inaction)

1. **Absence of Pre-Deployment Schema Verification in CI**:
   - The continuous integration pipeline lacked a migration linting stage (such as `squawk` or `strong_migrations`) to detect destructive DDL operations (e.g. dropping indexes, table locks, or unindexed foreign keys) prior to PR approval.
2. **Missing Production-Scale Staging Validation**:
   - Staging environments only contained 50 synthetic seed records. Sequential scans on 50 rows complete in under 1ms, masking the fatal O(N) performance cliff that manifests on 2.4 million production records.
3. **Lack of Automated Change Freeze Window in CD Tooling**:
   - The deployment pipeline allowed high-risk schema migrations to execute on Friday afternoon without requiring on-call leadership sign-off or enforcing automated deployment freezes outside core business hours.
4. **Permissive Branch Protection Policies**:
   - Repository settings allowed PR merges without enforcing a mandatory code review approval from the Database/Platform domain team on migration directories (`migrations/*`).
5. **Slow Time-To-Detect (Missing Query Latency Alarms)**:
   - Alerting was configured on database crash/process death rather than p99 query latency or connection pool saturation. Consequently, the issue was detected only after user-facing customer escalations 2 hours post-deployment.

---

## 3. Rewritten Concrete Remediation Items

| # | Action | Owner | Deadline | Status |
|---|--------|-------|----------|--------|
| 1 | Integrate automated schema linter (`strong_migrations`) into CI pipeline to automatically fail any PR containing unindexed drops or lock-inducing DDL | Data Platform Team | March 22, 2026 | Open |
| 2 | Enforce GitHub branch protection requiring 2 peer reviews including 1 Database Codeowner on any changes to `migrations/**` | Infra SecOps | March 19, 2026 | Open |
| 3 | Configure automated deployment freeze in GitHub Actions / ArgoCD from Friday 14:00 UTC to Monday 08:00 UTC (blocking non-emergency deployments) | DevOps / Release Eng | March 25, 2026 | Open |
| 4 | Deploy Datadog anomaly monitor alerting on PostgreSQL p95 query duration > 250ms and connection pool utilization > 80% with PagerDuty SEV1 routing | Observability Team | March 20, 2026 | Open |
| 5 | Build staging migration dry-run step populated with anonymized, production-scale dataset (2M+ rows) to catch full table scans before deployment | Data Platform Team | April 05, 2026 | Open |

