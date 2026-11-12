#!/usr/bin/env bash
set -euo pipefail

# Automated Rollback script for production microservice
IMAGE_NAME="myservice-prod"
APP_PORT="${APP_PORT:-3000}"

echo "=== [ROLLBACK INITIATED] Reverting ${IMAGE_NAME} to stable release ==="

# Stop and remove broken container
docker stop "${IMAGE_NAME}" 2>/dev/null || true
docker rm "${IMAGE_NAME}" 2>/dev/null || true

# Relaunch using the last known stable tag
echo "Relaunching container from ${IMAGE_NAME}:stable..."
docker run -d \
  --name "${IMAGE_NAME}" \
  --restart unless-stopped \
  -p "${APP_PORT}:3000" \
  --env-file .env \
  -m 1g \
  "${IMAGE_NAME}:stable"

echo "Verifying rollback container health..."
sleep 3

LIVE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${APP_PORT}/live" 2>/dev/null || echo "000")
READY_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:${APP_PORT}/ready" 2>/dev/null || echo "000")

echo "Rollback probe results -> Live: ${LIVE_STATUS}, Ready: ${READY_STATUS}"

if [ "$LIVE_STATUS" = "200" ] && [ "$READY_STATUS" = "200" ]; then
  echo "=== [ROLLBACK COMPLETE] Stable version successfully restored and serving traffic ==="
  exit 0
else
  echo "CRITICAL: Rollback container failed readiness checks! Paging on-call immediately!"
  exit 2
fi

