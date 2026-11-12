# Module 08 Context: The Last Mile — Production-Ready AI Engineering

## Bridging the Gap from "Demo-Ready" to "Production-Ready"

An AI-generated feature that functions during a local demo is only half-built. Engineering rigor begins when we ensure the code can be safely maintained, deployed, and depended upon by other engineers.

### Pillar 1: Regression Defense Tests
- **Demo-Ready:** Unit tests that verify only the single happy path under mocked conditions.
- **Production-Ready:** Boundary tests, negative authorization assertions (401/403/404), concurrency checks, and integration tests that prevent regressions when upstream models or database drivers change.

### Pillar 2: Architectural Documentation for Future Teammates
- **Demo-Ready:** A developer README with a list of endpoints.
- **Production-Ready:** An operational runbook and architecture specification detailing data models, RBAC privilege matrices, event propagation lifecycles, and rollback steps.

### Pillar 3: Deterministic CI Pipeline
- **Demo-Ready:** Tests run manually on developer laptops with pre-seeded local databases.
- **Production-Ready:** Automated, non-flaky GitHub Actions CI executing linting, static analysis, type checking, and automated container builds on every push to `main`.

### Pillar 4: Non-Breaking Deployment & Rollback Strategy
- **Demo-Ready:** Manual ad-hoc container restarts.
- **Production-Ready:** Zero-downtime rolling deploys gated by active readiness probes (`/ready`), post-deploy business smoke checks, and automated sub-2-minute rollback triggers.

