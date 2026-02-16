import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import Swal from "sweetalert2";

import ApiOutlinedIcon from "@mui/icons-material/ApiOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CodeIcon from "@mui/icons-material/Code";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import RouteIcon from "@mui/icons-material/Route";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import SecurityIcon from "@mui/icons-material/Security";

import { api } from "../../lib/api";
import { getApiMessage } from "../../lib/errors";

// Représente une route OpenAPI.
type OpenApiRoute = {
  path: string;
  method: string;
  summary: string;
  tags: string[];
  auth: boolean;
  responses: string[];
};

// Représente la réponse de l'endpoint /docs/routes.
type DocsRoutesResponse = {
  tags: string[];
  routes: OpenApiRoute[];
};

// Retourne la classe CSS correspondant à la méthode HTTP.
function getMethodBadge(method: string) {
  const m = method.toUpperCase();
  if (m === "GET") return "badge-success";
  if (m === "POST") return "badge-info";
  if (m === "PUT") return "badge-warning";
  if (m === "DELETE") return "badge-error";
  return "badge-neutral";
}

// Retourne l'URL de la documentation OpenAPI en YAML.
function getOpenApiYamlUrl() {
  const base = (
    import.meta.env.VITE_API_URL ?? "http://localhost:4000/api"
  ).replace(/\/$/, "");
  const origin = base.replace(/\/api$/, "");
  return `${origin}/openapi.yaml`;
}

