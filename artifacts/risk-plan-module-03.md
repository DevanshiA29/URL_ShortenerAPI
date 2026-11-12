# SkillSwap Risk-First Execution Plan — Module 03 (Revised for External Business Blocker)

## 1. Risk Annotations Matrix (Updated with Business Blocker)

| Work Item ID | Name | Risk Score (1-5) | Risk Type(s) | Risk Description & Adaptation Rationale |
|---|---|---|---|---|
| **WI-01** | User Authentication | **2** | Dependency | Foundational identity. Low uncertainty, unblocks all downstream user state. |
| **WI-02** | Listings Data Model | **3** | Scale, Dependency | Multi-city schema tags and pending vetting lifecycle status. |
| **WI-03** | Provider Onboarding | **2** | Novelty | Multi-step credential upload and application state machine. |
| **WI-04** | Availability Management | **4** | Novelty, Concurrency | **Elevated Priority:** Race conditions and double-booking concurrency locking. |
| **WI-05** | Search & Browse | **3** | Scale | Multi-city indexing and sub-100ms response cache layer. |
| **WI-06** | Booking Flow | **3** | Dependency | Connects users and providers; consumes the Payment Interface Contract. |
| **WI-07a** | Payment Interface Contract & Stub | **1** | Contract Design | **Active:** Defines `processPayment(bookingId, amount, method) -> {status, txnId}` with deterministic local stub. |
| **WI-07b** | Stripe Payment Integration | **5** | External Business / Legal | **BLOCKED:** Client lacks merchant entity and Stripe account. Gated until legal resolution. |
| **WI-08** | Review System | **1** | CRUD | Post-session rating and feedback storage. |
| **WI-09** | Notification System | **2** | Integration | Email/SMS event bus listeners. |
| **WI-10** | Cancellation Flow | **3** | Novelty | Refund tier logic; tested against stubbed refund transaction handlers. |
| **WI-11** | Dispute Resolution | **3** | Novelty | Dispute arbitration and escrow hold extension states. |
| **WI-12a** | Admin Review Tool (Minimal) | **1** | Dependency | CLI/API status toggle script to unblock provider vetting without UI complexity. |
| **WI-12b** | Admin Dashboard (Full) | **2** | Scale | Rich metrics, dispute arbitration, and bulk admin operations. |

---

## 2. PM Escalation Communication

> **To:** Product Manager  
> **Subject:** [BLOCKER] SkillSwap Live Payments — Gated on Client Merchant Entity  
> **Message:**  
> *"Payment processing is currently blocked because the client has not established a legal business entity or Stripe merchant account. We have defined a strict Payment Interface Contract and local stub (`WI-07a`) so booking and cancellation development continues completely unblocked, but live transaction verification is gated on client resolution. Could you clarify the timeline for merchant onboarding so we can schedule the live swap?"*

---

## 3. Revised Adaptive Build Order

1. **Step 1: WI-01 — User Authentication (Risk: 2, Dependency)** — Core identities.
2. **Step 2: WI-02 — Listings Data Model with Multi-City Schema (Risk: 3, Scale)** — Foundational schema.
3. **Step 3: WI-07a — Payment Interface Contract & Local Stub (Risk: 1, Contract)** — Standardizes the payment function signature and mock transaction responses (`MOCK_TXN_OK`), unblocking the team.
4. **Step 4: WI-03 — Provider Onboarding (Risk: 2, Novelty)** — Profile intake.
5. **Step 5: WI-12a — Admin Review Tool (Minimal) (Risk: 1, Dependency)** — Unblocks provider activation.
6. **Step 6: WI-04 — Availability Management & Concurrency Locking (Risk: 4, Novelty)** — **Moved up:** Team bandwidth shifts to solve race conditions and optimistic slot locking immediately.
7. **Step 7: WI-06 — Booking Flow (Risk: 3, Dependency)** — Integrates against the `WI-07a` stubbed payment interface.
8. **Step 8: WI-10 — Cancellation Flow (Risk: 3, Novelty)** — Implements tiered cooling-off refund calculations against the mock payment refund API.
9. **Step 9: WI-05 — Search & Browse with City Filtering (Risk: 3, Scale)** — High-speed category indexing.
10. **Step 10: WI-11 — Dispute Resolution (Risk: 3, Novelty)** — Dispute arbitration models.
11. **Step 11: WI-09 — Notification System (Risk: 2, Integration)** — Email/SMS dispatchers.
12. **Step 12: WI-08 — Review System (Risk: 1, CRUD)** — Post-session feedback.
13. **Step 13: WI-12b — Admin Dashboard (Full) (Risk: 2, Scale)** — Platform analytics and moderation.
14. **FUTURE (BLOCKED): WI-07b — Live Stripe Integration (Risk: 5, External)** — Plugged in when the client completes legal merchant setup; zero changes required to Booking or Cancellation code due to interface isolation.
