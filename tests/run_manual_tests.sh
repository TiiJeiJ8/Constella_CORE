#!/usr/bin/env bash
set -euo pipefail

echo "== Manual integration tests for Constella server (bash) =="

curl -s -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"alice","email":"alice@example.com","password":"secret123"}' | jq '.' || true

TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"alice@example.com","password":"secret123"}' | jq -r '.token')

echo "token: $TOKEN"

if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  curl -s -H "Authorization: Bearer $TOKEN" http://localhost:3000/api/v1/me | jq '.'
else
  echo "no token received"
fi
