# Module 09 Context: Testing Architecture & Isolation Safeguards

## 1. Single Critical Test Priority
- **Chosen Test**: The redirect hot-path (`GET /r/:code`) and authorization boundary tests.
- **Why**: Redirects are the core customer-facing contract of a URL shortener. If redirects fail or route to malicious/stale URLs, availability and trust collapse instantly. Concurrently, auth boundaries guarantee that tenant data remains isolated.

## 2. Preventing Accidental Real Database Mutations in Test Suites
- **Root Cause of Test Contamination**: Default fallback to `.env` or missing test isolation configs where `MONGO_URI` defaults to localhost/production rather than an in-memory Mongo mock or isolated test replica.
- **Safeguards**:
  - Enforce `NODE_ENV=test` guard assertions at bootstrap.
  - Require explicit in-memory mongodb runner (`mongodb-memory-server`) or mock repositories for unit/service tests.
  - Isolate test databases with dynamic prefixes (e.g., `test_url_shortener_<timestamp>`) and verify DB cleanup hooks (`afterAll`, `afterEach`).

