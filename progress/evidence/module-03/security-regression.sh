#!/bin/bash

set -e

BASE_URL="http://localhost:3000/links"

echo "Testing javascript URL..."

status=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"long_url":"javascript:alert(1)"}')

if [ "$status" != "400" ]; then
  echo "FAIL: javascript URL returned $status"
  exit 1
fi

echo "PASS: javascript URL rejected with 400"

echo "Testing data URL..."

status=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"long_url":"data:text/html,<svg/onload=alert(1)>"}')

if [ "$status" != "400" ]; then
  echo "FAIL: data URL returned $status"
  exit 1
fi

echo "PASS: data URL rejected with 400"

echo "Testing valid HTTPS URL..."

status=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL" \
  -H "Content-Type: application/json" \
  -d '{"long_url":"https://example.com"}')

if [ "$status" != "201" ]; then
  echo "FAIL: valid HTTPS URL returned $status"
  exit 1
fi

echo "PASS: valid HTTPS URL accepted with 201"

echo "All security regression tests passed."
