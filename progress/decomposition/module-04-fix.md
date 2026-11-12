# Module 04 Fix: Adjusted Vertical Slice Plan & PM Communication

## 1. PM Alignment Communication
> "Hi [PM],
>
> I reviewed the lead investor's request to see real payments flowing through the platform during next Friday's demo.
>
> **The Risk of Bloating Slice 1**:
> Merging Stripe Elements, webhook listeners, payment intent lifecycles, and receipt state directly into Slice 1’s booking flow will expand build effort from 6 hours to ~20+ hours. Under a tight 5-day delivery window, introducing an external dependency into the core booking thread creates severe single-point-of-failure risk during the investor presentation.
>
> **The Proposed Solution (Two Focused Demos)**:
> 1. **Slice 1 (Marketplace Booking)** remains intact and on schedule: Investors see an ultra-smooth, 2-click booking experience with zero technical friction.
> 2. **Slice 1.5 (Payment Feasibility Spike)** is added as an independent parallel deliverable (estimated at ~6 hours): A standalone Stripe test checkout where the investor can type test card numbers, click Pay, and watch a real `$50.00` payment intent succeed and trigger a verified webhook.
>
> **The Pitch Flow**:
> In the demo, we show Slice 1 to demonstrate conversion and marketplace UX, then immediately show Slice 1.5 to demonstrate payment viability and Stripe settlement. We close by presenting the interface contract connecting the two in Slice 5.
>
> This gives the investor 100% of the proof they requested while eliminating the technical risk of an unfinished or buggy consolidated build."

---

## 2. Updated Slice Definition: Slice 1.5 (Payment Feasibility Spike)
- **Name**: Standalone Payment Feasibility Spike
- **Scope (What Is In)**:
  - Single standalone route `/demo/checkout-spike`.
  - Stripe Elements client form accepting credit card credentials (`4242...`).
  - Backend endpoint `POST /api/v1/payments/create-intent` initializing Stripe PaymentIntent with test secret key.
  - Webhook listener endpoint `POST /api/v1/webhooks/stripe` capturing `payment_intent.succeeded`.
  - UI visual receipt displaying Stripe Charge ID, captured amount, and green settlement badge.
- **Anti-Scope (What Is Explicitly Out)**:
  - No connection to booking tables (payments are unattached test spikes).
  - No provider bank payouts or Stripe Connect split billing.
  - No customer refund, dispute, or recurring billing mechanisms.
  - No customer payment method vaulting or saved card tokens.
- **Dependencies**: None (Can be developed and tested completely in parallel with Slice 1).
- **Acceptance Criteria**:
  1. Open `/demo/checkout-spike`.
  2. Enter Stripe standard test card `4242 4242 4242 4242`, exp `12/28`, CVC `123`.
  3. Click "Authorize & Pay $50.00".
  4. Verify UI displays green checkmark with live Stripe Charge ID `ch_3M...` within 1.5s.
  5. Check server logs; verify `payment_intent.succeeded` webhook logged with 200 OK.
- **Estimated Complexity**: **S** (~5 to 6 hours).
