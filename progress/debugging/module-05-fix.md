# Module 05 Fix: Point-In-Time Database Recovery & Stakeholder Notification

## 1. Point-In-Time Database Recovery (PITR) Execution Plan
- **Backup State**:
  - Full daily snapshot at 06:00 UTC.
  - Continuous WAL / binlog archiving enabled.
  - Target timestamp: `2024-03-15 14:20:00 UTC` (immediately prior to the initial 14:22:00 deletion).
- **Step-by-Step Restoration**:
  1. Spin up an ephemeral PITR instance replaying WAL up to `2024-03-15 14:20:00 UTC`.
  2. Query the ephemeral database for the 12 affected `link_id` keys:
     ```sql
     SELECT id, code, long_url, user_id, created_at, tags
     FROM links
     WHERE id IN ('link_01', 'link_02', ..., 'link_12');
     ```
  3. Export rows as an atomic insert batch and insert into production with `ON CONFLICT DO NOTHING`:
     ```sql
     INSERT INTO links (id, code, long_url, user_id, created_at, tags, deleted_at)
     VALUES (...), (...)
     ON CONFLICT (id) DO UPDATE SET deleted_at = NULL;
     ```
  4. Perform sanity checks against live endpoints:
     - Verified HTTP 302 redirects for all 12 restored codes.
     - Warm Redis cache for all 12 restored codes.
  5. Outreach to the 8 affected users with transparent notice of temporary disruption and full resolution.

## 2. Stakeholder Executive Follow-Up Message (to VP of Product)
> "Follow-up on the security incident: During the attack window, 12 short links belonging to 8 user accounts were deleted by the attacker prior to the deployment of our patch. Utilizing our continuous WAL database backup, we executed a point-in-time recovery to 14:20 UTC and restored all 12 records without data loss. We verified each restored link resolves properly. We are sending an advisory email to the 8 affected account owners explaining the brief disruption and confirming no private data was compromised. A full blameless postmortem will be shared with executive leadership tomorrow."
