# TICK-101: Seed Database with 3 Test Providers & Slots

## 1. Title
Seed Database with 3 Test Providers & Availability Slots

## 2. Context (Why)
Enables Slice 1 demand-side clickthrough testing without requiring a functioning provider onboarding portal. Seeded records provide deterministic test data for automated integration tests and stakeholder walk-throughs.

## 3. Scope (What)
Create a standalone seed script (`scripts/seed-providers.ts`) that idempotently inserts 3 provider documents and 3 available time slots per provider into the database.

## 4. Interface Contract (Data Shapes)
- **Database Collection / Table**: `providers` and `slots`
- **Provider Document Shape**:
  ```json
  {
    "_id": "507f1f77bcf86cd799439011",
    "name": "Elena Vance",
    "trade": "Woodworking",
    "bio": "Master artisan specializing in bespoke cabinetry.",
    "rating": 4.9,
    "review_count": 28,
    "hourly_rate": 65.00
  }
  ```
- **Slot Document Shape**:
  ```json
  {
    "_id": "507f1f77bcf86cd799439021",
    "provider_id": "507f1f77bcf86cd799439011",
    "start_time": "2026-11-15T10:00:00.000Z",
    "end_time": "2026-11-15T11:00:00.000Z",
    "is_booked": false
  }
  ```

## 5. Acceptance Criteria (Given/When/Then)
- **Scenario 1: Fresh Database Seeding**
  - **Given** an empty `providers` and `slots` collection in the local database
  - **When** the engineer executes `npm run db:seed`
  - **Then** exactly 3 provider records and 9 slot records are persisted with exit code 0.
- **Scenario 2: Idempotent Re-execution**
  - **Given** `providers` collection already populated with the 3 test records
  - **When** `npm run db:seed` is executed a second time
  - **Then** existing records are updated or skipped without duplicate key errors or record count growth.

## 6. Constraints
- Use the existing Mongoose / MongoDB connection established in `src/database/database.module.ts`.
- Store test IDs deterministically as valid ObjectIds.
- Do not drop unrelated database collections.

## 7. Anti-Scope
- No user accounts or client credentials seeded.
- No dynamic web UI for seeding triggers.
- No production database connection configs.
