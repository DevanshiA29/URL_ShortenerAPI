# Module 01 REFLECT: Production Containerization & Hardening

## 1. Real Problem Solved
Ad-hoc server deployments ("scp to production") create environment drift, unrepeatable dependency conflicts, and severe security exposures from services running with unrestricted host root privileges. This module implements reproducible, multi-stage, least-privilege containerization that guarantees identical runtime behavior across staging and production while minimizing image attack surfaces.

## 2. Most Impactful Decision
The decision to utilize **Multi-Stage Builds combined with Alpine-based minimal runtimes and Non-Root User Hardening (`appuser`)**. Separating the full compilation environment from the lean runtime container dropped the image size from >400MB down to 174MB, stripped dev tooling and build caches, and restricted container execution to an unprivileged user to neutralize container escape vulnerabilities.

## 3. End-to-End Proof
- `docker build -t myservice .` compiles and packages the NestJS service in 0.1s via layer caching.
- `/live` and `/ready` probes return HTTP 200 OK (`{"status":"ok"}` and `{"status":"ready"}`).
- `docker exec myservice-verify whoami` returns `appuser`.
- Image footprint measures 174MB, comfortably passing the <200MB threshold.
- Comprehensive `.dockerignore` blocks `.env*`, `.git`, and test artifacts from leaking into production layers.

## 4. Mini Practical Task Proof
- **Verification Command & Output**:
  ```bash
  docker exec myservice-verify whoami
  # Output: appuser

  docker images myservice --format "{{.Size}}"
  # Output: 174MB

  curl -i http://localhost:3000/live
  # Output: HTTP/1.1 200 OK {"status":"ok"}
  ```

## 5. Risk and Mitigation
- **Risk**: Manual image builds executed locally lack automated vulnerability scanning and pull request gating, risking human error or deployment drift.
- **Mitigation**: Implement automated CI/CD pipelines (Module 02) with automated linting, test suites, container image signing, and automated vulnerability scanning prior to registry push.

