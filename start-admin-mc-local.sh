#!/bin/sh
# Start admin-mission-control-ui locally with Docker
# Usage: ./start-admin-mc-local.sh

set -e

IMAGE="ghcr.io/inceptionstack/admin-mission-control-ui:latest"
PORT="8080"

echo "🐳 Pulling latest image..."
docker pull "$IMAGE" 2>/dev/null || {
  echo "⚠️  Pull failed — building locally..."
  docker build -t "$IMAGE" .
}

echo "🚀 Starting admin-mission-control-ui on http://localhost:$PORT"
docker run --rm -it \
  -p "${PORT}:80" \
  -e API_BASE_URL="/api" \
  -e AUTH_PROVIDER="cognito" \
  -e COGNITO_DOMAIN="your-cognito-domain" \
  -e COGNITO_CLIENT_ID="your-client-id" \
  -e COGNITO_REGION="us-east-1" \
  -e COGNITO_POOL_ID="your-pool-id" \
  -e APP_TITLE="admin-mission-control-ui" \
  "$IMAGE"
