import { Router } from "express";
import type { Response } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";

const router = Router();

interface Message {
  id: string;
  username: string;
  text: string;
  timestamp: number;
}

// In-memory message store (capped at 500 messages)
const messages: Message[] = [];

/** GET /api/chat/messages — returns the last 200 messages */
router.get(
  "/chat/messages",
  requireAuth,
  (_req: AuthenticatedRequest, res: Response) => {
    res.json(messages.slice(-200));
  },
);

/** POST /api/chat/messages — append a new message; identity comes from the verified JWT */
router.post(
  "/chat/messages",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const { text } = req.body as { text?: unknown };
    const username = req.user!.username;

    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "Invalid message" });
    }

    const message: Message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      username,
      text: text.slice(0, 1000),
      timestamp: Date.now(),
    };

    messages.push(message);

    // Enforce cap
    if (messages.length > 500) {
      messages.splice(0, messages.length - 500);
    }

    return res.status(201).json(message);
  },
);

export default router;
