# TICK-104: POST /api/v1/bookings — Atomic Booking Creation

## 1. Title
POST `/api/v1/bookings` — Atomic Booking Creation

## 2. Context (Why)
The core monetization and engagement loop: converts user interest into a confirmed reservation. Must atomically reserve the slot to prevent concurrency race conditions.

## 3. Scope (What)
Implement `POST /api/v1/bookings` accepting slot and provider identifiers, executing an atomic conditional reservation, and persisting the booking record.

## 4. Interface Contract
- **HTTP Method & Path**: `POST /api/v1/bookings`
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "provider_id": "507f1f77bcf86cd799439011",
    "slot_id": "507f1f77bcf86cd799439021",
    "client_name": "Devanshi Awasthi",
    "client_email": "devanshi@example.com",
    "notes": "Looking forward to learning carpentry fundamentals."
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "booking_id": "bk_98723498234",
    "status": "CONFIRMED",
    "provider_id": "507f1f77bcf86cd799439011",
    "slot_id": "507f1f77bcf86cd799439021",
    "created_at": "2026-11-10T07:45:00.000Z"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "client_email must be a valid email" }`
  - `404 Not Found`: `{ "error": "Slot or Provider does not exist" }`
  - `409 Conflict`: `{ "error": "Slot is already booked" }`

## 5. Acceptance Criteria (Given/When/Then)
- **Scenario 1: Successful Atomic Booking**
  - **Given** an open slot `507f1f77bcf86cd799439021`
  - **When** a client submits a valid `POST /api/v1/bookings`
  - **Then** the server responds with 201 Created and the slot's `is_booked` flag is updated to `true`.
- **Scenario 2: Double-Booking Race Condition**
  - **Given** two concurrent requests for the same unbooked slot
  - **When** both requests arrive within 5ms of each other
  - **Then** exactly one request receives 201 Created and the second receives 409 Conflict.

## 6. Constraints
- Mutate slot state atomically using `findOneAndUpdate({ _id: slot_id, is_booked: false }, { is_booked: true })` or database transactions.
- Validate request payload using `class-validator`.

## 7. Anti-Scope
- No credit card payment capture (booking is pre-authorized/free in Slice 1).
- No external email or calendar invite dispatch.
- No user login session verification.
