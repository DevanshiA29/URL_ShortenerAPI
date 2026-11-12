# Module 08 Verification: Search Security & Operational Tradeoffs

## 1. What Can Go Wrong if Building SQL/NoSQL with String Concatenation?
- **SQL / NoSQL Injection**:
  - In SQL: Constructing raw queries like `SELECT * FROM links WHERE long_url LIKE '%" + input + "%'` allows attackers to inject malicious payloads (e.g. `%'; DROP TABLE links; --` or union-based data exfiltration).
  - In NoSQL (MongoDB): Unescaped regex concatenation allows ReDoS (catastrophic backtracking) or operator injection via JSON objects (e.g. `{ "$where": "sleep(5000)" }` or `{ "$gt": "" }` to bypass filters).
- **Remediation**: Always use parameterized queries, ORM/ODM abstraction layers, and regex character escaping (`replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`).

## 2. Why Must `page_size` Be Capped?
- **Heap Exhaustion & DoS Prevention**:
  - Allowing arbitrary page sizes (e.g. `page_size=1000000`) allows callers to force full-table scans that consume massive database I/O and RAM buffers.
  - In the application layer, deserializing 1,000,000 documents consumes gigabytes of Node.js V8 heap, triggering catastrophic garbage collection pauses and process crashes (OOM kills).
- **Rule**: Strictly clamp `page_size` to a safe upper bound (e.g. `min(max(1, page_size), 100)`).

## 3. What is the Operational Cost of Adding a Search Engine (Elasticsearch / Meilisearch)?
- **Data Synchronization & Eventual Consistency**: Dual writes between primary database and search cluster inevitably drift when network blips occur. You need change-data-capture (Debezium/Kafka) or background reconciliation sync jobs.
- **Dual-Write Failure Modes**: Transactions cannot span across MongoDB and Elasticsearch natively. If the DB commits but the search index write fails, search results become permanently stale or miss newly created items.
- **Infrastructure & Maintenance Overhead**: Dedicated search clusters require JVM heap tuning, shard management, reindexing migrations on mapping changes, dedicated monitoring/alerting, and substantial cloud hosting costs.
