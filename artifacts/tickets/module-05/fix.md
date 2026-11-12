# Module 05 Fix: Hardening Ticket Specifications Against Latent Assumptions

## 1. Identified Unstated Assumptions in TICK-104 & Applied Fixes

### Assumption 1: Network Retry Idempotency
- **The Gap**: Client network dropouts cause automatic retries; without deduplication, users could inadvertently spawn 2 distinct bookings.
- **The Ticket Hardening**:
  - Added optional header: `Idempotency-Key: <UUID>`.
  - Specification: Cache successful booking response in Redis under `idemp:{key}` with a 120-second TTL. On key replay, return the cached 201 response directly without duplicate database insertion.

### Assumption 2: Input Sanitization & Payload Clamping (XSS & Memory Abuse)
- **The Gap**: Freeform `notes` string could contain malicious HTML/JavaScript (`<script>alert(1)</script>`) targeting provider dashboards, or multi-megabyte payloads.
- **The Ticket Hardening**:
  - Enforced string trimming and HTML entity stripping on `notes`.
  - Enforced maximum string length of 500 characters (`@MaxLength(500)`).
  - Enforced global HTTP body parser limit of 10 KB.

### Assumption 3: Strict Tenancy Authorization Binding
- **The Gap**: Accepting `user_id` in request body permits malicious callers to create appointments charged or attributed to arbitrary other users.
- **The Ticket Hardening**:
  - Removed `user_id` entirely from the client request body schema.
  - Implemented requirement: The server must inject the caller's identity strictly from the verified session context (`req.user.id` from JWT middleware). Unauthenticated calls are rejected with HTTP 401 Unauthorized.

---

## 2. Updated TICK-104 Specification Artifact
The complete revised specification incorporating all security, operational, and data boundary constraints has been synced to `artifacts/tickets/module-05/tick-104-post-bookings.md` and `progress/decomposition/tickets/tick-104-post-bookings.md`.
