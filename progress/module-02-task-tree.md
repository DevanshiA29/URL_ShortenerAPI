# Module 02 BUILD — Team Collaboration Task Tree

## Planning approach

Progressive decomposition. The tree starts with the data models and refines dependent work after each foundational task is verified.

## Task 1 — Create Team data model

### Input context
- Inspect existing Mongoose schema conventions in:
  - `src/links/link.schema.ts`
  - `src/click-events/click-event.schema.ts`
- Inspect `src/app.module.ts` and existing database module configuration.
- Determine how timestamps, ObjectId references, decorators, and schema registration are handled.
- No existing Team implementation should be assumed.

### Expected output
- Create the Team schema in the existing schema/model directory following the project's established conventions.
- Team must contain:
  - `_id`
  - `name`: required string, maximum 100 characters
  - `description`: optional string, maximum 500 characters
  - `owner_id`: required reference to the existing user identity mechanism, if one exists
  - `created_at`
  - `updated_at`
- Register the schema through the existing database/module pattern.
- Do not modify unrelated features.

### Acceptance criteria
- Application starts successfully.
- Database initialization succeeds.
- A valid Team document can be persisted.
- A Team with an empty name is rejected.
- A Team with a name longer than 100 characters is rejected.
- No unrelated existing tests regress.

### Dependencies
- None.

---

## Task 2 — Create TeamMembership data model

### Input context
- Task 1 Team schema and its identifier/reference convention.
- Existing schema conventions from `src/links/link.schema.ts` and `src/click-events/click-event.schema.ts`.
- Existing user identity mechanism, if present.
- Existing database registration pattern.

### Expected output
- Create a TeamMembership schema.
- Required fields:
  - `_id`
  - `team_id`: required reference to Team
  - `user_id`: required reference to the existing user identity mechanism
  - `role`: required enum containing `admin`, `member`, `viewer`
  - `created_at`
  - `updated_at`
- Enforce uniqueness for the `(team_id, user_id)` relationship.
- Register the schema using existing project conventions.
- Do not create a second user system or add unrelated dependencies.

### Acceptance criteria
- A membership can be persisted for a valid Team and user.
- The same user cannot have two memberships for the same Team.
- Only `admin`, `member`, and `viewer` are accepted as roles.
- Invalid roles are rejected.
- Existing tests continue to pass.

### Dependencies
- Task 1.

---

## Task 3 — Implement Team CRUD API

### Input context
- Task 1 Team schema.
- Task 2 TeamMembership schema.
- Existing controller/service/module/DTO conventions in `src/links/`.
- Existing application bootstrap and routing conventions.
- Existing validation and error-handling behavior.

### Expected output
- Create a dedicated Team module, controller, service, and DTOs following the existing NestJS structure.
- Implement:
  - `POST /teams`
  - `GET /teams/:id`
  - `PATCH /teams/:id`
  - `DELETE /teams/:id`
- `POST /teams` accepts a valid team name and optional description.
- Successful creation returns HTTP 201 and the created Team.
- Invalid name input returns HTTP 400.
- Missing Team lookup returns HTTP 404.
- Update accepts only the supported mutable Team fields.
- Delete removes the requested Team and its direct Team record.
- Do not implement invitations, activity feeds, comments, or notifications in this task.
- Do not add new packages.

### Acceptance criteria
- `POST /teams` returns 201 for valid input.
- `POST /teams` returns 400 for invalid input.
- `GET /teams/:id` returns 200 for an existing Team.
- `GET /teams/:id` returns 404 for an unknown Team.
- `PATCH /teams/:id` updates only supported fields.
- `DELETE /teams/:id` removes an existing Team.
- API tests cover the success and failure cases.
- Existing tests remain green.

### Dependencies
- Task 1.
- Task 2.

---

## Task 4 — Implement membership join/leave operations

### Input context
- Team and TeamMembership schemas.
- Team CRUD API.
- Existing controller/service/DTO conventions.

### Expected output
- Implement endpoints for joining and leaving a Team.
- Prevent duplicate membership creation.
- Prevent leaving a Team when business rules require the Team to retain an admin.
- Return explicit HTTP errors for nonexistent Teams and invalid membership operations.

