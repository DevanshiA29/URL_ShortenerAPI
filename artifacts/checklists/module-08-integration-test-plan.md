# Module 08: End-to-End Integration Scenario Test Plan

## Scenario 1: Happy Path Corporate Delegation Booking Flow
- **Description**: Meridian corporate manager searches for a provider, books a slot on behalf of an employee, and completes Stripe checkout.
- **Component Sequence**:
  1. `Frontend (TICKET-03)` -> `GET /api/providers?category=wellness`: Returns available providers.
  2. `Frontend (TICKET-07B)` -> Opens booking modal for Provider `prov_101`; toggles "Book for employee"; inputs Name: "Alice Smith", Email: "alice@meridian.com".
  3. `Booking API (TICKET-04)` -> `POST /api/bookings`: Validates `req.user.role === 'manager'`, writes record with `status: PENDING`, `booked_for_name: 'Alice Smith'`, `booked_for_email: 'alice@meridian.com'`.
  4. `Payment API (TICKET-05)` -> `POST /api/checkout/session`: Creates Stripe checkout session embedding `booking_id` in metadata.
  5. `Webhook Handler (TICKET-05)` -> Receives `checkout.session.completed`: Updates booking status to `CONFIRMED`.
  6. `Provider View (TICKET-07C)` -> `GET /api/provider/appointments`: Provider sees confirmed slot with "Booked by: Meridian Manager for Alice Smith".
- **Pass Criteria**: End-to-end journey completes with HTTP 200/201, database shows `status: CONFIRMED`, and provider UI displays delegation badge.

---

## Scenario 2: Cancellation & Refund Flow
- **Description**: User cancels an existing confirmed appointment within the allowable window; cancellation policy applies, status updates across all views, and Stripe refund is initiated.
- **Component Sequence**:
  1. `Frontend` -> `POST /api/bookings/:id/cancel`: Client requests cancellation.
  2. `Booking API` -> Evaluates cancellation policy window (> 24 hours before appointment = 100% refund).
  3. `Payment Gateway` -> Dispatches `stripe.refunds.create({ charge: charge_id })`.
  4. `Booking State Machine` -> Transitions booking status from `CONFIRMED` to `CANCELLED`.
  5. `Cache Invalidation` -> Invalidates provider slot cache to restore availability to the public catalog.
  6. `Provider View` -> `GET /api/provider/appointments` reflects `CANCELLED` status; slot becomes re-bookable in `GET /api/providers/:id/slots`.
- **Pass Criteria**: Booking transitions to `CANCELLED`, Stripe refund ID recorded, and slot reappears in public availability search.

---

## Scenario 3: Edge Case -- Concurrent Booking Conflict (Atomic Lock)
- **Description**: Two users concurrently attempt to book the identical provider time slot at the exact same millisecond.
- **Component Sequence**:
  1. User 1 and User 2 both submit `POST /api/bookings` with `{ provider_id: 'prov_101', slot_id: 'slot_20261115_1400' }`.
  2. `Booking API (TICKET-04)` -> Executes atomic conditional update:
     `UPDATE slots SET status = 'RESERVED', locked_by = user_id WHERE id = slot_id AND status = 'AVAILABLE'`.
  3. **Winner (User 1)**: Matches 1 document; lock granted; proceeds to `PENDING` booking creation. Returns `HTTP 201 Created`.
  4. **Loser (User 2)**: Matches 0 documents; conflict detected; transaction aborts. Returns `HTTP 409 Conflict` (`{"error": "SLOT_ALREADY_RESERVED", "message": "This slot was just booked by another user. Please select another time."}`).
- **Pass Criteria**: Exactly 1 booking is created; zero double-booking in database; User 2 receives immediate, clean HTTP 409 error with guidance.

