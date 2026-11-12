# Module 08 Fix: Search Query Sanitization & Pagination Boundary Safeguards

## 1. Minimal Failing Example & Root Cause Analysis

### A. Vulnerable Query Builder
```typescript
// FAILING / VULNERABLE IMPLEMENTATION
const filter: any = {};
if (query) {
  filter.long_url = { $regex: query, $options: 'i' };
}
```
- **Failure Mode**: When given input `.*`, the query regex searches for arbitrary string matches rather than literal `.*`. When given complex nested groupings like `(a+)+$`, it induces ReDoS vulnerability.

### B. Vulnerable Pagination Calculations
```typescript
// FAILING / VULNERABLE IMPLEMENTATION
const skip = page * pageSize; // Off-by-one: Page 1 skips items 0..9!
const totalPages = Math.floor(total / pageSize); // Dropped remainder: 25 items / 10 = 2 pages instead of 3!
```

---

## 2. Fixed Implementation

In `src/links/links.service.ts`:
```typescript
  async search(
    query?: string,
    tag?: string,
    page = 1,
    pageSize = 20,
    principalId?: string,
  ) {
    // 1. Enforce strict pagination clamping
    const safePage = Math.max(1, page);
    const safePageSize = Math.min(Math.max(1, pageSize), 100);
    const skip = (safePage - 1) * safePageSize;

    const filter: any = {};
    if (tag && tag.trim()) {
      filter.tags = tag.trim();
    }
    // 2. Escape all regex special characters before query compilation
    if (query && query.trim()) {
      const sanitized = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.long_url = { $regex: sanitized, $options: 'i' };
    }
    if (principalId && principalId !== 'anonymous') {
      filter.created_by = principalId;
    }

    const [items, total] = await Promise.all([
      this.linkModel
        .find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(safePageSize)
        .maxTimeMS(1000)
        .lean(),
      this.linkModel.countDocuments(filter).maxTimeMS(1000),
    ]);

    return {
      items,
      page: safePage,
      page_size: safePageSize,
      total,
      total_pages: Math.ceil(total / safePageSize) || 1,
    };
  }
```

---

## 3. Unit Test Verification (`src/links/pagination.spec.ts`)

Ran via `NODE_OPTIONS="--experimental-vm-modules" jest`:
- **Boundary Test 1 (First Page)**: `page=1, pageSize=10, total=25` yields `skip=0`, `safePage=1`. Verified.
- **Boundary Test 2 (Intermediate Page)**: `page=2, pageSize=10, total=25` yields `skip=10`. Verified.
- **Boundary Test 3 (Last Page Remainder)**: `page=3, pageSize=10, total=25` yields `skip=20`, `totalPages=3`. Verified.
- **Boundary Test 4 (Empty Collection)**: `total=0` yields `skip=0`, `totalPages=1`. Verified.
- **Boundary Test 5 (Clamping Boundaries)**:
  - Negative page/page_size (`page=-5, pageSize=0`) clamped to `safePage=1, safePageSize=1`.
  - Unbounded page_size (`pageSize=50000`) clamped to upper limit `100`.
- **Query Sanitization Test**:
  - `payload = '.*'` in vulnerable builder yielded raw metacharacters `.*`.
  - `payload = '.*'` in fixed builder yields escaped literal `\\.\\*`.

