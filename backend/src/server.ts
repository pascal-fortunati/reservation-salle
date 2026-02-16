import "dotenv/config";

import { createApp } from "./app";
import { env } from "./config/env";

// Point d'entrée du serveur HTTP.
// createApp() est séparé pour faciliter les tests et le wiring middleware/routes.
const app = createApp();

app.listen(env.PORT, () => {
  process.stdout.write(`API listening on http://localhost:${env.PORT}\n`);
});
