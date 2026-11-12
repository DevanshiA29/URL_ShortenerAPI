# Module 04: Vertical Slicing vs Horizontal Layers

## 1. Horizontal Layers Analysis ("Cake Layers")
- **Layer 1: Data Storage (Database)**:
  - Tables / Collections: `providers`, `services`, `availability_slots`, `bookings`, `reviews`, `payments`.
  - Migrations, indexes, foreign key relationships, ORM schemas.
- **Layer 2: Backend Application & API Logic**:
  - Routing controllers, booking validation services, calendar slot conflict resolvers, notification dispatchers, payment gateway adapters.
- **Layer 3: Client Interface (UI)**:
  - Provider discovery directory, calendar date-picker widget, booking form modal, status badge, checkout flow.

*Risk of Horizontal Stacking*: Three sprints spent polishing schemas and DB models yields 0 executable customer capability; schema assumptions remain ungrounded against real runtime workflows until the very end.

## 2. Minimal Vertical Slice ("Cake Wedge")
- **Scope Definition ("Walking Skeleton")**:
  - **Actor**: Single authenticated user.
  - **Target**: 1 pre-seeded provider offering 1 fixed 30-minute skill swap session.
  - **Action**: User clicks single "Confirm Booking" button for the default slot.
  - **Thread of Execution**:
    - UI: Minimal booking confirmation screen with a single submit button.
    - API: `POST /api/v1/bookings` accepting `{ providerId, slotId }`.
    - Data: Direct atomic write into `bookings` table setting `status: 'confirmed'`.
    - Feedback: Response returned and UI displays "Booking #101 Confirmed".
- **Excluded Complexity**: Multi-currency pricing, recurring schedules, cancellation/refund workflows, calendar sync (Google/iCal), rating prompts.
- **Immediate Learning Value**: Validates the end-to-end data pipeline, payload formats, error bubbling, and state transitions within sprint 1.
