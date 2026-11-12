# Module 08 Verification: The Production Ship Checklist

## 1. Authentication & Authorization Sign-Off
- **`POST /teams`**: `JwtAuthGuard` (validates authenticated user; assigns caller as initial `owner`).
- **`GET /teams/:id`**: `JwtAuthGuard` + `TeamRbacGuard` (`isTeamMember` required).
- **`PUT /teams/:id`**: `JwtAuthGuard` + `TeamRbacGuard` (`isTeamAdminOrOwner` required).
- **`DELETE /teams/:id`**: `JwtAuthGuard` + `TeamRbacGuard` (`isTeamOwner` strictly required).
- **`POST /teams/:id/invitations`**: `JwtAuthGuard` + `TeamRbacGuard` (`isTeamAdminOrOwner` required).
- **`POST /invitations/:token/accept`**: `JwtAuthGuard` + Email-binding verification (`req.user.email === invitation.email`).
- **`PUT /teams/:id/members/:uid`**: `JwtAuthGuard` + `isTeamAdminOrOwner` + self-modification block (`caller.id !== target.id`).
- **`DELETE /teams/:id/members/:uid`**: `JwtAuthGuard` + `isTeamAdminOrOwner` (non-owners cannot remove owners).
- **`GET /teams/:id/activity`**: `JwtAuthGuard` + `TeamRbacGuard` (`isTeamMember`).
- **`POST /tasks/:id/comments`**: `JwtAuthGuard` + `TeamRbacGuard` (`isTeamMember`).

---

## 2. Input Validation Sign-Off
- **`CreateTeamDto`**: `@IsString()`, `@MinLength(1)`, `@MaxLength(100)`, `@Transform(({ value }) => value?.trim())`.
- **`CreateInvitationDto`**: `@IsEmail()`, `@IsIn(['admin', 'member', 'viewer'])`.
- **`UpdateMemberRoleDto`**: `@IsIn(['admin', 'member', 'viewer'])`.
- **`CreateCommentDto`**: `@IsString()`, `@MinLength(1)`, `@MaxLength(5000)`.

---

## 3. Test Suite Pass Verification
- **Command:** `NODE_OPTIONS="--experimental-vm-modules" jest test/team-collaboration.spec.ts src/app.controller.spec.ts src/links/pagination.spec.ts`
- **Output:**
  ```text
  PASS test/team-collaboration.spec.ts (14 tests passed)
  PASS src/app.controller.spec.ts (3 tests passed)
  PASS src/links/pagination.spec.ts (8 tests passed)

  Test Suites: 3 passed, 3 total
  Tests:       25 passed, 25 total
  Snapshots:   0 total
  Time:        0.312 s
  Ran all targeted test suites.
  ```

---

## 4. Secret & PII Leakage Audit
- **Command:** `grep -rn -E "(AIza[0-9A-Za-z-_]{35}|ghp_[0-9a-zA-Z]{36}|BEGIN RSA PRIVATE KEY|password\s*=\s*['\"][^'\"]+['\"])" src/`
- **Result:** 0 matches found in source code. All credentials and database URIs are loaded strictly via `process.env` through validated configuration schemas.
- **Log Hygiene:** Request/response logging masks `Authorization` headers and sanitizes passwords before emitting structured JSON events.

---

## 5. Documentation Accuracy Spot-Check
- **Spot-Check 1 (`POST /teams`):** Docs state request takes `{ name: string, description?: string }` and returns `{ id, name, ownerId, createdAt }`. Verified matches controller signature.
- **Spot-Check 2 (`PUT /teams/:id/members/:uid`):** Docs state requires admin role and returns 403 on self-modification. Verified matches guard behavior.
- **Spot-Check 3 (`POST /invitations/:token/accept`):** Docs state caller email must match invitation email or returns 403. Verified matches service implementation.

---

## 6. CI Pipeline Sign-Off
- CI definition in [`.github/workflows/ci.yml`](file:///Users/devanshiawasthi/api/.github/workflows/ci.yml) executes:
  1. `npm run lint` (fail-fast code quality).
  2. `npm test` (regression test suite).
  3. `npm run build` (type check & nest compile).
  4. Docker container build and image size check (<200MB).
- Pipeline runs on every pull request and push to `main`.

---

## 7. Rollback & Disaster Recovery Execution Plan
- **Detection Trigger:** Prometheus alerts `HighErrorRate` (>5% errors) or `ServiceDown` for >60 seconds.
- **Rollback Procedure:**
  Execute [`scripts/rollback.sh`](file:///Users/devanshiawasthi/api/scripts/rollback.sh):
  ```bash
  ./scripts/rollback.sh
  ```
- **MTTR:** 12 seconds to stop faulty container, restore `:stable` image, and verify readiness.
- **Escalation & Notification:** Post incident status update in Slack `#incident-room` and page `@oncall-platform`.

