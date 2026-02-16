import { useContext } from "react";

import { AuthContext } from "./AuthContext";

// Hook utilitaire : évite d'importer useContext/AuthContext partout.
// Si on l'appelle hors <AuthProvider>, on préfère crash en dev plutôt que
// de continuer avec un contexte null.
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthContext missing");
  return ctx;
}
