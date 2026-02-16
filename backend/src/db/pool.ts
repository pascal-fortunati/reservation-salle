import mysql from "mysql2/promise";

import { env } from "../config/env";

// Pool de connexions MySQL (mysql2/promise).
// - namedPlaceholders: permet d'utiliser ":param" plutôt que "?".
// - connectionLimit: limite de connexions simultanées.
export const pool = mysql.createPool({
  host: env.DB_HOST,
  user: env.DB_USER,
  password: env.DB_PASSWORD,
  database: env.DB_NAME,
  port: env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  namedPlaceholders: true,
});
