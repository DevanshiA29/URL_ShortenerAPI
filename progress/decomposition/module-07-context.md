# Module 07 Context: Mid-Build Adaptation & Blast Radius Assessment

## Micro-Exercise: Availability Display Requirement Change

### Baseline State
- **Ticket A: User Authentication** -- `DONE` (100%).
- **Ticket B: Service Listing Page** -- `IN PROGRESS` (70% complete; search works, pagination pending).
- **Ticket C: Booking Flow** -- `NOT STARTED` (0%).

### Requirement Influx
> *"Users need to see provider availability on the listing page before clicking into a provider's profile."*

---

## Blast Radius Analysis

```
[Ticket A: User Auth] ──────────→ (0% Impact: Completely decoupled authentication boundary)

[Ticket B: Listing Page] ───────→ (HIGH Impact: 70% in-flight)
                                  - API contract update: Add `next_available_slot: ISO8601` or `is_available_today: boolean`
                                  - Card UI: Add availability badge to provider listing card
                                  - Query optimization: Join/aggregate slot availability without N+1 query cliff
                                  - PRESERVE: Existing search, provider card layout, category filtering

[Ticket C: Booking Flow] ───────→ (MODERATE Impact: Pending start)
                                  - Simplified scope: High-level availability filter handled upstream
                                  - Granular slot selection remains on detail page
                                  - Contract alignment: Reuse availability query schema across both views
```

## Core Takeaways
1. **Never Throw Away Completed or In-Flight Progress**: Ticket B is 70% complete; we adapt the interface contract and append the UI badge without scrapping the existing search and layout implementation.
2. **Contract-First Adjustment**: Expose the new requirement as a non-breaking additive field on the listing API response, preserving existing client compatibility.
3. **GPS Mental Model**: Recalculate route from the current 60% completion waypoint rather than panicking or restarting from scratch.

