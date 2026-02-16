import express from "express";
import type { RowDataPacket } from "mysql2";

import { pool } from "../db/pool";
import { requireAuth } from "../middleware/auth";
import { HttpError } from "../utils/httpErrors";

export const usersRouter = express.Router();

usersRouter.get("/profile", requireAuth(), async (req, res, next) => {
  try {
    // US04 : profil en lecture seule (nom, prénom, email).
    const userId = req.user?.id;
    if (!userId) return next(new HttpError(401, "Non authentifié"));

    type ProfileRow = RowDataPacket & {
      id: number;
      nom: string;
      prenom: string;
      email: string;
      created_at: string;
    };

    const [rows] = await pool.execute<ProfileRow[]>(
      "SELECT id, nom, prenom, email, created_at FROM users WHERE id = :id LIMIT 1",
      { id: userId }
    );

    const user = rows[0];
    if (!user) return next(new HttpError(401, "Non authentifié"));

    return res.status(200).json({ user });
  } catch (err) {
    return next(err);
  }
});
