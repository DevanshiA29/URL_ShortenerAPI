# Module 08 Build: Search Implementation & Pagination Analysis

## 1. Search Endpoint Architecture
- **Route**: `GET /links/search`
- **Query Parameters**:
  - `q`: String (URL substring query, sanitized against regex injection)
  - `tag`: String (Exact tag filter)
  - `page`: Integer (1-based, clamped to $\ge 1$)
  - `page_size`: Integer (default: 20, clamped strictly to $1 \le page\_size \le 100$)
- **Output Schema**:
  ```json
  {
    "items": [...],
    "page": 1,
    "page_size": 20,
    "total": 42,
    "total_pages": 3
  }
  ```

## 2. Security & Guardrails Applied
- **Sanitized Search Query**: Special characters in user query are escaped via `replace(/[.*+?^${}()|[\]\\]/g, '\\$&')` to prevent catastrophic regex backtracking and NoSQL operator injection.
- **Strict Page Size Capping**: Requesting `page_size=5000` is automatically clamped to 100, preventing V8 memory exhaustion and database pool starvation.
- **Tenancy Boundary**: Queries can be scoped to the authenticated caller's `principal_id`.

## 3. Why Pagination Off-By-One Bugs Are Common
1. **1-Based vs 0-Based Index Mismatch**:
   - HTTP clients and human interfaces operate on 1-based indexing (Page 1 is the first page).
   - Database query engines (`OFFSET / skip`) operate on 0-based indexing (`skip = (page - 1) * limit`).
   - If an engineer writes `skip = page * limit`, requesting page 1 skips the entire first page of results, losing the first $N$ records.
2. **Total Page Calculation Rounding**:
   - Using `Math.floor(total / pageSize)` drops the trailing partial page. If `total = 21` and `limit = 10`, floor yields 2 pages, stranding the 21st record in limbo.
   - The correct formula requires `Math.ceil(total / pageSize) || 1`.
3. **Array Slicing vs SQL Limits**:
   - In-memory array slices take `[start, end)` (half-open range where `end = start + limit`), whereas database queries take `(skip, limit)`. Conflating `end` with `limit` results in exponential window growth.
4. **Data Mutation Drift (Offset Pagination Flaw)**:
   - When new records are inserted while a user is paginating, the existing items shift forward. Page 2 can display duplicate records that already appeared at the bottom of Page 1.
