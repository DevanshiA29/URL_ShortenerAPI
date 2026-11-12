# Module 05 Break: The Technically Correct Disaster Diagnosis

## Problem Analysis

### 1. No Authentication / IDOR via Request Body (`user_id`)
- **Missing Element in Ticket**: The ticket allowed `user_id` to be accepted as a raw JSON parameter in the request body without declaring an authorization boundary.
- **Ticket vs Cross-Cutting Concern**:
  - The *authentication mechanism* (JWT validation guard) is a cross-cutting framework concern.
  - The *trust boundary rule* ("Never accept `user_id` in request payloads; bind identity exclusively from server-verified request context `req.user.id`") MUST be explicitly written in the ticket interface contract.
- **Scope Impact**: Small (~10 mins). Prevents critical horizontal privilege escalation (IDOR).

### 2. Lack of Rate Limiting / DoS Vulnerability
- **Missing Element in Ticket**: No request throttle rate limit specified for the public write endpoint.
- **Ticket vs Cross-Cutting Concern**: Cross-cutting infrastructure concern. Rate limiting belongs in the API Gateway / global NestJS `ThrottlerModule`.
- **Ticket Requirement**: The ticket must reference the standard: "Apply standard API rate limit tier (10 req/min per IP via `@Throttle(10, 60)`)."

### 3. Generic Error Handling & Stack Trace Leaks
- **Missing Element in Ticket**: Unhandled exceptions (e.g. database pool drops) default to unformatted 500s exposing stack traces.
- **Ticket vs Cross-Cutting Concern**: Cross-cutting concern. A global `HttpExceptionFilter` must intercept unhandled rejections and sanitize output to `{ "statusCode": 500, "error": "Internal Server Error", "code": "INTERNAL_ERROR" }`.
- **Scope Impact**: Negligible (handled globally at application bootstrap).

### 4. Absence of Structured Audit Logging
- **Missing Element in Ticket**: No telemetry requirement for financial/booking transactions.
- **Ticket vs Cross-Cutting Concern**: The logging *format* and destination (JSON logger / Cloud Logging) is cross-cutting; the requirement to log transactional events (`logger.log({ event: 'booking_created', booking_id, provider_id, slot_id })`) must be stated in ticket constraints.
