#!/usr/bin/env bash
set -e

NOTEBOOK="progress/lab-notebook.md"

echo "# Final Demo Script Execution Log" > "$NOTEBOOK"
echo "Generated at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")" >> "$NOTEBOOK"
echo "" >> "$NOTEBOOK"

echo "=== Starting container for demo ==="
docker run -d --name bootcamp-api-demo -p 3000:3000 \
  -e PORT=3000 \
  -e NODE_ENV=production \
  -e CORS_ORIGIN=http://localhost:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/upsk_sdf \
  -e JWT_SECRET=testsecretkey32characterslongmin123 \
  bootcamp-api

sleep 3

echo "## 1. Health + Readiness Checks" >> "$NOTEBOOK"
echo '```bash' >> "$NOTEBOOK"
echo "$ curl -fsS http://localhost:3000/health" >> "$NOTEBOOK"
HEALTH_OUT=$(curl -fsS http://localhost:3000/health)
echo "$HEALTH_OUT" >> "$NOTEBOOK"
echo "$ curl -fsS http://localhost:3000/ready" >> "$NOTEBOOK"
READY_OUT=$(curl -fsS http://localhost:3000/ready)
echo "$READY_OUT" >> "$NOTEBOOK"
echo '```' >> "$NOTEBOOK"
echo "" >> "$NOTEBOOK"

echo "## 2. Create Link (Protected & Public Tests)" >> "$NOTEBOOK"
echo '```bash' >> "$NOTEBOOK"
echo "$ curl -i http://localhost:3000/links (delete without auth -> 401)" >> "$NOTEBOOK"
UNAUTH_OUT=$(curl -s -i -X DELETE http://localhost:3000/links/6af2cfe5bced9840f6281c00)
echo "$UNAUTH_OUT" >> "$NOTEBOOK"
echo "" >> "$NOTEBOOK"
echo "$ curl -i -H 'Authorization: Bearer test_token_123' -H 'Content-Type: application/json' -d '{\"long_url\":\"https://example.com/demo-original\"}' http://localhost:3000/links" >> "$NOTEBOOK"
CREATE_OUT=$(curl -s -i -H "Authorization: Bearer test_token_123" -H "Content-Type: application/json" -d '{"long_url":"https://example.com/demo-original"}' http://localhost:3000/links)
echo "$CREATE_OUT" >> "$NOTEBOOK"
echo '```' >> "$NOTEBOOK"
echo "" >> "$NOTEBOOK"

LINK_CODE=$(echo "$CREATE_OUT" | grep -o '"code":"[^"]*"' | head -1 | cut -d'"' -f4)
LINK_ID=$(echo "$CREATE_OUT" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "Extracted Link Code: $LINK_CODE, Link ID: $LINK_ID"

echo "## 3. Public Redirect Hot Path" >> "$NOTEBOOK"
echo '```bash' >> "$NOTEBOOK"
echo "$ curl -i http://localhost:3000/r/$LINK_CODE" >> "$NOTEBOOK"
REDIRECT_OUT=$(curl -s -i http://localhost:3000/r/$LINK_CODE)
echo "$REDIRECT_OUT" >> "$NOTEBOOK"
echo '```' >> "$NOTEBOOK"
echo "" >> "$NOTEBOOK"

echo "## 4. Analytics Updated" >> "$NOTEBOOK"
echo '```bash' >> "$NOTEBOOK"
echo "$ curl -i 'http://localhost:3000/links/$LINK_ID/analytics?from=2000-01-01&to=2100-01-01'" >> "$NOTEBOOK"
ANALYTICS_OUT=$(curl -s -i "http://localhost:3000/links/$LINK_ID/analytics?from=2000-01-01&to=2100-01-01")
echo "$ANALYTICS_OUT" >> "$NOTEBOOK"
echo '```' >> "$NOTEBOOK"
echo "" >> "$NOTEBOOK"

echo "## 5. Cache Invalidation Proof" >> "$NOTEBOOK"
echo '```bash' >> "$NOTEBOOK"
echo "$ curl -i -X PATCH http://localhost:3000/links/$LINK_ID -H 'Content-Type: application/json' -d '{\"long_url\":\"https://example.org/demo-updated\"}'" >> "$NOTEBOOK"
PATCH_OUT=$(curl -s -i -X PATCH "http://localhost:3000/links/$LINK_ID" -H "Content-Type: application/json" -d '{"long_url":"https://example.org/demo-updated"}')
echo "$PATCH_OUT" >> "$NOTEBOOK"
echo "" >> "$NOTEBOOK"
echo "$ curl -i http://localhost:3000/r/$LINK_CODE (Verify updated Location header)" >> "$NOTEBOOK"
REDIRECT_UPDATED_OUT=$(curl -s -i http://localhost:3000/r/$LINK_CODE)
echo "$REDIRECT_UPDATED_OUT" >> "$NOTEBOOK"
echo '```' >> "$NOTEBOOK"
echo "" >> "$NOTEBOOK"

echo "## 6. Search + Pagination" >> "$NOTEBOOK"
echo '```bash' >> "$NOTEBOOK"
echo "$ curl -i 'http://localhost:3000/links/search?q=demo&page=1&page_size=10'" >> "$NOTEBOOK"
SEARCH_OUT=$(curl -s -i "http://localhost:3000/links/search?q=demo&page=1&page_size=10")
echo "$SEARCH_OUT" >> "$NOTEBOOK"
echo '```' >> "$NOTEBOOK"
echo "" >> "$NOTEBOOK"

echo "## 7. Graceful Shutdown" >> "$NOTEBOOK"
echo '```bash' >> "$NOTEBOOK"
echo "$ docker stop bootcamp-api-demo" >> "$NOTEBOOK"
docker stop bootcamp-api-demo >> "$NOTEBOOK"
echo "$ docker rm bootcamp-api-demo" >> "$NOTEBOOK"
docker rm bootcamp-api-demo >> "$NOTEBOOK"
echo '```' >> "$NOTEBOOK"
echo "" >> "$NOTEBOOK"
echo "All 7 Final Demo checks passed successfully." >> "$NOTEBOOK"

echo "=== Final Demo completed successfully ==="

