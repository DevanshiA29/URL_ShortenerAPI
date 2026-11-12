# Module 01 Diagnosis Notes

## Bug 1
- Symptom: Service crashes on startup with database connection error.
- Hypothesis A: The database container is not running or healthy.
  - Command: docker ps
  - Observation: Database container is healthy and accepting connections on port 5432.
- Hypothesis B: Configuration contract mismatch between .env and application config (DATABASE_URL vs DB_URL).
  - Command: grep -E "DATABASE_URL|DB_URL" .env src/
  - Observation: The application configuration expected DATABASE_URL, but runtime .env defined DB_URL.
- Fix: Standardized environment variable naming in .env to DATABASE_URL to match application schema.
- Verification proof: Service started cleanly; curl -sS http://localhost:3000/health returned {"ok": true}.

## Bug 2
- Symptom: Duplicate items appear across pagination boundaries (the 10th item on page 1 duplicates as the 1st item on page 2).
- Hypothesis A: The OFFSET calculation in the pagination repository contains an off-by-one arithmetic error.
  - Command: curl -sS "http://localhost:3000/api/admin/links?page=1&limit=10" && curl -sS "http://localhost:3000/api/admin/links?page=2&limit=10"
  - Observation: Query offset was calculated as `(page - 1) * limit - 1`, causing page 2 to overlap page 1 by exactly 1 item.
- Hypothesis B: Database sort order is unstable across queries without a unique tie-breaker.
  - Command: Inspect repository query ORDER BY clause and execute back-to-back runs.
  - Observation: Query explicitly ordered by `created_at DESC, id DESC`. Sort is deterministic; confirmed off-by-one offset arithmetic was root cause.
- Fix: Corrected offset formula to `Math.max(0, (page - 1) * limit)` and verified zero overlap.
- Verification proof: Paginated through pages 1, 2, and 3; all returned items are unique with zero duplicates across boundaries.

## Bug 3 (Concurrency Regression)
- Symptom: Intermittent duplicate and skipped items appear when paginating while concurrent writes/inserts are active.
- Hypothesis A: Missing explicit deterministic sort order (`ORDER BY id`) causes the database engine to return natural storage order that shifts during table reorganizations.
  - Command: Inspect query execution plan and compare multiple back-to-back pagination runs during write load.
  - Observation: Query lacked an explicit `ORDER BY id` clause, leading to non-deterministic row ordering.
- Fix: Enforced explicit deterministic ordering `ORDER BY id ASC` across all paginated queries.
- Verification proof: Ran concurrent write generator while querying across 3 consecutive pages; verified that every item appears exactly once with zero duplicates.
