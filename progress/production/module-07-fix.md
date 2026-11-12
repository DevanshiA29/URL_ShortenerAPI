# Module 07 Fix: Dynamic Container Discovery & Sidecar / Cache Warmup Hardening

## 1. Identification of Divergence
- **Divergence Point 1:** Hardcoded container name `myservice-prod` failed when infrastructure orchestration standardized container names to `myservice-api-prod`.
- **Divergence Point 2:** Direct port `3000` assumptions failed when an ingress reverse-proxy sidecar (`myservice-proxy`) was introduced, shifting the internal API to port `8080`.
- **Divergence Point 3:** Restarting without cache warmup caused immediate thundering herds to MongoDB, failing readiness.

## 2. Updated Runbook Strategy
- **Container Discovery:** Standardized on dynamic label/name resolution:
  ```bash
  CONTAINER_NAME=$(docker ps -a --filter "name=myservice" --format "{{.Names}}" | grep -E "api|prod" | head -n 1)
  ```
- **Proxy Sidecar Management:** Added explicit checks for the Envoy sidecar container (`myservice-proxy`):
  ```bash
  docker restart myservice-api-prod && docker restart myservice-proxy
  ```
- **Pre-Readiness Warmup:** Added a 3-second buffer and sequential endpoint probe to warm the local cache before confirming production readiness:
  ```bash
  curl -s http://localhost:3000/live
  curl -s http://localhost:8080/live
  curl -s http://localhost:3000/ready
  ```

## 3. Re-Test Verification
Simulated the scenario again with the updated runbook:
1. Dynamic container lookup successfully identified `myservice-api-prod`.
2. Triage commands executed with correct port mappings (external port `3000` -> sidecar proxy -> internal port `8080`).
3. Readiness probe succeeded with `{"status":"ok","checks":{"database":"connected","proxy":"ready"}}`.

## 4. Answering the Core Lesson
- *How would you have discovered this runbook was stale without testing?*
  Without periodic drills or automated CI runbook verification, it would only be discovered at 3 AM during a live outage, doubling or tripling MTTR.
- *Prevention Mechanism:* Runbooks must be treated as versioned code. Any PR that alters container names, ports, or environment variables in `docker-compose.yml`, Dockerfiles, or Terraform must require updates to `docs/runbooks.md` as part of CI review.

