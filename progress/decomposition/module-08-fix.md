# Module 08 Fix: Canonical Contract Architecture & Prevention

## 1. Evaluation of Immediate Fix Options

| Option | Approach | Tradeoff Evaluation | Decision |
|---|---|---|---|
| **Option 1** | Change Booking Service to emit `"active"` | **Rejected**: Inaccurate domain modeling. An appointment in the future is "confirmed"; "active" implies currently in-progress. Introduces tech debt for appointment state tracking. | **NO** |
| **Option 2** | Change Dashboard to query `"confirmed"` | **Acceptable as Hotfix**: Restores immediate provider visibility in 5 minutes with zero backend risk. However, leaves the underlying contract divergence unaddressed. | **HOTFIX ONLY** |
| **Option 3** | **Shared Canonical Status Definition & Contract Schema** | **Architectural Solution**: Establishes a single source of truth imported by both producer and consumer. Completely eliminates semantic divergence across all present and future services. | **SELECTED AS STRATEGIC FIX** |

---

## 2. Immediate Tactical Implementation
1. **Shared Enum Definition** (`packages/contracts/src/booking.ts`):
   ```typescript
   export enum BookingStatus {
     PENDING = 'PENDING',
     CONFIRMED = 'CONFIRMED',
     IN_PROGRESS = 'IN_PROGRESS',
     CANCELLED = 'CANCELLED',
     COMPLETED = 'COMPLETED'
   }

   export const PROVIDER_VISIBLE_STATUSES = [
     BookingStatus.CONFIRMED,
     BookingStatus.IN_PROGRESS
   ];
   ```
2. **Dashboard Query Patch**:
   - Update Dashboard request: `GET /api/provider/appointments?provider_id=prov_101&status=CONFIRMED`
   - Update Booking Service query resolver: Accepts `status` parameter as an array or comma-separated list, mapping to Mongoose `$in: [BookingStatus.CONFIRMED]`.

---

## 3. Four-Pillar Systemic Prevention Framework
To prevent semantic contract bugs from silently reaching production:

1. **Monorepo Shared Types / OpenAPI Codegen**:
   - Maintain contract definitions in a single schema package (`@shared/contracts`).
   - Run `openapi-generator-cli` or `ts-json-schema-generator` on every PR. Producers and consumers compile against the exact same generated TypeScript interfaces.
2. **Consumer-Driven Contract Testing (Pact)**:
   - Dashboard team publishes its expectations (consumer contract): *"When I request appointments, I expect `status` in `['CONFIRMED', 'CANCELLED']`"*.
   - Booking service CI automatically runs provider verification against consumer contracts. Any unilateral status renaming immediately breaks the CI build before merging.
3. **Automated Cross-Component Integration Test Suite**:
   - Automate the 3 end-to-end integration scenarios (Happy Path, Cancellation, Race Condition) in GitHub Actions.
   - The test creates a booking via API and immediately queries the provider dashboard endpoint, asserting the new booking appears in the list.
4. **Proactive Seam Discovery (Semantic Drift Audit)**:
   - Conduct pre-integration contract diffing audits before merging parallel streams, comparing enum dictionaries and datetime formats across all schema boundaries.

