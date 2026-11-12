# Module 04 Break Investigation: CPU Lockup & ReDoS

## Symptom Analysis
- Alert: Single `POST /links` requests with repeating characters (e.g. `http://example.com/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa!`) took 47s, 52s, and timed out at 60s.
- Infrastructure impact: 100% CPU spike on a single event-loop thread. No errors logged, database queries completed instantly, memory remained completely stable.

## CPU Profiler Findings
- **Profiler Used**: Node.js CPU profiler (`--inspect` / `v8-profiler` / execution sampling via `scripts/drill-redos-profiler.ts`).
- **Flamegraph & Call Tree Observation**:
  - 99.8% of CPU sample ticks were concentrated inside the V8 Irregexp engine evaluating `RegExp.prototype.test` / `RegExp.prototype.exec`.
  - The offending regular expression used nested quantifiers matching URL paths: `/^http:\/\/example\.com\/([a-z0-9_-]+)+$/`.
- **Root Cause (Catastrophic Backtracking / ReDoS)**:
  - The nested repetition `([a-z0-9_-]+)+` has $O(2^n)$ combinatorial ways to partition a sequence of $n$ matching characters.
  - When followed by a character that fails to match (e.g. `!`), the engine backtracks exhaustively through all $2^n$ permutations before rejecting the string.
  - At length 18: ~1ms. At length 26: ~282ms. At length 30+: >45 seconds. The Node.js single-threaded event loop is completely blocked, freezing all concurrent requests.

## Fix Strategy
- Replace vulnerable nested-quantifier regex with non-backtracking URL validation using the standard WHATWG `URL` parser (`new URL(input)`).
- Profiled 5,000 character payload on fixed parser: **0.11 ms** execution time, strictly $O(N)$ with 0% persistent CPU utilization.
