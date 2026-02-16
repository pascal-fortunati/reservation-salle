export type AuthUser = {
  id: number;
  email: string;
  nom?: string;
  prenom?: string;
};

export type AuthState = {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
};

export type AuthContextValue = AuthState & {
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
};