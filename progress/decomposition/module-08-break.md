# Module 08 Break Analysis: The "Confirmed" vs. "Active" Status Seam Bug

## Symptom
Providers report that newly created bookings do not appear on their appointment dashboard. 

---

## Forensic Trace & Diagnosis

### Step 1: Booking Creation Service Audit
- Direct database query against `bookings` table:
  ```json
  {
    "_id": "6732918a2010bf0012019ab2",
    "provider_id": "prov_101",
    "user_id": "user_202",
    "status": "confirmed",
    "created_at": "2026-11-11T23:20:00.000Z"
  }
  ```
- **Finding**: Bookings are successfully created, persisted, and marked with `status: "confirmed"`. The booking service is 100% compliant with its internal specification.

### Step 2: Provider Dashboard Query Audit
- Inspecting network requests dispatched by the Provider Dashboard SPA:
  `GET /api/provider/appointments?provider_id=prov_101&status=active`
- **Finding**: The dashboard client queries specifically for `status=active`. The database returns `[]` (empty array) because no records have `status == "active"`.

### Step 3: Root Cause: Semantic Vocabulary Divergence
- **Neither component has a code defect**:
  - The booking team used `"confirmed"` to signify that payment succeeded and the reservation is locked.
  - The dashboard team used `"active"` to signify that the appointment is upcoming and non-cancelled.
- Because the interface contract between the teams did not define a canonical enum with explicit values, both teams invented reasonable but incompatible string literals.

---

## Remediation Plan
1. **Shared Contract Single Source of Truth**:
   - Establish shared TypeScript enum in canonical contracts package:
     ```typescript
     export enum BookingStatus {
       PENDING = 'PENDING',
       CONFIRMED = 'CONFIRMED',
       CANCELLED = 'CANCELLED',
       COMPLETED = 'COMPLETED'
     }
     ```
2. **Dashboard Query Alignment**:
   - Update Dashboard query to request `status=CONFIRMED`.
   - Update API endpoint to support multi-status filtering if needed: `?status=CONFIRMED,PENDING`.
3. **Automated Schema Validation**:
   - Add OpenAPI validation in CI asserting that query parameter enums strictly match database schema enums.

