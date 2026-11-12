# Module 07 Break: Runbook Drift & Reality Discrepancy

## Injected Scenario: Stale Container Name & Cold Cache Warmup Failure

### The Symptom
At 3:12 AM, an alert pages for `HighLatency` and `ServiceDown`.
The on-call operator opens `docs/runbooks.md` and begins executing the triage and mitigation steps:
1. Operator runs:
   ```bash
   docker logs --tail 100 myservice-prod
   ```
   **Result:** `Error: No such container: myservice-prod`.
   The command fails immediately. The actual container deployed by Kubernetes/Compose during the last infrastructure migration was named `myservice-api-prod`.

2. After discovering the container name via `docker ps`, operator executes mitigation:
   ```bash
   docker restart myservice-api-prod
   ```
   **Result:** Container restarts, but running:
   ```bash
   curl -s http://localhost:3000/ready
   ```
   fails with:
   `curl: (7) Failed to connect to localhost port 3000: Connection refused`.
   The service was updated to listen on port `8080` behind an Envoy proxy sidecar (`myservice-proxy`) on port `3000`. Furthermore, a cold cache causes immediate query storms to MongoDB, tripping the circuit breaker before the health check succeeds.

### Why This Broke
1. **Config Drift (Container Name & Port):** The runbook assumed hardcoded `myservice-prod` and port `3000`, which was invalidated by recent infrastructure updates without runbook review.
2. **Missing Dependency / Sidecar:** The runbook failed to document the dependency on the proxy sidecar container and the mandatory cache-warmup check.
3. **Cognitive Trap:** The on-call operator spent 12 critical minutes troubleshooting why the Docker daemon couldn't find the container, increasing downtime.

