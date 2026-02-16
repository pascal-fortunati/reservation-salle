import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env";
import { HttpError } from "../utils/httpErrors";

export type JwtPayload = {
  sub: string;
  email: string;
};

declare global {
  namespace Express {
    interface Request {
      // Injecté par requireAuth() après validation du JWT.
      user?: { id: number; email: string };
    }
  }
}

export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction) => {
    // Convention : Authorization: Bearer <token>
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return next(new HttpError(401, "Non authentifié"));
    }

    const token = header.slice("Bearer ".length).trim();
    try {
      // Vérifie la signature + expiration.
      const decoded = jwt.verify(token, env.JWT_SECRET);

      if (typeof decoded === "string") {
        return next(new HttpError(401, "Session expirée ou invalide"));
      }

      const email = (decoded as { email?: unknown }).email;
      const sub = (decoded as { sub?: unknown }).sub;

      if (typeof email !== "string" || typeof sub !== "string") {
        return next(new HttpError(401, "Session expirée ou invalide"));
      }

      const userId = Number(sub);
      if (!Number.isInteger(userId) || userId <= 0) {
        return next(new HttpError(401, "Session expirée ou invalide"));
      }

      // Session glissante : à chaque requête authentifiée, on renouvelle le JWT.
      // Objectif : expiration après 24h d'inactivité (et non 24h après connexion).
      const refreshedToken = jwt.sign({ email }, env.JWT_SECRET, {
        subject: sub,
        expiresIn: "24h",
      });

      // Le frontend lit ce header (CORS exposedHeaders) et remplace le token en localStorage.
      res.setHeader("x-auth-token", refreshedToken);

      // Données minimales accessibles aux routes (propriété du créneau, etc.).
      req.user = { id: userId, email };
      return next();
    } catch {
      return next(new HttpError(401, "Session expirée ou invalide"));
    }
  };
}
