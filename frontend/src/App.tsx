import { Navigate, Route, Routes } from "react-router-dom";

import { RequireAuth } from "./state/auth/RequireAuth";
import { useAuth } from "./state/auth/useAuth";
import { DashboardPage } from "./ui/pages/DashboardPage";
import { DocsPage } from "./ui/pages/DocsPage";
import { LoginPage } from "./ui/pages/LoginPage";
import { NotFoundPage } from "./ui/pages/NotFoundPage";
import { ProfilePage } from "./ui/pages/ProfilePage";
import { RegisterPage } from "./ui/pages/RegisterPage";
import { AppShell } from "./ui/shell/AppShell";

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    // Router principal de l'application.
    // Convention :
    // - Routes publiques : /login, /register, /docs
    // - Routes protégées : /dashboard, /profile (JWT requis)
    // - "/" redirige selon l'état auth
    <Routes>
      <Route
        path="/"
        element={
          <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
        }
      />

      <Route
        path="/login"
        element={
          isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <RegisterPage />
          )
        }
      />
      <Route path="/docs" element={<DocsPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
