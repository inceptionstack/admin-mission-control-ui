// Runtime configuration — overwritten by Docker entrypoint in production.
// For local development, edit these values or use VITE_* env vars as fallback.
window.__CONFIG__ = {
  API_BASE_URL: "/api",
  AUTH_PROVIDER: "cognito",
  COGNITO_POOL_ID: "",
  COGNITO_CLIENT_ID: "",
  COGNITO_DOMAIN: "",
  COGNITO_REGION: "us-east-1",
  OIDC_AUTHORITY: "",
  OIDC_CLIENT_ID: "",
  OIDC_REDIRECT_URI: "",
  OIDC_POST_LOGOUT_REDIRECT_URI: "",
  APP_TITLE: "Admin Mission Control",
};
