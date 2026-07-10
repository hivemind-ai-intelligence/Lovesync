import { Router } from "express";
import type { Response } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";

const router = Router();

interface Song {
  id: string;
  title: string;
  artist: string;
  addedBy: string;
  addedAt: number;
}

// In-memory playlist store
const songs: Song[] = [];

/** GET /api/playlist — return the full playlist */
router.get(
  "/playlist",
  requireAuth,
  (_req: AuthenticatedRequest, res: Response) => {
    res.json(songs);
  },
);

/** POST /api/playlist — add a song; identity comes from the verified JWT */
router.post(
  "/playlist",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const { title, artist } = req.body as {
      title?: unknown;
      artist?: unknown;
    };

    if (
      typeof title !== "string" ||
      typeof artist !== "string" ||
      !title.trim() ||
      !artist.trim()
    ) {
      return res.status(400).json({ error: "Invalid song data" });
    }

    const song: Song = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: title.slice(0, 200),
      artist: artist.slice(0, 200),
      addedBy: req.user!.username,
      addedAt: Date.now(),
    };

    songs.push(song);
    return res.status(201).json(song);
  },
);

/** DELETE /api/playlist/:id — remove a song; only the song's owner may delete it */
router.delete(
  "/playlist/:id",
  requireAuth,
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const index = songs.findIndex((s) => s.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Song not found" });
    }

    if (songs[index]!.addedBy !== req.user!.username) {
      return res.status(403).json({ error: "Forbidden" });
    }

    songs.splice(index, 1);
    return res.json({ success: true });
  },
);

export default router;
