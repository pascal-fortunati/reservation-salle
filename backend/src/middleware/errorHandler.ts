import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

import { env } from "../config/env";
import { HttpError } from "../utils/httpErrors";

type MysqlLikeError = {
  code?: unknown;
  errno?: unknown;
  sqlState?: unknown;
  message?: unknown;
};

function isMysqlLikeError(err: unknown): err is MysqlLikeError {
  return typeof err === "object" && err !== null;
}

function mapMysqlErrorToHttp(err: MysqlLikeError) {
  const code = typeof err.code === "string" ? err.code : undefined;
  if (!code) return null;

  // But : transformer des erreurs "techniques" MySQL/driver en réponses
  // compréhensibles côté client.
  const dbUnavailableCodes = new Set([
    "ECONNREFUSED",
    "ETIMEDOUT",
    "ENOTFOUND",
    "EHOSTUNREACH",
    "PROTOCOL_CONNECTION_LOST",
  ]);
  if (dbUnavailableCodes.has(code)) {
    return { status: 503, message: "Base de données indisponible" };
  }

  const dbInitCodes = new Set(["ER_BAD_DB_ERROR", "ER_NO_SUCH_TABLE"]);
  if (dbInitCodes.has(code)) {
    return { status: 500, message: "Base de données non initialisée" };
  }

  return null;
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  // On log en dev uniquement. En production on évite de polluer les logs et de
  // potentiellement exposer des détails internes.
  if (env.NODE_ENV !== "production") {
    const safePath = `${req.method} ${req.originalUrl}`;
    console.error(`[api:error] ${safePath}`);
    console.error(err);
  }

  // Zod (validation) => 400 + détails exploitables par le frontend.
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: "Données invalides",
      details: err.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      })),
    });
  }

  // Erreurs contrôlées (ex: 401/403/404/409) => status imposé.
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }

  // Erreurs MySQL connues => mapping vers 503/500.
  if (isMysqlLikeError(err)) {
    const mapped = mapMysqlErrorToHttp(err);
    if (mapped)
      return res.status(mapped.status).json({ message: mapped.message });
  }

  // Fallback : ne jamais renvoyer la stack au client.
  return res.status(500).json({ message: "Erreur interne" });
};
