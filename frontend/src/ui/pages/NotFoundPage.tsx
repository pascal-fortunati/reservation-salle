import { Link } from "react-router-dom";
import HomeIcon from "@mui/icons-material/Home";
import SearchOffIcon from "@mui/icons-material/SearchOff";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export function NotFoundPage() {
  return (
    <div className="min-h-screen hero bg-base-200">
      <div className="hero-content text-center">
        <div className="max-w-2xl">
          {/* Illustration 404 */}
          <div className="mb-8 relative">
            <div className="text-[7rem] sm:text-[10rem] lg:text-[12rem] font-black text-primary/20 leading-none select-none">
              404
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="avatar placeholder">
                <div className="bg-primary text-primary-content rounded-full w-24 h-24 sm:w-32 sm:h-32 flex items-center justify-center">
                  <SearchOffIcon sx={{ fontSize: 72 }} />
                </div>
              </div>
            </div>
          </div>

          {/* Titre et description */}
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">
            Oups ! Page introuvable
          </h1>

          <p className="text-base sm:text-lg mb-2 text-base-content/80">
            La page que vous recherchez semble avoir disparu dans les limbes du
            cyberespace.
          </p>

          <p className="text-base mb-8 text-base-content/60">
            Elle a peut-être été déplacée, supprimée, ou n'a jamais existé.
          </p>

          {/* Stats amusantes */}
          <div className="stats stats-vertical lg:stats-horizontal shadow-lg mb-8">
            <div className="stat">
              <div className="stat-figure text-error">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="inline-block w-8 h-8 stroke-current"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  ></path>
                </svg>
              </div>
              <div className="stat-title">Code d'erreur</div>
              <div className="stat-value text-error">404</div>
              <div className="stat-desc">Not Found</div>
            </div>

            <div className="stat">
              <div className="stat-figure text-warning">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  className="inline-block w-8 h-8 stroke-current"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  ></path>
                </svg>
              </div>
              <div className="stat-title">Niveau de perte</div>
              <div className="stat-value text-warning">MAX</div>
              <div className="stat-desc">Complètement perdu</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link to="/" className="btn btn-primary btn-lg gap-2 shadow-lg">
              <HomeIcon />
              Retour à l'accueil
            </Link>

            <button
              onClick={() => window.history.back()}
              className="btn btn-outline btn-lg gap-2"
            >
              <ArrowBackIcon />
              Page précédente
            </button>
          </div>

          {/* Message d'aide */}
          <div className="divider mt-12">Besoin d'aide ?</div>

          <div className="alert alert-info shadow-lg">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <div className="text-left">
              <div className="font-bold">Si le problème persiste</div>
              <div className="text-sm">
                Vérifiez l'URL ou contactez l'administrateur système.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
