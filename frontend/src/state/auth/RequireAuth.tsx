import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./useAuth";

// Garde de route (protected routes).
// Si non authentifié, redirige vers /login en conservant la destination.
export function RequireAuth() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  // On conserve la page demandée pour pouvoir rediriger après login.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Outlet = sous-routes enfants (ex: AppShell -> pages).
  return <Outlet />;
}
