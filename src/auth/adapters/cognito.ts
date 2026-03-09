import { config } from "@/config";
import type { AuthAdapter, AuthUser } from "../types";

const REDIRECT_URI = `${window.location.origin}/`;

function tokenEndpoint(): string {
  return `https://${config.cognitoDomain}.auth.${config.cognitoRegion}.amazoncognito.com/oauth2/token`;
}

function parseIdToken(token: string): AuthUser {
  const payload = token.split(".")[1];
  const decoded = JSON.parse(atob(payload));
  return { email: decoded.email || "", sub: decoded.sub || "" };
}

function isTokenExpired(token: string): boolean {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

async function exchangeCodeForTokens(
  code: string,
): Promise<{ idToken: string; accessToken: string; refreshToken: string }> {
  const response = await fetch(tokenEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.cognitoClientId,
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to exchange code for tokens");
  }

  const data = await response.json();
  return {
    idToken: data.id_token,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
  };
}

export function createCognitoAdapter(): AuthAdapter {
  return {
    async init() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        try {
          const tokens = await exchangeCodeForTokens(code);
          localStorage.setItem("id_token", tokens.idToken);
          localStorage.setItem("access_token", tokens.accessToken);
          localStorage.setItem("refresh_token", tokens.refreshToken);
          window.history.replaceState({}, "", window.location.pathname);
          return {
            user: parseIdToken(tokens.idToken),
            token: tokens.idToken,
          };
        } catch (err) {
          console.error("Token exchange failed:", err);
          localStorage.removeItem("id_token");
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          return { user: null, token: null };
        }
      }

      const storedToken = localStorage.getItem("id_token");
      if (storedToken && !isTokenExpired(storedToken)) {
        return { user: parseIdToken(storedToken), token: storedToken };
      }

      if (storedToken) {
        localStorage.removeItem("id_token");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
      }

      return { user: null, token: null };
    },

    login() {
      const url =
        `https://${config.cognitoDomain}.auth.${config.cognitoRegion}.amazoncognito.com/login` +
        `?client_id=${config.cognitoClientId}` +
        `&response_type=code` +
        `&scope=openid+email+profile` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;
      window.location.href = url;
    },

    logout() {
      localStorage.removeItem("id_token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      const url =
        `https://${config.cognitoDomain}.auth.${config.cognitoRegion}.amazoncognito.com/logout` +
        `?client_id=${config.cognitoClientId}` +
        `&logout_uri=${encodeURIComponent(REDIRECT_URI)}`;
      window.location.href = url;
    },

    async refreshToken() {
      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) return null;

      try {
        const response = await fetch(tokenEndpoint(), {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            client_id: config.cognitoClientId,
            refresh_token: refreshToken,
          }),
        });
        if (!response.ok) return null;
        const data = await response.json();
        localStorage.setItem("id_token", data.id_token);
        if (data.access_token)
          localStorage.setItem("access_token", data.access_token);
        return data.id_token as string;
      } catch {
        return null;
      }
    },
  };
}
