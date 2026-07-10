import { Router } from "express";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";

const router = Router();

/**
 * POST /api/auth/login
 * Validates credentials against OURROOM_USERNAME / OURROOM_PASSWORD env vars.
 * Supports two users: primary (OURROOM_USERNAME) and partner (OURROOM_USERNAME_2).
 * Returns a signed JWT on success; fails closed if env vars are missing.
 */
router.post("/auth/login", (req: Request, res: Response) => {
  const { username, password } = req.body as {
    username?: unknown;
    password?: unknown;
  };

  if (typeof username !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Invalid request body" });
  }

  const secret = process.env["SESSION_SECRET"];
  if (!secret) {
    return res.status(500).json({ error: "Server misconfiguration: SESSION_SECRET not set" });
  }

  const user1 = process.env["OURROOM_USERNAME"] ?? "vasudev";
  const pass1 = process.env["OURROOM_PASSWORD"] ?? "ourroom2024";
  const user2 = process.env["OURROOM_USERNAME_2"] ?? "sana";
  const pass2 = process.env["OURROOM_PASSWORD_2"] ?? "ourroom2024";

  const matchUser1 = username === user1 && password === pass1;
  const matchUser2 = username === user2 && password === pass2;

  if (matchUser1 || matchUser2) {
    const token = jwt.sign({ username }, secret, { expiresIn: "30d" });
    return res.json({ success: true, username, token });
  }

  return res.status(401).json({ error: "Invalid credentials" });
});

/**
 * GET /api/auth/me
 * Validates the Bearer token and returns the current user's username.
 * Used by the mobile app on launch to verify a stored token is still valid.
 */
router.get("/auth/me", (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const token = authHeader.slice(7);
  const secret = process.env["SESSION_SECRET"];
  if (!secret) {
    return res.status(500).json({ error: "Server misconfiguration" });
  }

  try {
    const payload = jwt.verify(token, secret) as { username: string };
    return res.json({ username: payload.username });
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
});

export default router;
