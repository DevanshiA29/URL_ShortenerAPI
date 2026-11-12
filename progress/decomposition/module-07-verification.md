# Module 07 Verification: Plan Adaptation Defense & Cut Analysis

## 1. PM Impact Statement Defense
Our communication to the Product Manager directly answers the three essential stakeholder questions:
1. **What they are getting**: A fully functional end-to-end booking and Stripe checkout flow with corporate delegation. Meridian administrators can book on behalf of employees, and providers see employee names and emails on their appointment cards.
2. **What they are giving up**: Google Calendar 2-way sync and the customer review submission form (both deferred to fast-follow Sprint 2 post-demo).
3. **What they need to do next**: Confirm Meridian's test manager email by 2:00 PM today and give formal sign-off on the descoped calendar sync.

---

## 2. Deep Dive on Scope Cuts (The "What Depended on It?" Test)

### Cut 1: Google Calendar Two-Way Sync (`TICKET-09`)
- **Dependency Topology**: `TICKET-09` is a strict **leaf node** in the dependency graph. It listens for `BookingCreated` events or runs post-checkout.
- **What depended on it**: Nothing. Zero downstream tickets require Google Calendar sync to function.
- **Why safe to remove**: Integrating third-party OAuth2 consent screens, token refresh routines, and Google API rate limits introduces high variance and latency risk during a 6-day sprint. The in-app confirmation modal and email receipts provide complete operational confirmation for the demo.

### Cut 2: Customer Reviews & Ratings Submission (`TICKET-08`)
- **Dependency Topology**: Leaf node.
- **What depended on it**: Nothing. The search and listing views (`TICKET-02`, `TICKET-03`) read existing star ratings, which are seeded statically in demo fixtures.
- **Why safe to remove**: Investor demos evaluate the core value transaction (search -> book -> pay). Omitting post-service review authoring does not block the checkout loop.

---

## 3. Blast Radius Analysis: The Highest-Impact Row

### Highest-Impact Item: **Booking Flow (API) -- MAJOR**
- **Why Rated MAJOR**:
  - The booking creation endpoint (`POST /api/bookings`) is the central transactional nexus of the application.
  - Modifying it requires:
    1. Updating request DTO schema with `booked_for_name` and `booked_for_email`.
    2. Implementing conditional validation: requiring delegation fields if and only if the caller's account has `can_book_for_others = true`.
    3. Persisting delegation columns to the MongoDB/Postgres database.
    4. Updating the JSON response contract consumed by both the web client and the provider dashboard.
- **Confidence Level**: **95% High Confidence**.
- **Where we might be wrong (Residual Risk)**:
  - If Meridian Corp requires cost-center billing codes or multi-employee group bookings (e.g., booking a workshop for 5 employees at once), our single-employee flat string schema (`booked_for_name`, `booked_for_email`) would prove insufficient, requiring an array refactor. We explicitly bounded the pilot scope to 1-on-1 bookings to mitigate this risk.

