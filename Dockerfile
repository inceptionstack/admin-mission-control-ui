# ── Stage 1: Build ──
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: Serve ──
FROM nginx:alpine

# Remove default nginx config
RUN rm -rf /etc/nginx/conf.d/*

# Copy nginx config as template (for envsubst)
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy Docker scripts
COPY docker/generate-config.sh /docker/generate-config.sh
COPY docker/entrypoint.sh /docker/entrypoint.sh
RUN chmod +x /docker/generate-config.sh /docker/entrypoint.sh

# Default env vars
ENV API_UPSTREAM=http://host.docker.internal:3001
ENV AUTH_PROVIDER=cognito

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost/health || exit 1

ENTRYPOINT ["/docker/entrypoint.sh"]
