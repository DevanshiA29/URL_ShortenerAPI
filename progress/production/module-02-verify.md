# Module 02 VERIFY: Pipeline Integrity & Security Audit

## 1. Verification Checklist

### 1.1 Trigger Configuration
- **Branch Triggers**: Configured for `push` and `pull_request` on `branches: [main]`.
- **Validation**: Any push to `main` immediately schedules and launches the workflow.

### 1.2 Gating: Broken Test Prevents Build
- **Execution Order**: `Lint -> Test -> Build -> Verify Size -> Smoke Test -> Publish`.
- **Gating Mechanism**: Because steps run sequentially with default error handling, a non-zero exit code during `npm test` abruptly halts the job. The downstream `Build Production Container Image` and `Tag and Publish` steps remain strictly unexecuted, guaranteeing defective code is never containerized or published.

### 1.3 Immutable Git SHA Image Tagging
- **Tag Format**: `myservice:${{ github.sha }}` and `ghcr.io/${{ github.repository }}:${{ github.sha }}`.
- **Traceability**: Every published container artifact directly maps to an immutable Git commit hash (`git log --oneline -1`), completely eliminating "which code is running in production?" ambiguities.

### 1.4 Secret Protection & Zero-Leak Audit
- **Credentials**: Zero hardcoded passwords or API keys in `.github/workflows/ci.yml`.
- **Secret Provider**: Employs ephemeral, scoped GitHub Actions tokens (`${{ secrets.GITHUB_TOKEN }}`) with automatic stdout masking (`***`).
- **Isolation**: Build and push steps execute under restricted job permissions (`contents: read`, `packages: write`).

---

## 2. Production Conceptual Analysis

### 2.1 Concurrent Push Resolution
When multiple developers push commits concurrently to `main`, the CI runner queues builds. In default configurations, each runs sequentially against its specific commit SHA. To optimize resource consumption and avoid redundant builds on outdated commits, workflows can define `concurrency: group: ${{ github.ref }}, cancel-in-progress: true` to automatically terminate superseded runs.

### 2.2 Pipeline Velocity & Economic Budgeting
An 8-minute pipeline executed 15 times daily consumes 120 minutes/day (~2,400 minutes/month), exceeding standard free quotas (2,000 min/month) and forcing developers into detrimental context switching. The primary engineering levers to reduce duration to <2 minutes are:
1. Multi-tier dependency caching (`actions/setup-node` caching `~/.npm`).
2. Parallelizing orthogonal stages (`Lint` concurrently with `Test`).
3. Pre-building lightweight base images with pre-warmed dependencies.

---

## 3. Red Flag Audit
- [x] Zero hardcoded secrets, tokens, or private endpoints in YAML or Git history.
- [x] Distinct stage separation: linting, unit testing, compilation, containerization, image validation, and registry push are isolated into clear steps with explicit diagnostic logging.

