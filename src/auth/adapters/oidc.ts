import { UserManager, WebStorageStateStore } from "oidc-client-ts";
import { config } from "@/config";
import type { AuthAdapter, AuthUser } from "../types";

let userManager: UserManager | null = null;

function getUserManager(): UserManager {
  if (!userManager) {
    userManager = new UserManager({
      authority: config.oidcAuthority,
      client_id: config.oidcClientId,
      redirect_uri: config.oidcRedirectUri,
      post_logout_redirect_uri: config.oidcPostLogoutRedirectUri,
      response_type: "code",
      scope: "openid email profile",
      userStore: new WebStorageStateStore({ store: window.localStorage }),
      automaticSilentRenew: true,
    });
  }
  return userManager;
}

function toAuthUser(profile: Record<string, unknown>): AuthUser {
  return {
    email: (profile.email as string) || "",
    sub: (profile.sub as string) || "",
  };
}

export function createOidcAdapter(): AuthAdapter {
  return {
    async init() {
      const mgr = getUserManager();

      // Handle redirect callback
      if (
        window.location.search.includes("code=") ||
        window.location.search.includes("state=")
      ) {
        try {
          const user = await mgr.signinRedirectCallback();
          window.history.replaceState({}, "", window.location.pathname);
          const token = user.id_token ?? user.access_token ?? null;
          if (token) {
            localStorage.setItem("id_token", token);
          }
          return {
            user: toAuthUser(user.profile as unknown as Record<string, unknown>),
            token,
          };
        } catch (err) {
          console.error("OIDC callback failed:", err);
          return { user: null, token: null };
        }
      }

      // Check existing session
      try {
        const user = await mgr.getUser();
        if (user && !user.expired) {
          const token = user.id_token ?? user.access_token ?? null;
          if (token) {
            localStorage.setItem("id_token", token);
          }
          return {
            user: toAuthUser(user.profile as unknown as Record<string, unknown>),
            token,
          };
        }
      } catch {
        // No valid session
      }

      return { user: null, token: null };
    },

    login() {
      getUserManager().signinRedirect();
    },

    logout() {
      localStorage.removeItem("id_token");
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      getUserManager().signoutRedirect();
    },

    async refreshToken() {
      try {
        const user = await getUserManager().signinSilent();
        if (user) {
          const token = user.id_token ?? user.access_token ?? null;
          if (token) {
            localStorage.setItem("id_token", token);
          }
          return token;
        }
      } catch {
        // Silent renew failed
      }
      return null;
    },
  };
}
