import { Router } from "express";
import type { Response } from "express";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { db, queueSongsTable } from "@workspace/db";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";

const router = Router();

/** GET /api/queue — return the shared queue, ordered by position */
router.get(
  "/queue",
  requireAuth,
  async (_req: AuthenticatedRequest, res: Response) => {
    const songs = await db
      .select()
      .from(queueSongsTable)
      .orderBy(asc(queueSongsTable.position));
    res.json(songs);
  },
);

/** POST /api/queue — add a song to the end of the queue */
router.post(
  "/queue",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const { videoId, title, channel, thumbnail, duration } = req.body as {
      videoId?: unknown;
      title?: unknown;
      channel?: unknown;
      thumbnail?: unknown;
      duration?: unknown;
    };

    if (
      typeof videoId !== "string" ||
      typeof title !== "string" ||
      typeof channel !== "string" ||
      typeof thumbnail !== "string" ||
      typeof duration !== "string" ||
      !videoId.trim() ||
      !title.trim() ||
      !channel.trim()
    ) {
      return res.status(400).json({ error: "Invalid song data" });
    }

    const [{ maxPosition } = { maxPosition: -1 }] = await db
      .select({
        maxPosition: sql<number>`coalesce(max(${queueSongsTable.position}), -1)`,
      })
      .from(queueSongsTable);

    const [song] = await db
      .insert(queueSongsTable)
      .values({
        videoId: videoId.slice(0, 32),
        title: title.slice(0, 300),
        channel: channel.slice(0, 300),
        thumbnail: thumbnail.slice(0, 1000),
        duration: duration.slice(0, 20),
        addedAt: Date.now(),
        position: maxPosition + 1,
      })
      .returning();

    return res.status(201).json(song);
  },
);

/** DELETE /api/queue/:id — remove a song from the queue */
router.delete(
  "/queue/:id",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const id = Number(req.params["id"]);
    if (!Number.isInteger(id)) {
      return res.status(404).json({ error: "Song not found" });
    }

    const deleted = await db
      .delete(queueSongsTable)
      .where(eq(queueSongsTable.id, id))
      .returning({ id: queueSongsTable.id });

    if (deleted.length === 0) {
      return res.status(404).json({ error: "Song not found" });
    }

    return res.json({ success: true });
  },
);

/** PATCH /api/queue/reorder — reorder the queue given the full ordered id list */
router.patch(
  "/queue/reorder",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const { orderedIds } = req.body as { orderedIds?: unknown };

    if (
      !Array.isArray(orderedIds) ||
      orderedIds.length === 0 ||
      !orderedIds.every((id) => typeof id === "number" && Number.isInteger(id))
    ) {
      return res.status(400).json({ error: "Invalid reorder payload" });
    }

    // Require the payload to be the COMPLETE current queue — same IDs, no extras, no missing.
    const existing = await db
      .select({ id: queueSongsTable.id })
      .from(queueSongsTable);

    const existingIds = new Set(existing.map((r) => r.id));
    const payloadIds = new Set(orderedIds as number[]);

    if (
      existingIds.size !== payloadIds.size ||
      [...existingIds].some((id) => !payloadIds.has(id))
    ) {
      return res.status(400).json({
        error:
          "Reorder payload must contain exactly the current queue IDs, no more, no less",
      });
    }

    await Promise.all(
      (orderedIds as number[]).map((id, index) =>
        db
          .update(queueSongsTable)
          .set({ position: index })
          .where(eq(queueSongsTable.id, id)),
      ),
    );

    const songs = await db
      .select()
      .from(queueSongsTable)
      .orderBy(asc(queueSongsTable.position));

    return res.json(songs);
  },
);

export default router;
