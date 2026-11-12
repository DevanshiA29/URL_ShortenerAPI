# Module 07 Fix: Layered Adaptation Plan (v2 with RBAC Integration)

## 1. Architectural Inflection: Abandoning the Boolean Flag for Pragmatic RBAC
When the requirement escalated from simple delegation to a 3-tier hierarchy (Manager, Employee, Department Head), the boolean `can_book_for_others` flag became untenable. Rather than taking 3 weeks to build a fully normalized enterprise schema, we evolved our bridge into **Pragmatic RBAC**:

```typescript
// User Document Schema Extension
interface User {
  id: string;
  email: string;
  org_id?: string;
  role: 'individual' | 'employee' | 'manager' | 'dept_head';
  department_id?: string;
}

// JWT Token Payload
interface JWTPayload {
  sub: string;
  org_id?: string;
  role: 'individual' | 'employee' | 'manager' | 'dept_head';
  department_id?: string;
}
```

---

## 2. Enforcement & Security Mechanics
1. **Endpoint Protection (`POST /api/bookings`)**:
   - Standard booking (self-booking): Allowed for all authenticated roles.
   - Delegation booking (contains `booked_for_name` or `booked_for_email`): Guarded by `@Roles('manager')`.
   - Violation behavior: If an `employee` attempts to submit delegation fields, the middleware rejects the request immediately with `HTTP 403 Forbidden` (`{"error": "FORBIDDEN_DELEGATION", "message": "Only managers can book appointments on behalf of other employees"}`).
2. **Row-Level Read Scoping (`GET /api/bookings`)**:
   - `employee`: Automatically filters query by `{ $or: [{ user_id: req.user.id }, { booked_for_email: req.user.email }] }`.
   - `dept_head`: Filters query by `{ department_id: req.user.department_id }` across all employees in that department.
   - `manager`: Filters query by `{ booked_by_user_id: req.user.id }` to track team bookings.

---

## 3. Final 6-Day Runway Plan Matrix

### Preserved (100% Unchanged from Previous Sprints)
- `TICKET-01`: Authentication and Password Hashing (`DONE`)
- `TICKET-02`: Provider Catalog Taxonomies (`DONE`)
- `TICKET-03`: Search & Category Filtering UI (`DONE`)

### Modified (Adapted In-Flight)
- `TICKET-04`: Core Booking Engine API (Estimate: M) -- Adds `booked_for_*` schema, `@Roles('manager')` delegation guard, and department-scoped query filter.
- `TICKET-05`: Stripe Direct Checkout (Estimate: S) -- Injects `org_id` and `department_id` into Stripe charge metadata for corporate expense reconciliation.

### Cut (Strictly Descoped to Protect the 6-Day Investor Demo)
- `TICKET-06`: Email Confirmation Receipts (SendGrid) -- *Demoted from SHOULD to CUT*. Replaced by zero-dependency in-app confirmation modal and printable HTML receipt.
- `TICKET-08`: Customer Review & Rating Authoring (`CUT`)
- `TICKET-09`: Google Calendar 2-Way Sync (`CUT`)
- `TICKET-10`: Multi-Location Corporate Reporting Console (`CUT`)

### Added (New Scoped RBAC Tickets)
- `TICKET-07A`: User Role & Department Schema Migration (Estimate: S, 0.5 Day)
- `TICKET-07B`: Role-Based Delegation Booking Modal UI (Estimate: M, 1.0 Day)
- `TICKET-07C`: Department Head Scoped Reporting View (Estimate: S, 0.5 Day)

---

## 4. Credibility-Preserving Stakeholder Impact Statement

> *"In our update 15 minutes ago, we committed to delivering company booking delegation within 6 days while holding calendar sync and reviews for Sprint 2. Following the IT Director's requirement for 3-tier role-based access control (Managers, Employees, Department Heads), we have re-engineered our user claims and query filtering to support this exact security hierarchy. To maintain our strict Tuesday demo deadline without increasing crunch or defect risk, we have made one additional calculated tradeoff: we are swapping automated SendGrid email receipts for instant on-screen booking confirmation cards. This preserves 100% of the booking, payment, and enterprise security demo flow with zero schedule slip. We are proceeding under a complete scope freeze; please confirm Meridian IT's sign-off on the 3-tier role matrix."*

