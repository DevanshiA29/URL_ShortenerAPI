# Module 05 Verification: Incident Handling & Communication Review

## 1. Severity Assignment & Blast Radius Reasoning
- **Severity Level**: **SEV1**
- **Justification**:
  - The alert recorded 47 HTTP 200 responses to `DELETE /api/admin/links` from an unrecognized external IP address (`203.0.113.42`).
  - This is active, successful destruction of customer link data, not a failed penetration attempt or theoretical flaw.
  - What would make it SEV2: If the requests returned HTTP 401/403 (blocked attempts), or if the endpoint was purely read-only analytics with zero mutation of customer state.
  - What crossed the SEV1 line: The successful 200 status codes confirming actual data loss and complete bypass of the administrative boundary.

## 2. First Stakeholder Update Evaluation
- **Language**: Completely free of confusing jargon; avoids internal implementation trivia (e.g. "JWT token split undefined") and clearly specifies business impact ("47 short links deleted").
- **Direct Answer to Demo**: Explicitly informs the VP that the public URL redirection service runs on an isolated route unaffected by admin deletion, giving them unambiguous green-light to proceed with the prospect demo.
- **Expectation Setting**: Explicit commitment to follow up in 10 minutes or sooner if new indicators emerge.

## 3. Resisting Pressure to Downplay ("Is it a real breach?")
- **The Tradeoff & Moral Hazard**:
  - Telling the VP "it's fine, not a real breach" provides fleeting relief, but leads the VP to make false representations to the CTO, board, and sales prospect.
  - When the 47 deleted links trigger customer complaints next week, the cover-up destroys personal and organizational credibility.
- **The Disciplined Response**:
  - Acknowledge reality directly: It is a genuine auth bypass and data deletion incident.
  - Frame containment accurately: It is isolated strictly to the admin deletion route, does not affect customer redirects or compromise auth secrets, and point-in-time database restoration has commenced.

## 4. Timeliness & Cadence
- **Initial Broadcast**: Dispatched within 4 minutes of alert generation.
- **Value**: Establishes incident command, prevents executive panic and backchannel messaging, and provides an authoritative log for handoff and postmortem.
