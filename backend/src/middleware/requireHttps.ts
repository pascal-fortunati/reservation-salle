import { env } from "../config/env";
import type { NextFunction, Request, Response } from "express";

// En local on est généralement en HTTP (localhost). On n'applique cette règle
// qu'en production, derrière un reverse-proxy qui gère TLS.
export function requireHttps() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (env.NODE_ENV !== "production") return next();

    // Selon l'infra, la terminaison TLS est sur le proxy :
    // - req.secure peut être false
    // - x-forwarded-proto contient alors "https"
    const forwardedProto = req.headers["x-forwarded-proto"];
    const isHttps =
      req.secure ||
      (typeof forwardedProto === "string" && forwardedProto.includes("https"));

    if (!isHttps) {
      return res.status(400).json({ message: "HTTPS requis" });
    }

    return next();
  };
}
