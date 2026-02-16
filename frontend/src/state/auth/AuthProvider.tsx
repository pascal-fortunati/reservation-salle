import { useEffect, useMemo, useState } from "react";

import type { AuthContextValue, AuthState, AuthUser } from "./types";
import { AuthContext } from "./AuthContext";

// Source de vérité côté client pour l'auth.
// L'API reste l'autorité : ce state sert uniquement à piloter l'UI et les routes.

// localStorage est une source non fiable (modifiable par l'utilisateur).
// On valide minimalement la forme avant de l'utiliser dans l'UI.
function safeParseUser(raw: string | null): AuthUser | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.id !== "number" || typeof parsed.email !== "string")
      return null;
    return parsed;
  } catch {
    return null;
  }
}

// État initial : lu depuis localStorage pour "rester connecté" après refresh.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    const token = localStorage.getItem("token");
    const user = safeParseUser(localStorage.getItem("user"));
    return {
      token,
      user,
      isAuthenticated: Boolean(token),
    };
  });

  // Synchronisation multi-onglets :
  // - event "storage" : changements localStorage depuis un autre onglet
  // - events custom "auth:*" : envoyés par l'intercepteur Axios
  useEffect(() => {
    const onStorage = () => {
      const token = localStorage.getItem("token");
      const user = safeParseUser(localStorage.getItem("user"));
      setState({ token, user, isAuthenticated: Boolean(token) });
    };
    const onAuthLogout = () => {
      setState({ token: null, user: null, isAuthenticated: false });
    };
    const onAuthToken = (event: Event) => {
      const nextToken = (event as CustomEvent<{ token?: unknown }>).detail
        ?.token;
      if (typeof nextToken === "string" && nextToken.trim().length > 0) {
        setState((prev) => ({
          ...prev,
          token: nextToken,
          isAuthenticated: true,
        }));
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("auth:logout", onAuthLogout);
    window.addEventListener("auth:token", onAuthToken);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("auth:logout", onAuthLogout);
      window.removeEventListener("auth:token", onAuthToken);
    };
  }, []);

  // Login : on persiste token + user pour recharger l'état au refresh.
  // Logout : suppression complète côté client.
  const value = useMemo<AuthContextValue>(() => {
    return {
      ...state,
      login: (token, user) => {
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        setState({ token, user, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setState({ token: null, user: null, isAuthenticated: false });
      },
    };
  }, [state]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
