# AI Output Code Review: Team Collaboration & Invitations

**Reviewer:** Senior Engineering Peer Review  
**Review Method:** Pattern-Based (5 LLM Failure Categories) with targeted Line-by-Line inspection on authorization, data mutations, and network boundaries.  
**Scope:** AI-generated Team Collaboration models, invitation endpoints (`POST /teams/:teamId/invitations`, `POST /invitations/:token/accept`), and test suites.

---

## 1. Executive Summary

A pattern-based security and reliability audit of the AI-generated Team Collaboration code revealed multiple critical vulnerabilities characteristic of statistical pattern-completion in LLMs:
- **Security:** Broken Object-Level Authorization (IDOR) on team invitation issuance—the code verifies JWT authentication (`req.user`) but fails to verify that the caller is an active `admin` of `teamId`. Direct SQL string interpolation in team queries permits SQL injection.
- **Edge Cases:** Unchecked race conditions during simultaneous invitation acceptance, unvalidated email formatting, and absence of uniqueness constraints on pending invitations.
- **Error Handling:** Swallowed database exceptions returning generic 500 errors without rollback, leaving orphaned invitations when email delivery fails.
- **Naming & Abstractions:** Arbitrary abstraction layers and generic naming (`processData`, `res`, `data`) departing from repository conventions.
- **Test Coverage:** Tautological happy-path unit tests relying on over-mocked repositories with zero boundary tests for non-admin invitation attempts or SQL injection payloads.

---

## 2. Detailed Findings by Component

### Component 1: `createInvitation` (`POST /teams/:teamId/invitations`)

| Category | Finding | Severity | Evidence |
| :--- | :--- | :--- | :--- |
| **Security** | **Broken Authorization (IDOR):** Any authenticated user can issue invitations for any team without being a member or admin of that team. | **Critical** | `if (!req.user) return 401;` — checks login only; lacks `membershipService.assertRole(req.user.id, teamId, 'admin')`. |
| **Security** | **SQL / Query Injection:** `teamId` is interpolated directly into query string without parameterization. | **Critical** | `SELECT * FROM teams WHERE id = '${teamId}'` allows arbitrary SQL execution if `teamId` is not validated as UUID/ObjectId. |
| **Edge Cases** | **Duplicate Membership & Self-Invitation:** Allows inviting a user who is already an active team member or inviting one's own email. | **High** | Missing duplicate membership check: `findMembership(teamId, email)` is never executed before creating the invitation. |
| **Edge Cases** | **Email Format & Case Sensitivity:** No regex/RFC validation or lowercase normalization on target email. | **Medium** | Empty strings (`""`) or uppercase variants (`User@Example.com`) bypass deduplication checks. |
| **Error Handling** | **Orphaned State on Email Failure:** If outbound email provider fails after DB insert, invitation remains valid in DB without rollback. | **High** | No distributed transaction or compensation: `await db.insert()` followed by un-catchable `await emailClient.send()`. |
| **Naming** | **Ambiguous Parameter Naming:** Controller uses generic `data` and `res` without domain context. | **Low** | Renamed `createInvitationRequest` / `InvitationRecord` for clear domain clarity. |
| **Tests** | **Missing Negative Authorization Tests:** Test suite asserts status 201 for valid token, but has 0 tests asserting 403 Forbidden for non-admin users. | **High** | `describe('createInvitation')` only tests 200/201 happy path with mock admin user. |

---

### Component 2: `acceptInvitation` (`POST /invitations/:token/accept`)

| Category | Finding | Severity | Evidence |
| :--- | :--- | :--- | :--- |
| **Security** | **Invitation Hijacking:** Does not verify that the authenticated user's email matches the invitation recipient email. | **Critical** | Any authenticated user who obtains or guesses the token can claim membership on another user's behalf. |
| **Edge Cases** | **Concurrent Acceptance Race Condition:** Two simultaneous requests with the same token can double-create memberships. | **High** | Lacks atomic `findOneAndUpdate` with state condition `status: 'pending'` -> `status: 'accepted'`. |
| **Edge Cases** | **Token Expiration Boundary:** Timestamp comparison fails to account for clock skew. | **Medium** | `if (invitation.expires_at < now)` lacks small grace period or fails abruptly with 500 instead of 410 Gone / 400. |
| **Error Handling** | **Swallowed DB Collision:** Unique constraint violation on `(team_id, user_id)` crashes with raw Mongo/PG error. | **Medium** | Throws unhandled database error instead of catch-translating to `409 Conflict: Already a member`. |
| **Naming** | **Inconsistent Route Structure:** Acceptance mounted at `/invitations/:token/accept` while creation is under `/teams/:teamId/invitations`. | **Low** | Nested sub-resource vs top-level token routing needs documented justification. |
| **Tests** | **Untested Concurrency & Replay:** No test verifying that a second call with the same token returns 400/409. | **High** | Missing replay-attack test in `invitation.e2e-spec.ts`. |

---

### Component 3: Team Data Models (`team.schema.ts`, `team-membership.schema.ts`)

| Category | Finding | Severity | Evidence |
| :--- | :--- | :--- | :--- |
| **Security** | **Unrestricted Team Creation:** `POST /teams` lacks rate limiting or quota enforcement, permitting DDoS database exhaustion. | **Medium** | No rate limiting middleware on team creation endpoints. |
| **Edge Cases** | **Compound Index Missing:** Lacks unique compound index on `(team_id, user_id)` in persistence layer. | **Critical** | Database permits duplicate membership records if application validation is bypassed. |
| **Edge Cases** | **Boundary Length Violations:** Team name allows 0 characters or >100 characters if DTO validation is omitted. | **High** | Schema missing explicit `{ minlength: 1, maxlength: 100 }` validators. |
| **Error Handling** | **Missing Soft Delete Cascade:** Deleting a team leaves orphaned `TeamMembership` and `Link` documents. | **High** | No pre-hook on team removal to cascade delete or deactivate memberships. |
| **Naming** | **Property Drift:** Mixed use of `teamId` (camelCase) and `team_id` (snake_case) across DTOs and database schemas. | **Medium** | Inconsistent schema conventions compared to `link.schema.ts` (`long_url`, `created_at`). |
| **Tests** | **Tautological Mongoose Schema Tests:** Tests verify Mongoose mock model returns mocked instance instead of testing DB validation constraints. | **Medium** | Unit tests assert `expect(schema.name).toBeDefined()` rather than asserting validation throws on empty string. |

---

## 3. Remediation Checklist & Verification Strategy

1. **Parameterize All Queries:** Disallow template string interpolation in all SQL / Mongoose calls.
2. **Enforce Role-Based Access Control (RBAC):** Require `@Roles('admin')` guard on all `teams/:teamId/invitations` routes.
3. **Enforce Database-Level Compound Uniqueness:** Add `schema.index({ team_id: 1, user_id: 1 }, { unique: true })`.
4. **Implement Atomic Token Transition:** Use single atomic query `UPDATE invitations SET status = 'accepted' WHERE token = $1 AND status = 'pending'`.
5. **Expand Test Boundary Matrix:** Add automated negative tests covering non-admin invitation (403), duplicate invite (409), invalid email format (422), and token replay attacks (400).

