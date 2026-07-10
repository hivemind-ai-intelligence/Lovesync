import { Router } from "express";
import type { Response } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

interface YoutubeSearchItem {
  id: { videoId?: string };
  snippet: {
    title: string;
    channelTitle: string;
    publishedAt: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
  };
}

/** Parses an ISO-8601 duration (e.g. PT3M42S) into mm:ss / h:mm:ss. */
function formatDuration(iso: string | undefined): string | null {
  if (!iso) return null;
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

/** GET /api/youtube/search?q=... — search YouTube for videos matching the query */
router.get(
  "/youtube/search",
  requireAuth,
  async (req: AuthenticatedRequest, res: Response) => {
    const q = req.query["q"];
    if (typeof q !== "string" || !q.trim()) {
      return res.status(400).json({ error: "Missing query parameter 'q'" });
    }

    const apiKey = process.env["YOUTUBE_API_KEY"];
    if (!apiKey) {
      return res
        .status(502)
        .json({ error: "Server misconfiguration: YOUTUBE_API_KEY not set" });
    }

    try {
      const searchUrl = new URL(
        "https://www.googleapis.com/youtube/v3/search",
      );
      searchUrl.searchParams.set("part", "snippet");
      searchUrl.searchParams.set("type", "video");
      searchUrl.searchParams.set("maxResults", "20");
      searchUrl.searchParams.set("q", q);
      searchUrl.searchParams.set("key", apiKey);

      const searchRes = await fetch(searchUrl);
      if (!searchRes.ok) {
        const body = await searchRes.text();
        logger.error(
          { status: searchRes.status, body },
          "YouTube search API error",
        );
        return res.status(502).json({ error: "YouTube search failed" });
      }

      const searchData = (await searchRes.json()) as {
        items: YoutubeSearchItem[];
      };

      const videoIds = searchData.items
        .map((item) => item.id.videoId)
        .filter((id): id is string => Boolean(id));

      let durationsByVideoId = new Map<string, string | null>();
      if (videoIds.length > 0) {
        const detailsUrl = new URL(
          "https://www.googleapis.com/youtube/v3/videos",
        );
        detailsUrl.searchParams.set("part", "contentDetails");
        detailsUrl.searchParams.set("id", videoIds.join(","));
        detailsUrl.searchParams.set("key", apiKey);

        const detailsRes = await fetch(detailsUrl);
        if (detailsRes.ok) {
          const detailsData = (await detailsRes.json()) as {
            items: { id: string; contentDetails: { duration: string } }[];
          };
          durationsByVideoId = new Map(
            detailsData.items.map((item) => [
              item.id,
              formatDuration(item.contentDetails.duration),
            ]),
          );
        } else {
          logger.warn(
            { status: detailsRes.status },
            "YouTube videos.list (durations) failed; continuing without durations",
          );
        }
      }

      const results = searchData.items
        .filter((item) => item.id.videoId)
        .map((item) => ({
          videoId: item.id.videoId as string,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumbnail:
            item.snippet.thumbnails.high?.url ??
            item.snippet.thumbnails.medium?.url ??
            item.snippet.thumbnails.default?.url ??
            "",
          duration: durationsByVideoId.get(item.id.videoId as string) ?? null,
          publishedAt: item.snippet.publishedAt,
        }));

      return res.json(results);
    } catch (err) {
      logger.error({ err }, "YouTube search request failed");
      return res.status(502).json({ error: "YouTube search failed" });
    }
  },
);

export default router;
