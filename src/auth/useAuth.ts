import { useContext } from "react";
import { AuthContext } from "./AuthProvider";
import type { AuthContextValue } from "./types";

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
