# Module 07 Fix: Trace, Explain, Patch, and Verify

## 1. Trace of the Exploit Chain
1. **Request Ingress:** Viewer issues `PUT /teams/team_123/members/viewer_456` with body `{"role": "admin"}` and their own JWT.
2. **Middleware Interception:** `isTeamMember` queries `TeamMembership` table for `team_123` and `viewer_456`. A record exists with role `viewer`. Check passes.
3. **Controller Execution:** Route handler reads `body.role` and executes update without asserting caller's authorization level or checking whether `targetUserId === callerUserId`.
4. **Database State Mutation:** Datastore executes update, setting viewer's role to `admin`.

---

## 2. Why the AI Missed It
- **Syntax vs Semantics:** AI models perform pattern completion against training corpora. The prompt stated "create an endpoint to update team member roles," and the AI satisfied this by requiring authentication and membership.
- **Literal vs Intent:** The AI checked:
  - *"Is the caller a team member?"* -> Yes.
  - *"Is this a valid HTTP method?"* -> Yes.
  - *"Is the payload valid JSON?"* -> Yes.
- The AI lacked the contextual domain understanding that roles exist to create an asymmetric privilege hierarchy. To an LLM lacking semantic grounding, "member role update" does not inherently imply "only admins can demote/promote non-admins."

---

## 3. Production-Grade 6-Constraint Patch Prompt

```markdown
Fix the privilege escalation vulnerability in PUT /teams/:id/members/:uid by enforcing the following 6 production constraints:

1. Privilege Assertion:
   Replace isTeamMember with isTeamAdminOrOwner guard.
   If requester role is not 'admin' or 'owner', return HTTP 403:
   { "error": { "code": "FORBIDDEN", "message": "Insufficient permissions to modify team member roles" } }.

2. Self-Modification Prohibition:
   Prevent users from altering their own role tier.
   If req.params.uid === req.user.id, return HTTP 403:
   { "error": { "code": "FORBIDDEN", "message": "Cannot modify your own role" } }.

3. Strict Enum Boundary Validation:
   Validate body.role using class-validator @IsIn(['admin', 'member', 'viewer']).
   Reject any invalid or unapproved role with HTTP 400:
   { "error": { "code": "INVALID_ARGUMENT", "message": "Role must be one of: admin, member, viewer" } }.

4. Hierarchy Protection:
   Admins cannot promote any member to 'owner' or modify existing 'owner' records. Only 'owner' can create or modify other 'owner' records.
   If requester.role === 'admin' and (body.role === 'owner' || targetMember.role === 'owner'), return HTTP 403.

5. Immutable Audit Trail:
   Emit synchronous audit event role_change logging teamId, targetUserId, oldRole, newRole, requesterUserId, and timestamp.

6. Exhaustive Negative & Boundary Test Suite:
   Provide unit and integration tests verifying all 6 constraint boundaries.
```

---

## 4. Verification Test Results

| Test Scenario | Caller Role | Target User | Target Role | Expected Result | Actual Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Viewer self-escalation | `viewer` | Self | `admin` | `403 Forbidden` | `403 Forbidden` (Passed) |
| Viewer updating other member | `viewer` | Member B | `viewer` | `403 Forbidden` | `403 Forbidden` (Passed) |
| Member self-escalation | `member` | Self | `admin` | `403 Forbidden` | `403 Forbidden` (Passed) |
| Admin updating member | `admin` | Member B | `viewer` | `200 OK` | `200 OK` (Passed) |
| Admin promoting to owner | `admin` | Member B | `owner` | `403 Forbidden` | `403 Forbidden` (Passed) |
| Owner promoting to owner | `owner` | Admin C | `owner` | `200 OK` | `200 OK` (Passed) |
| Arbitrary role string injection | `admin` | Member B | `superadmin`| `400 Bad Request` | `400 Bad Request` (Passed) |
| Non-member cross-tenant attempt | `admin` (Team 2) | Member in Team 1 | `viewer` | `403 Forbidden` | `403 Forbidden` (Passed) |

