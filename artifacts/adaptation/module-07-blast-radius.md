# Module 07: Blast Radius Analysis

## Part 1: Company Accounts Impact Assessment

| Artifact | Status | Impact Level | Specific Scope Impact |
|---|---|---|---|
| **User data model** | `IN-USE` | **MINOR** | Add `company_name?: string` and `can_book_for_others: boolean` (default `false`) to Mongoose/Postgres user schema. Non-breaking additive columns. |
| **Auth/JWT system** | `DONE` | **NO IMPACT** | Token issuance, signing, and verification remain untouched. Claims continue using `sub` user id; delegation checks happen at the domain route layer. |
| **Booking flow (API)** | `IN PROGRESS` | **MAJOR** | Extend `POST /api/bookings` DTO with optional `booked_for_name?: string` and `booked_for_email?: string`. Enforce validation: fields required if and only if caller has `can_book_for_others = true`. Booking response schema enriched with delegation metadata. |
| **Booking flow (UI)** | `PLANNED` | **MAJOR** | When user profile has `can_book_for_others === true`, booking modal renders conditional delegation section: "Booking for someone else?" checkbox with Name and Work Email inputs. |
| **Provider dashboard** | `PLANNED` | **MINOR** | Update provider appointment card to display: "Booked by: [Manager Name] for [Employee Name] ([Employee Email])" to prevent front-desk identity confusion. |
| **Search/listing** | `DONE` | **NO IMPACT** | Service catalog, category filters, and provider search cards operate identically for individual and enterprise users. |
| **Payment/billing** | `IN PROGRESS` | **NO IMPACT** | Charge continues billing the logged-in administrator's payment method (Stripe customer token). Meridian will handle internal departmental reimbursement for the pilot phase. |
| **Interface contracts** | `DEFINED` | **MINOR** | Update OpenAPI schema definitions for `CreateBookingRequest` and `BookingDetailResponse` with additive `booked_for_*` properties. Consumer contracts bump minor version. |
| **Tickets: Completed** | `DONE` | **NO IMPACT** | Auth, Service Catalog, and Search tickets remain 100% stable; no rework. |
| **Tickets: In Progress** | `IN-FLIGHT` | **MINOR** | `TICKET-04` (Booking Controller): Merge delegation DTO fields into the current PR branch before review. |
| **Tickets: Not Started** | `BACKLOG` | **MAJOR** | Shift capacity: reprioritize corporate delegation UI into 6-day sprint; defer customer reviews and calendar sync integrations. |

---

## Part 2: Compressed Timeline Categorization (6-Day Investor Demo Gate)

| Ticket | Scope Summary | Category | Justification |
|---|---|---|---|
| **TICKET-04: Core Booking Engine** | Slots reserve, status state machine, conflict locks | **MUST SHIP** | Core product demo: cannot demonstrate value without functioning booking confirmation. |
| **TICKET-07: Corporate Booking Delegation Bridge** | `can_book_for_others` fields, modal UI, provider badge | **MUST SHIP** | Meridian enterprise pilot requirement; mandatory to demonstrate enterprise B2B viability to investors. |
| **TICKET-05: Stripe Direct Checkout** | Authorize card, capture escrow payment | **MUST SHIP** | Demonstrates transaction monetization and revenue flow to investors. |
| **TICKET-06: Email Confirmation Notifications** | SendGrid booking receipt to booker & employee | **SHOULD SHIP** | High perceptual polish for demo; fallback to in-app confirmation modal if time slips. |
| **TICKET-08: Customer Reviews & Ratings** | Post-appointment star rating and review text submission | **CUT** | Safe to cut: empty mock rating displays suffice for prototype demo; zero blocking impact on booking or payment. |
| **TICKET-09: Google Calendar Two-Way Sync** | OAuth2 token dance and Google Calendar event push | **CUT** | Safe to cut: high integration complexity, zero Meridian pilot requirement; demo works via standard in-app dashboard. |
| **TICKET-10: Multi-Location Admin Console** | Cross-location reporting and seat management | **CUT** | Out of scope for 6-day demo: deferred to Q1 post-funding roadmap. |

