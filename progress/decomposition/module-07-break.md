# Module 07 Break Analysis: Layering In Role-Based Access Control (RBAC)

## The Second Requirement Influx
The Meridian IT Director requires hierarchical role-based access control:
1. **Managers**: Can book services on behalf of any employee.
2. **Employees**: Can view their own bookings; cannot book for others.
3. **Department Heads**: Can view all bookings within their department.

---

## 1. Escalation of Blast Radius

| Artifact | Original Rating | Escalated Rating | Architectural Reason for Escalation |
|---|---|---|---|
| **Auth/JWT System** | `NO IMPACT` | **MAJOR** | JWT tokens must now embed claims: `{ org_id: string, role: 'manager' \| 'dept_head' \| 'employee', department_id: string }`. Auth guards must validate token claims on booking endpoints. |
| **User Data Model** | `MINOR` | **MAJOR** | The single boolean `can_book_for_others` is fundamentally obsolete. The user model requires `role` (enum: `manager`, `dept_head`, `employee`) and `department_id` (string). |
| **Booking Query API** | `NO IMPACT` | **MAJOR** | `GET /api/bookings` requires row-level security scoping: employees see only bookings where `booked_for_user_id == req.user.id`; department heads see bookings where `department_id == req.user.department_id`; managers see bookings they initiated. |
| **Booking Creation API** | `MAJOR` | **MAJOR** | Guard `POST /api/bookings` to reject delegation payload with `HTTP 403 Forbidden` if `req.user.role === 'employee'`. |

---

## 2. Re-evaluating the Scope Cuts (Compensating for RBAC)
To absorb the ~1.5 days of RBAC middleware and query-scoping work without pushing past the 6-day demo:
- **TICKET-06: Email Confirmation Notifications**: Demoted from `SHOULD SHIP` to **`CUT`**. Replaced by standard in-app confirmation modal and on-screen printable receipt.
- **TICKET-08 (Reviews), TICKET-09 (Calendar Sync), TICKET-10 (Multi-Location Console)**: Remain firmly **`CUT`**.
- **Scope Freeze Agreement**: Zero additional feature requests permitted between now and Tuesday's investor demo.

---

## 3. Decision Reassessment: Re-architecting the Bridge
Does Option B (Minimal Bridge) still hold?
- The boolean flag shortcut is dead. However, Option A (full normalized multi-tenant relational redesign with separate Organization, Role, and Department tables) would still take 2-3 weeks and blow through the 6-day deadline.
- **The Adapted Bridge (Pragmatic RBAC)**:
  - Add `role` (`'manager' | 'dept_head' | 'employee'`) and `department_id` directly to the `User` document.
  - Implement a NestJS `@Roles('manager')` guard and query filter interceptor.
  - This delivers 100% of the IT Director's functional requirements for Meridian Corp within 2 days, preserves the 6-day investor demo, and creates a clean migration path to normalized multi-tenancy in Q1.

---

## 4. Revised PM Impact Statement
> *"We have re-assessed our plan following the IT Director's requirement for role-based access control (Managers, Employees, and Department Heads). We can deliver this exact three-tier permission model in time for the 6-day demo by extending user roles and scoping booking visibility by department. To fit this security logic into our deadline without introducing regressions, we have descoped SendGrid email receipts, replacing them with instantaneous in-app confirmation screens. The demo remains 100% on schedule for Tuesday, provided we institute an immediate, absolute scope freeze. Please confirm with Meridian IT that this three-tier role structure meets their pilot security sign-off."*