### Acceptance criteria
- Valid join creates exactly one membership.
- Repeated join does not create duplicates.
- Valid leave removes the membership.
- Invalid Team returns 404.
- Invalid membership state returns an appropriate 4xx response.
- Tests cover join, duplicate join, leave, and nonexistent Team.

### Dependencies
- Task 1.
- Task 2.
- Task 3.

---

## Task 5 — Implement role-based access control

### Input context
- Team schema.
- TeamMembership schema.
- Existing authentication/user identity mechanism.
- Team CRUD and membership endpoints.
- Existing NestJS guards/decorators/interceptor conventions, if any.

### Expected output
- Define authorization rules for `admin`, `member`, and `viewer`.
- Admin can manage Team settings and membership.
- Member can perform ordinary Team collaboration operations.
- Viewer has read-only access.
- Unauthorized requests return 401/403 according to the existing authentication conventions.
- Authorization logic is reusable across Team endpoints.

### Acceptance criteria
- Admin can perform every permitted admin operation.
- Member is denied admin-only operations with 403.
- Viewer is denied write operations with 403.
- Unauthenticated requests follow existing authentication behavior.
- Tests cover each role against representative protected endpoints.

### Dependencies
- Task 2.
- Task 3.
- Task 4.

---

## Task 6 — Implement Team invitations

### Input context
- Team and TeamMembership schemas.
- Existing authentication/user identity mechanism.
- RBAC rules from Task 5.
- Existing configuration/service conventions for external integrations.

### Expected output
- Create an invitation model containing:
  - sender
  - invitee
  - team
  - status
  - expiry
- Implement `POST /teams/:id/invitations`.
- Only authorized Team administrators can create invitations.
- Prevent invitations to existing members.
- Prevent duplicate pending invitations.
- Implement invitation acceptance and revocation.
- Define the invitation expiry behavior explicitly.
- Isolate email delivery behind a service boundary.
- Do not introduce a new email provider unless already supported by the project.

### Acceptance criteria
- Authorized admin can create an invitation.
- Non-admin cannot create an invitation.
- Existing members cannot receive a duplicate membership invitation.
- Duplicate pending invitations are rejected.
- Expired invitations cannot be accepted.
- Valid acceptance creates the TeamMembership.
- Revoked invitations cannot be accepted.
- Email-service failure does not create an inconsistent invitation state.
- Integration tests cover the invitation lifecycle.

### Dependencies
- Task 2.
- Task 4.
- Task 5.

---

## Task 7 — Implement Team activity feed

### Input context
- Team schema.
- TeamMembership schema.
- Existing event/logging conventions.
- Completed Team and membership operations.

### Expected output
- Create an activity record for significant Team actions.
- Store Team, actor, action type, timestamp, and relevant metadata.
- Implement a read endpoint returning Team activity chronologically.
- Restrict access according to Team membership/RBAC rules.

### Acceptance criteria
- Creating, joining, leaving, inviting, accepting, revoking, and role-changing actions produce the expected activity records where applicable.
- Activity records are returned newest-first.
- Non-members cannot access protected Team activity.
- Activity retrieval has deterministic ordering.
- Tests verify representative activity events.

### Dependencies
- Task 4.
- Task 5.
- Task 6.

---

## Task 8 — Implement audit logging

### Input context
- Team, membership, invitation, and activity implementations.
- Existing logging/error-handling conventions.

### Expected output
- Create a persistent audit record for significant security-sensitive Team actions.
- Record actor, action, Team, target/resource, timestamp, and relevant metadata.
- Audit records must not be silently modified by ordinary Team operations.
- Provide a protected read endpoint for authorized administrators.

### Acceptance criteria
- Security-sensitive Team actions create audit records.
- Audit records identify the actor and action.
- Unauthorized users cannot read audit records.
- Records persist independently of the activity feed.
- Tests verify representative audit events and access control.

### Dependencies
- Task 5.
- Task 6.
- Task 7.

---

