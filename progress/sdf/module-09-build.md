# Module 09 BUILD Evidence: Integration & Security Test Suite

## 1. Test Suite Architecture (`src/integration.spec.ts`)

The test suite runs against an isolated test MongoDB database (`bootcamp_test`), cleanly drops and disconnects after test completion, and exercises real HTTP request-response cycles via Supertest:

```typescript
// Test suites and assertions:
// 1. Link creation & code generation (POST /links)
// 2. Public redirect hot path (GET /r/:code -> 302 + Location header)
// 3. Authentication protection (DELETE /links/:id without auth -> 401 Unauthorized)
// 4. Owner scoping & IDOR prevention (Principal B accessing Principal A link -> 403 Forbidden)
// 5. URL validation & injection bypass rejection (POST /links with %3A%2F%2F or javascript: -> 400 Bad Request)
// 6. Retention enforcement (analyticsService.purgeOldClicks(30) -> 0 remaining clicks)
// 7. Worker idempotency (analyticsService.recordClick() called twice with same request_id -> 1 click recorded)
```

## 2. Test Execution Output

```
> api@0.0.1 test
> NODE_OPTIONS="--experimental-vm-modules" jest --forceExit

PASS src/integration.spec.ts
  System Design Integration & Security Test Suite
    1. Link Creation & Retrieval
      ✓ creates a link with valid URL and returns short code
    2. Public Redirect Hot Path
      ✓ returns HTTP 302 redirect with Location header pointing to long URL
    3. Authentication Behavior (Protected Routes)
      ✓ returns HTTP 401 when accessing protected route without credentials
    4. Owner Scoping & IDOR Prevention
      ✓ prevents Principal B from reading or deleting a link owned by Principal A
    5. URL Validation & Injection Defense
      ✓ rejects URL bypass attempts with HTTP 400
    6. Retention Enforcement (Purge Old Telemetry)
      ✓ purges clicks older than retention cutoff
    7. Async Queue Worker Idempotency
      ✓ deduplicates duplicate click payloads sharing the same request_id
PASS src/links/pagination.spec.ts
PASS src/app.controller.spec.ts

Test Suites: 3 passed, 3 total
Tests:       16 passed, 16 total
Snapshots:   0 total
Time:        0.525 s
```
All 16 tests pass across 3 test suites.

