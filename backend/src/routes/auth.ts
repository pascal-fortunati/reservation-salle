import bcrypt from "bcrypt";
import express from "express";
import jwt from "jsonwebtoken";
import type { ResultSetHeader } from "mysql2";
import type { RowDataPacket } from "mysql2";
import { z } from "zod";
import xss from "xss";

import { env } from "../config/env";
import { pool } from "../db/pool";
import { HttpError } from "../utils/httpErrors";

export const authRouter = express.Router();

// Routes Auth :
// - POST /register : crée un utilisateur (email unique, password hashé)
// - POST /login    : retourne { token, user }

const emailRfc5322Pattern =
  "^(?:[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*|\"(?:[\\u0001-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u0021\\u0023-\\u005b\\u005d-\\u007f]|\\\\[\\u0001-\\u0009\\u000b\\u000c\\u000e-\\u007f])*\")@(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?\\.)+[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?|\\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-zA-Z0-9-]*[a-zA-Z0-9]:(?:[\\u0001-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u0021-\\u005a\\u0053-\\u007f]|\\\\[\\u0001-\\u0009\\u000b\\u000c\\u000e-\\u007f])+)\\])$";

const emailRfc5322Re = new RegExp(emailRfc5322Pattern);

const emailSchema = z
  .string()
  .trim()
  .refine((v) => emailRfc5322Re.test(v), { message: "Email invalide" });

const passwordSchema = z
  .string()
  .min(8)
  .refine((v) => /[a-z]/.test(v), {
    message: "Le mot de passe doit contenir une minuscule",
  })
  .refine((v) => /[A-Z]/.test(v), {
    message: "Le mot de passe doit contenir une majuscule",
  })
  .refine((v) => /\d/.test(v), {
    message: "Le mot de passe doit contenir un chiffre",
  });

const registerSchema = z.object({
  nom: z.string().trim().min(1).max(100),
  prenom: z.string().trim().min(1).max(100),
  email: emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string(),
});

authRouter.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const nom = xss(input.nom);
    const prenom = xss(input.prenom);
    const email = input.email.toLowerCase();

    // Hash bcrypt (jamais stocker le mot de passe en clair).
    const hashed = await bcrypt.hash(input.password, 12);

    try {
      const [result] = await pool.execute<ResultSetHeader>(
        "INSERT INTO users (nom, prenom, email, password, created_at) VALUES (:nom, :prenom, :email, :password, NOW())",
        { nom, prenom, email, password: hashed }
      );

      const userId = result.insertId;
      return res.status(201).json({ id: userId, nom, prenom, email });
    } catch (e: any) {
      if (e?.code === "ER_DUP_ENTRY") {
        return next(new HttpError(400, "Email déjà utilisé"));
      }
      throw e;
    }
  } catch (err) {
    return next(err);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);
    const email = input.email.toLowerCase();

    type UserRow = RowDataPacket & {
      id: number;
      email: string;
      password: string;
      nom: string;
      prenom: string;
    };

    const [rows] = await pool.execute<UserRow[]>(
      "SELECT id, email, password, nom, prenom FROM users WHERE email = :email LIMIT 1",
      { email }
    );

    const user = rows[0];
    if (!user) {
      return next(new HttpError(401, "Identifiants invalides"));
    }

    const ok = await bcrypt.compare(input.password, user.password);
    if (!ok) {
      return next(new HttpError(401, "Identifiants invalides"));
    }

    // JWT : subject = id utilisateur, payload minimal (email) + expiration 24h.
    const token = jwt.sign({ email: user.email }, env.JWT_SECRET, {
      subject: String(user.id),
      expiresIn: "24h",
    });

    return res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        nom: user.nom,
        prenom: user.prenom,
      },
    });
  } catch (err) {
    return next(err);
  }
});
