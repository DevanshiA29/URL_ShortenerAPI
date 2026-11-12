# Module 04 Verification Evidence & Analysis

## Bug #6 Verification: Memory Leak via Connection Release
- **Profiler & Heap Measurements**:
  - Baseline Memory before load: `HeapUsed = 32.4 MB`, `Active Connections = 0/20`
  - Post-Execution Memory after 2,000 requests (with 2% synthetic error rate): `HeapUsed = 33.5 MB`, `Active Connections = 0/20`
  - **Net Heap Delta**: `1.08 MB` (well under the 50MB stability threshold, demonstrating flat heap trajectory and regular V8 garbage collection).
- **Mechanism of `finally` Fix**:
  - In a standard `try-catch`, any thrown exception (database query timeout, socket reset, syntax error) aborts execution before `connection.release()` can be reached in the `try` block.
  - If `connection.release()` is placed solely in the success path, failed queries leave the pooled connection in an unreleased `inUse = true` state indefinitely.
  - Over repeated errors, the connection pool becomes fully starved (20/20 held), leading to unhandled pool timeouts or process crashes.
  - The `finally` block guarantees execution regardless of whether the try block resolves or rejects, ensuring 100% reclamation of acquired connection handles.

## Bug #7 Verification: N+1 Query Resolution on `/links`
- **Query Log Analysis**:
  - **Before Fix (N+1 Pattern)**:
    - 1 Query: `SELECT * FROM links ORDER BY created_at DESC LIMIT 50;`
    - 50 Queries: `SELECT * FROM analytics WHERE link_id = ?;` (50 sequential roundtrips)
    - Total Queries: **51**
    - Latency: **3,060 ms** (50 roundtrips * ~60ms per query)
  - **After Fix (Explicit Eager JOIN)**:
    - 1 Query: `SELECT links.*, analytics.click_count FROM links LEFT JOIN analytics ON analytics.link_id = links.id ORDER BY links.created_at DESC LIMIT 50;`
    - Total Queries: **1**
    - Measured Response Time: **71.51 ms** (< 200 ms target threshold).
- **Why Code Reading Fails on Dependency Default Shifts**:
  - In ORM layers (such as Sequelize, TypeORM, or SQLAlchemy), declarative options like `{ eager: true }` or `{ include: [...] }` may change semantic behavior across major/minor version upgrades.
  - While the application code syntax remains unchanged and appears to specify eager loading, the underlying library may silently deprecate or ignore the legacy flag and fall back to lazy-loading getters.
  - Only runtime query logging and telemetry expose that 51 SQL statements are dispatched over the wire instead of 1 joined query.
