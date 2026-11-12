# Module 07 Break: The Compound Privilege Escalation Exploit

## 1. Incident Reproduction & Exploit Anatomy

### The Attack Vector
A user with `viewer` role in Team `team_abc123` executes the following HTTP request:
```http
PUT /teams/team_abc123/members/usr_viewer999 HTTP/1.1
Host: api.example.com
Authorization: Bearer <viewer_jwt_token>
Content-Type: application/json

{
  "role": "admin"
}
```

### Response
```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "userId": "usr_viewer999",
  "teamId": "team_abc123",
  "role": "admin",
  "updatedAt": "2026-11-12T13:25:00Z"
}
```

---

## 2. Root Cause Analysis: Composition of Two Isolated "Medium" Flaws

1. **Flaw 1 (Coarse-Grained Authorization Check):**
   - The route handler uses `isTeamMember(teamId, userId)` middleware.
   - The middleware confirms `usr_viewer999` belongs to `team_abc123`.
   - *Result:* Access granted because the check asserted *presence* rather than *privilege* (`isAdmin` or `isOwner`).
2. **Flaw 2 (Missing Input Constraint / DTO Enum):**
   - The controller accepts the raw request body and passes `body.role` directly to `membershipService.updateRole()`.
   - The schema lacks an `@IsIn(['admin', 'member', 'viewer'])` constraint and has no validation forbidding non-admins from passing privileged roles.
   - *Result:* The datastore executes `UPDATE team_memberships SET role = 'admin' WHERE user_id = 'usr_viewer999'`.

---

## 3. Why AI Review Failed to Flag the Exploit
- The AI reviewing the controller checked: *"Does this endpoint have authentication?"* Yes (`requireAuth`). *"Does it check team membership?"* Yes (`isTeamMember`). The AI marked it **OK**.
- The AI reviewing the DTO checked: *"Is role a string?"* Yes. The AI marked it **OK**.
- Neither AI agent evaluated the **system composition**: that an authenticated team member calling a string-accepting endpoint can overwrite their own authorization tier.
- **Key Takeaway:** Vulnerabilities in AI-generated code thrive at the seams between independently "clean" components.

