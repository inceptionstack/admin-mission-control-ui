import {
  createContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type { AuthContextValue, AuthUser } from "./types";
import { getAuthAdapter } from "./adapter";

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  token: null,
  login: () => {},
  logout: () => {},
});

export { AuthContext };

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const adapter = getAuthAdapter();

  const login = useCallback(() => {
    adapter.login();
  }, [adapter]);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    adapter.logout();
  }, [adapter]);

  useEffect(() => {
    adapter.init().then((result) => {
      if (result.user) {
        setUser(result.user);
        setToken(result.token);
      }
      setIsLoading(false);
    });
  }, [adapter]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        token,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
