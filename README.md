# Admin Mission Control UI

Cloud-agnostic React dashboard for managing environments, deployments, and operations.

## Architecture

```
src/
  auth/              Auth abstraction layer
    adapters/        Provider-specific implementations (Cognito, OIDC)
    AuthProvider.tsx  React context provider
    useAuth.ts       Hook for consuming auth state
  api/client.ts      API client with token refresh
  config.ts          Runtime config (reads window.__CONFIG__)
  components/        Shared UI + business components
  pages/             Route-level page components
  context/           React contexts (favorites, SSM sessions)
public/
  config.js          Runtime config placeholder (overwritten in Docker)
docker/
  nginx.conf         Nginx SPA config with API proxy
  generate-config.sh Writes config.js from env vars
  entrypoint.sh      Docker entrypoint
```

## Local Development

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` to `http://localhost:3001`.

For auth config during local dev, either:
- Edit `public/config.js` directly, or
- Set `VITE_*` env vars (e.g. `VITE_COGNITO_CLIENT_ID`)

## Docker

### Build & Run

```bash
docker build -t admin-mc-ui .
docker run -p 8080:80 \
  -e AUTH_PROVIDER=cognito \
  -e COGNITO_POOL_ID=us-east-1_xxxxx \
  -e COGNITO_CLIENT_ID=abc123 \
  -e COGNITO_DOMAIN=myapp \
  -e API_UPSTREAM=http://backend:3001 \
  admin-mc-ui
```

### Docker Compose

```bash
docker compose up --build
```

## ECS Deployment

1. Push image to ECR/GHCR
2. Create ECS task definition with environment variables (see `.env.example`)
3. Set `API_UPSTREAM` to your backend ALB URL
4. Map port 80 to your load balancer target group
5. Health check path: `/health`

## Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: admin-mc-ui
spec:
  replicas: 2
  selector:
    matchLabels:
      app: admin-mc-ui
  template:
    metadata:
      labels:
        app: admin-mc-ui
    spec:
      containers:
        - name: ui
          image: ghcr.io/your-org/admin-mc-ui:latest
          ports:
            - containerPort: 80
          env:
            - name: AUTH_PROVIDER
              value: "oidc"
            - name: OIDC_AUTHORITY
              value: "https://your-idp.example.com"
            - name: OIDC_CLIENT_ID
              value: "your-client-id"
            - name: API_UPSTREAM
              value: "http://backend-service:3001"
          livenessProbe:
            httpGet:
              path: /health
              port: 80
          readinessProbe:
            httpGet:
              path: /health
              port: 80
---
apiVersion: v1
kind: Service
metadata:
  name: admin-mc-ui
spec:
  selector:
    app: admin-mc-ui
  ports:
    - port: 80
      targetPort: 80
```

## Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `AUTH_PROVIDER` | `cognito` | Auth provider: `cognito` or `oidc` |
| `COGNITO_POOL_ID` | | Cognito User Pool ID |
| `COGNITO_CLIENT_ID` | | Cognito App Client ID |
| `COGNITO_DOMAIN` | | Cognito domain prefix |
| `COGNITO_REGION` | `us-east-1` | AWS region for Cognito |
| `OIDC_AUTHORITY` | | OIDC issuer URL (Auth0, Okta, Keycloak) |
| `OIDC_CLIENT_ID` | | OIDC client ID |
| `OIDC_REDIRECT_URI` | `{origin}/` | Post-login redirect |
| `OIDC_POST_LOGOUT_REDIRECT_URI` | `{origin}/` | Post-logout redirect |
| `API_BASE_URL` | `/api` | API base path (frontend) |
| `API_UPSTREAM` | `http://host.docker.internal:3001` | Backend URL (nginx proxy) |
| `APP_TITLE` | `Admin Mission Control` | Browser title |

## Auth Setup

### Cognito
Set `AUTH_PROVIDER=cognito` and provide `COGNITO_POOL_ID`, `COGNITO_CLIENT_ID`, `COGNITO_DOMAIN`. The app uses the Cognito Hosted UI with authorization code flow.

### Generic OIDC (Auth0, Okta, Keycloak)
Set `AUTH_PROVIDER=oidc` and provide `OIDC_AUTHORITY` (issuer URL) and `OIDC_CLIENT_ID`. Uses `oidc-client-ts` with authorization code + PKCE flow.
<!-- webhook test 2026-03-12T00:46:09Z -->
