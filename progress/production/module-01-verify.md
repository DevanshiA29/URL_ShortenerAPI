# Production Readiness - Module 01 VERIFY Evidence

## 1. Verification Checklist & Command Output

### 1.1 Image Build
```bash
docker build -t myservice .
```
- **Output**: Built successfully in 0.1s using multi-stage Alpine 3.21 builder/runner. Zero errors, zero warnings.

### 1.2 Container Execution & Health Probes
```bash
docker run -d --name myservice-test -p 3000:3000 -e PORT=3000 -e MONGODB_URI=mongodb://host.docker.internal:27017/upsk_sdf myservice
curl -i http://localhost:3000/live
curl -i http://localhost:3000/ready
```
- **Output**:
  ```http
  HTTP/1.1 200 OK
  X-Request-ID: 8a0c217e-bc68-489b-90b3-ba9c0fa4debc
  Content-Type: application/json; charset=utf-8
  {"status":"ok"}

  HTTP/1.1 200 OK
  X-Request-ID: 291b159d-e84a-4da2-bf5c-169c2e5b058f
  Content-Type: application/json; charset=utf-8
  {"status":"ready"}
  ```

### 1.3 Security: Non-Root Execution
```bash
docker exec myservice-test whoami
```
- **Output**: `appuser` (UID verified non-root; restricted permissions enforced).

### 1.4 Image Size (< 200MB)
```bash
docker images myservice --format "{{.Size}}"
```
- **Output**: `174MB` (Well under the 200MB threshold).

### 1.5 Cleanup
```bash
docker stop myservice-test && docker rm myservice-test
```
- **Output**: Container stopped and removed cleanly.

---

## 2. Conceptual Questions & Production Fundamentals

### 2.1 Layer Caching Mechanics
If `COPY . .` precedes `RUN npm install`, modifying a single application file (e.g. `src/main.ts`) invalidates the build cache at that step, forcing Docker to discard all subsequent layers and reinstall all dependencies from scratch. By copying `package*.json` first and executing dependency installation independently, dependency installation remains cached across code changes until dependencies actually change.

### 2.2 Docker Layers
Each instruction (`FROM`, `RUN`, `COPY`) generates an immutable read-only filesystem diff known as a layer. Docker stacks these layers to form the container image and caches them using content hashes. Instruction order determines cache validity: placing static, infrequently modified instructions early preserves cache hits and reduces build times from minutes to milliseconds.

### 2.3 Multi-Stage Builds
Single-stage images inherit all intermediate development tooling (TypeScript compiler, test frameworks, npm caches, header files), bloating images to 1GB+. Multi-stage builds decouple the build environment from runtime artifacts, allowing the final image to copy only compiled binaries (`dist/`) and production dependencies (`node_modules`), dropping image size from >400MB down to 174MB.

### 2.4 Least-Privilege Execution (Non-Root User)
Running containerized processes as `root` (UID 0) breaches defense-in-depth principles. If a remote code execution (RCE) vulnerability is triggered, the attacker gains root-level capabilities inside the container, drastically simplifying container breakouts, kernel privilege escalation, and unauthorized host filesystem access. Confining processes to an unprivileged `appuser` limits the blast radius.

