export interface AuthUser {
  email: string;
  sub: string;
}

export interface AuthAdapter {
  init(): Promise<{ user: AuthUser | null; token: string | null }>;
  login(): void;
  logout(): void;
  refreshToken(): Promise<string | null>;
}

export interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: () => void;
  logout: () => void;
}
