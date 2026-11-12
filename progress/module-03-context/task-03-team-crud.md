# Task 3 — Team CRUD API

SYSTEM CONTEXT:
- Attach `progress/module-03-architecture-context.md`.

## Files to Read

1. `src/links/links.controller.ts`
   - Reason: Existing NestJS controller and route pattern.
   - If omitted: The agent may invent a different controller structure.

2. `src/links/links.service.ts`
   - Reason: Existing service pattern, Mongoose injection, query handling, and HTTP exceptions.
   - If omitted: The agent may use inconsistent service or error-handling patterns.

3. `src/links/links.module.ts`
   - Reason: Existing feature module registration pattern.
   - If omitted: The Team feature may be integrated inconsistently.

4. `src/links/link.schema.ts`
   - Reason: Existing Mongoose model pattern.
   - If omitted: The agent may use incompatible database conventions.

5. `src/teams/team.schema.ts`
   - Reason: Team CRUD operates on this model.
   - If omitted: The agent may reference the wrong model fields.

6. `src/teams/team-membership.schema.ts`
   - Reason: Task 3 must preserve the Task 2 interface contract where applicable.
   - If omitted: The agent may create an incompatible relationship model.

7. `src/app.module.ts`
   - Reason: Shows root-level feature module integration.
   - If omitted: The Team module may not be registered correctly.

8. `progress/module-02-task-tree.md`
   - Reason: Defines the Task 2 -> Task 3 interface contract.
   - If omitted: The agent may ignore the dependency contract.

## Files to Modify

- New Team controller/service/module/DTO files as required.
- `src/app.module.ts` for Team module registration.
- Existing Team schema only if required for API integration.

## Expected Output

Implement:

- `POST /teams`
- `GET /teams/:id`
- `PATCH /teams/:id`
- `DELETE /teams/:id`

Follow existing controller/service/DTO conventions.

Do not implement:
- invitations
- activity feed
- audit logging
- notifications
- unrelated membership workflows

Do not install dependencies.

## Verification

- Application builds.
- Existing tests pass.
- Team creation works with valid input.
- Invalid Team input is rejected through the existing validation mechanism.
- Missing Team returns the appropriate NestJS HTTP error.
- CRUD routes are registered and reachable.
- Existing link functionality remains unchanged.
