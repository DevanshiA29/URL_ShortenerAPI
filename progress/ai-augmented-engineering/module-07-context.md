# Module 07 Context: System-Level Review & Human Engineering Oversight

## The 5 Categories AI Cannot Autonomously Judge

Across Modules 01 through 06, AI agents generated individual features: Teams, Invitations, Roles/RBAC, Comments, Activity Feeds, Audit Logs, and WebSockets. While each module passed individual function-level unit tests, function-level verification does not guarantee system-level integrity.

### 1. Business Logic Correctness
- **Function View:** An invitation acceptance function executes a valid database update setting `invitation.status = 'accepted'`.
- **System Reality:** If the product specification requires that only users matching the invited email address can accept, but the AI implemented open acceptance for any authenticated user holding the token, the function works perfectly yet violates product rules.

### 2. Security in Context (Call Chain Analysis)
- **Function View:** `updateTeamMemberRole(teamId, memberId, newRole)` safely updates the record with schema sanitization.
- **System Reality:** If the HTTP controller routing to this function verifies that the requester is a member of *a* team, but fails to assert that the requester is an `Admin` or `Owner` of *that specific* `teamId`, an authorization bypass (IDOR) exists across the boundary between controller middleware and service logic.

### 3. Architectural Coherence
- **Function View:** Feature A uses NestJS exception filters with custom HTTP exceptions. Feature B uses raw `res.status().json()`. Feature C throws unhandled rejections.
- **System Reality:** The system becomes internally incoherent, degrading observability, breaking client API contracts, and increasing downstream cognitive load.

### 4. Data Integrity Under Pressure (Concurrency & Partial Failures)
- **Function View:** A team deletion endpoint deletes the `Team` document. A concurrent comment endpoint appends a comment to a task within that team.
- **System Reality:** Without cross-collection transactions or cascade hooks, orphaned comments and corrupted activity references persist in the datastore.

### 5. Compliance & Regulatory Requirements
- **Function View:** An audit log records every inbound payload and HTTP parameter.
- **System Reality:** If incoming payloads contain unmasked passwords, session tokens, or GDPR-protected PII, the audit log transforms into a critical regulatory liability.

