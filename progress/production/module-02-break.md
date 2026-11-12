# Module 02 BREAK: Tri-Symptom Pipeline Breakdown Analysis

## 1. Symptom 1: Secret Exposure in Pipeline Logs
- **Observed Defect**: Plaintext secrets or credentials leaked into build step output.
- **Root Cause**: **Injudicious Debug Logging (`echo` / `env` dumps)**.
  - Adding debug steps like `run: echo "Connecting to registry with user: $REGISTRY_USER and pass: $REGISTRY_PASSWORD"` or `run: env` prints credentials directly to stdout.
  - Even when CI platforms attempt automatic masking, formatting tricks, base64 encoding, or string interpolations bypass masks and expose plaintext credentials.
  - **Remediation**: Eliminate debug echo statements involving secrets; use native, audited actions (`docker/login-action`) that pass credentials via encrypted stdin.

## 2. Symptom 2: Pipeline Execution Slowdown (3x–4x Duration)
- **Observed Defect**: Pipeline duration spikes significantly despite zero code changes.
- **Root Cause**: **Broken or Misaligned Cache Keys and Paths**.
  - If the cache path is configured incorrectly (e.g., caching `~/.npm` when using yarn, or caching `node_modules` without lockfile hash synchronization), the runner suffers a 100% cache miss rate on every run.
  - Every pipeline execution is forced to perform a cold clean download of hundreds of dependencies from the public registry.
  - **Remediation**: Align cache path and key with the actual package manager lockfile:
    ```yaml
    uses: actions/setup-node@v4
    with:
      node-version: 22
      cache: 'npm'
    ```

## 3. Symptom 3: Unintended Deployments from Feature Branches
- **Observed Defect**: Experimental feature branches push container images to production registries.
- **Root Cause**: **Missing Branch Guard Conditionals on CD Steps**.
  - If the publish step lacks an explicit conditional check (`if: github.ref == 'refs/heads/main' && github.event_name == 'push'`), any push to any branch (e.g., `feat/wip-experiment`) executes the registry push step.
  - This pollutes the production registry with unvetted images and introduces the catastrophic risk of deploying half-finished branch code to production.
  - **Remediation**: Enforce strict conditional gating on all registry and deployment steps:
    ```yaml
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    ```

