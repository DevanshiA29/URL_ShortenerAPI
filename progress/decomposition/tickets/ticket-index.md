# Module 05: Engineering Ticket Specification Index

This ticket bundle decomposes Vertical Slice 1 (Browse & Book Walking Skeleton) and Vertical Slice 2 (Provider Onboarding) into five atomic, zero-ambiguity execution tickets ready for autonomous AI agents or engineers.

| Ticket ID | Title | Slice Source | Complexity | Target Component |
| :--- | :--- | :--- | :--- | :--- |
| **[TICK-101](tick-101-seed-providers.md)** | Seed Database with 3 Test Providers & Slots | Slice 1 | S (1 hr) | `src/database/seeds/` |
| **[TICK-102](tick-102-get-providers.md)** | GET `/api/v1/providers` — List Marketplace Providers | Slice 1 | S (2 hrs) | `src/providers/` |
| **[TICK-103](tick-103-get-provider-slots.md)** | GET `/api/v1/providers/:id/slots` — List Provider Time Slots | Slice 1 | S (2 hrs) | `src/providers/` |
| **[TICK-104](tick-104-post-bookings.md)** | POST `/api/v1/bookings` — Atomic Booking Creation | Slice 1 | M (3 hrs) | `src/bookings/` |
| **[TICK-105](tick-105-post-providers.md)** | POST `/api/v1/providers` — Self-Serve Provider Onboarding | Slice 2 | M (3 hrs) | `src/providers/` |

---
