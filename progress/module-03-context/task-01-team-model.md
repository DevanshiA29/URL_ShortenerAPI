# Task 1 — Team Data Model

SYSTEM CONTEXT:
- Attach `progress/module-03-architecture-context.md`.

## Files to Read

1. `src/links/link.schema.ts`
   - Reason: Shows the project's established Mongoose schema, property, naming, and timestamp conventions.
   - If omitted: The agent may invent a different schema style or timestamp configuration.

2. `src/database/database.module.ts`
   - Reason: Shows the existing Mongoose registration pattern.
   - If omitted: The agent may register the Team schema incorrectly or create a second database setup.

3. `src/app.module.ts`
   - Reason: Shows how feature/database modules are integrated at application level.
   - If omitted: The agent may integrate the new feature inconsistently.

4. `src/teams/team.schema.ts`
   - Reason: Shows the current Team schema state and prevents duplicate or conflicting implementation.
   - If omitted: The agent may recreate an existing schema instead of inspecting and extending/reconciling it.

## Files to Modify

- `src/teams/team.schema.ts` if the existing file does not already satisfy the task.
- `src/database/database.module.ts` only if Team schema registration is required.

## Expected Output

Create or correct the Team Mongoose model using the existing project conventions.

Required fields:
- `_id`
- `name`: required string, maximum 100 characters
- `description`: optional string, maximum 500 characters
- `owner_id`: required reference to the existing user identity mechanism
- `created_at`
- `updated_at`

Do not create a duplicate User model.
Do not add unrelated fields.
Do not install dependencies.

## Verification

- Application builds.
- Valid Team persistence succeeds.
- Empty name is rejected.
- Name longer than 100 characters is rejected.
- Existing tests continue to pass.