# Dependency graph

Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8

Additional dependency:
- Task 5 depends directly on Task 2 and Task 3.
- Task 6 depends on Task 5.
- Task 7 depends on Tasks 4–6.
- Task 8 depends on Tasks 5–7.

## Critical path

Task 1 → Task 2 → Task 3 → Task 4 → Task 5 → Task 6 → Task 7 → Task 8

The critical path is the full foundational sequence because each later capability relies on the models, membership state, or authorization behavior established earlier.

## Riskiest task

Task 6 — Team invitations.

Reason:
- It combines authorization, membership state, duplicate prevention, expiry, revocation, acceptance, and an external email integration boundary.
- It has multiple race/consistency cases.
- Email delivery can fail independently from database operations.
- The invitation lifecycle therefore has a higher probability of exposing assumptions than straightforward CRUD work.

---

# First three AI-agent prompts

## Prompt 1 — Team model

Create the Team data model for the existing NestJS project.

Before changing anything, inspect `src/links/link.schema.ts`, `src/click-events/click-event.schema.ts`, `src/app.module.ts`, and the existing database module to determine the project's established Mongoose schema, naming, timestamp, reference, and registration conventions.

Create the Team schema using those conventions. It must contain only these fields: `_id`, `name` as a required string with a maximum length of 100 characters, `description` as an optional string with a maximum length of 500 characters, `owner_id` as a required reference to the existing user identity mechanism, `created_at`, and `updated_at`.

Register the schema using the existing database/module pattern. Do not invent a second user model. Do not add fields beyond those listed. Do not install packages. Do not modify unrelated existing schemas or application behavior.

Verification must demonstrate that the application starts, a valid Team can be persisted, an empty name is rejected, and a name longer than 100 characters is rejected. Run the relevant existing tests after the change.

## Prompt 2 — Team membership model

Create the TeamMembership data model for the existing NestJS project.

First inspect the Team schema produced by the previous task, the existing Mongoose schema conventions, and the project's database registration pattern. Reuse the existing user identity mechanism rather than creating another user model.

Create a TeamMembership schema containing only `_id`, `team_id` as a required Team reference, `user_id` as a required reference to the existing user identity mechanism, `role` as a required enum restricted to `admin`, `member`, or `viewer`, `created_at`, and `updated_at`.

Enforce uniqueness for the `(team_id, user_id)` relationship so one user cannot have multiple memberships in the same Team. Follow the project's existing schema and index conventions. Do not install packages or modify unrelated features.

Verification must demonstrate that a valid membership can be persisted, duplicate membership for the same Team and user is rejected, and invalid roles are rejected. Run the relevant existing tests after the change.

## Prompt 3 — Team CRUD API

Implement the Team CRUD API using the existing NestJS project conventions.

Before changing anything, inspect the Team and TeamMembership schemas, the existing `src/links/links.controller.ts`, `src/links/links.service.ts`, `src/links/links.module.ts`, `src/links/dto/create-link.dto.ts`, and the application's existing validation and error-handling behavior. Reuse those conventions instead of introducing a new architecture.

Create a dedicated Team module, controller, service, and DTOs. Implement `POST /teams`, `GET /teams/:id`, `PATCH /teams/:id`, and `DELETE /teams/:id`.

`POST /teams` must accept a required name and optional description, return HTTP 201 with the created Team for valid input, and return HTTP 400 for an empty or overlong name. `GET /teams/:id` must return HTTP 200 for an existing Team and HTTP 404 for an unknown Team. `PATCH /teams/:id` may update only the supported Team fields and must return HTTP 404 for an unknown Team. `DELETE /teams/:id` must remove the requested Team and return the project's established success response.

Do not implement invitations, activity feeds, comments, notifications, or role-based authorization in this task. Do not install new packages. Do not modify unrelated existing endpoints.

Add API tests covering successful creation, invalid creation, successful retrieval, missing retrieval, update, and deletion. Verify that the existing test suite remains green.

# Module 02 — Interface Contracts

## Contract: Task 1 → Task 2

### Task 1 produces

