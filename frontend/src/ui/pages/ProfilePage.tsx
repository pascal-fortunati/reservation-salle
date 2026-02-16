import { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { getApiMessage } from "../../lib/errors";
import { addDays, formatDate, startOfWeekMonday } from "../../lib/dates";
import { useAuth } from "../../state/auth/useAuth";

import Swal from "sweetalert2";

import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutline";
import PersonIcon from "@mui/icons-material/Person";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import BadgeIcon from "@mui/icons-material/Badge";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import TodayIcon from "@mui/icons-material/Today";

// Page Profil :
// - Affiche les infos utilisateur
// - Affiche un résumé de réservation sur la semaine courante
// Note : on démarre avec un user "optimiste" (depuis AuthContext / cache) pour éviter un flash.

type ProfileUser = {
  id: number;
  nom?: string;
  prenom?: string;
  email: string;
  created_at?: string;
};

type PlanningReservation = {
  id: number;
  user_id: number;
  date: string;
  start_time: string;
  end_time: string;
  object: string;
  nom: string;
  prenom: string;
};

// MySQL peut renvoyer "H:MM:SS" ou "HH:MM:SS" selon config.
// On normalise pour afficher et parser côté client.
function normalizeHHMM(value: string) {
  const m = value.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return value;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

// Calcule le nombre de minutes écoulées depuis minuit.
function minutesSinceMidnight(time: string) {
  const hhmm = normalizeHHMM(time);
  const [hh, mm] = hhmm.split(":").map(Number);
  return hh * 60 + mm;
}

// Parse une date MySQL ou standard.
function parseMaybeMysqlDateTime(value: string) {
  // created_at peut être renvoyé en "YYYY-MM-DD HH:MM:SS" (MySQL).
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return new Date(value.replace(" ", "T"));
  }
  return new Date(value);
}

// Calcule le nombre de jours entre deux dates.
function calendarDayDiff(from: Date, to: Date) {
  const fromMidnight = new Date(
    from.getFullYear(),
    from.getMonth(),
    from.getDate()
  ).getTime();
  const toMidnight = new Date(
    to.getFullYear(),
    to.getMonth(),
    to.getDate()
  ).getTime();
  return Math.floor((toMidnight - fromMidnight) / (1000 * 60 * 60 * 24));
}

// Page de profil utilisateur avec planning de la semaine.
let profileCacheUser: ProfileUser | null = null;

export function ProfilePage() {
  const { user: authUser } = useAuth();

  const [user, setUser] = useState<ProfileUser | null>(() => {
    if (profileCacheUser) return profileCacheUser;
    if (!authUser) return null;
    return {
      id: authUser.id,
      email: authUser.email,
      nom: authUser.nom,
      prenom: authUser.prenom,
    };
  });
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState<string>("");
  const [weekEnd, setWeekEnd] = useState<string>("");
  const [myWeekReservations, setMyWeekReservations] = useState<
    PlanningReservation[]
  >([]);
  const [weekLoading, setWeekLoading] = useState(false);
  const [weekError, setWeekError] = useState<string | null>(null);

  // Charge le profil de l'utilisateur connecté.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/users/profile");
        const nextUser = (res.data?.user ?? null) as ProfileUser | null;
        if (!cancelled) {
          setUser(nextUser);
          profileCacheUser = nextUser;
        }
      } catch (err) {
        if (!cancelled) {
          await Swal.fire({
            icon: "error",
            title: "Chargement impossible",
            text: getApiMessage(err, "Chargement impossible"),
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  // Charge les réservations de la semaine courante (ou prochaine si week-end).
  useEffect(() => {
    // Ne charge rien si l'utilisateur n'est pas connecté.
    if (!user) return;
    let cancelled = false;
    const loadWeek = async () => {
      setWeekLoading(true);
      setWeekError(null);
      try {
        const today = new Date();
        const monday = startOfWeekMonday(today);
        const day = today.getDay();
        const hour = today.getHours();


        let base = monday;
        if (day === 0 || day === 6 || day === 5) {
          base = addDays(monday, 7);
        } else if (day === 4 && hour >= 18) {
          base = addDays(monday, 7);
        }

        console.log("ProfilePage - Loading week for date:", formatDate(base), "Day:", day, "Monday:", formatDate(monday));

        console.log("ProfilePage - Loading week for date:", formatDate(base), "Day:", day, "Monday:", formatDate(monday));

        const res = await api.get("/planning/week", {
          params: { date: formatDate(base) },
        });
        const nextStart = res.data?.weekStart as string;
        const nextEnd = res.data?.weekEnd as string;
        const all = (res.data?.reservations ?? []) as PlanningReservation[];
        const mine = all.filter((r) => r.user_id === user.id);

        if (!cancelled) {
          setWeekStart(typeof nextStart === "string" ? nextStart : "");
          setWeekEnd(typeof nextEnd === "string" ? nextEnd : "");
          setMyWeekReservations(mine);
        }
      } catch (err) {
        if (!cancelled) {
          setWeekError(
            getApiMessage(err, "Impossible de charger vos réservations")
          );
          setMyWeekReservations([]);
        }
      } finally {
        if (!cancelled) setWeekLoading(false);
      }
    };

    void loadWeek();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading && !user) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-48 w-full rounded-box"></div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 skeleton h-96 rounded-box"></div>
          <div className="skeleton h-96 rounded-box"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="hero min-h-[60vh]">
        <div className="hero-content text-center">
          <div className="max-w-md">
            <div className="text-error flex justify-center">
              <WarningAmberIcon sx={{ fontSize: 96 }} />
            </div>
            <h1 className="text-3xl font-bold mt-4">Profil introuvable</h1>
            <p className="py-4">
              Impossible de charger les informations de votre profil.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const memberSince = user.created_at
    ? parseMaybeMysqlDateTime(user.created_at)
    : new Date(Number.NaN);
  const memberSinceValid = !Number.isNaN(memberSince.getTime());
  const daysSinceMember = memberSinceValid
    ? Math.max(0, calendarDayDiff(memberSince, new Date()))
    : 0;
  const memberSinceLabel = !memberSinceValid
    ? "inconnu"
    : daysSinceMember === 0
      ? "aujourd'hui"
      : daysSinceMember === 1
        ? "1 jour"
        : `${daysSinceMember} jours`;
  const memberSinceRelativeLabel = !memberSinceValid
    ? "Date d'inscription inconnue"
    : daysSinceMember === 0
      ? "Inscrit aujourd'hui"
      : daysSinceMember === 1
        ? "Inscrit il y a 1 jour"
        : `Inscrit il y a ${daysSinceMember} jours`;
  const memberSinceDateLabel = memberSinceValid
    ? memberSince.toLocaleDateString("fr-FR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    : "Date inconnue";

  const nowTs = Date.now();
  const myWeekTotal = myWeekReservations.length;
  const myWeekHours = myWeekReservations.reduce((sum, r) => {
    const start = minutesSinceMidnight(r.start_time);
    const end = minutesSinceMidnight(r.end_time);
    const duration = Math.max(0, end - start);
    return sum + duration / 60;
  }, 0);
  const myWeekUpcoming = myWeekReservations.filter(
    (r) =>
      new Date(`${r.date}T${normalizeHHMM(r.start_time)}:00`).getTime() >= nowTs
  ).length;
  const myWeekPast = Math.max(0, myWeekTotal - myWeekUpcoming);

  return (
    <div className="space-y-6">
      {/* Header avec hero */}
      <div className="hero bg-gradient-to-r from-primary to-secondary rounded-box shadow-xl">
        <div className="hero-content text-center py-8 sm:py-12 w-full">
          <div className="w-full">
            <div className="avatar placeholder mb-4">
              <div className="bg-base-100 text-primary rounded-full w-20 h-20 sm:w-24 sm:h-24 flex items-center justify-center ring ring-primary-content ring-offset-base-100 ring-offset-2">
                <span className="text-3xl sm:text-4xl font-bold leading-none">
                  {user.prenom?.charAt(0).toUpperCase()}
                  {user.nom?.charAt(0).toUpperCase()}
                </span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold text-primary-content mb-2">
              {user.prenom ?? ""} {user.nom ?? ""}
            </h1>
            <p className="text-primary-content/90 text-base sm:text-lg mb-4 flex items-center justify-center gap-2 break-all">
              <MailOutlineIcon fontSize="small" />
              {user.email}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              <div className="badge badge-md sm:badge-lg gap-2 bg-primary-content/20 border-primary-content/30 text-primary-content">
                <CheckCircleOutlineIcon fontSize="small" />
                Compte actif
              </div>
              <div className="badge badge-md sm:badge-lg gap-2 bg-primary-content/20 border-primary-content/30 text-primary-content">
                <CalendarMonthIcon fontSize="small" />
                Membre depuis {memberSinceLabel}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Informations principales */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations personnelles */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-6">
                <PersonIcon />
                Informations personnelles
              </h2>

              <div className="space-y-4">
                {/* Nom */}
                <div className="flex items-start gap-4 p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors">
                  <div className="mt-1">
                    <BadgeIcon className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-base-content/60 mb-1">
                      Nom
                    </div>
                    <div className="text-lg font-medium">{user.nom ?? "-"}</div>
                  </div>
                </div>

                {/* Prénom */}
                <div className="flex items-start gap-4 p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors">
                  <div className="mt-1">
                    <PersonIcon className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-base-content/60 mb-1">
                      Prénom
                    </div>
                    <div className="text-lg font-medium">
                      {user.prenom ?? "-"}
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-start gap-4 p-4 bg-base-200 rounded-lg hover:bg-base-300 transition-colors">
                  <div className="mt-1">
                    <MailOutlineIcon className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-base-content/60 mb-1">
                      Adresse email
                    </div>
                    <div className="text-lg font-medium break-all">
                      {user.email}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Statistiques détaillées */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-6">
                <EventAvailableIcon />
                Activité de réservation
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="stat bg-primary/10 rounded-box">
                  <div className="stat-figure text-primary">
                    <CalendarMonthIcon sx={{ fontSize: 40 }} />
                  </div>
                  <div className="stat-title">Réservations</div>
                  <div className="stat-value text-primary">{myWeekTotal}</div>
                  <div className="stat-desc">Cette semaine</div>
                </div>

                <div className="stat bg-secondary/10 rounded-box">
                  <div className="stat-figure text-secondary">
                    <AccessTimeIcon sx={{ fontSize: 40 }} />
                  </div>
                  <div className="stat-title">Heures réservées</div>
                  <div className="stat-value text-secondary">
                    {myWeekHours}h
                  </div>
                  <div className="stat-desc">Cette semaine</div>
                </div>

                <div className="stat bg-accent/10 rounded-box">
                  <div className="stat-figure text-accent">
                    <TodayIcon sx={{ fontSize: 40 }} />
                  </div>
                  <div className="stat-title">Réservations à venir</div>
                  <div className="stat-value text-accent">{myWeekUpcoming}</div>
                  <div className="stat-desc">À venir</div>
                </div>

                <div className="stat bg-success/10 rounded-box">
                  <div className="stat-figure text-success">
                    <CheckCircleOutlineIcon sx={{ fontSize: 40 }} />
                  </div>
                  <div className="stat-title">Réservations complétées</div>
                  <div className="stat-value text-success">{myWeekPast}</div>
                  <div className="stat-desc">Cette semaine</div>
                </div>
              </div>

              <div className="divider my-6"></div>

              <h3 className="text-lg font-bold">Mes créneaux réservés</h3>
              {weekStart && weekEnd && (
                <p className="text-sm opacity-70">
                  Semaine :{" "}
                  {new Date(`${weekStart}T00:00:00`).toLocaleDateString(
                    "fr-FR"
                  )}{" "}
                  →{" "}
                  {new Date(`${weekEnd}T00:00:00`).toLocaleDateString("fr-FR")}
                </p>
              )}

              {weekError && (
                <div className="alert alert-error mt-4">
                  <WarningAmberIcon />
                  <span className="text-sm">{weekError}</span>
                </div>
              )}

              {!weekError && weekLoading && (
                <div className="skeleton h-24 w-full rounded-box mt-4"></div>
              )}

              {!weekError &&
                !weekLoading &&
                myWeekReservations.length === 0 && (
                  <div className="alert alert-info mt-4">
                    <InfoOutlinedIcon />
                    <span className="text-sm">
                      Aucun créneau réservé pour cette semaine.
                    </span>
                  </div>
                )}

              {!weekError && !weekLoading && myWeekReservations.length > 0 && (
                <div className="overflow-x-auto mt-4">
                  <table className="table table-sm">
                    <thead>
                      <tr className="bg-base-200">
                        <th>Date</th>
                        <th>Horaire</th>
                        <th>Objet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...myWeekReservations]
                        .sort((a, b) => {
                          const at = new Date(
                            `${a.date}T${normalizeHHMM(a.start_time)}:00`
                          ).getTime();
                          const bt = new Date(
                            `${b.date}T${normalizeHHMM(b.start_time)}:00`
                          ).getTime();
                          return at - bt;
                        })
                        .map((r) => (
                          <tr key={r.id}>
                            <td>
                              {new Date(
                                `${r.date}T00:00:00`
                              ).toLocaleDateString("fr-FR", {
                                weekday: "short",
                                day: "2-digit",
                                month: "short",
                              })}
                            </td>
                            <td>
                              {normalizeHHMM(r.start_time)} -{" "}
                              {normalizeHHMM(r.end_time)}
                            </td>
                            <td className="max-w-[420px] truncate">
                              {r.object}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stats rapides */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-lg mb-4">
                <InfoOutlinedIcon fontSize="small" />
                Résumé du compte
              </h3>

              <div className="stats stats-vertical shadow-inner bg-base-200">
                <div className="stat py-4">
                  <div className="stat-figure text-primary">
                    <CalendarMonthIcon />
                  </div>
                  <div className="stat-title text-xs">Réservations</div>
                  <div className="stat-value text-2xl text-primary">
                    {myWeekTotal}
                  </div>
                  <div className="stat-desc">Cette semaine</div>
                </div>

                <div className="stat py-4">
                  <div className="stat-figure text-secondary">
                    <AccessTimeIcon />
                  </div>
                  <div className="stat-title text-xs">Ce mois</div>
                  <div className="stat-value text-2xl text-secondary">
                    {myWeekHours}h
                  </div>
                  <div className="stat-desc">Cette semaine</div>
                </div>
              </div>
            </div>
          </div>

          {/* Détails du compte */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-lg mb-4">
                <InfoOutlinedIcon fontSize="small" />
                Détails du compte
              </h3>

              <div className="space-y-4">
                <div className="p-3 bg-base-200 rounded-lg">
                  <div className="text-xs font-semibold text-base-content/60 mb-1">
                    ID utilisateur
                  </div>
                  <div className="font-mono text-sm font-bold">
                    #{user.id.toString().padStart(6, "0")}
                  </div>
                </div>

                <div className="divider my-2"></div>

                <div className="p-3 bg-base-200 rounded-lg">
                  <div className="text-xs font-semibold text-base-content/60 mb-1">
                    Inscription
                  </div>
                  <div className="text-sm font-medium">
                    {memberSinceDateLabel}
                  </div>
                  <div className="text-xs text-base-content/60 mt-1">
                    {memberSinceRelativeLabel}
                  </div>
                </div>

                <div className="p-3 bg-base-200 rounded-lg">
                  <div className="text-xs font-semibold text-base-content/60 mb-1">
                    Dernière connexion
                  </div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    <div className="badge badge-success badge-sm">En ligne</div>
                    Aujourd'hui
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Aide */}
          <div className="card bg-info text-info-content shadow-xl">
            <div className="card-body">
              <h3 className="card-title text-base">
                <InfoOutlinedIcon fontSize="small" />
                Besoin d'aide ?
              </h3>
              <p className="text-sm">
                Pour toute question concernant votre compte ou vos réservations,
                contactez l'administrateur.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
