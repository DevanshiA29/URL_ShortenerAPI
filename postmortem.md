# Incident Postmortem: Silent Order Dropping During OrderProcessor v2.14 Release

**Incident Date:** Wednesday, November 2026  
**Incident Duration:** 2 hours 2 minutes (14:00 UTC – 16:02 UTC)  
**Time to Detect (TTD):** 55 minutes (14:00 – 14:55 UTC)  
**Time to Mitigate (TTM):** 39 minutes (14:55 – 15:34 UTC)  
**Severity:** SEV-1 (Critical Revenue & Customer Impact)  
**Status:** Resolved & Remediated  

---

## 1. Executive Summary

On Wednesday between 14:00 and 15:34 UTC, a regression in OrderProcessor v2.14 caused the service to silently drop all incoming customer orders post-checkout while returning successful HTTP 200 OK responses to clients. Customers were successfully charged by the payment gateway, but orders were never committed to the database and no confirmation emails were generated. The incident affected approximately 1,400 customer orders totaling $186,000 in revenue. The root cause was a broad exception-handling block that caught missing routing configuration errors, logged at DEBUG verbosity, and masked database write failures behind an HTTP 200 response. Remediation required a manual rollback to v2.13 and reconciling dropped transactions from payment gateway event logs. All 1,400 orders were backfilled and fulfilled by 16:02 UTC with zero permanent data loss.

---

## 2. Chronological Timeline (UTC)

| Timestamp | Event / Observation | Operational Impact |
| :--- | :--- | :--- |
| **14:00** | Deployment of OrderProcessor v2.14 completes. Release removes deprecated `warehouse_routing` config field. | Release goes live; silent write failures begin immediately. |
| **14:00–14:22** | Service metrics appear healthy. Synthetic health checks pass (`/live`, `/ready`). CPU/memory nominal; HTTP 200 rate is 100%. | False sense of security; business metrics are not monitored. |
| **14:22** | First customer social media complaints and Slack `#cs-escalations` support tickets report missing confirmation emails. | User friction emerges outside primary monitoring dashboards. |
| **14:23–14:38** | Customer Support flags tickets in Slack. Primary on-call treats report as an external email delivery provider delay based on past heuristics. | Investigation delayed by 15 minutes due to ambiguous alert classification. |
| **14:38** | Support volume escalates sharply; second alert wave triggers active on-call investigation. | Active technical investigation initiates. |
| **14:42** | On-call checks Datadog/Grafana dashboards: HTTP error rate is 0%, latency is normal. Dashboards show green. | Metrics mask application failure because errors are caught internally. |
| **14:55** | On-call inspects PostgreSQL order database directly: discovers zero new records written since 14:00 UTC. | Incident scope recognized as silent order loss (SEV-1 declared). |
| **15:02** | Correlation identified with v2.14 release; automated rollback initiated. | Mitigation begins. |
| **15:08** | Automated rollback fails. Rollback script points to deprecated artifact repository paths following infrastructure migration 4 months prior. | Mitigation stalled; rollback automation broken. |
| **15:15** | Incident escalated to Platform Engineering rotation for emergency manual container image rollback. | Cross-team escalation. |
| **15:34** | Platform Engineering successfully completes manual rollback to v2.13. Database order writes resume immediately. | Outage mitigated (customer impact ends). |
| **15:45** | Data Engineering script parses payment gateway webhook logs and initiates idempotent batch order re-creation. | Data reconciliation underway. |
| **16:02** | All 1,400 dropped orders created in database; confirmation emails dispatched; customer support notified. | Incident fully resolved. |

---

## 3. Root Cause Analysis

The incident was triggered by the removal of the deprecated `warehouse_routing` configuration key in v2.14. However, the systemic root causes that permitted this trigger to cause catastrophic customer impact were:

1. **Swallowed Exceptions Masked as HTTP 200**: OrderProcessor wrapped order creation in an overbroad `try...catch` block. When the missing `warehouse_routing` field threw a reference error, the handler caught the exception, emitted a `DEBUG`-level log, and returned an HTTP 200 response with an empty payload. This anti-pattern deceived clients, upstream gateways, and synthetic monitors into assuming successful order fulfillment.
2. **Decoupled Configuration Schemas Between Staging and Production**: The staging environment did not replicate production configuration schema validation. The `warehouse_routing` key had never existed in staging; consequently, staging pipelines passed automated testing without ever exercising the code path that failed in production.

---

## 4. Contributing Factors

1. **Absence of Semantic Business Metric Alerting**: System telemetry monitored only infrastructure vitals (CPU, memory, HTTP response status, p99 latency). There was no alert monitoring business throughput (e.g., `orders_created_per_minute == 0`).
2. **Untested Automated Rollback Infrastructure**: Rollback automation had not been exercised or tested since an infrastructure cloud migration 4 months earlier. When the on-call engineer initiated rollback, it failed due to broken artifact path references, extending outage duration by 26 minutes.
3. **Alert Routing & Diagnostic Ambiguity**: Customer reports surfaced in a general support Slack channel without automated correlation to deployment windows, leading responders to initially misdiagnose the issue as external transactional email latency.

---

## 5. Corrective & Preventative Action Items

| Action Item | Owner (Role) | Target Deadline | Definition of Done |
| :--- | :--- | :--- | :--- |
| **1. Eliminate Swallowed Exceptions** | Order Processing Lead | Week 1 | Refactor order creation pipeline so unhandled database or configuration failures bubble to the global exception filter, returning HTTP 500 and logging at `ERROR` level with stack trace. |
| **2. Add Zero-Order Business Alerting** | SRE / Observability Lead | Week 1 | Configure Datadog P1 monitor alerting to on-call pager if `orders_created_per_minute` drops to zero for >2 minutes during peak hours (10:00–22:00 UTC). |
| **3. Automate Rollback CI Verification** | Platform Engineering Lead | Week 2 | Implement automated weekly pipeline in staging that triggers a canary deployment followed by an automated rollback script, verifying artifact path integrity. |
| **4. Enforce Schema Parity via Config Validation** | Application Architecture Lead | Week 2 | Adopt Zod/Pydantic schema validation for application configuration, ensuring staging and production configurations share an identical schema contract with CI validation gates. |
| **5. Implement End-to-End Synthetic Order Canary** | QA / Automation Lead | Week 3 | Deploy continuous synthetic end-to-end checkout test in production that executes a test order every 5 minutes and verifies row insertion in the database. |

---

## 6. Lessons Learned & What Went Well

### What Went Well
- **Payment Processor Event Durability**: The payment gateway retained full webhook event logs for every transaction, allowing complete, accurate reconstruction and financial reconciliation of all 1,400 dropped orders with zero customer overcharging or permanent revenue loss.
- **Cross-Team Incident Collaboration**: Once the SEV-1 was declared at 14:55 UTC, Customer Support, Platform Engineering, and Core Application engineers mobilized rapidly into an incident bridge, executing manual rollback and batch reprocessing within 67 minutes.

### What Surprised the Team
- **The Lie of HTTP 200**: Monitoring dashboards were completely green while the primary business function of the company was completely halted. System reliability must be measured by business invariants, not merely HTTP status codes.

### Immediate Interim Mitigation (If Repeated Tomorrow)
- If order processing stalls prior to automated rollback verification, the on-call rotation has an explicit, tested runbook command (`kubectl set image deployment/order-processor order-processor=v2.13`) documented in the team's incident handbook to execute manual container rollbacks in under 2 minutes.

