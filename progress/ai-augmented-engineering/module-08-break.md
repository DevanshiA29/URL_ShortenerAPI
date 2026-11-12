# Module 08 Break: The Flaky CI Failure & Implicit Seed Data Trap

## 1. Incident Breakdown
- **Observation:** `npm test` runs cleanly on the local developer workstation, but fails in the GitHub Actions runner during the end-to-end integration scenario.
- **Error in CI:**
  ```text
  NotFoundError: Team with ID '64b1f2e09a1c' not found in database.
  Expected status 200, received 404 Not Found.
  ```

---

## 2. Root Cause Analysis
1. **The AI's Local Context Bias:**
   - When the AI agent generated the integration test, it inspected the running local database or recent logs to sample an existing `teamId` and `userId`.
   - The test was authored with hardcoded ID references:
     ```typescript
     const existingTeamId = '64b1f2e09a1c'; // Existed only in developer's local MongoDB!
     ```
2. **Hermetic CI Environment:**
   - In GitHub Actions CI, MongoDB spins up as a fresh Docker service container (`image: mongo:7`).
   - The database is completely blank at the start of the job.
   - Any test relying on pre-existing development state fails immediately with 404 / entity not found.

---

## 3. Engineering Principle: Self-Contained Test Fixtures
- Tests must never rely on ambient database state.
- Every test suite must implement the **Arrange-Act-Assert** pattern with **Hermetic Setup**:
  1. *Arrange:* Dynamically create all required prerequisite entities (Organization, Owner, Team) in `beforeEach` or within the test itself.
  2. *Act:* Execute the API operation against the dynamically provisioned ID.
  3. *Assert:* Validate response payload and database mutation.
  4. *Teardown:* Drop or clean up the created records in `afterEach`.

