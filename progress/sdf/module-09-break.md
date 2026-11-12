# Module 09 BREAK: Flaky Test & Shared State Diagnostic Investigation

## 1. Injected Bug: Flaky Test Caused by Shared State & Fixed Fixture Collisions
- **Vulnerable Test Pattern**:
  ```typescript
  // Flawed test setup: Hardcoded short codes and unisolated collection counts
  await analyticsService.recordClick({
    link_id: linkId,
    code: 'ret01', // Fixed static code
    request_id: 'req_retention_old',
    ...
  });
  ```
- **Symptom & Reproduction**:
  - Running the test suite multiple times in succession or running test suites in parallel causes:
    `MongoServerError: E11000 duplicate key error collection: bootcamp_test.clicks index: request_id_1 dup key: { request_id: "req_retention_old" }`
  - When tests rely on global database counts (`clickModel.countDocuments()`) rather than scoping to a unique `link_id` created during that test's lifecycle, tests fail nondeterministically depending on execution order.

## 2. Injected Bug: Missing Database Isolation Guard
- **Vulnerable Configuration**:
  - If `MONGODB_URI` is read directly from `.env` without checking `NODE_ENV === 'test'`, tests run directly against `mongodb://localhost:27017/upsk_sdf` (the development/production database).
  - Destructive lifecycle hooks (`dropDatabase()` or `deleteMany({})`) unintentionally wipe all live developer data.

## 3. Empirical Evidence
- When two tests insert the same fixture without per-test clean-up:
  - Test 1 succeeds.
  - Test 2 fails with: `Status 500 / E11000 duplicate key error on request_id`.
- Flakiness demonstrated: 100% pass on clean runs, 0% pass on sequential re-runs without database reset.

