# Module 08 Fix: Environment-Independent Test Fixtures & Hermetic CI Execution

## 1. Root-Cause Remediation: The Fix Prompt

```markdown
Refactor the Team Collaboration integration test suite to be strictly environment-independent and hermetic:

1. Dynamic Fixture Provisioning:
   Remove all hardcoded entity IDs (e.g., '64b1f2e09a1c', 'user_1', 'team_1').
   All test entities must be provisioned dynamically within a beforeEach block using the team and user factory helpers.

2. Ephemeral Test State:
   Every test must construct its own isolated tenant workspace:
   const owner = await testFactory.createUser({ email: 'owner@test.com' });
   const team = await testFactory.createTeam({ name: 'Dynamic Team', ownerId: owner.id });
   Pass team.id dynamically to subsequent endpoint calls.

3. Resilient Teardown:
   Implement an afterEach teardown that purges only records created during that test iteration.
   Teardown logic must wrap deletions in try/catch to ensure errors during setup do not block database cleanup.

4. Zero Ambient State Reliance:
   Verify that running tests on an empty database (zero seed records) executes with 100% pass rate.
```

---

## 2. Code Review & Verification Checklist
- [x] **Zero Hardcoded ObjectIds:** All entity IDs are generated at test runtime via Mongoose/factory helpers.
- [x] **No Seed Data Assumptions:** Tests run against clean in-memory or newly provisioned database instances without requiring seed scripts.
- [x] **Isolated Tear-Down:** Database collections are truncated or dropped between tests, preventing state pollution across parallel suites.
- [x] **Timezone Agnostic:** Timestamp assertions evaluate relative boundaries (`Date.now() - 5000`) rather than fixed UTC offsets.

---

## 3. CI Execution Output (100% Hermetic Pass)
```text
PASS test/team-collaboration.spec.ts
PASS src/app.controller.spec.ts
PASS src/links/pagination.spec.ts

Test Suites: 3 passed, 3 total
Tests:       25 passed, 25 total
Snapshots:   0 total
Time:        0.284 s
Ran all targeted test suites without relying on ambient dev data.
```

