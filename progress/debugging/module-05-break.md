# Module 05 Break Analysis: Data Loss Remediation & Customer Recovery

## Incident Assessment: Post-Patch Audit
- **Audit Findings**:
  - `links` table: 12 rows marked with `deleted_at` timestamps between 14:22:00 and 14:32:00 UTC.
  - Affected scope: 8 distinct user accounts.
  - Source IP: `203.0.113.42`.

## The Key Technical Insight: Soft Deletion
- The presence of `deleted_at` timestamps proves this was implemented as a **soft delete**, not a destructive `DROP` or `DELETE FROM`.
- The records, their target URLs, created timestamps, and routing keys remain physically present in the database table.

## Immediate Remediation Plan
1. **Targeted Technical Rollback / Undelete**:
   ```sql
   UPDATE links
   SET deleted_at = NULL
   WHERE deleted_at >= '2024-03-15 14:22:00 UTC'
     AND deleted_at <= '2024-03-15 14:32:00 UTC';
   ```
2. **Cache Invalidation & Warmup**:
   - Evict any negative cache entries or 404 tombstones from Redis for the 12 affected link codes.
   - Run verification curl requests against all 12 restored links to verify 302/301 redirects resolve correctly.

3. **Proactive, Transparent Customer Communication**:
   - Rather than waiting for users to discover dead links, send a direct, transparent advisory specifically to the 8 affected account holders:
     > "Between 14:22 and 14:32 UTC today, an unauthorized request caused 12 links in your account to temporarily become inactive. The issue was identified, the vulnerability patched, and all 12 links have been 100% restored. No passwords, credentials, or private account data were accessed or exposed. We sincerely apologize for this disruption."

4. **Permanent Hardening & Safeguards**:
   - Implement WAF rate-limiting on all `/api/admin/*` routes.
   - Convert destructive admin operations to require two-person rule or secondary confirmation tokens.
   - Set up automated anomalous volume alerts (e.g. alert if admin deletions > 5 in 1 hour).
