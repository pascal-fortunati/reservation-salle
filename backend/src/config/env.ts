import { z } from "zod";

// Validation/normalisation des variables d'environnement.
// Objectif : crash au démarrage si la config est invalide (plutôt que runtime).
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  JWT_SECRET: z.string().min(32),
  DB_HOST: z.string().default("localhost"),
  DB_USER: z.string().default("root"),
  DB_PASSWORD: z.string().default(""),
  DB_NAME: z.string().default("reservation_salle"),
  DB_PORT: z.coerce.number().int().positive().default(3306),
});

// Remarque : ne jamais logger JWT_SECRET/DB_PASSWORD.
export const env = envSchema.parse(process.env);
