# Module 02 CONTEXT: CI/CD Foundations & Automated Quality Gates

## 1. Case Study: The Friday Laptop Deployment Outage
Deploying directly from developer workstations introduces severe non-determinism:
- The developer's build artifact contained untracked, uncommitted local changes that did not exist in version control.
- When production crashed, the engineering team spent 48 hours triaging because the Git repository showed clean code, while the running binary diverged completely from HEAD.
- **Fundamental Rule**: Production artifacts must be built exclusively by isolated, automated CI/CD runners pulling directly from immutable Git commit SHAs, never from local developer laptops.

## 2. Micro-Exercise: Manual vs. Automated Pre-Push Checklist
- **Manual Verification Steps**:
  1. `npm run lint` (syntax, formatting, and static analysis).
  2. `npm run test` (isolated unit tests).
  3. `npm run test:e2e` (integration contracts).
  4. `docker build` (container packaging).
  5. Container smoke tests (`/live` and `/ready` probes).
- **The Human Bottleneck**: Executing this 5-step checklist 20 times daily across multiple team members inevitably leads to shortcuts ("I only changed one line", "tests take too long, I'll run them after pushing").
- **Solution**: Continuous Integration (CI) enforces these quality checks as non-negotiable status checks on every pull request, eliminating human compliance failure.

