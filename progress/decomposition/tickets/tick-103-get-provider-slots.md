# TICK-103: GET /api/v1/providers/:id/slots — List Provider Time Slots

## 1. Title
GET `/api/v1/providers/:id/slots` — List Available Time Slots

## 2. Context (Why)
Renders the appointment calendar on the provider detail page so clients can choose an available consultation window.

## 3. Scope (What)
Implement `GET /api/v1/providers/:id/slots` to retrieve unbooked future slots for a specified provider.

## 4. Interface Contract
- **HTTP Method & Path**: `GET /api/v1/providers/:id/slots`
- **Path Parameters**: `id`: Provider UUID / Mongo ObjectID
- **Success Response (200 OK)**:
  ```json
  {
    "provider_id": "507f1f77bcf86cd799439011",
    "slots": [
      {
        "slot_id": "507f1f77bcf86cd799439021",
        "start_time": "2026-11-15T14:00:00.000Z",
        "end_time": "2026-11-15T15:00:00.000Z",
        "is_available": true
      }
    ]
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "Invalid provider id format" }`
  - `404 Not Found`: `{ "error": "Provider not found" }`

## 5. Acceptance Criteria (Given/When/Then)
- **Scenario 1: Valid Provider Retrieval**
  - **Given** Provider `507f1f77bcf86cd799439011` with 3 slots, 1 of which is marked `is_booked = true`
  - **When** `GET /api/v1/providers/507f1f77bcf86cd799439011/slots` is dispatched
  - **Then** HTTP 200 is returned with only the 2 unbooked slots.
- **Scenario 2: Non-existent Provider**
  - **Given** an invalid or unknown provider ID `507f1f77bcf86cd799439099`
  - **When** the endpoint is queried
  - **Then** the server responds with HTTP 404 Not Found.

## 6. Constraints
- Filter out slots with `start_time` earlier than `Date.now()`.
- Sort slots chronologically ascending by `start_time`.

## 7. Anti-Scope
- No dynamic recurring slot generator.
- No timezone calculation on the server (return UTC ISO strings).
