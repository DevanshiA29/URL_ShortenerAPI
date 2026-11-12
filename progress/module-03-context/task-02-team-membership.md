# Task 2 — TeamMembership Data Model

SYSTEM CONTEXT:
- Attach `progress/module-03-architecture-context.md`.

## Files to Read

1. `src/teams/team.schema.ts`
   - Reason: Defines the Team identity consumed by TeamMembership.
   - If omitted: The agent may reference the wrong Team fields or create incompatible identifiers.

2. `src/links/link.schema.ts`
   - Reason: Reference Mongoose schema showing project conventions.
   - If omitted: The agent may use a different schema/property pattern.

3. `src/database/database.module.ts`
   - Reason: Defines the current Mongoose registration pattern.
   - If omitted: The agent may create an inconsistent database registration.

4. `progress/module-02-task-tree.md`
   - Reason: Contains the dependency and interface contract between Task 1 and Task 2.
   - If omitted: The agent may ignore the explicit Task 1 -> Task 2 contract.

5. `src/teams/team-membership.schema.ts`
   - Reason: Shows the current workspace state and prevents duplicate or conflicting definitions.
   - If omitted: The agent may overwrite or duplicate an existing implementation.

## Files to Modify

- `src/teams/team-membership.schema.ts`
- `src/database/database.module.ts` if required for registration

## Expected Output

Create or correct the TeamMembership Mongoose model.

Required fields:
- `_id`
- `team_id`
- `user_id`
- `role`
- `created_at`
- `updated_at`

Role values:
- `admin`
- `member`
- `viewer`

Enforce uniqueness for `(team_id, user_id)`.

Use the Team identity from Task 1.
Do not create a User model.
Do not add unrelated fields.
Do not install dependencies.

## Verification

- Application builds.
- Valid membership can be persisted.
- Invalid role is rejected.
- Duplicate `(team_id, user_id)` membership is prevented.
- Existing tests continue to pass.