- Team schema/model named `Team`
- `name`: required string, maximum 100 characters
- `description`: optional string, maximum 500 characters
- `owner_id`: required reference to the existing user identity mechanism
- `created_at`
- `updated_at`

Task 1 also establishes the Team model as the upstream dependency consumed by Task 2.

### Task 2 expects

- The `Team` model exists and is registered through the existing database/module pattern.
- `TeamMembership.team_id` references the existing `Team` model.
- `TeamMembership.user_id` references the existing user identity mechanism.
- `TeamMembership.role` accepts only `admin`, `member`, or `viewer`.
- `(team_id, user_id)` is unique so a user cannot have duplicate membership in the same Team.
- `created_at` and `updated_at` are present on TeamMembership.

### Shared contract

Both tasks must use the same Team identity, database conventions, and existing user identity mechanism.

Task 2 must not assume any Team or membership fields that Task 1 did not explicitly produce.

## Contract: Task 2 → Task 3

### Task 2 produces

- Registered `TeamMembership` model.
- `team_id` referencing Team.
- `user_id` referencing the existing user identity mechanism.
- `role` restricted to `admin`, `member`, `viewer`.
- Unique `(team_id, user_id)` membership constraint.
- `created_at` and `updated_at`.

### Task 3 expects

- Team and TeamMembership models are available.
- Team CRUD operations use the existing Team model.
- Membership data is not recreated inside the Team CRUD implementation.
- Team membership roles remain `admin`, `member`, or `viewer`.

### Shared contract

Task 3 consumes the exact models produced by Tasks 1 and 2 and does not introduce alternative Team or membership representations.

## Contract: Task 3 → Task 4

### Task 3 produces

- Team CRUD API.
- `POST /teams`
- `GET /teams/:id`
- `PATCH /teams/:id`
- `DELETE /teams/:id`

### Task 4 expects

- The Team CRUD API and Team model already exist.
- Team lookup uses the same Team identifier and model established by Task 1.
- Membership operations reference the same Team records.

### Shared contract

Task 4 must use the existing Team API/model rather than creating a second Team representation.

## Contract: Task 4 → Task 5

### Task 4 produces

- Team membership join operation.
- Team membership leave operation.
- Duplicate membership prevention.
- Membership state represented by TeamMembership.
- Explicit errors for nonexistent Teams and invalid membership operations.

### Task 5 expects

- TeamMembership is the authoritative representation of Team membership.
- Membership roles are `admin`, `member`, and `viewer`.
- Team membership checks can be reused by authorization logic.

### Shared contract

RBAC must operate on the same TeamMembership records created and removed by Task 4.

## Contract: Task 5 → Task 6

### Task 5 produces

- Reusable authorization rules for `admin`, `member`, and `viewer`.
- Admin-only authorization for membership/settings operations.

### Task 6 expects

- Existing RBAC rules and guards/decorators.
- Only authorized Team administrators can create invitations.

### Shared contract

Invitation authorization must reuse Task 5's RBAC behavior rather than implementing separate permission logic.

## Contract: Task 6 → Task 7

### Task 6 produces

- Team invitation lifecycle.
- Invitation creation, acceptance, revocation, expiry behavior.
- Invitation state changes that can generate activity events.

### Task 7 expects

- Completed invitation lifecycle.
- Existing TeamMembership and RBAC behavior.
- Significant Team actions can be represented as activity events.

### Shared contract

Activity records reference the same Team and user identities used by TeamMembership and invitation operations.

## Contract: Task 7 → Task 8

### Task 7 produces

- Team activity records containing Team, actor, action type, timestamp, and relevant metadata.
- Deterministic chronological activity retrieval.

### Task 8 expects

- Activity and Team operations use the same Team and actor identities.
- Audit logging can observe the significant actions established by previous tasks.

### Shared contract

Audit events must reference the same identifiers and action semantics established by the Team activity system.

## Process Fix

Before executing a dependent AI task, include the verified output of its upstream task and the explicit interface contract in the downstream prompt.

The downstream prompt must not rely solely on the original task tree or assumptions about what the upstream task was supposed to produce.
