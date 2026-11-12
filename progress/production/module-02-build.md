# Module 02 BUILD: CI/CD Pipeline Implementation

## 1. Automated Workflow Definition
Constructed production CI/CD pipeline at `.github/workflows/ci.yml` incorporating all four architectural chunks:
1. **Quality Gates (Fail-Fast)**:
   - `npm run lint`: Static analysis and syntax enforcement via oxlint.
   - `npm test`: Automated unit test verification before compilation or containerization.
2. **Immutable Build Artifacts**:
   - `docker build`: Tagged with exact immutable git commit SHA (`${{ github.sha }}`) and `latest`.
3. **Secret Security & Registry Delivery**:
   - Automated authentication to GitHub Container Registry using ephemeral, scoped `${{ secrets.GITHUB_TOKEN }}`.
   - Conditional execution: Only pushes container images on pushes to the `main` branch, keeping feature branch artifacts isolated.
4. **Pipeline Hardening**:
   - Job-level timeout protection (`timeout-minutes: 15`).
   - Dependency caching via `actions/setup-node@v4` with `cache: 'npm'`.
   - Image size guardrail enforcing strict limit (< 200MB) before container execution.
   - Automated runtime smoke test verifying container `/live` probe response before registry publishing.

## 2. Failure-First Drill Verification
- **Test Invalidation**: If any test in `npm test` fails, the runner exits with code 1.
- **Downstream Protection**: Because the pipeline is sequentially gated, failure in the test phase halts execution immediately, completely preventing broken binaries from being packaged into Docker images or pushed to the production registry.

