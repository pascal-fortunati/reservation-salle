import express from "express";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";

import { pool } from "../db/pool";
import {
  addDays,
  formatLocalDate,
  isValidDateOnly,
  startOfWeekMonday,
} from "../utils/dateTime";

export const planningRouter = express.Router();

const weekQuerySchema = z.object({
  date: z
    .string()
    .optional()
    .refine((v) => v === undefined || isValidDateOnly(v), {
      message: "date invalide",
    }),
});

planningRouter.get("/week", async (req, res, next) => {
  try {
    // Query param "date" : une date de référence (YYYY-MM-DD).
    // On calcule ensuite la semaine "monday -> friday" contenant cette date.
    const { date } = weekQuerySchema.parse(req.query);
    const baseDate = date ? new Date(`${date}T00:00:00`) : new Date();
    const monday = startOfWeekMonday(baseDate);
    const friday = addDays(monday, 4);

    const start = formatLocalDate(monday);
    const end = formatLocalDate(friday);

    type PlanningRow = RowDataPacket & {
      id: number;
      user_id: number;
      date: string;
      start_time: string;
      end_time: string;
      object: string;
      nom: string;
      prenom: string;
    };

    // On joint users pour afficher "qui a réservé" dans le planning.
    // Note : start_time/end_time sont des TIME MySQL, renvoyés en string.
    const [rows] = await pool.execute<PlanningRow[]>(
      `SELECT
         r.id,
         r.user_id,
         DATE_FORMAT(r.date, '%Y-%m-%d') AS date,
         r.start_time AS start_time,
         r.end_time AS end_time,
         r.object,
         u.nom,
         u.prenom
       FROM reservations r
       JOIN users u ON u.id = r.user_id
       WHERE r.date BETWEEN :start AND :end
       ORDER BY r.date ASC, r.start_time ASC`,
      { start, end }
    );

    return res.status(200).json({
      weekStart: start,
      weekEnd: end,
      reservations: rows,
    });
  } catch (err) {
    return next(err);
  }
});
