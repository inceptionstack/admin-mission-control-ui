import { config } from "@/config";
import type { AuthAdapter } from "./types";
import { createCognitoAdapter } from "./adapters/cognito";
import { createOidcAdapter } from "./adapters/oidc";

let adapter: AuthAdapter | null = null;

export function getAuthAdapter(): AuthAdapter {
  if (!adapter) {
    switch (config.authProvider) {
      case "oidc":
        adapter = createOidcAdapter();
        break;
      case "cognito":
      default:
        adapter = createCognitoAdapter();
        break;
    }
  }
  return adapter;
}
