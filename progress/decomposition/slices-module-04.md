# SkillSwap: Vertical Slice Decomposition Architecture

## Slice 1: Browse & Book Walking Skeleton (Seeded Data)
- **Name**: Browse & Book (Seeded Data Walking Skeleton)
- **Scope (What Is In)**:
  - Client interface displaying a catalog of 3 pre-seeded provider cards (name, avatar, trade category, rating).
  - Provider detail screen showing 1 offered service and 3 fixed 1-hour time slots.
  - "Book Now" CTA dispatching an unauthenticated `POST /api/v1/bookings`.
  - Backend persists booking record to database with status `CONFIRMED` and returns JSON with generated `booking_id`.
  - Confirmation screen displaying booking reference, provider name, date/time, and success checkmark.
- **Anti-Scope (What Is Explicitly Out)**:
  - No user authentication or registration (sessions are anonymous/guest).
  - No payment processing or credit card input (all bookings are free demo transactions).
  - No external SMS, Push, or Email dispatching (confirmation is solely in-app).
  - No search bar, category filters, geolocation matching, or pagination.
  - No provider portal or UI to create/edit services (all providers are database seeds).
  - No rescheduling, cancellation, or dispute flows.
  - No review or feedback submission.
- **Dependencies**: None (Root foundation slice).
- **Acceptance Criteria**:
  1. Open web application; verify exactly 3 provider cards appear on the homepage.
  2. Click "Elena Vance - Woodworking Master"; verify detail page opens displaying 3 slots (10:00, 14:00, 16:00).
  3. Select the 14:00 slot and click "Book Now".
  4. Verify redirect to `/bookings/confirmation` displaying "Booking #BK-1001 Confirmed" with Elena Vance at 14:00.
  5. Refresh page; verify booking ID remains valid and retrievable.
- **Estimated Complexity**: **S** (Small - 4 to 6 hours).

---

## Slice 2: Provider Onboarding & Self-Serve Service Listing
- **Name**: Provider Onboarding & Service Listing
- **Scope (What Is In)**:
  - Provider onboarding form: Name, bio, hourly rate, skills, and portfolio photos.
  - Service creation form: Title, description, duration, and default weekly operating hours.
  - Backend API: `POST /api/v1/providers` and `POST /api/v1/providers/:id/services`.
  - Database schema extension: `providers` and `services` relational tables.
  - Live marketplace integration: newly submitted providers immediately render in Slice 1's browse directory alongside seeded providers.
- **Anti-Scope (What Is Explicitly Out)**:
  - No background checks, identity verification, or license validation.
  - No calendar exception handling (e.g. holidays or custom block-out dates).
  - No multi-currency billing or tax calculations.
  - No provider payouts or bank connection (Stripe Connect).
  - No messaging or in-app chat between provider and client.
- **Dependencies**: Slice 1 (Browse & Book).
- **Acceptance Criteria**:
  1. Navigate to `/become-a-provider`; fill out profile for "Carlos Mendez - Plumbing".
  2. Submit profile; verify redirection to `/provider/services/new`.
  3. Create service "Emergency Pipe Repair", duration 60 mins.
  4. Return to public homepage; verify "Carlos Mendez" now appears in the public provider directory with the new service.
  5. Click Carlos's card; execute booking using Slice 1 flow and confirm booking succeeds.
- **Estimated Complexity**: **M** (Medium - 1.5 days).

---

## Slice 3: Dynamic Slot Generation & Concurrency Conflict Prevention
- **Name**: Dynamic Availability & Double-Booking Lock
- **Scope (What Is In)**:
  - Dynamic slot generator calculating available time windows against existing bookings and provider operating hours.
  - Real-time slot reservation mutex / atomic conditional insert (`status = 'PENDING'` lock for 10 minutes).
  - Disabling and greying out booked slots on the frontend in near real-time.
  - Error state handling: user friendly alert when two users race for the identical time slot.
- **Anti-Scope (What Is Explicitly Out)**:
  - No external calendar synchronization (Google Calendar / Outlook iCal sync).
  - No buffer-time configuration between appointments (e.g. 15-min travel buffers).
  - No automated waitlists for booked slots.
  - No timezone conversion UI (all operations locked to provider local timezone).
- **Dependencies**: Slice 1, Slice 2.
- **Acceptance Criteria**:
  1. Open two separate browser tabs on Provider Carlos's 10:00 AM slot.
  2. In Tab A, click "Book Now" and proceed to confirmation.
  3. In Tab B, attempt to click "Book Now" on the same 10:00 AM slot.
  4. Verify Tab B receives HTTP 409 Conflict with UI notice "This time slot was just booked by another client. Please select another time."
  5. Verify the 10:00 AM slot becomes visually disabled on reload.
- **Estimated Complexity**: **M** (Medium - 2 days).

---

## Slice 4: User Authentication & Booking Lifecycle Management
- **Name**: User Accounts & Booking Lifecycle (Cancel / Reschedule)
- **Scope (What Is In)**:
  - User registration and login (Email + Password with secure JWT tokens).
  - Client dashboard `/my-bookings` displaying upcoming, past, and cancelled appointments.
  - Provider dashboard `/provider/schedule` displaying upcoming appointments.
  - Booking cancellation workflow: User or provider cancels with a required reason string.
  - Slot release: Cancelling an appointment automatically re-opens the slot in Slice 3's availability engine.
- **Anti-Scope (What Is Explicitly Out)**:
  - No social OAuth logins (Google, Apple, GitHub).
  - No automated penalty fees or cancellation fee rules.
  - No reschedule negotiation chat thread.
  - No multi-factor authentication (MFA / SMS OTP).
- **Dependencies**: Slice 1, Slice 2, Slice 3.
- **Acceptance Criteria**:
  1. Register account `client@test.com`; login and book an available slot with Elena Vance.
  2. Navigate to `/my-bookings`; verify booking appears under "Upcoming Appointments".
  3. Click "Cancel Booking" and enter reason "Schedule conflict".
  4. Verify status transitions immediately to "CANCELLED".
  5. Revisit Elena's public booking page; verify previously booked slot is once again available for booking.
- **Estimated Complexity**: **M** (Medium - 2 days).

---

## Slice 5: Escrow Payment Processing & Two-Way Reviews
- **Name**: Escrow Payments & Two-Way Rating System
- **Scope (What Is In)**:
  - Payment integration: Stripe payment intent authorized at time of booking and held in escrow.
  - Completion capture: Client clicks "Mark Completed" (or auto-completed after 24h) to release funds to provider.
  - 1-to-5 star rating and written review submission after booking status reaches `COMPLETED`.
  - Aggregation engine computing average star rating on provider profile cards.
- **Anti-Scope (What Is Explicitly Out)**:
  - No tip or gratuity workflows.
  - No dispute arbitration console or chargeback management dashboard.
  - No photo attachments in reviews.
  - No platform promotional discount codes or referral credits.
- **Dependencies**: Slices 1, 2, 3, 4.
- **Acceptance Criteria**:
  1. Log in as client; select slot and enter Stripe test credit card (`4242...`).
  2. Confirm booking; verify payment is authorized in escrow (`requires_capture`).
  3. After session timestamp, provider marks session "Fulfilled" and client clicks "Confirm & Release Payment".
  4. Verify funds transition to captured state.
  5. Prompt appears: "Rate your experience with Elena"; submit 5 stars and text "Fantastic woodworking tutor!".
  6. Verify Elena's profile rating updates to 5.0 stars with 1 review.
- **Estimated Complexity**: **L** (Large - 3 to 4 days).
