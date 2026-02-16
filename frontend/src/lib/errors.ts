import type { AxiosError } from "axios";

// Convention côté API : { message: string } en cas d'erreur.
// Ce helper extrait le message proprement sans dépendre du type exact.
export function getApiMessage(error: unknown, fallback: string) {
  const err = error as AxiosError<{ message?: unknown }>;
  const message = err?.response?.data?.message;
  if (typeof message === "string" && message.trim().length > 0) return message;
  return fallback;
}
