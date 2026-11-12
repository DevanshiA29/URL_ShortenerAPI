# Module 08 Context: Integration Verification & Requirements Traceability

## 1. The Core Principle
> *"Individual correctness does not guarantee system correctness."*

In modern distributed systems, services and micro-agents frequently satisfy their localized unit tests and isolated mocks while failing catastrophically upon end-to-end integration (as demonstrated by Healthcare.gov's 55 contractor components). Integration bugs live exclusively in the seams, assumptions, and contract mismatches between subsystems.

---

## 2. Micro-Exercise: The Seam Contract Bug

### Stream A (Booking Service)
```http
POST /api/bookings
Response: { "booking_id": "uuid", "status": "confirmed", "created_at": "2025-03-15T14:30:00Z" }
```

### Stream B (Notification Service)
```http
POST /api/notifications/booking-created
Request: { "booking_id": "uuid", "created_at": 1710513000, "provider_id": "uuid" }
```

### The Seam Failure
- **The Divergence**: Stream A produces an ISO 8601 UTC timestamp string (`"2025-03-15T14:30:00Z"`), while Stream B expects a Unix epoch timestamp number (`1710513000`).
- **The Consequence**: In JavaScript/TypeScript, passing `"2025-03-15T14:30:00Z"` into `new Date(created_at * 1000)` yields `NaN` (`Invalid Date`). The notification either crashes with an unhandled exception or formats the timestamp as January 1, 1970, silently corrupting customer emails.
- **Systemic Prevention**: Shared JSON Schema / OpenAPI specs generated into TypeScript types, combined with pre-merge consumer-driven contract testing (e.g. Pact).

---

## 3. Requirements Traceability
Requirements traceability ensures that every business requirement maps to:
1. Architectural decomposition ticket.
2. Interface wire contract.
3. Code implementation branch.
4. Automated integration test fixture.
5. End-to-end user journey verification proof.

If an item in the chain is broken or missing, the requirement is either unverified or dead code.

