# SkillSwap Requirements Matrix

## 1. Stakeholder Requirements Matrix

| ID | Stakeholder | Category | Requirement Description | Status | Priority |
|---|---|---|---|---|---|
| REQ-01 | Learner | Functional | Browse, search, and filter available sessions by skill, rating, and schedule. | Active | High |
| REQ-02 | Learner | Functional | Book a session and submit payment via escrow. | Active | High |
| REQ-03 | Learner | Functional / Policy | Cancel a booking and receive an appropriate refund based on timing. | **BLOCKED - pending PM decision** | High |
| REQ-04 | Provider | Functional | Create and manage provider profile, list skills, and set hourly/session rates. | Active | High |
| REQ-05 | Provider | Functional | Set own availability calendar and define session slots. | Active | High |
| REQ-06 | Provider | Functional | Manage booking requests, confirm sessions, and track scheduled appointments. | Active | High |
| REQ-07 | Provider | Functional | View dashboard for completed sessions, pending payouts, and net earnings. | Active | Medium |
| REQ-08 | Platform | Quality / Scale | Handle several thousand concurrent users during peak booking windows without race conditions. | Active | High |
| REQ-09 | Platform | Payment / Escrow | Hold payments in escrow until session completion before releasing funds to provider. | Active | High |
| REQ-10 | Platform | Security | Enforce role-based access control (Learner vs Provider vs Admin) and validate all booking inputs. | Active | High |

---

## 2. Cancellation Contradiction Resolution (REQ-03)

**Contradiction Identified:**
The original spec promised learners frictionless cancellation and refund guarantees while simultaneously stating providers maintain full autonomy over availability, booking terms, and schedules. Without explicit policy reconciliation, this creates direct conflict during late cancellations and refund settlements.

**Current Status:** `BLOCKED - pending PM decision`

### Proposed Options for PM Decision:

#### Option 1: Platform-First Cancellation Policy
* **Rule:** Universal platform rule — full refund if cancelled >24 hours prior to session start; strictly non-refundable within 24 hours. Providers cannot override this window.
* **Who it Affects:** Protects learners with predictable, uniform expectations across the app; removes provider autonomy to set custom rules.
* **Tradeoff:** High user experience consistency vs. low provider flexibility (disadvantages same-day booking providers or high-prep instructors).
* **Implementation Complexity:** Low — simple timestamp diff against session start time; single global validation check in the booking service.

#### Option 2: Provider Policy with Platform Floor (Recommended)
* **Rule:** Providers select their policy tier (`Flexible`: full refund up to 2 hours before; `Moderate`: full refund up to 24 hours before; `Strict`: 50% refund up to 48 hours before). The platform enforces a universal minimum cooling-off floor: 100% refund if cancelled within 1 hour of initial booking, regardless of tier.
* **Who it Affects:** Gives providers autonomy over their business model while guaranteeing learners an essential safety net against accidental bookings.
* **Tradeoff:** Preserves marketplace supply diversity and provider satisfaction at the cost of higher UI transparency and multi-tier refund calculation logic.
* **Implementation Complexity:** Medium — requires tier configuration on provider profiles, tier badge display during checkout, tiered refund calculation engine, and cooling-off window timers.

---

## 3. Downstream Affected Requirements

The resolution between Option 1 and Option 2 directly impacts:
1. **Payment & Escrow Flow (REQ-09):** Determining escrow release schedules and handling automated partial or full refund transactions via the payment gateway.
2. **Refund Processing Service (REQ-03):** Logic required to calculate refund percentages based on booking timestamp, cancellation timestamp, and provider policy tier.
3. **Provider Dashboard & Earnings (REQ-07):** Accurate reporting of gross earnings, forfeited cancellation payouts, processing fee deductions, and net pending payouts.
4. **Provider Settings & Onboarding (REQ-04, REQ-05):** UI/schema needed if providers must configure and display their cancellation policy tier on their profile.

