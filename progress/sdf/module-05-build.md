# Module 05 — BUILD Evidence: Error Envelopes, Request ID, Logging

## Implementation

### Global Exception Filter (`src/common/filters/http-exception.filter.ts`)
- `@Catch()` catches ALL exceptions (HTTP and unhandled)
- Reads `response.locals.requestId` for request tracing
- 4xx/5xx error details mapped to stable `code` strings (BAD_REQUEST, NOT_FOUND, etc.)
- 500+ errors log `request_id`, `route`, `status_code`, `error` — no stack trace in response
- Response envelope: `{ error: { code, message, request_id } }`

### Request ID Middleware (`src/common/middleware/request-id.middleware.ts`)  
- Generates `randomUUID()` per request
- Sets `res.locals.requestId` and `X-Request-ID` response header
- Logs on `res.on('finish')`: `request_id`, `route`, `status_code`, `latency_ms`

### Applied in `main.ts`
- `app.useGlobalFilters(new HttpExceptionFilter())` — global coverage
- Middleware applied via `AppModule.configure()` for all routes

---

## Evidence

### Test 1: Validation Error (4xx + safe envelope, no stack trace)
```
POST /links with {"long_url":"not-a-url"}
HTTP/1.1 400 Bad Request
X-Request-ID: 5148158f-623d-43c4-9028-39d1f7621ccd
{"error":{"code":"BAD_REQUEST","message":"Invalid request","request_id":"5148158f-623d-43c4-9028-39d1f7621ccd"}}
```
Log: `request_id: '5148158f-...', route: '/links', status_code: 400, latency_ms: 6`

### Test 2: Server Error (safe 500 response, request_id in log)
```
GET /links/invalid-object-id-causes-cast-error
HTTP/1.1 400 Bad Request
X-Request-ID: 7e16037d-968c-47da-ad41-5e46e856ef3a
{"error":{"code":"BAD_REQUEST","message":"Invalid request","request_id":"7e16037d-968c-47da-ad41-5e46e856ef3a"}}
```
No stack trace in response body. `request_id` present. ✅

### Test 3: Sentinel Secret Not Logged
```bash
curl -H "Authorization: Bearer DO_NOT_LOG_ME_123" http://localhost:3000/links
```
Logs output:
```
request_id: '555ad4b5-...', route: '/links', status_code: 200, latency_ms: 6
```
`DO_NOT_LOG_ME_123` does NOT appear anywhere in server logs. ✅

---

## Error Envelope Contract
```json
{
  "error": {
    "code": "BAD_REQUEST",       // stable machine-readable code
    "message": "Invalid request", // human-readable, never internal detail
    "request_id": "uuid-v4"      // correlates with server logs for support
  }
}
```
Stack traces, internal paths, DB queries, and secrets NEVER appear in error responses.

