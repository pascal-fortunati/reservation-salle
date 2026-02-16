import express from "express";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { z } from "zod";
import xss from "xss";

import { withTransaction, getLock, releaseLock } from "../db/tx";
import { HttpError } from "../utils/httpErrors";
import {
  combineLocalDateTime,
  isValidDateOnly,
  isValidHourTime,
  minutesSinceMidnight,
} from "../utils/dateTime";

export const reservationsRouter = express.Router();

// Routes Réservations :
// - POST   /api/reservations      : création (anti-chevauchement, 409 si conflit)
// - PUT    /api/reservations/:id  : modification de l'objet (propriétaire uniquement)
// - DELETE /api/reservations/:id  : annulation (propriétaire uniquement)

function toHHMM(value: string) {
  // MySQL TIME peut arriver sous forme "HH:MM:SS".
  // L'UI travaille en "HH:MM".
  return value.length >= 5 ? value.slice(0, 5) : value;
}

const createReservationSchema = z
  .object({
    date: z.string().refine(isValidDateOnly, { message: "date invalide" }),
    start_time: z
      .string()
      .refine(isValidHourTime, { message: "start_time invalide" }),
    end_time: z
      .string()
      .refine(isValidHourTime, { message: "end_time invalide" }),
    object: z.string().trim().min(1).max(255),
  })
  .superRefine((val, ctx) => {
    // Règles métier US07 : créneaux d'1h sur des heures pleines, horaires 8h-19h.
    const startMin = minutesSinceMidnight(val.start_time);
    const endMin = minutesSinceMidnight(val.end_time);

    if (startMin % 60 !== 0 || endMin % 60 !== 0) {
      ctx.addIssue({
        code: "custom",
        message: "Créneaux sur des heures pleines uniquement",
      });
      return;
    }

    if (endMin <= startMin) {
      ctx.addIssue({
        code: "custom",
        message: "Durée minimum 1h",
      });
      return;
    }

    const durationMinutes = endMin - startMin;
    if (durationMinutes < 60 || durationMinutes % 60 !== 0) {
      ctx.addIssue({
        code: "custom",
        message: "Durée minimum 1h",
      });
      return;
    }

    const dayStart = 8 * 60;
    const dayEnd = 19 * 60;
    if (startMin < dayStart || endMin > dayEnd) {
      ctx.addIssue({
        code: "custom",
        message: "Créneau hors horaires (8h-19h)",
      });
      return;
    }
  });

const updateReservationSchema = z
  .object({
    object: z.string().trim().min(1).max(255),
    start_time: z
      .string()
      .refine(isValidHourTime, { message: "start_time invalide" })
      .optional(),
    end_time: z
      .string()
      .refine(isValidHourTime, { message: "end_time invalide" })
      .optional(),
  })
  .superRefine((val, ctx) => {
    const hasStart = typeof val.start_time === "string";
    const hasEnd = typeof val.end_time === "string";
    if (hasStart !== hasEnd) {
      ctx.addIssue({
        code: "custom",
        message: "start_time et end_time doivent être fournis ensemble",
      });
      return;
    }
    if (typeof val.start_time !== "string" || typeof val.end_time !== "string")
      return;

    const startMin = minutesSinceMidnight(val.start_time);
    const endMin = minutesSinceMidnight(val.end_time);

    if (startMin % 60 !== 0 || endMin % 60 !== 0) {
      ctx.addIssue({
        code: "custom",
        message: "Créneaux sur des heures pleines uniquement",
      });
      return;
    }

    if (endMin <= startMin) {
      ctx.addIssue({
        code: "custom",
        message: "Durée minimum 1h",
      });
      return;
    }

    const durationMinutes = endMin - startMin;
    if (durationMinutes < 60 || durationMinutes % 60 !== 0) {
      ctx.addIssue({
        code: "custom",
        message: "Durée minimum 1h",
      });
      return;
    }

    const dayStart = 8 * 60;
    const dayEnd = 19 * 60;
    if (startMin < dayStart || endMin > dayEnd) {
      ctx.addIssue({
        code: "custom",
        message: "Créneau hors horaires (8h-19h)",
      });
      return;
    }
  });

function isPastSlot(date: string, startTime: string) {
  // Règle US11 : interdiction de réserver/modifier/annuler dans le passé.
  // On compare en "local" (même référence que l'UI).
  const start = combineLocalDateTime(date, startTime);
  return start.getTime() < Date.now();
}

reservationsRouter.post("/", async (req, res, next) => {
  try {
    // L'utilisateur vient du middleware JWT (requireAuth).
    const userId = req.user?.id;
    if (!userId) return next(new HttpError(401, "Non authentifié"));

    const input = createReservationSchema.parse(req.body);

    if (isPastSlot(input.date, input.start_time)) {
      return next(
        new HttpError(400, "Impossible de réserver un créneau passé")
      );
    }

    // Protection XSS : on nettoie l'objet avant stockage/affichage.
    const object = xss(input.object);
    const lockName = `reservation-room:${input.date}`;

    const created = await withTransaction(async (conn) => {
      // Concurrence : on sérialise les opérations sur une même journée.
      // But : empêcher 2 requêtes simultanées de réserver le même slot.
      // US08 : lock optimiste via GET_LOCK pour sérialiser les réservations d'une même journée.
      // Sans lock, 2 requêtes concurrentes peuvent passer le SELECT avant l'INSERT.
      const locked = await getLock(conn, lockName, 10);
      if (!locked)
        throw new HttpError(409, "Créneau déjà en cours de réservation");

      try {
        type OverlapRow = RowDataPacket & { id: number };

        const [overlaps] = await conn.execute<OverlapRow[]>(
          // Chevauchement si [start_time, end_time) se recoupe.
          // Exemple :
          // - Réservation existante 10:00-12:00 bloque 10:00-11:00 et 11:00-12:00
          // - mais ne bloque pas 12:00-13:00
          // Chevauchement si les intervalles [start_time, end_time) se recoupent.
          // NOT (end <= newStart OR start >= newEnd)
          `SELECT id
           FROM reservations
           WHERE date = :date
             AND NOT (end_time <= :start_time OR start_time >= :end_time)
           LIMIT 1`,
          {
            date: input.date,
            start_time: input.start_time,
            end_time: input.end_time,
          }
        );

        if (overlaps.length > 0) {
          throw new HttpError(409, "Créneau déjà occupé");
        }

        const [result] = await conn.execute<ResultSetHeader>(
          `INSERT INTO reservations (user_id, date, start_time, end_time, object, created_at)
           VALUES (:user_id, :date, :start_time, :end_time, :object, NOW())`,
          {
            user_id: userId,
            date: input.date,
            start_time: input.start_time,
            end_time: input.end_time,
            object,
          }
        );

        return { id: result.insertId };
      } finally {
        await releaseLock(conn, lockName);
      }
    });

    return res.status(201).json(created);
  } catch (err) {
    return next(err);
  }
});

