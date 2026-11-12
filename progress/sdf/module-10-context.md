# Module 10 Context: Deployment, Network Binding & Platform Port Ingress

## 1. What Happens If a Container Binds to Localhost on Cloud Platforms
- **Root Cause**: Binds to `127.0.0.1` (the loopback interface inside the isolated container network namespace).
- **Platform Consequence**: Railway, AWS ECS, GCP Cloud Run, and Kubernetes forward inbound ingress traffic through container virtual ethernet interfaces (`eth0` / `0.0.0.0`). When an application binds strictly to `127.0.0.1`, external proxy packets cannot reach the socket. Platform health probes fail with `ECONNREFUSED` / `502 Bad Gateway`, and the orchestrator kills the container after failed readiness probes.
- **Production Standard**: Always bind to `0.0.0.0` to accept connections across all network interfaces.

## 2. What Happens If an Application Hardcodes Port Numbers
- **Platform Ingress Conflict**: Cloud PaaS platforms dynamically allocate internal ports at runtime and inject them via the `PORT` environment variable (e.g. `PORT=8080` or ephemeral ports).
- **Consequence**: The platform's edge load balancer forwards traffic exclusively to the port specified in `PORT`. If the application ignores `process.env.PORT` and binds to hardcoded `3000`, the ingress router connects to a non-existent port, readiness checks time out, and deployment fails.
- **Production Standard**: Always read `Number(process.env.PORT) || 3000`.

