# TICK-102: GET /api/v1/providers — List Marketplace Providers

## 1. Title
GET `/api/v1/providers` — List Marketplace Providers

## 2. Context (Why)
Powers the client marketplace landing page, allowing clients to browse active skill swap providers with baseline ratings and trade categories.

## 3. Scope (What)
Implement a REST GET endpoint in `src/providers/providers.controller.ts` querying the database with optional limit query parameters and returning a sanitized list of providers.

## 4. Interface Contract
- **HTTP Method & Path**: `GET /api/v1/providers`
- **Query Parameters**:
  - `limit`: integer (optional, default: 20, min: 1, max: 100)
- **Success Response (200 OK)**:
  ```json
  {
    "items": [
      {
        "id": "507f1f77bcf86cd799439011",
        "name": "Elena Vance",
        "trade": "Woodworking",
        "rating": 4.9,
        "hourly_rate": 65.0
      }
    ],
    "count": 1
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: `{ "error": "Invalid limit parameter: must be between 1 and 100" }`

## 5. Acceptance Criteria (Given/When/Then)
- **Scenario 1: Default Query**
  - **Given** 3 providers seeded in the database
  - **When** a client dispatches `GET /api/v1/providers`
  - **Then** the server responds with HTTP 200, returning all 3 provider objects without internal DB version keys (`__v`).
- **Scenario 2: Boundary Validation**
  - **Given** the service is running
  - **When** a client dispatches `GET /api/v1/providers?limit=0`
  - **Then** the server responds with HTTP 400 Bad Request and validation error message.

## 6. Constraints
- Follow NestJS Controller / Service architecture.
- Use projection to exclude internal timestamps or private fields.
- Response time must remain sub-50ms for 50 records.

## 7. Anti-Scope
- No full-text search indexing or keyword filters.
- No geolocation / proximity sorting.
- No client authentication requirements.
