import cors from "cors";
import express from "express";
import fs from "node:fs/promises";
import helmet from "helmet";
import path from "node:path";

import { env } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import { requireHttps } from "./middleware/requireHttps";
import { requireAuth } from "./middleware/auth";
import { authRouter } from "./routes/auth";
import { planningRouter } from "./routes/planning";
import { reservationsRouter } from "./routes/reservations";
import { usersRouter } from "./routes/users";
import { HttpError } from "./utils/httpErrors";
import { parseOpenApiRoutesFromYaml } from "./utils/openapi";

// Lecture du fichier openapi.yaml.
async function readOpenApiYaml() {
  const filePath = path.resolve(__dirname, "../openapi.yaml");
  return await fs.readFile(filePath, "utf-8");
}

// Création de l'application Express.
export function createApp() {
  const app = express();

  // Important derrière un reverse-proxy (Render/NGINX) :
  // - req.secure dépend souvent de l'en-tête x-forwarded-proto.
  // - Helmet et la redirection HTTPS ont besoin de cette info.
  app.set("trust proxy", 1);

  // Sécurité HTTP : headers (CSP, X-Frame-Options, etc.).
  app.use(helmet());

  // En production on exige HTTPS (on laisse passer en dev pour le localhost).
  app.use(requireHttps());

  // CORS : autorise le frontend (Vite) à appeler l'API.
  // exposedHeaders : permet au navigateur de lire le header x-auth-token
  // (utilisé pour la "session glissante" / refresh JWT).
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
      exposedHeaders: ["x-auth-token"],
    })
  );

  // Parsing JSON (limité pour éviter les payloads trop gros).
  app.use(express.json({ limit: "100kb" }));

  // OpenAPI : expose le fichier YAML complet.
  app.get("/openapi.yaml", async (_req, res, next) => {
    try {
      const yamlText = await readOpenApiYaml();
      res.type("application/yaml").status(200).send(yamlText);
    } catch (err) {
      next(err);
    }
  });

  // Documentation : routes OpenAPI triées par chemin/méthode.
  app.get("/api/docs/routes", async (_req, res, next) => {
    try {
      const yamlText = await readOpenApiYaml();
      const routes = parseOpenApiRoutesFromYaml(yamlText).sort((a, b) =>
        a.path === b.path
          ? a.method.localeCompare(b.method)
          : a.path.localeCompare(b.path)
      );
      const tags = Array.from(
        new Set(
          routes.flatMap((r) => (r.tags.length > 0 ? r.tags : ["Autres"]))
        )
      ).sort((a, b) => a.localeCompare(b));

      res.status(200).json({ tags, routes });
    } catch (err) {
      next(err);
    }
  });

  // Redirection vers la documentation.
  app.get("/docs", (_req, res) => {
    const base = env.CORS_ORIGIN.replace(/\/$/, "");
    res.redirect(302, `${base}/docs`);
  });

  // Health check : simple route pour vérifier que l'API fonctionne.
  app.get("/api/health", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  // Auth : routes publiques (register/login).
  app.use("/api/auth", authRouter);

  // Profil : protégé dans le routeur lui-même.
  app.use("/api/users", usersRouter);

  // Planning/Réservations : protégées au niveau du montage.
  app.use("/api/planning", requireAuth(), planningRouter);
  app.use("/api/reservations", requireAuth(), reservationsRouter);

  app.use((_req, _res, next) => {
    next(new HttpError(404, "Route introuvable"));
  });

  // Gestion d'erreurs centralisée : Zod -> 400, HttpError -> status, etc.
  app.use(errorHandler);

  return app;
}
