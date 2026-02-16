import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import "sweetalert2/dist/sweetalert2.min.css";
import App from "./App";
import { AuthProvider } from "./state/auth/AuthProvider";
import { initThemeFromStorage } from "./state/theme/themes";

// Point d'entrée React.
// - Monte le router (React Router)
// - Monte le provider d'auth (JWT en localStorage + sync multi-onglets)
// - Initialise le thème DaisyUI avant le premier paint

// Initialise le thème DaisyUI avant le premier render pour éviter un flash.
initThemeFromStorage();

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <AuthProvider>
      <App />
    </AuthProvider>
  </BrowserRouter>
);