// Page de documentation OpenAPI.
export function DocsPage() {
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [routes, setRoutes] = useState<OpenApiRoute[]>([]);

  useEffect(() => {
    let cancelled = false;

    // Charge les routes OpenAPI.
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get<DocsRoutesResponse>("/docs/routes");
        if (cancelled) return;
        setTags(Array.isArray(res.data?.tags) ? res.data.tags : []);
        setRoutes(Array.isArray(res.data?.routes) ? res.data.routes : []);
      } catch (err) {
        if (cancelled) return;
        await Swal.fire({
          icon: "error",
          title: "Impossible de charger la documentation",
          text: getApiMessage(err, "Erreur inconnue"),
        });
        setTags([]);
        setRoutes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Filtre les routes en fonction de la requête et des tags sélectionnés.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list =
      q.length === 0
        ? routes
        : routes.filter((r) => {
            const hay = `${r.method} ${r.path} ${r.summary} ${(
              r.tags ?? []
            ).join(" ")}`.toLowerCase();
            return hay.includes(q);
          });
    return list;
  }, [query, routes]);

  // Groupe les routes par tag.
  const grouped = useMemo(() => {
    const map = new Map<string, OpenApiRoute[]>();
    for (const tag of tags.length > 0 ? tags : ["Autres"]) map.set(tag, []);
    for (const r of filtered) {
      const tag = r.tags?.[0] ?? "Autres";
      if (!map.has(tag)) map.set(tag, []);
      map.get(tag)!.push(r);
    }
    for (const [tag, list] of map.entries()) {
      map.set(
        tag,
        list.sort((a, b) =>
          a.path === b.path
            ? a.method.localeCompare(b.method)
            : a.path.localeCompare(b.path)
        )
      );
    }
    return map;
  }, [filtered, tags]);

  // Retourne l'URL de la documentation OpenAPI en YAML.
  const openApiUrl = useMemo(() => getOpenApiYamlUrl(), []);

  if (loading) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="text-center space-y-4">
          <span className="loading loading-spinner loading-lg text-primary"></span>
          <p className="text-lg">Chargement de la documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-200">
      <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
        {/* Hero Section */}
        <div className="card bg-gradient-to-r from-primary to-secondary shadow-xl">
          <div className="card-body text-center py-8 sm:py-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <DescriptionOutlinedIcon
                sx={{ fontSize: 44 }}
                className="text-primary-content"
              />
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold text-primary-content mb-2">
              Documentation API
            </h1>

            <p className="text-primary-content/80 text-base sm:text-lg mb-6">
              Explorez toutes les routes disponibles de l'API
            </p>

            <div className="flex flex-wrap gap-3 justify-center">
              <a
                href={openApiUrl}
                className="btn btn-md sm:btn-lg btn-outline border-primary-content/30 text-primary-content hover:bg-primary-content hover:text-primary gap-2"
                target="_blank"
                rel="noreferrer"
              >
                <DownloadOutlinedIcon />
                Télécharger OpenAPI (YAML)
              </a>

              <Link
                to="/"
                className="btn btn-md sm:btn-lg btn-ghost text-primary-content hover:bg-primary-content/20 gap-2"
              >
                <ArrowBackIcon />
                Retour
              </Link>
            </div>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="stats stats-vertical lg:stats-horizontal shadow-xl w-full">
          <div className="stat">
            <div className="stat-figure text-primary">
              <RouteIcon sx={{ fontSize: 40 }} />
            </div>
            <div className="stat-title">Total de routes</div>
            <div className="stat-value text-primary">{routes.length}</div>
            <div className="stat-desc">Endpoints disponibles</div>
          </div>

          <div className="stat">
            <div className="stat-figure text-secondary">
              <FolderOpenIcon sx={{ fontSize: 40 }} />
            </div>
            <div className="stat-title">Catégories</div>
            <div className="stat-value text-secondary">{tags.length}</div>
            <div className="stat-desc">Tags organisationnels</div>
          </div>

          <div className="stat">
            <div className="stat-figure text-accent">
              <SecurityIcon sx={{ fontSize: 40 }} />
            </div>
            <div className="stat-title">Routes protégées</div>
            <div className="stat-value text-accent">
              {routes.filter((r) => r.auth).length}
            </div>
            <div className="stat-desc">Nécessitent JWT</div>
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
              <h2 className="card-title text-xl sm:text-2xl">
                <SearchOutlinedIcon />
                Rechercher une route
              </h2>
              {query.trim() && (
                <div className="badge badge-primary badge-md sm:badge-lg">
                  {filtered.length} résultat(s)
                </div>
              )}
            </div>

            <label className="input input-bordered input-md sm:input-lg flex items-center gap-2 w-full">
              <SearchOutlinedIcon className="opacity-70" />
              <input
                className="grow"
                placeholder="Rechercher: /api/auth, GET, login, réservation..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query.trim().length > 0 && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm btn-circle"
                  onClick={() => setQuery("")}
                  title="Effacer"
                >
                  ✕
                </button>
              )}
            </label>

            {query.trim() && filtered.length === 0 && (
              <div className="alert alert-warning">
                <InfoOutlinedIcon />
                <span>Aucune route ne correspond à votre recherche.</span>
              </div>
            )}
          </div>
        </div>

        {/* Routes groupées par tag */}
        <div className="space-y-4">
          {Array.from(grouped.entries())
            .filter(([, list]) => list.length > 0)
            .map(([tag, list]) => (
              <div key={tag} className="card bg-base-100 shadow-xl">
                <div className="card-body">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="card-title text-xl sm:text-2xl">
                      <FolderOpenIcon className="text-primary" />
                      {tag}
                    </h2>
                    <div className="badge badge-neutral badge-md sm:badge-lg">
                      {list.length} route(s)
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="table table-zebra table-sm sm:table-md">
                      <thead>
                        <tr>
                          <th className="w-32">
                            <div className="flex items-center gap-2">
                              <CodeIcon fontSize="small" />
                              Méthode
                            </div>
                          </th>
                          <th>
                            <div className="flex items-center gap-2">
                              <RouteIcon fontSize="small" />
                              Endpoint
                            </div>
                          </th>
                          <th className="w-32 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <SecurityIcon fontSize="small" />
                              Sécurité
                            </div>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {list.map((r) => {
                          const responses = r.responses?.length
                            ? r.responses.join(", ")
                            : "-";
                          return (
                            <tr key={`${r.method}:${r.path}`} className="hover">
                              <td>
                                <div
                                  className={`badge badge-md sm:badge-lg font-bold ${getMethodBadge(
                                    r.method
                                  )}`}
                                >
                                  {r.method}
                                </div>
                              </td>
                              <td>
                                <div className="font-mono text-sm font-semibold mb-1">
                                  {r.path}
                                </div>
                                <div className="text-sm opacity-70 mb-2">
                                  {r.summary || "Aucune description disponible"}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <div className="badge badge-ghost badge-sm gap-1">
                                    <ApiOutlinedIcon sx={{ fontSize: 14 }} />
                                    Réponses: {responses}
                                  </div>
                                </div>
                              </td>
                              <td className="text-center">
                                {r.auth ? (
                                  <div className="badge badge-warning gap-2">
                                    <LockOutlinedIcon sx={{ fontSize: 16 }} />
                                    JWT
                                  </div>
                                ) : (
                                  <div className="badge badge-success gap-2">
                                    <PublicOutlinedIcon sx={{ fontSize: 16 }} />
                                    Public
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* Footer info */}
        <div className="alert alert-info shadow-lg">
          <InfoOutlinedIcon />
          <div>
            <h3 className="font-bold">💡 Astuce d'utilisation</h3>
            <div className="text-sm">
              Toutes les routes API sont préfixées par{" "}
              <code className="badge badge-sm badge-primary">/api</code>
              (exemple:{" "}
              <code className="badge badge-sm badge-primary">
                /api/auth/login
              </code>
              )
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
