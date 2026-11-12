# Module 07: Updated Execution Plan (6-Day Runway)

## 1. Preserved (Completed or Untouched In-Flight)
- **TICKET-01: Authentication & User Service (`DONE`)**: JWT issuance, login/signup endpoints, password hashing. Unchanged.
- **TICKET-02: Provider Catalog & Category Taxonomies (`DONE`)**: Schema, seed fixtures, and service index. Unchanged.
- **TICKET-03: Provider Search & Filtering UI (`DONE`)**: Elastic/MongoDB text query and responsive listing page. Unchanged.

## 2. Modified (Existing Tickets Adapted for New Requirements)
- **TICKET-04: Core Booking Engine API (Modified -- Estimate: M)**:
  - *Original Scope*: Accept `provider_id`, `slot_time`, `user_id`; insert booking record with `PENDING` state.
  - *Modification*: Add optional `booked_for_name` and `booked_for_email` fields. If caller has `can_book_for_others: true`, validate that both fields are non-empty strings. Return delegation metadata in booking response.
- **TICKET-05: Stripe Checkout Flow (Modified -- Estimate: S)**:
  - *Original Scope*: Charge individual user card with itemized line items.
  - *Modification*: Add `booked_for_name` into Stripe charge metadata dictionary to allow Meridian accounting to audit corporate charge slips.

## 3. Cut (Explicitly Descoped from 6-Day Runway)
- **TICKET-08: Customer Reviews & Ratings Submission**:
  - *Why safe to cut*: Static hardcoded star ratings on provider cards provide identical visual fidelity for the investor demo. Omitting the user review submission form introduces zero breakage in the core search-book-pay loop.
- **TICKET-09: Google Calendar Two-Way Sync**:
  - *Why safe to cut*: Eliminates complex third-party OAuth consent screens and webhook listener failure modes. The in-app booking confirmation screen and transactional email suffice for pilot validation.
- **TICKET-10: Multi-Location Corporate Reporting Console**:
  - *Why safe to cut*: Meridian agreed that a single account manager booking for employees across locations satisfies their immediate pilot agreement for week 1. Multi-location hierarchy is deferred to Q1.

## 4. Added (New Work for Company Accounts Requirement)
- **TICKET-07A: Schema Migration & User Delegation Flag (Estimate: S, 0.5 Day)**:
  - *Scope*: Add `company_name` (string) and `can_book_for_others` (boolean, default false) to user schema and auth middleware payload. Seed Meridian demo corporate manager account.
- **TICKET-07B: Delegation Booking Modal Component (Estimate: M, 1.0 Day)**:
  - *Scope*: Add toggle "Booking on behalf of an employee?" inside booking modal; render Name and Email input fields when active.
- **TICKET-07C: Provider Appointment Delegation Display (Estimate: S, 0.5 Day)**:
  - *Scope*: Update Provider dashboard appointment card to render "Booked for: [Employee Name] ([Employee Email])" badge when delegation fields are present.

