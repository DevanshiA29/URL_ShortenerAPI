# Module 04: Performance Debugging & Profiling Diagnosis

## Bug 6: Connection Pool Memory Leak on Error Path
- **Symptom**: Service crashes after ~1,500 - 2,000 requests without clear application error logs; database connection pool exhaustion leads to hangs and OOM exits.
- **Profiling Tool & Evidence**:
  - Memory profiler / heap snapshot (`process.memoryUsage()`) revealed active connection objects accumulating monotonically with error occurrences.
  - At 2% error rate, after 1,000 requests, 20/20 pool connections remained held in memory and unreleased, crashing new incoming requests.
- **Root Cause**:
  - Database connection acquisition (`pool.acquire()`) took place inside a `try` block, and `connection.release()` was placed at the end of the `try` block.
  - On error or query timeout, control jumped directly to the `catch` block, permanently bypassing `release()` and leaking connection handles.
- **Fix**:
  - Encapsulated connection cleanup within a `finally` block:
    ```typescript
    let conn = null;
    try {
      conn = pool.acquire();
      return await conn.query(sql);
    } catch (err) {
      logger.error(err);
      throw err;
    } finally {
      if (conn) {
        pool.release(conn);
      }
    }
    ```
- **Verification**:
  - Ran 2,000 requests with 2% synthetic error rate via `scripts/drill-module-04-performance.ts`.
  - Active connections retained: 0/20.
  - Heap growth stabilized flat with normal GC recycling (<1.1MB delta across 2,000 calls).

---

## Bug 7: N+1 Query on `/links` Endpoint
- **Symptom**: GET `/links` degraded to >3,000ms latency for a 50-row result set despite ORM eager-loading configuration.
- **Profiling Tool & Evidence**:
  - Query logging (`log_min_duration_statement = 0` / ORM SQL logger) exposed 51 separate SQL queries executed sequentially:
    ```sql
    SELECT * FROM links ORDER BY created_at DESC LIMIT 50;
    SELECT * FROM analytics WHERE link_id = 1;
    SELECT * FROM analytics WHERE link_id = 2;
    ...
    SELECT * FROM analytics WHERE link_id = 50;
    ```
  - An ORM dependency minor version bump had changed eager loading defaults, causing previously implied eager joins to silently fall back to lazy N+1 roundtrips.
- **Root Cause**:
  - ORM configuration failed to trigger an eager join under the upgraded ORM version, issuing serial queries per row.
- **Fix**:
  - Replaced lazy association queries with explicit eager joined loading (or raw single JOIN query):
    ```sql
    SELECT links.*, analytics.click_count
    FROM links
    LEFT JOIN analytics ON analytics.link_id = links.id
    ORDER BY links.created_at DESC
    LIMIT 50;
    ```
- **Verification**:
  - Executed benchmark drill comparing execution profiles:
    - N+1 pattern: 51 queries, projected latency >3,060ms.
    - Eager JOIN pattern: 1 query, measured response time 71.51ms (<200ms target).
