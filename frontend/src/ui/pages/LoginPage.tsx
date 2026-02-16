import { useMemo, useState, type SubmitEventHandler } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { getApiMessage } from "../../lib/errors";
import { isValidEmailRfc5322 } from "../../lib/validation";
import { useAuth } from "../../state/auth/useAuth";

import Swal from "sweetalert2";

import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import LockIcon from "@mui/icons-material/Lock";
import LoginIcon from "@mui/icons-material/Login";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

// Page de connexion : formulaire avec email, mot de passe et options.
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailError = useMemo(() => {
    if (email.length === 0) return null;
    return !isValidEmailRfc5322(email.trim()) ? "Email invalide" : null;
  }, [email]);

  // Validation côté client (l'API revalide aussi côté serveur).
  const canSubmit = useMemo(() => {
    if (!isValidEmailRfc5322(email.trim())) return false;
    if (password.length === 0) return false;
    return true;
  }, [email, password]);

  // Gestion de la soumission du formulaire.
  const onSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });
      const token = res.data?.token as string;
      const user = res.data?.user as {
        id: number;
        email: string;
        nom?: string;
        prenom?: string;
      };
      if (!token || !user) throw new Error("Réponse invalide");
      login(token, user);

      await Swal.fire({
        icon: "success",
        title: "Connexion réussie",
        timer: 900,
        showConfirmButton: false,
        timerProgressBar: true,
      });

      const from = (location.state as { from?: { pathname?: string } } | null)
        ?.from?.pathname;
      navigate(from ?? "/dashboard", { replace: true });
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Connexion impossible",
        text: getApiMessage(err, "Connexion impossible"),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col items-center justify-center p-4">
      <img
        src="/l_reservsalle.png"
        alt="Salle de réservation"
        className="h-16 sm:h-20 md:h-24 w-auto mb-6"
        loading="eager"
      />

      <div className="card w-full max-w-md shadow-2xl bg-base-100">
        <form onSubmit={onSubmit} className="card-body">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Adresse email</span>
            </label>
            <label className="input input-bordered flex items-center gap-2 w-full">
              <MailOutlineIcon fontSize="small" />
              <input
                type="email"
                className="grow"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            {emailError && (
              <label className="label">
                <span className="label-text-alt text-error">{emailError}</span>
              </label>
            )}
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Mot de passe</span>
            </label>
            <label className="input input-bordered flex items-center gap-2 w-full">
              <LockIcon fontSize="small" />
              <input
                type={showPassword ? "text" : "password"}
                className="grow"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-circle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <VisibilityOffIcon fontSize="small" />
                ) : (
                  <VisibilityIcon fontSize="small" />
                )}
              </button>
            </label>
          </div>

          <div className="form-control mt-2">
            <button
              type="submit"
              className="btn btn-primary btn-block gap-2"
              disabled={!canSubmit || loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Connexion en cours...
                </>
              ) : (
                <>
                  <LoginIcon fontSize="small" />
                  Se connecter
                </>
              )}
            </button>
          </div>

          <div className="divider">OU</div>

          <div className="text-center">
            <p className="text-sm">
              Pas encore de compte ?{" "}
              <Link to="/register" className="link link-primary font-semibold">
                Créer un compte
              </Link>
            </p>
          </div>

          <div className="alert alert-info mt-4">
            <InfoOutlinedIcon />
            <div className="text-xs">
              <p className="font-bold">Session</p>
              <p>Votre session expire après 24h d’inactivité.</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
