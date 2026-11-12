#!/usr/bin/env bash
set -euo pipefail

# Deploy & Verify script for production microservice
IMAGE_NAME="myservice-prod"
TAG="${1:-$(git rev-parse --short HEAD 2>/dev/null || echo "v1.0.0")}"
APP_PORT="${APP_PORT:-3000}"
HEALTH_TIMEOUT_SECONDS=20

echo "=== [1/5] Building container image: ${IMAGE_NAME}:${TAG} ==="
docker build -t "${IMAGE_NAME}:${TAG}" .
docker tag "${IMAGE_NAME}:${TAG}" "${IMAGE_NAME}:latest"

echo "=== [2/5] Preserving stable release tag ==="
if docker inspect "${IMAGE_NAME}:stable" >/dev/null 2>&1; then
  echo "Existing stable image preserved."
else
  docker tag "${IMAGE_NAME}:${TAG}" "${IMAGE_NAME}:stable"
fi

echo "=== [3/5] Starting new container instance ==="
docker stop "${IMAGE_NAME}" 2>/dev/null || true
docker rm "${IMAGE_NAME}" 2>/dev/null || true

docker run -d \
  --name "${IMAGE_NAME}" \
  --restart unless-stopped \
  -p "${APP_PORT}:3000" \
  --env-file .env \
  -m 1g \
  "${IMAGE_NAME}:${TAG}"

echo "=== [4/5] Verifying Deployment Health (Liveness & Readiness Gating) ==="
START_TIME=$(date +%s)
READY=false

while true; do
  ELAPSED=$(( $(date +%s) - START_TIME ))
  if [ "$ELAPSED" -gt "$HEALTH_TIMEOUT_SECONDS" ]; then
    echo "ERROR: Health check verification timed out after ${HEALTH_TIMEOUT_SECONDS}s!"
    break
  fi

  LIVE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${APP_PORT}/live" 2>/dev/null || echo "000")
  READY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${APP_PORT}/ready" 2>/dev/null || echo "000")

  if [ "$LIVE_STATUS" = "200" ] && [ "$READY_STATUS" = "200" ]; then
    echo "SUCCESS: Both /live (200) and /ready (200) passed!"
    READY=true
    break
  fi

  echo "Waiting for service readiness... (Live: ${LIVE_STATUS}, Ready: ${READY_STATUS}) [${ELAPSED}s]"
  sleep 2
done

if [ "$READY" != "true" ]; then
  echo "Deployment FAILED readiness checks. Triggering automated rollback..."
  ./scripts/rollback.sh
  exit 1
fi

echo "=== [5/5] Executing Post-Deploy Business Smoke Check ==="
# Verify that business endpoints actually function, not just shallow dependency pings
SMOKE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "http://localhost:${APP_PORT}/links" \
  -H "Content-Type: application/json" \
  -d '{"originalUrl":"https://example.com/smoke-test","alias":"smoke-test"}' 2>/dev/null || true)

SMOKE_HTTP_CODE=$(echo "$SMOKE_RESPONSE" | tail -n 1)

if [ "$SMOKE_HTTP_CODE" = "201" ] || [ "$SMOKE_HTTP_CODE" = "200" ] || [ "$SMOKE_HTTP_CODE" = "409" ]; then
  echo "SUCCESS: Business smoke test passed (HTTP ${SMOKE_HTTP_CODE})!"
  echo "Promoting image to stable..."
  docker tag "${IMAGE_NAME}:${TAG}" "${IMAGE_NAME}:stable"
  echo "=== Deployment ${IMAGE_NAME}:${TAG} VERIFIED & PROMOTED TO STABLE ==="
  exit 0
else
  echo "ERROR: Business smoke test failed with HTTP ${SMOKE_HTTP_CODE}! Triggering rollback..."
  ./scripts/rollback.sh
  exit 1
fi
