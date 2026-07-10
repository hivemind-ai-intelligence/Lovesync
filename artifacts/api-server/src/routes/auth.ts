import { Router } from "express";
import type { Request, Response } from "express";
import jwt from "jsonwebtoken";

const router = Router();

/**
 * POST /api/auth/login
 * Validates credentials against the OURROOM_USERNAME / OURROOM_PASSWORD secrets.
 * This is a single shared login for Vasudev and Sana -- there is no per-user
 * attribution or multiple accounts by design. Fails closed if either the
 * session secret or the credential secrets are not configured.
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
  const validUsername = process.env["OURROOM_USERNAME"];
  const validPassword = process.env["OURROOM_PASSWORD"];

  if (!secret || !validUsername || !validPassword) {
    return res
      .status(500)
      .json({ error: "Server misconfiguration: login is not configured" });
  }

  if (username === validUsername && password === validPassword) {
    const token = jwt.sign({ username }, secret, { expiresIn: "30d" });
    return res.json({ success: true, username, token });
  }

  return res.status(401).json({ error: "Invalid credentials" });
});

/**
 * GET /api/auth/me
 * Validates the Bearer token and returns the current user's username.
 * Used by the web app on launch to verify a stored token is still valid.
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