reservationsRouter.put("/:id", async (req, res, next) => {
  try {
    // Règle : modification par le propriétaire uniquement, pas dans le passé,
    // et anti-chevauchement (409).
    const userId = req.user?.id;
    if (!userId) return next(new HttpError(401, "Non authentifié"));

    const reservationId = Number(req.params.id);
    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      return next(new HttpError(400, "id invalide"));
    }

    const input = updateReservationSchema.parse(req.body);
    // Protection XSS : on nettoie l'objet avant stockage/affichage.
    const object = xss(input.object);

    const updated = await withTransaction(async (conn) => {
      type ReservationRow = RowDataPacket & {
        id: number;
        user_id: number;
        date: string;
        start_time: string;
        end_time: string;
      };

      const [rows] = await conn.execute<ReservationRow[]>(
        `SELECT
           id,
           user_id,
           DATE_FORMAT(date, '%Y-%m-%d') AS date,
           start_time AS start_time,
           end_time AS end_time
         FROM reservations
         WHERE id = :id
         LIMIT 1`,
        { id: reservationId }
      );

      const existing = rows[0];
      if (!existing) throw new HttpError(404, "Réservation introuvable");
      if (existing.user_id !== userId)
        throw new HttpError(403, "Action interdite");
      const nextStart = input.start_time ?? toHHMM(existing.start_time);
      const nextEnd = input.end_time ?? toHHMM(existing.end_time);

      if (isPastSlot(existing.date, nextStart)) {
        throw new HttpError(400, "Impossible de modifier un créneau passé");
      }

      const lockName = `reservation-room:${existing.date}`;
      const locked = await getLock(conn, lockName, 10);
      if (!locked)
        throw new HttpError(409, "Réservation en cours de modification");

      try {
        type OverlapRow = RowDataPacket & { id: number };
        const [overlaps] = await conn.execute<OverlapRow[]>(
          `SELECT id
           FROM reservations
           WHERE date = :date
             AND id <> :id
             AND NOT (end_time <= :start_time OR start_time >= :end_time)
           LIMIT 1`,
          {
            date: existing.date,
            id: reservationId,
            start_time: nextStart,
            end_time: nextEnd,
          }
        );

        if (overlaps.length > 0) {
          throw new HttpError(409, "Créneau déjà occupé");
        }

        await conn.execute<ResultSetHeader>(
          `UPDATE reservations
           SET object = :object, start_time = :start_time, end_time = :end_time
           WHERE id = :id`,
          {
            object,
            start_time: nextStart,
            end_time: nextEnd,
            id: reservationId,
          }
        );
      } finally {
        await releaseLock(conn, lockName);
      }

      return {
        id: reservationId,
        object,
        date: existing.date,
        start_time: nextStart,
        end_time: nextEnd,
      };
    });

    return res.status(200).json(updated);
  } catch (err) {
    return next(err);
  }
});

reservationsRouter.delete("/:id", async (req, res, next) => {
  try {
    // Règle : suppression uniquement par le propriétaire, et pas dans le passé.
    const userId = req.user?.id;
    if (!userId) return next(new HttpError(401, "Non authentifié"));

    const reservationId = Number(req.params.id);
    if (!Number.isInteger(reservationId) || reservationId <= 0) {
      return next(new HttpError(400, "id invalide"));
    }

    await withTransaction(async (conn) => {
      type ReservationRow = RowDataPacket & {
        id: number;
        user_id: number;
        date: string;
        start_time: string;
      };

      const [rows] = await conn.execute<ReservationRow[]>(
        `SELECT
           id,
           user_id,
           DATE_FORMAT(date, '%Y-%m-%d') AS date,
           start_time AS start_time
         FROM reservations
         WHERE id = :id
         LIMIT 1`,
        { id: reservationId }
      );

      const existing = rows[0];
      if (!existing) throw new HttpError(404, "Réservation introuvable");
      if (existing.user_id !== userId)
        throw new HttpError(403, "Action interdite");
      if (isPastSlot(existing.date, toHHMM(existing.start_time))) {
        throw new HttpError(400, "Impossible d’annuler un créneau passé");
      }

      const lockName = `reservation-room:${existing.date}`;
      const locked = await getLock(conn, lockName, 10);
      if (!locked)
        throw new HttpError(409, "Réservation en cours de modification");

      try {
        await conn.execute<ResultSetHeader>(
          "DELETE FROM reservations WHERE id = :id",
          { id: reservationId }
        );
      } finally {
        await releaseLock(conn, lockName);
      }
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    return next(err);
  }
});
