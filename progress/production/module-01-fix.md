# Module 01 FIX: Post-Fix Verification Evidence

## 1. Verification Sequence Execution
```bash
docker build -t myservice .
docker run -d --name myservice-verify -p 3000:3000 -e PORT=3000 -e MONGODB_URI=mongodb://host.docker.internal:27017/upsk_sdf myservice
curl -i http://localhost:3000/live
curl -i http://localhost:3000/ready
docker exec myservice-verify whoami
docker images myservice --format "{{.Size}}"
docker stop myservice-verify && docker rm myservice-verify
```

## 2. Command Results
- **Build Speed**: 0.1 seconds (16/16 steps cached when source unchanged).
- **Probes**:
  - `/live` -> HTTP 200 OK `{"status":"ok"}`
  - `/ready` -> HTTP 200 OK `{"status":"ready"}`
- **Security Check**: `whoami` returns `appuser`.
- **Image Size**: `174MB` (< 200MB threshold).
- **Artifact Protection**: `.dockerignore` actively strips `.env*`, `.git`, and `test` from the build context.
- **Cleanup**: Cleanly stopped and removed container `myservice-verify`.

