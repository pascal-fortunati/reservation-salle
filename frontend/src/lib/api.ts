import axios from "axios";

// Instance Axios unique pour toute l'app.
// - Ajoute automatiquement le JWT (Bearer) si présent
// - Réagit aux 401 pour purger la session côté client
// - Supporte un rafraîchissement de token via header x-auth-token

// Base URL de l'API.
// En prod, on configure généralement VITE_API_URL via .env (CI/CD).
const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// Avant chaque requête : si un JWT est présent, on l'envoie en Bearer.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Session glissante : l'API peut renvoyer un nouveau token dans x-auth-token.
// On le remplace côté client pour repousser l'expiration (24h d'inactivité).
api.interceptors.response.use(
  (res) => {
    const refreshedToken = res?.headers?.["x-auth-token"];
    if (
      typeof refreshedToken === "string" &&
      refreshedToken.trim().length > 0
    ) {
      localStorage.setItem("token", refreshedToken);
      window.dispatchEvent(
        new CustomEvent("auth:token", { detail: { token: refreshedToken } })
      );
    }
    return res;
  },
  (err) => {
    // Si l'API répond 401, on purge l'état local.
    const status = err?.response?.status;
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth:logout"));
    }
    return Promise.reject(err);
  }
);
