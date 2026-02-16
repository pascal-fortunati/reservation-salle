// Représente une route OpenAPI.
export type OpenApiRoute = {
  path: string;
  method: string;
  summary: string;
  tags: string[];
  auth: boolean;
  responses: string[];
};

// Parse une chaîne YAML représentant un tableau d'objets.
function parseInlineYamlArray(value: string) {
  const inner = value.trim().replace(/^\[/, "").replace(/\]$/, "").trim();
  if (inner.length === 0) return [];
  return inner
    .split(",")
    .map((s) => s.trim())
    .map((s) => s.replace(/^['"]/, "").replace(/['"]$/, ""))
    .filter((s) => s.length > 0);
}

// Parse les routes OpenAPI à partir d'un texte YAML.
export function parseOpenApiRoutesFromYaml(yamlText: string): OpenApiRoute[] {
  const routes: OpenApiRoute[] = [];
  const lines = yamlText.split(/\r?\n/);

  let inPaths = false;
  let currentPath: string | null = null;
  let currentRoute: OpenApiRoute | null = null;
  let inResponses = false;
  let inSecurity = false;

  // Vide le buffer de route en cours.
  const flush = () => {
    if (currentRoute) routes.push(currentRoute);
    currentRoute = null;
    inResponses = false;
    inSecurity = false;
  };

  // Parcourt chaque ligne du document YAML.
  for (const rawLine of lines) {
    const line = rawLine.replace(/\t/g, "  ");

    if (!inPaths) {
      if (/^paths:\s*$/.test(line)) inPaths = true;
      continue;
    }

    if (/^\S/.test(line) && !/^paths:\s*$/.test(line)) {
      flush();
      break;
    }

    // Parse le chemin de la route.
    const pathMatch = line.match(/^\s{2}([^\s].*?):\s*$/);
    if (pathMatch) {
      flush();
      currentPath = pathMatch[1].trim();
      continue;
    }

    // Parse la méthode HTTP de la route.
    const methodMatch = line.match(
      /^\s{4}(get|post|put|delete|patch|head|options):\s*$/i
    );
    if (methodMatch && currentPath) {
      flush();
      const method = methodMatch[1].toUpperCase();
      currentRoute = {
        path: currentPath,
        method,
        summary: "",
        tags: [],
        auth: false,
        responses: [],
      };
      continue;
    }

    if (!currentRoute) continue;

    if (/^\s{6}responses:\s*$/.test(line)) {
      inResponses = true;
      inSecurity = false;
      continue;
    }
    if (/^\s{6}security:\s*$/.test(line)) {
      inSecurity = true;
      inResponses = false;
      continue;
    }

    // Parse le résumé de la route.
    const summaryMatch = line.match(/^\s{6}summary:\s*(.+?)\s*$/);
    if (summaryMatch) {
      currentRoute.summary = summaryMatch[1]
        .trim()
        .replace(/^['"]/, "")
        .replace(/['"]$/, "");
      continue;
    }

    // Parse les tags de la route.
    const tagsMatch = line.match(/^\s{6}tags:\s*(\[.*\])\s*$/);
    if (tagsMatch) {
      currentRoute.tags = parseInlineYamlArray(tagsMatch[1]);
      continue;
    }

    if (inSecurity) {
      if (/^\s{8}-\s*bearerAuth\s*:\s*\[\s*\]\s*$/.test(line)) {
        currentRoute.auth = true;
      }

      if (/^\s{6}\S/.test(line)) {
        inSecurity = false;
      }
    }

    if (inResponses) {
      const codeMatch = line.match(/^\s{8}'?(\d{3})'?:\s*$/);
      if (codeMatch) {
        const code = codeMatch[1];
        if (!currentRoute.responses.includes(code))
          currentRoute.responses.push(code);
        continue;
      }
      if (/^\s{6}\S/.test(line)) {
        inResponses = false;
      }
    }
  }

  flush();
  return routes;
}
