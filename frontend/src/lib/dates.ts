// Format ISO "YYYY-MM-DD" attendu par l'API.
export function formatDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Ajoute un nombre de jours à une date.
export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

// Début de semaine "lundi".
// getDay() : 0=dimanche, 1=lundi, ... 6=samedi.
export function startOfWeekMonday(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

// On force une heure locale pour éviter les effets de timezone.
export function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00`);
}

// "08:00" ... "19:00"
export function timeLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

// Combine "YYYY-MM-DD" + "HH:MM" en Date locale.
export function combineLocal(dateOnly: string, hhmm: string) {
  return new Date(`${dateOnly}T${hhmm}:00`);
}
