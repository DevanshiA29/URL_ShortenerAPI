# Module 02 CONTEXT: Technical Writing & Scannability

## 1. Case Analysis: The Knight Capital Failure
The Knight Capital catastrophe demonstrates that technical documentation is an active operational subsystem, not secondary administrative trivia. When production systems fail at machine speed, human response time is bounded entirely by cognitive load and document scannability:
- A runbook buried in dense narrative prose forces responders into sequential reading during high-stress triage.
- Formatting deficiencies (lack of clear headings, missing checklists, absence of explicit rollback command blocks) turn recoverable incidents into catastrophic business loss.

## 2. Micro-Exercise: The 10-Second Scannability Test
- **Document Under Audit**: Production Database Failover Runbook.
- **10-Second Test Result**: Fails if written in paragraph format. Succeeds only when structured with:
  1. A clear header with status prerequisites.
  2. Bold command snippets with required flags.
  3. Step-by-step numbered instructions with expected stdout output.
- **Structural Imperatives**: Technical writing must function like assembly instructions—scannable, unambiguous, and structured for cognitive ease under pressure.

