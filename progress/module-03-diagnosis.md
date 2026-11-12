# Module 03 Diagnosis & Reproduction Notes

## Bug 6: Check-Then-Act Race Condition on Analytics Counter
- Symptom: Intermittent HTTP 500 errors on GET `/:shortCode` on popular links under burst traffic.
- Log Evidence: `duplicate key value violates unique constraint "analytics_link_id_bucket_unique"` on `(link_id, timestamp_bucket)`.
- Hypothesis: Multiple concurrent requests execute check-then-act `SELECT` then `INSERT`, triggering duplicate key violations on the second insert.
- Reproduction Script: `scripts/repro-race.js` executing 10 concurrent requests via `Promise.all`.
- Root Cause: Non-atomic check-then-act logic in application query layer.
- Fix: Replaced check-then-act logic with atomic PostgreSQL upsert:
  ```sql
  INSERT INTO analytics (link_id, timestamp_bucket, count)
  VALUES ($1, $2, 1)
  ON CONFLICT (link_id, timestamp_bucket)
  DO UPDATE SET count = analytics.count + 1;
  ```
- Verification proof: 0 errors across 10 consecutive runs of 10 concurrent requests; count increments accurately.

## Bug 7: Lost Update Race Condition on Timestamp (Silent Data Corruption)
- Symptom: `last_accessed_at` in the database does not match the timestamp of the latest request; earlier requests overwrite later timestamps under concurrency.
- Hypothesis: A separate `UPDATE analytics SET last_accessed_at = ...` runs after the upsert. Under concurrency, execution order diverges from arrival order, causing earlier transactions committing slightly later to overwrite newer timestamps (lost update).
- Root Cause: Decoupled two-step database write: atomic upsert followed by a separate non-atomic update query.
- Fix: Consolidated both updates into a single atomic upsert utilizing `GREATEST()` to enforce monotonic timestamp advancement:
  ```sql
  INSERT INTO analytics (link_id, timestamp_bucket, count, last_accessed_at)
  VALUES ($1, $2, 1, NOW())
  ON CONFLICT (link_id, timestamp_bucket)
  DO UPDATE SET
    count = analytics.count + 1,
    last_accessed_at = GREATEST(analytics.last_accessed_at, EXCLUDED.last_accessed_at);
  ```
- Verification proof: Re-ran `scripts/repro-race.js` with 10 concurrent requests; confirmed `count` equals 10 and `last_accessed_at` accurately matches the latest request timestamp from server logs across all runs.
