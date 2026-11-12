# TICK-105: POST /api/v1/providers — Self-Serve Provider Onboarding

## 1. Title
POST `/api/v1/providers` — Self-Serve Provider Onboarding

## 2. Context (Why)
Enables Slice 2 supply-side onboarding, allowing craftsmen and professionals to create marketplace profiles and list their services independently.

## 3. Scope (What)
Implement `POST /api/v1/providers` validating provider profile fields, saving the document to the database, and returning the created provider profile.

## 4. Interface Contract
- **HTTP Method & Path**: `POST /api/v1/providers`
- **Request Body**:
  ```json
  {
    "name": "Carlos Mendez",
    "trade": "Plumbing",
    "bio": "Licensed master plumber with 15 years residential experience.",
    "hourly_rate": 80.00,
    "email": "carlos@mendezplumbing.com"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "id": "507f1f77bcf86cd799439033",
    "name": "Carlos Mendez",
    "trade": "Plumbing",
    "bio": "Licensed master plumber with 15 years residential experience.",
    "hourly_rate": 80.00,
    "rating": 5.0,
    "created_at": "2026-11-10T07:46:00.000Z"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "hourly_rate must be a positive number" }`
  - `409 Conflict`: `{ "error": "Provider email already registered" }`

## 5. Acceptance Criteria (Given/When/Then)
- **Scenario 1: Valid Registration**
  - **Given** unique provider registration data
  - **When** `POST /api/v1/providers` is submitted
  - **Then** HTTP 201 is returned with initial rating set to 5.0.
- **Scenario 2: Duplicate Registration**
  - **Given** existing provider with email `carlos@mendezplumbing.com`
  - **When** another request submits the identical email
  - **Then** HTTP 409 Conflict is returned.

## 6. Constraints
- Enforce unique index on `email`.
- Sanitize bio text to strip HTML / script tags.

## 7. Anti-Scope
- No document verification / ID upload.
- No bank account linking.
- No password or auth credential setup.
