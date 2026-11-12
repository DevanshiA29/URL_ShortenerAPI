# Module 06: Interface Contracts Specification

## Shared Primitive Types & Conventions
- **UUID Format**: Canonical RFC 4122 v4 lowercase string (`^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`).
- **Timestamp Standard**: ISO 8601 UTC with milliseconds and trailing `Z` (`YYYY-MM-DDTHH:mm:ss.sssZ`). Unix timestamps or timezone offsets are forbidden across wire boundaries.
- **Enumeration Conventions**: Strict uppercase string tokens (`'AVAILABLE'`, `'PENDING'`, `'CONFIRMED'`, `'CANCELLED'`).

---

## Contract 1: Provider Availability Service <-> Booking Engine
- **Consumer**: Booking Service (Stream 2)
- **Producer**: Provider Availability Service (Stream 1)

### Provider Availability Endpoint
- **HTTP Method & Path**: `GET /api/v1/providers/{provider_id}/slots?date={YYYY-MM-DD}`
- **Success Response (200 OK)**:
  ```json
  {
    "provider_id": "c7a8b9d0-1234-4567-89ab-cdef01234567",
    "date": "2026-11-15",
    "slots": [
      {
        "slot_id": "a1b2c3d4-5678-490a-bcde-f01234567890",
        "start_time": "2026-11-15T14:00:00.000Z",
        "end_time": "2026-11-15T15:00:00.000Z",
        "status": "AVAILABLE"
      }
    ]
  }
  ```
- **Error Responses**:
  - `404 Not Found`: `{ "error": "PROVIDER_NOT_FOUND", "message": "Provider does not exist" }`

### Slot Lock Synchronization Endpoint
- **HTTP Method & Path**: `PATCH /api/v1/slots/{slot_id}/lock`
- **Request Body**:
  ```json
  {
    "lock_status": "PENDING",
    "lock_duration_seconds": 600,
    "consumer_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "slot_id": "a1b2c3d4-5678-490a-bcde-f01234567890",
    "status": "PENDING",
    "locked_until": "2026-11-15T14:10:00.000Z"
  }
  ```
- **Error Response (409 Conflict)**:
  - `{ "error": "SLOT_ALREADY_LOCKED", "message": "Slot is locked or booked" }`

---

## Contract 2: Booking Engine <-> Client Frontend
- **Consumer**: Marketplace Web Client (Stream 3)
- **Producer**: Booking Engine (Stream 2)

### Create Booking Endpoint
- **HTTP Method & Path**: `POST /api/v1/bookings`
- **Request Headers**:
  - `Content-Type: application/json`
  - `Idempotency-Key: <UUID-v4>` (Optional)
- **Request Body**:
  ```json
  {
    "provider_id": "c7a8b9d0-1234-4567-89ab-cdef01234567",
    "slot_id": "a1b2c3d4-5678-490a-bcde-f01234567890",
    "client_name": "Devanshi Awasthi",
    "client_email": "devanshi@example.com",
    "notes": "Introductory session request."
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "booking_id": "b00b1e55-9988-4433-2211-aabbccddeeff",
    "status": "CONFIRMED",
    "provider_id": "c7a8b9d0-1234-4567-89ab-cdef01234567",
    "slot_id": "a1b2c3d4-5678-490a-bcde-f01234567890",
    "created_at": "2026-11-15T14:02:15.120Z"
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "VALIDATION_FAILED", "message": "Invalid email or missing fields" }`
  - `409 Conflict`: `{ "error": "SLOT_ALREADY_BOOKED", "message": "Requested slot has already been reserved" }`
