# Module 02 REFLECT: CI/CD Automation & Quality Gates

## 1. Real Problem Solved
Manual builds and deployments from developer laptops cause environment drift, uncommitted code outages, and missed testing gates. This module automates the entire delivery assembly line into an immutable, version-controlled GitHub Actions pipeline that enforces fail-fast linting, test gating, git-SHA artifact tagging, and secure registry publishing on every push.

## 2. Most Impactful Decision
The decision to enforce **Sequential Gating with Fail-Fast Quality Checks and Main-Only Registry Publishing**. Gating container compilation behind successful linting and unit tests ensures that broken or non-compliant code is rejected within seconds before consuming compute on heavy container builds. Restricting image publishing strictly to the `main` branch (`if: github.ref == 'refs/heads/main' && github.event_name == 'push'`) prevents feature branches from polluting production registries.

## 3. End-to-End Proof
- Created `.github/workflows/ci.yml` defining an automated pipeline with timeout protection (15m), dependency caching, and size guardrails (<200MB).
- Verified that failing unit tests exit with non-zero status and prevent downstream Docker build and push stages.
- Diagnosed tri-symptom pipeline breakdown (secret leaks, cache misses, untargeted branch deploys) in `progress/production/module-02-break.md` and validated mitigations in `progress/production/module-02-fix.md`.

## 4. Mini Practical Task Proof
- **Pipeline Step Verification Proof**:
  ```yaml
  - name: Code Quality & Linting (Fail-Fast)
    run: npm run lint

  - name: Execute Automated Test Suite
    run: npm test

  - name: Verify Image Size Under 200MB Threshold
    run: |
      SIZE_BYTES=$(docker image inspect myservice:${{ github.sha }} --format='{{.Size}}')
      MAX_BYTES=209715200 # 200MB
      if [ "$SIZE_BYTES" -gt "$MAX_BYTES" ]; then exit 1; fi
  ```
  Verified local lint and test run: `Found 3 warnings and 0 errors`, `Test Suites: 1 passed, 1 total`.

## 5. Risk and Mitigation
- **Risk**: A prolonged CI pipeline (>15 minutes) incentivizes engineers to batch large, risky pull requests to avoid waiting, increasing deployment blast radius.
- **Mitigation**: Implement dependency caching via `actions/setup-node@v4` with `cache: 'npm'`, parallelize independent jobs, and enforce a 15-minute execution timeout.

