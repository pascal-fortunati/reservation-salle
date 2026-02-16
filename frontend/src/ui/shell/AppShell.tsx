import { useEffect, useRef, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../state/auth/useAuth";
import {
  applyTheme,
  getStoredTheme,
  type ThemeName,
} from "../../state/theme/themes";

import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import LoginIcon from "@mui/icons-material/Login";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import PersonIcon from "@mui/icons-material/Person";
import SpaceDashboardIcon from "@mui/icons-material/SpaceDashboard";

// Composant principal de l'application, gérant la navigation et l'affichage des pages.
// Layout :
// - Topbar fixe (toujours visible)
// - Sidebar fixe (toujours visible, scroll interne si nécessaire)
// - Le scroll se fait uniquement dans la zone de contenu (main)
export function AppShell() {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const outletFadeRef = useRef<HTMLDivElement | null>(null);

  // Thème DaisyUI (persisté côté client).
  const [theme, setTheme] = useState<ThemeName>(
    () => getStoredTheme() ?? "corporate"
  );

  // Déconnexion : purge token + user, puis retour page login.
  const onLogout = () => {
    logout();
    navigate("/login", { replace: true, state: { from: location } });
  };

  // Utilisé pour surligner la navigation dans la sidebar.
  // Active si le chemin actuel correspond au chemin fourni.
  const isActive = (path: string) => location.pathname === path;

  // Applique le data-theme + met à jour l'état local pour le toggle.
  const onThemeChange = (next: ThemeName) => {
    applyTheme(next);
    setTheme(next);
  };

  const isDarkTheme = theme === "business";

  // Ajoute une transition d'opacité lors du changement de route.
  useEffect(() => {
    const el = outletFadeRef.current;
    if (!el) return;
    el.style.opacity = "0.7";
    const raf = window.requestAnimationFrame(() => {
      el.style.opacity = "1";
    });
    return () => window.cancelAnimationFrame(raf);
  }, [location.pathname]);

  return (
    <div className="drawer lg:drawer-open h-screen">
      <input id="main-drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content flex flex-col h-screen">
        {/* Navbar épurée */}
        <div className="navbar bg-base-100 shadow-md border-b border-base-300 fixed top-0 left-0 right-0 z-30 h-16 lg:ml-80 lg:w-[calc(100%-20rem)]">
          <div className="flex-none lg:hidden">
            <label htmlFor="main-drawer" className="btn btn-square btn-ghost">
              <MenuIcon />
            </label>
          </div>

          <div className="flex-1">
            <div className="breadcrumbs text-sm px-4 hidden lg:block">
              <ul>
                <li>
                  <Link to="/">Accueil</Link>
                </li>
                {isActive("/dashboard") && <li>Planning</li>}
                {isActive("/profile") && <li>Profil</li>}
              </ul>
            </div>
            <div className="lg:hidden px-2">
              <span className="font-semibold">
                {isActive("/dashboard") && "Planning"}
                {isActive("/profile") && "Mon Profil"}
                {!isActive("/dashboard") &&
                  !isActive("/profile") &&
                  "TechSpace"}
              </span>
            </div>
          </div>

          <div className="flex-none gap-2">
            <label
              className="swap swap-rotate btn btn-ghost btn-circle"
              aria-label="Basculer le thème"
            >
              <input
                type="checkbox"
                checked={isDarkTheme}
                onChange={(e) =>
                  onThemeChange(e.target.checked ? "business" : "corporate")
                }
              />

              <svg
                className="swap-off h-6 w-6 fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path d="M5.64,17l-.71.71a1,1,0,0,0,0,1.41,1,1,0,0,0,1.41,0l.71-.71A1,1,0,0,0,5.64,17ZM5,12a1,1,0,0,0-1-1H3a1,1,0,0,0,0,2H4A1,1,0,0,0,5,12Zm7-7a1,1,0,0,0,1-1V3a1,1,0,0,0-2,0V4A1,1,0,0,0,12,5ZM5.64,7.05a1,1,0,0,0,.7.29,1,1,0,0,0,.71-.29,1,1,0,0,0,0-1.41l-.71-.71A1,1,0,0,0,4.93,6.34Zm12,.29a1,1,0,0,0,.7-.29l.71-.71a1,1,0,1,0-1.41-1.41L17,5.64a1,1,0,0,0,0,1.41A1,1,0,0,0,17.66,7.34ZM21,11H20a1,1,0,0,0,0,2h1a1,1,0,0,0,0-2Zm-9,8a1,1,0,0,0-1,1v1a1,1,0,0,0,2,0V20A1,1,0,0,0,12,19ZM18.36,17A1,1,0,0,0,17,18.36l.71.71a1,1,0,0,0,1.41,0,1,1,0,0,0,0-1.41ZM12,6.5A5.5,5.5,0,1,0,17.5,12,5.51,5.51,0,0,0,12,6.5Zm0,9A3.5,3.5,0,1,1,15.5,12,3.5,3.5,0,0,1,12,15.5Z" />
              </svg>

              <svg
                className="swap-on h-6 w-6 fill-current"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
              >
                <path d="M21.64,13a1,1,0,0,0-1.05-.14,8.05,8.05,0,0,1-3.37.73A8.15,8.15,0,0,1,9.08,5.49a8.59,8.59,0,0,1,.25-2A1,1,0,0,0,8,2.36,10.14,10.14,0,1,0,22,14.05,1,1,0,0,0,21.64,13Zm-9.5,6.69A8.14,8.14,0,0,1,7.08,5.22v.27A10.15,10.15,0,0,0,17.22,15.63a9.79,9.79,0,0,0,2.1-.22A8.11,8.11,0,0,1,12.14,19.73Z" />
              </svg>
            </label>

            {isAuthenticated ? (
              <>
                {/* Menu utilisateur */}
                <div className="dropdown dropdown-end">
                  <label tabIndex={0} className="btn btn-ghost btn-circle">
                    <div className="indicator">
                      <span className="indicator-item badge badge-success badge-xs"></span>
                      <div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center font-bold">
                        {user?.prenom?.charAt(0) ||
                          user?.email?.charAt(0).toUpperCase()}
                      </div>
                    </div>
                  </label>
                  <ul
                    tabIndex={0}
                    className="dropdown-content z-[1] menu menu-sm p-2 shadow-xl bg-base-100 rounded-box w-64 sm:w-72 max-w-[calc(100vw-1rem)] border border-base-300 mt-3"
                  >
                    <li className="menu-title px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="avatar placeholder">
                          <div className="bg-primary text-primary-content rounded-full w-12 flex items-center justify-center">
                            <span className="text-xl leading-none">
                              {user?.prenom?.charAt(0) ||
                                user?.email?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-base">
                            {user?.prenom} {user?.nom}
                          </span>
                          <span className="text-xs opacity-70 font-normal">
                            {user?.email}
                          </span>
                        </div>
                      </div>
                    </li>
                    <div className="divider my-1"></div>
                    <li>
                      <Link to="/profile" className="gap-3">
                        <PersonIcon fontSize="small" />
                        <span>Mon profil</span>
                      </Link>
                    </li>
                    <li>
                      <Link to="/dashboard" className="gap-3">
                        <CalendarMonthIcon fontSize="small" />
                        <span>Planning</span>
                      </Link>
                    </li>
                    <div className="divider my-1"></div>
                    <li>
                      <button
                        onClick={onLogout}
                        className="gap-3 text-error hover:bg-error hover:text-error-content"
                      >
                        <LogoutIcon fontSize="small" />
                        <span>Déconnexion</span>
                      </button>
                    </li>
                  </ul>
                </div>
              </>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" className="btn btn-ghost btn-sm gap-2">
                  <LoginIcon fontSize="small" />
                  <span className="hidden sm:inline">Connexion</span>
                </Link>
                <Link to="/register" className="btn btn-primary btn-sm gap-2">
                  <PersonAddIcon fontSize="small" />
                  <span className="hidden sm:inline">Inscription</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Contenu principal */}
        <main className="flex-1 pt-16 bg-base-200 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-3 sm:p-4 lg:p-6">
            <div
              ref={outletFadeRef}
              className="transition-opacity duration-150"
            >
              <Outlet />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="footer footer-center p-4 bg-base-100 text-base-content border-t border-base-300 lg:ml-80 lg:w-[calc(100%-20rem)]">
          <aside>
            <p className="text-sm opacity-70">
              © {new Date().getFullYear()} TechSpace - Système de réservation de
              salles
            </p>
          </aside>
        </footer>
      </div>

      {/* Sidebar */}
      <div className="drawer-side z-20">
        <label htmlFor="main-drawer" className="drawer-overlay"></label>
        <aside className="w-72 sm:w-80 bg-base-100 border-r border-base-300 flex flex-col h-[calc(100vh-4rem)] mt-16 overflow-y-auto">
          {/* Header Sidebar */}
          <div className="p-4 sm:p-6 border-b border-base-300">
            <Link to="/" className="flex items-center justify-center">
              <img
                src="/l_reservsalle.png"
                alt="Logo"
                className="h-16 sm:h-20 lg:h-24 w-auto"
              />
            </Link>
          </div>

          {isAuthenticated ? (
            <>
              {/* Menu Navigation */}
              <nav className="flex-1 overflow-y-auto">
                <ul className="menu w-full p-4 gap-1">
                  <li className="menu-title">
                    <span className="flex items-center gap-2">
                      <SpaceDashboardIcon fontSize="small" />
                      Navigation
                    </span>
                  </li>
                  <li className="w-full">
                    <Link
                      to="/dashboard"
                      className={`flex items-center gap-3 w-full justify-start ${
                        isActive("/dashboard")
                          ? "active bg-primary text-primary-content"
                          : ""
                      }`}
                    >
                      <CalendarMonthIcon fontSize="small" />
                      <span className="flex-1">Planning</span>
                      {isActive("/dashboard") && (
                        <ChevronRightIcon fontSize="small" />
                      )}
                    </Link>
                  </li>
                  <li className="w-full">
                    <Link
                      to="/profile"
                      className={`flex items-center gap-3 w-full justify-start ${
                        isActive("/profile")
                          ? "active bg-primary text-primary-content"
                          : ""
                      }`}
                    >
                      <PersonIcon fontSize="small" />
                      <span className="flex-1">Mon profil</span>
                      {isActive("/profile") && (
                        <ChevronRightIcon fontSize="small" />
                      )}
                    </Link>
                  </li>

                  <div className="divider my-2"></div>

                  <li className="w-full">
                    <button
                      onClick={onLogout}
                      className="flex items-center gap-3 w-full justify-start text-error hover:bg-error hover:text-error-content"
                    >
                      <LogoutIcon fontSize="small" />
                      <span>Déconnexion</span>
                    </button>
                  </li>
                </ul>
              </nav>

              {/* Help Card */}
              <div className="p-4 border-t border-base-300">
                <div className="card bg-gradient-to-br from-primary to-secondary text-primary-content shadow-xl">
                  <div className="card-body p-4">
                    <div className="flex items-start gap-2">
                      <HelpOutlineIcon fontSize="small" />
                      <div className="flex-1">
                        <h3 className="font-bold text-sm">Besoin d'aide ?</h3>
                        <p className="text-xs opacity-90 mt-1">
                          Consultez notre documentation ou contactez le support
                        </p>
                      </div>
                    </div>
                    <Link to="/docs" className="btn btn-sm btn-ghost mt-2">
                      En savoir plus
                    </Link>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-4"></div>
          )}
        </aside>
      </div>
    </div>
  );
}
