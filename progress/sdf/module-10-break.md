# Module 10 BREAK: Deployment Diagnostic & Readiness Failure Investigation

## 1. Injected Bug 1: Port Mismatch & Localhost Ingress Binding
- **Vulnerable Code Pattern**:
  ```typescript
  // Flawed bootstrap: binds to loopback interface and hardcoded port
  await app.listen(3000, '127.0.0.1');
  ```
- **Symptom & Production Impact**:
  - The cloud orchestrator injects `PORT=8080` and directs ingress load balancer traffic to the container's external IP on port 8080.
  - Because the app binds to `127.0.0.1:3000`:
    - Platform health probes to port 8080 fail with `ECONNREFUSED`.
    - Ingress traffic receives `502 Bad Gateway`.
    - Platform marks the deployment failed after probe timeout: `Container failed to respond on port 8080`.

---

## 2. Injected Bug 2: Abrupt SIGTERM Connection Drop (Missing Shutdown Hooks)
- **Vulnerable Code Pattern**:
  ```typescript
  // Missing shutdown lifecycle management
  // app.enableShutdownHooks() is omitted
  ```
- **Symptom & Production Impact**:
  - During a rolling deployment or horizontal autoscaling downscale, the container orchestrator sends `SIGTERM`.
  - Without shutdown hooks, Node.js instantly exits, abruptly severing open TCP connections.
  - In-flight HTTP redirect requests terminate with `ECONNRESET`, and pending BullMQ queue writes in Redis are left incomplete.

