declare global {
  interface Window {
    __CONFIG__?: Record<string, string>;
  }
}

function get(key: string): string {
  const runtimeValue = window.__CONFIG__?.[key];
  if (runtimeValue !== undefined && runtimeValue !== "") {
    return runtimeValue;
  }
  // Fallback to Vite env vars for local dev
  const viteKey = `VITE_${key}`;
  return (import.meta.env[viteKey] as string) ?? "";
}

export const config = {
  apiBaseUrl: get("API_BASE_URL") || "/api",
  authProvider: get("AUTH_PROVIDER") || "cognito",

  // Cognito-specific
  cognitoPoolId: get("COGNITO_POOL_ID"),
  cognitoClientId: get("COGNITO_CLIENT_ID"),
  cognitoDomain: get("COGNITO_DOMAIN"),
  cognitoRegion: get("COGNITO_REGION") || "us-east-1",

  // Generic OIDC
  oidcAuthority: get("OIDC_AUTHORITY"),
  oidcClientId: get("OIDC_CLIENT_ID"),
  oidcRedirectUri: get("OIDC_REDIRECT_URI") || `${window.location.origin}/`,
  oidcPostLogoutRedirectUri:
    get("OIDC_POST_LOGOUT_REDIRECT_URI") || `${window.location.origin}/`,

  appTitle: get("APP_TITLE") || "Admin Mission Control",
} as const;
