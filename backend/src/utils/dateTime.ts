export function isValidDateOnly(value: string) {
  // Format attendu par l'API et le frontend : YYYY-MM-DD.
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function isValidHourTime(value: string) {
  // Format attendu côté UI : HH:MM (heures pleines validées ailleurs).
  return /^\d{2}:\d{2}$/.test(value);
}

export function minutesSinceMidnight(time: string) {
  // Convertit "HH:MM" en minutes depuis 00:00 pour faire des comparaisons.
  const [hh, mm] = time.split(":").map(Number);
  return hh * 60 + mm;
}

export function formatLocalDate(date: Date) {
  // Date locale -> YYYY-MM-DD.
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function startOfWeekMonday(date: Date) {
  // Début de semaine "lundi".
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = (day + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function combineLocalDateTime(dateOnly: string, time: string) {
  // Combine localement "YYYY-MM-DD" + "HH:MM".
  return new Date(`${dateOnly}T${time}:00`);
}
