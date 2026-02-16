import { useMemo, useState, type SubmitEventHandler } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { getApiMessage } from "../../lib/errors";
import { getPasswordIssues, isValidEmailRfc5322 } from "../../lib/validation";

import Swal from "sweetalert2";

import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorIcon from "@mui/icons-material/Error";
import InfoIcon from "@mui/icons-material/Info";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import SecurityIcon from "@mui/icons-material/Security";
import BadgeIcon from "@mui/icons-material/Badge";

export function RegisterPage() {
  const navigate = useNavigate();
  const [nom, setNom] = useState("");
  const [prenom, setPrenom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordIssues = useMemo(() => getPasswordIssues(password), [password]);
  const emailError = useMemo(() => {
    if (email.length === 0) return null;
    return !isValidEmailRfc5322(email.trim()) ? "Email invalide" : null;
  }, [email]);

  const canSubmit = useMemo(() => {
    // Validation côté client (l'API revalide aussi côté serveur).
    if (nom.trim().length === 0) return false;
    if (prenom.trim().length === 0) return false;
    if (!isValidEmailRfc5322(email.trim())) return false;
    if (passwordIssues.length > 0) return false;
    return true;
  }, [nom, prenom, email, passwordIssues]);

  const showPasswordCriteria = async () => {
    await Swal.fire({
      icon: "info",
      title: "Critères du mot de passe",
      html: `
        <div style="text-align:left">
          <ul style="margin:0; padding-left: 1.25rem;">
            <li>8 caractères minimum</li>
            <li>1 minuscule</li>
            <li>1 majuscule</li>
            <li>1 chiffre</li>
          </ul>
        </div>
      `,
      confirmButtonText: "OK",
    });
  };

  const onSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    // Inscription : crée le compte puis redirige vers /login.
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/register", {
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim(),
        password,
      });
      await Swal.fire({
        icon: "success",
        title: "Inscription réussie",
        text: "Compte créé avec succès. Redirection... ",
        timer: 1200,
        showConfirmButton: false,
        timerProgressBar: true,
      });
      navigate("/login", { replace: true });
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Inscription impossible",
        text: getApiMessage(err, "Inscription impossible"),
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
              <span className="label-text font-semibold">Nom</span>
            </label>
            <label className="input input-bordered flex items-center gap-2 w-full">
              <BadgeIcon className="opacity-70" sx={{ fontSize: 20 }} />
              <input
                type="text"
                className="grow"
                placeholder="Dupont"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Prénom</span>
            </label>
            <label className="input input-bordered flex items-center gap-2 w-full">
              <PersonIcon className="opacity-70" sx={{ fontSize: 20 }} />
              <input
                type="text"
                className="grow"
                placeholder="Jean"
                value={prenom}
                onChange={(e) => setPrenom(e.target.value)}
                required
              />
            </label>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Adresse email</span>
            </label>
            <label className="input input-bordered flex items-center gap-2 w-full">
              <EmailIcon className="opacity-70" sx={{ fontSize: 20 }} />
              <input
                type="email"
                className="grow"
                placeholder="jean.dupont@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            {emailError && (
              <label className="label">
                <span className="label-text-alt text-error flex items-center gap-1">
                  <ErrorIcon sx={{ fontSize: 14 }} />
                  {emailError}
                </span>
              </label>
            )}
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Mot de passe</span>
              <button
                type="button"
                className="btn btn-ghost btn-xs gap-1"
                onClick={() => void showPasswordCriteria()}
              >
                <InfoIcon sx={{ fontSize: 16 }} />
                Critères
              </button>
            </label>
            <label className="input input-bordered flex items-center gap-2 w-full">
              <LockIcon className="opacity-70" sx={{ fontSize: 20 }} />
              <input
                type={showPassword ? "text" : "password"}
                className="grow"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
              <button
                type="button"
                className="btn btn-ghost btn-xs btn-circle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? (
                  <VisibilityOffIcon sx={{ fontSize: 20 }} />
                ) : (
                  <VisibilityIcon sx={{ fontSize: 20 }} />
                )}
              </button>
            </label>
            {password.length > 0 && passwordIssues.length > 0 && (
              <label className="label">
                <span className="label-text-alt text-error flex items-center gap-1">
                  <ErrorIcon sx={{ fontSize: 14 }} />
                  Mot de passe invalide
                </span>
              </label>
            )}
            {password.length > 0 && passwordIssues.length === 0 && (
              <label className="label">
                <span className="label-text-alt text-success flex items-center gap-1">
                  <CheckCircleIcon sx={{ fontSize: 14 }} />
                  Mot de passe valide
                </span>
              </label>
            )}
          </div>

          <div className="alert alert-info mt-2">
            <InfoIcon />
            <div className="text-xs">
              <p className="font-bold">Critères du mot de passe :</p>
              <p>Au moins 8 caractères, avec majuscule, minuscule et chiffre</p>
            </div>
          </div>

          <div className="form-control mt-4">
            <button
              type="submit"
              className="btn btn-primary btn-block gap-2"
              disabled={!canSubmit || loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Création en cours...
                </>
              ) : (
                <>
                  <AccountCircleIcon />
                  Créer mon compte
                </>
              )}
            </button>
          </div>

          <div className="divider">OU</div>

          <div className="text-center">
            <p className="text-sm">
              Vous avez déjà un compte ?{" "}
              <Link to="/login" className="link link-primary font-semibold">
                Se connecter
              </Link>
            </p>
          </div>

          <div className="alert mt-4">
            <SecurityIcon className="text-info" />
            <div className="text-xs">
              <p className="font-bold">Sécurité</p>
              <p>Mot de passe chiffré et session JWT (24h d’inactivité).</p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
