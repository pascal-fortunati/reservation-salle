import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../lib/api";
import { getApiMessage } from "../../lib/errors";
import {
  addDays,
  combineLocal,
  formatDate,
  parseDateOnly,
  startOfWeekMonday,
  timeLabel,
} from "../../lib/dates";
import { useAuth } from "../../state/auth/useAuth";

import Swal from "sweetalert2";

import AddIcon from "@mui/icons-material/Add";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EventIcon from "@mui/icons-material/Event";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

// Page Planning (semaine courante) :
// - Grille lundi→vendredi, 8h→19h, créneaux de 1h
// - Couleurs : vert (libre), rouge (occupé), gris (passé)
// - CRUD réservation avec règles métier (créneaux passés bloqués, etc.)

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

// Cache le planning de la semaine pour éviter de refaire des appels API.
let dashboardCache: {
  weekStart: string;
  weekEnd: string;
  reservations: PlanningReservation[];
} | null = null;

// MySQL TIME peut inclure des secondes. On affiche uniquement HH:MM.
function toHHMM(value: string) {
  const m = value.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return value;
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

// Un créneau d'1h est considéré occupé si l'heure du slot est dans [start, end).
function reservationCovers(res: PlanningReservation, hour: number) {
  const slot = timeLabel(hour);
  const start = toHHMM(res.start_time);
  const end = toHHMM(res.end_time);
  return slot >= start && slot < end;
}

export function DashboardPage() {
  const { user } = useAuth();

  const initialWeekStart = useMemo(() => {
    const now = new Date();
    const currentMonday = startOfWeekMonday(now);
    const day = now.getDay();
    const monday =
      day === 0 || day === 6 ? addDays(currentMonday, 7) : currentMonday;
    return formatDate(monday);
  }, []);

  const [weekData, setWeekData] = useState<{
    weekStart: string;
    weekEnd: string;
    reservations: PlanningReservation[];
    loading: boolean;
  }>(() => {
    if (dashboardCache) {
      return {
        weekStart: dashboardCache.weekStart,
        weekEnd: dashboardCache.weekEnd,
        reservations: dashboardCache.reservations,
        loading: false,
      };
    }
    return {
      weekStart: initialWeekStart,
      weekEnd: "",
      reservations: [],
      loading: true,
    };
  });

  const { weekStart, weekEnd, reservations, loading } = weekData;
  const [hoveredReservation, setHoveredReservation] = useState<number | null>(
    null
  );

  const weekRequestIdRef = useRef(0);

  const planningScrollRef = useRef<HTMLDivElement | null>(null);
  const planningScrollPosRef = useRef<{ left: number; top: number } | null>(
    null
  );

  const createDialogRef = useRef<HTMLDialogElement | null>(null);
  const editDialogRef = useRef<HTMLDialogElement | null>(null);
  const deleteDialogRef = useRef<HTMLDialogElement | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<{
    date: string;
    hour: number;
  } | null>(null);
  const [createObject, setCreateObject] = useState("");
  const [createDuration, setCreateDuration] = useState(1);
  const [createSubmitting, setCreateSubmitting] = useState(false);

  const [selectedReservation, setSelectedReservation] =
    useState<PlanningReservation | null>(null);
  const [editObject, setEditObject] = useState("");
  const [editStartHour, setEditStartHour] = useState(8);
  const [editDuration, setEditDuration] = useState(1);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const days = useMemo(() => {
    const monday = parseDateOnly(weekStart);
    return Array.from({ length: 5 }, (_, i) => formatDate(addDays(monday, i)));
  }, [weekStart]);

  const hours = useMemo(() => Array.from({ length: 11 }, (_, i) => 8 + i), []);

  const weekLabel = useMemo(() => {
    if (!weekEnd) return weekStart;
    const start = new Date(`${weekStart}T00:00:00`).toLocaleDateString(
      "fr-FR",
      { day: "numeric", month: "long" }
    );
    const end = new Date(`${weekEnd}T00:00:00`).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `${start} - ${end}`;
  }, [weekStart, weekEnd]);

  const reservationByDay = useMemo(() => {
    const map = new Map<string, PlanningReservation[]>();
    for (const r of reservations) {
      const list = map.get(r.date) ?? [];
      list.push(r);
      map.set(r.date, list);
    }
    return map;
  }, [reservations]);

  const loadWeek = useCallback(
    async (dateOnly: string, options?: { silent?: boolean }) => {
      const requestId = ++weekRequestIdRef.current;

      const scrollEl = planningScrollRef.current;
      if (scrollEl) {
        planningScrollPosRef.current = {
          left: scrollEl.scrollLeft,
          top: scrollEl.scrollTop,
        };
      }

      if (!options?.silent) {
        setWeekData((prev) => ({ ...prev, loading: true }));
      }

      try {
        const res = await api.get("/planning/week", {
          params: { date: dateOnly },
        });
        const nextStart = res.data?.weekStart as string;
        const nextEnd = res.data?.weekEnd as string;
        const nextReservations = (res.data?.reservations ??
          []) as PlanningReservation[];

        if (requestId !== weekRequestIdRef.current) return;

        setWeekData({
          weekStart: nextStart,
          weekEnd: nextEnd,
          reservations: nextReservations,
          loading: false,
        });

        dashboardCache = {
          weekStart: nextStart,
          weekEnd: nextEnd,
          reservations: nextReservations,
        };

        requestAnimationFrame(() => {
          const el = planningScrollRef.current;
          const pos = planningScrollPosRef.current;
          if (!el || !pos) return;
          el.scrollLeft = pos.left;
          el.scrollTop = pos.top;
        });
      } catch (err) {
        if (requestId !== weekRequestIdRef.current) return;
        if (!options?.silent)
          setWeekData((prev) => ({ ...prev, loading: false }));
        await Swal.fire({
          icon: "error",
          title: "Erreur de chargement",
          text: getApiMessage(err, "Impossible de charger le planning"),
          confirmButtonText: "OK",
        });
      }
    },
    []
  );

  useEffect(() => {
    void loadWeek(initialWeekStart, { silent: dashboardCache !== null });
  }, [initialWeekStart, loadWeek]);

  // Après un CRUD, on recharge la même semaine pour refléter l'état serveur.
  const refresh = async () => {
    await loadWeek(weekStart);
  };

  const weekStartDate = useMemo(() => parseDateOnly(weekStart), [weekStart]);
  const prevWeekStart = useMemo(
    () => formatDate(addDays(weekStartDate, -7)),
    [weekStartDate]
  );
  const nextWeekStart = useMemo(
    () => formatDate(addDays(weekStartDate, 7)),
    [weekStartDate]
  );

  // Règle UX : on bloque la navigation vers une semaine entièrement passée.
  const isWeekEntirelyPast = (startDateOnly: string) => {
    const start = parseDateOnly(startDateOnly);
    const friday = addDays(start, 4);
    const end = new Date(`${formatDate(friday)}T19:00:00`);
    return end.getTime() < Date.now();
  };

  const canGoPrev = useMemo(
    () => !isWeekEntirelyPast(prevWeekStart),
    [prevWeekStart]
  );

  // Ouvre la modale de création sur le slot choisi.
  const openCreate = (date: string, hour: number) => {
    setCreateObject("");
    setCreateDuration(1);
    setSelectedSlot({ date, hour });
    createDialogRef.current?.showModal();
  };

  const openEdit = (resv: PlanningReservation, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedReservation(resv);
    setEditObject(resv.object);
    const startHour = Number(toHHMM(resv.start_time).slice(0, 2));
    const endHour = Number(toHHMM(resv.end_time).slice(0, 2));
    const duration = Number.isFinite(endHour - startHour)
      ? Math.max(1, endHour - startHour)
      : 1;
    setEditStartHour(Number.isFinite(startHour) ? startHour : 8);
    setEditDuration(duration);
    editDialogRef.current?.showModal();
  };

  const openDelete = (resv: PlanningReservation, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedReservation(resv);
    deleteDialogRef.current?.showModal();
  };

  // Création : durée min 1h, objet obligatoire. L'API protège aussi contre les overlaps (409).
  const onCreate = async () => {
    if (!selectedSlot) return;
    setCreateSubmitting(true);
    try {
      const start = timeLabel(selectedSlot.hour);
      const end = timeLabel(selectedSlot.hour + createDuration);
      await api.post("/reservations", {
        date: selectedSlot.date,
        start_time: start,
        end_time: end,
        object: createObject.trim(),
      });
      createDialogRef.current?.close();
      await refresh();

      await Swal.fire({
        icon: "success",
        title: "Réservation créée !",
        toast: true,
        position: "top-end",
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
      });
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Erreur",
        text: getApiMessage(err, "Impossible de créer la réservation"),
        confirmButtonText: "OK",
      });
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Modification : objet + horaires (même journée).
  const onEdit = async () => {
    if (!selectedReservation) return;
    setEditSubmitting(true);
    try {
      const start = timeLabel(editStartHour);
      const end = timeLabel(editStartHour + editDuration);
      await api.put(`/reservations/${selectedReservation.id}`, {
        object: editObject.trim(),
        start_time: start,
        end_time: end,
      });
      editDialogRef.current?.close();
      await refresh();

      await Swal.fire({
        icon: "success",
        title: "Réservation modifiée !",
        toast: true,
        position: "top-end",
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
      });
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Erreur",
        text: getApiMessage(err, "Impossible de modifier la réservation"),
        confirmButtonText: "OK",
      });
    } finally {
      setEditSubmitting(false);
    }
  };

  // Suppression : libère immédiatement le créneau côté serveur.
  const onDelete = async () => {
    if (!selectedReservation) return;
    setDeleteSubmitting(true);
    try {
      await api.delete(`/reservations/${selectedReservation.id}`);
      deleteDialogRef.current?.close();
      await refresh();

      await Swal.fire({
        icon: "success",
        title: "Réservation annulée !",
        toast: true,
        position: "top-end",
        timer: 2000,
        showConfirmButton: false,
        timerProgressBar: true,
      });
    } catch (err) {
      await Swal.fire({
        icon: "error",
        title: "Erreur",
        text: getApiMessage(err, "Impossible d'annuler la réservation"),
        confirmButtonText: "OK",
      });
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const todayMonday = useMemo(() => startOfWeekMonday(new Date()), []);
  const isCurrentWeekOrFuture =
    weekStartDate.getTime() >= todayMonday.getTime();

  const isInitialLoad =
    loading && reservations.length === 0 && weekStart === initialWeekStart;

  if (isInitialLoad) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-32 w-full rounded-box"></div>
        <div className="skeleton h-96 w-full rounded-box"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card bg-gradient-to-r from-primary to-secondary text-primary-content shadow-xl">
        <div className="card-body">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
                <CalendarTodayIcon />
                Planning de réservation
              </h1>
              <div className="flex items-center gap-2 mt-3">
                <EventIcon fontSize="small" className="opacity-80" />
                <span className="text-base sm:text-lg opacity-90">
                  {weekLabel}
                </span>
              </div>
            </div>

            <div className="join shadow-lg w-full sm:w-auto">
              <button
                className="join-item btn btn-outline border-primary-content/30 text-primary-content hover:bg-primary-content hover:text-primary flex-1 sm:flex-none"
                disabled={loading || !canGoPrev}
                onClick={() => void loadWeek(prevWeekStart)}
              >
                <ChevronLeftIcon />
                <span className="hidden sm:inline">Précédente</span>
                <span
                  className={`loading loading-spinner loading-xs ${
                    loading ? "" : "opacity-0"
                  }`}
                ></span>
              </button>
              <button
                className="join-item btn btn-outline border-primary-content/30 text-primary-content hover:bg-primary-content hover:text-primary flex-1 sm:flex-none"
                disabled={loading}
                onClick={() => void loadWeek(nextWeekStart)}
              >
                <span className="hidden sm:inline">Suivante</span>
                <ChevronRightIcon />
                <span
                  className={`loading loading-spinner loading-xs ${
                    loading ? "" : "opacity-0"
                  }`}
                ></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Légende */}
      <div className="card bg-base-100 shadow-lg">
        <div className="card-body p-4">
          <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
            <div className="flex items-center gap-2">
              <div className="badge badge-success gap-1">
                <CheckCircleIcon sx={{ fontSize: 14 }} />
                Disponible
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="badge badge-primary gap-1">
                <PersonIcon sx={{ fontSize: 14 }} />
                Mes réservations
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="badge badge-error gap-1">
                <ErrorOutlineIcon sx={{ fontSize: 14 }} />
                Réservé par un autre
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Planning Table */}
      <div className="card bg-base-100 shadow-xl">
        <div ref={planningScrollRef} className="overflow-x-auto">
          <table className="table table-sm lg:table-md">
            <thead>
              <tr className="bg-base-200">
                <th className="sticky left-0 z-10 bg-base-200 min-w-[80px]">
                  <AccessTimeIcon fontSize="small" className="mr-1" />
                  Heure
                </th>
                {days.map((d, dayIndex) => {
                  const dayDate = new Date(`${d}T00:00:00`);
                  const isToday = formatDate(new Date()) === d;
                  return (
                    <th
                      key={dayIndex}
                      className="text-center min-w-[120px] sm:min-w-[150px]"
                    >
                      <div
                        className={`flex flex-col ${
                          isToday ? "text-primary font-bold" : ""
                        }`}
                      >
                        <span className="text-xs sm:text-sm lg:text-base capitalize">
                          {dayDate.toLocaleDateString("fr-FR", {
                            weekday: "long",
                          })}
                        </span>
                        <span className="text-xs opacity-70">
                          {dayDate.toLocaleDateString("fr-FR", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                        {isToday && (
                          <span className="badge badge-primary badge-xs mt-1">
                            Aujourd'hui
                          </span>
                        )}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {hours.map((h) => (
                <tr key={h} className="hover">
                  <th className="sticky left-0 z-10 bg-base-200 font-bold">
                    {timeLabel(h)} - {timeLabel(h + 1)}
                  </th>
                  {days.map((d, dayIndex) => {
                    const slotStart = combineLocal(d, timeLabel(h));
                    const isPast = slotStart.getTime() < Date.now();
                    const dayReservations = reservationByDay.get(d) ?? [];
                    const resv =
                      dayReservations.find((r) => reservationCovers(r, h)) ??
                      null;
                    const isMine = resv ? resv.user_id === user?.id : false;
                    const isFirstSlot = resv
                      ? reservationCovers(resv, h) &&
                        !reservationCovers(resv, h - 1)
                      : false;
                    const isHovered = resv
                      ? hoveredReservation === resv.id
                      : false;

                    return (
                      <td key={`${dayIndex}-${h}`} className="p-1">
                        {resv ? (
                          isFirstSlot ? (
                            <div
                              className={`card shadow-md h-full min-h-[60px] transition-all relative group ${
                                isPast
                                  ? "bg-base-300 text-base-content"
                                  : isMine
                                  ? "bg-primary text-primary-content cursor-pointer hover:shadow-xl"
                                  : "bg-error text-error-content"
                              } ${
                                isHovered && isMine && !isPast
                                  ? "ring-2 ring-primary"
                                  : ""
                              }`}
                              onMouseEnter={() =>
                                isMine &&
                                !isPast &&
                                setHoveredReservation(resv.id)
                              }
                              onMouseLeave={() => setHoveredReservation(null)}
                            >
                              <div className="card-body p-2">
                                <div className="flex items-start justify-between gap-1">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 text-xs opacity-90 mb-1">
                                      <AccessTimeIcon sx={{ fontSize: 12 }} />
                                      <span>
                                        {toHHMM(resv.start_time)} -{" "}
                                        {toHHMM(resv.end_time)}
                                      </span>
                                    </div>
                                    <div className="font-bold text-sm truncate">
                                      {resv.object}
                                    </div>
                                    <div className="flex items-center gap-1 text-xs opacity-90 mt-1">
                                      <PersonIcon sx={{ fontSize: 12 }} />
                                      <span className="truncate">
                                        {resv.prenom} {resv.nom}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {isMine && !isPast && (
                                  <div className="absolute inset-0 bg-primary/90 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 rounded-lg">
                                    <button
                                      className="btn btn-sm btn-ghost bg-white/20 hover:bg-white/30 text-white border-white/30"
                                      onClick={(e) => openEdit(resv, e)}
                                      title="Modifier"
                                    >
                                      <EditIcon fontSize="small" />
                                      <span className="hidden sm:inline">
                                        Modifier
                                      </span>
                                    </button>
                                    <button
                                      className="btn btn-sm btn-ghost bg-error/80 hover:bg-error text-white"
                                      onClick={(e) => openDelete(resv, e)}
                                      title="Annuler"
                                    >
                                      <DeleteIcon fontSize="small" />
                                      <span className="hidden sm:inline">
                                        Annuler
                                      </span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div
                              className={`h-full min-h-[60px] ${
                                isPast
                                  ? "bg-base-300/70"
                                  : isMine
                                  ? "bg-primary/20"
                                  : "bg-error/20"
                              }`}
                              onMouseEnter={() =>
                                isMine &&
                                !isPast &&
                                setHoveredReservation(resv.id)
                              }
                              onMouseLeave={() => setHoveredReservation(null)}
                            ></div>
                          )
                        ) : isPast || !isCurrentWeekOrFuture ? (
                          <div className="h-full min-h-[60px] bg-base-300/70"></div>
                        ) : (
                          <button
                            className="btn btn-success btn-outline w-full h-full min-h-[60px] transition-all hover:shadow-lg hover:brightness-110"
                            onClick={() => openCreate(d, h)}
                          >
                            <div className="flex flex-col items-center gap-1">
                              <AddIcon fontSize="small" />
                              <span className="text-xs hidden sm:inline">
                                Réserver
                              </span>
                            </div>
                          </button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Dialog */}
      <dialog
        ref={createDialogRef}
        className="modal modal-bottom sm:modal-middle"
      >
        <div className="modal-box">
          <h3 className="font-bold text-2xl mb-4 flex items-center gap-2">
            <AddIcon />
            Nouvelle réservation
          </h3>

          {selectedSlot && (
            <div className="alert alert-info mb-4">
              <InfoOutlinedIcon />
              <div>
                <div className="font-semibold">
                  {new Date(`${selectedSlot.date}T00:00:00`).toLocaleDateString(
                    "fr-FR",
                    {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </div>
                <div className="text-sm opacity-80">
                  Créneau : {timeLabel(selectedSlot.hour)} →{" "}
                  {timeLabel(selectedSlot.hour + createDuration)}
                </div>
              </div>
            </div>
          )}

          <div className="form-control w-full mb-4">
            <label className="label">
              <span className="label-text font-semibold">
                Objet de la réservation
              </span>
              <span className="label-text-alt">{createObject.length}/255</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Réunion d'équipe, Formation, Présentation..."
              className="input input-bordered w-full"
              value={createObject}
              onChange={(e) => setCreateObject(e.target.value)}
              maxLength={255}
              autoFocus
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-semibold">Durée</span>
            </label>
            <select
              className="select select-bordered w-full"
              value={createDuration}
              onChange={(e) => setCreateDuration(Number(e.target.value))}
            >
              {selectedSlot &&
                Array.from(
                  { length: Math.max(1, 19 - selectedSlot.hour) },
                  (_, i) => i + 1
                ).map((d) => (
                  <option key={d} value={d}>
                    {d} heure{d > 1 ? "s" : ""} ({timeLabel(selectedSlot.hour)}{" "}
                    - {timeLabel(selectedSlot.hour + d)})
                  </option>
                ))}
            </select>
          </div>

          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={() => createDialogRef.current?.close()}
              disabled={createSubmitting}
            >
              Annuler
            </button>
            <button
              className="btn btn-primary gap-2"
              disabled={createSubmitting || createObject.trim().length === 0}
              onClick={() => void onCreate()}
            >
              {createSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Création...
                </>
              ) : (
                <>
                  <CheckCircleIcon fontSize="small" />
                  Confirmer
                </>
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Edit Dialog */}
      <dialog
        ref={editDialogRef}
        className="modal modal-bottom sm:modal-middle"
      >
        <div className="modal-box">
          <h3 className="font-bold text-2xl mb-4 flex items-center gap-2">
            <EditIcon />
            Modifier la réservation
          </h3>

          {selectedReservation && (
            <div className="alert mb-4">
              <InfoOutlinedIcon />
              <div>
                <div className="font-semibold">
                  {new Date(
                    `${selectedReservation.date}T00:00:00`
                  ).toLocaleDateString("fr-FR", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </div>
                <div className="text-sm opacity-80">
                  Créneau : {timeLabel(editStartHour)} →{" "}
                  {timeLabel(editStartHour + editDuration)}
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">Heure de début</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={editStartHour}
                onChange={(e) => {
                  const nextStart = Number(e.target.value);
                  setEditStartHour(nextStart);
                  setEditDuration((prev) => Math.min(prev, 19 - nextStart));
                }}
              >
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {timeLabel(h)}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-control w-full">
              <label className="label">
                <span className="label-text font-semibold">Durée</span>
              </label>
              <select
                className="select select-bordered w-full"
                value={editDuration}
                onChange={(e) => setEditDuration(Number(e.target.value))}
              >
                {Array.from(
                  { length: Math.max(1, 19 - editStartHour) },
                  (_, i) => i + 1
                ).map((d) => (
                  <option key={d} value={d}>
                    {d} heure{d > 1 ? "s" : ""} ({timeLabel(editStartHour)} -{" "}
                    {timeLabel(editStartHour + d)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-semibold">
                Objet de la réservation
              </span>
              <span className="label-text-alt">{editObject.length}/255</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={editObject}
              onChange={(e) => setEditObject(e.target.value)}
              maxLength={255}
              autoFocus
            />
          </div>

          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={() => editDialogRef.current?.close()}
              disabled={editSubmitting}
            >
              Annuler
            </button>
            <button
              className="btn btn-primary gap-2"
              disabled={editSubmitting || editObject.trim().length === 0}
              onClick={() => void onEdit()}
            >
              {editSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Enregistrement...
                </>
              ) : (
                <>
                  <CheckCircleIcon fontSize="small" />
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Delete Dialog */}
      <dialog
        ref={deleteDialogRef}
        className="modal modal-bottom sm:modal-middle"
      >
        <div className="modal-box">
          <h3 className="font-bold text-2xl mb-4 flex items-center gap-2 text-error">
            <DeleteIcon />
            Annuler la réservation
          </h3>

          <div className="alert alert-warning mb-4">
            <ErrorOutlineIcon />
            <div>
              <p className="font-semibold">Attention !</p>
              <p className="text-sm">Cette action est irréversible.</p>
            </div>
          </div>

          {selectedReservation && (
            <div className="bg-base-200 rounded-lg p-4 mb-4">
              <div className="font-semibold mb-2">
                {selectedReservation.object}
              </div>
              <div className="text-sm opacity-70">
                {new Date(
                  `${selectedReservation.date}T00:00:00`
                ).toLocaleDateString("fr-FR", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </div>
              <div className="text-sm opacity-70">
                {toHHMM(selectedReservation.start_time)} -{" "}
                {toHHMM(selectedReservation.end_time)}
              </div>
            </div>
          )}

          <div className="py-4">
            <p className="mb-2">
              Êtes-vous sûr de vouloir annuler cette réservation ?
            </p>
            <p className="text-sm opacity-70">
              Le créneau sera immédiatement libéré et disponible pour d'autres
              utilisateurs.
            </p>
          </div>

          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={() => deleteDialogRef.current?.close()}
              disabled={deleteSubmitting}
            >
              Retour
            </button>
            <button
              className="btn btn-error gap-2"
              disabled={deleteSubmitting}
              onClick={() => void onDelete()}
            >
              {deleteSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Annulation...
                </>
              ) : (
                <>
                  <DeleteIcon fontSize="small" />
                  Confirmer l'annulation
                </>
              )}
            </button>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>
    </div>
  );
}
