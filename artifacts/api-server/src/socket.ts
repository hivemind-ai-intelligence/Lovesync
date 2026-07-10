import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { logger } from "./lib/logger";

export type RepeatMode = "off" | "one" | "all";

/** Shared playback state, kept in memory (not persisted to the DB). */
interface PlaybackState {
  queueSongId: number | null;
  videoId: string | null;
  isPlaying: boolean;
  positionSeconds: number;
  /** epoch ms when positionSeconds was last authoritative */
  updatedAt: number;
  shuffle: boolean;
  repeat: RepeatMode;
}

const state: PlaybackState = {
  queueSongId: null,
  videoId: null,
  isPlaying: false,
  positionSeconds: 0,
  updatedAt: Date.now(),
  shuffle: false,
  repeat: "off",
};

/** username → Set of socket IDs (handles multi-tab correctly) */
const userSocketMap = new Map<string, Set<string>>();

function connectedUsernames(): string[] {
  return Array.from(userSocketMap.keys());
}

/** Registers the Socket.IO server on the given HTTP server. */
export function setupSocket(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    path: "/api/socket.io",
    cors: { origin: "*" },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth["token"];
    const secret = process.env["SESSION_SECRET"];
    if (typeof token !== "string" || !secret) {
      next(new Error("Unauthorized"));
      return;
    }
    try {
      const payload = jwt.verify(token, secret) as { username: string };
      socket.data["username"] = payload.username;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const username = socket.data["username"] as string;
    logger.info({ username }, "Socket connected");

    // Track user presence (per socket-ID so multi-tab works correctly)
    const existingSockets = userSocketMap.get(username) ?? new Set<string>();
    existingSockets.add(socket.id);
    userSocketMap.set(username, existingSockets);
    io.emit("users:update", connectedUsernames());

    // Send current state to the newly connected client
    socket.emit("playback:sync", state);

    socket.on("playback:update", (raw: unknown) => {
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
      const payload = raw as Record<string, unknown>;

      const next: Partial<PlaybackState> = {};

      if ("queueSongId" in payload) {
        const v = payload["queueSongId"];
        if (v === null || (typeof v === "number" && Number.isFinite(v) && v > 0)) {
          next.queueSongId = v as number | null;
        }
      }
      if ("videoId" in payload) {
        const v = payload["videoId"];
        if (v === null || (typeof v === "string" && v.length <= 32)) {
          next.videoId = v as string | null;
        }
      }
      if ("isPlaying" in payload) {
        if (typeof payload["isPlaying"] === "boolean") {
          next.isPlaying = payload["isPlaying"];
        }
      }
      if ("positionSeconds" in payload) {
        const v = payload["positionSeconds"];
        if (typeof v === "number" && Number.isFinite(v) && v >= 0 && v < 86400) {
          next.positionSeconds = v;
        }
      }
      if ("shuffle" in payload) {
        if (typeof payload["shuffle"] === "boolean") {
          next.shuffle = payload["shuffle"];
        }
      }
      if ("repeat" in payload) {
        const v = payload["repeat"];
        if (v === "off" || v === "one" || v === "all") {
          next.repeat = v;
        }
      }

      Object.assign(state, next, { updatedAt: Date.now() });
      // Broadcast to ALL clients (including sender) so state stays consistent
      io.emit("playback:sync", state);
    });

    socket.on("queue:changed", () => {
      socket.broadcast.emit("queue:changed");
    });

    socket.on("disconnect", () => {
      logger.info({ username }, "Socket disconnected");
      const sockets = userSocketMap.get(username);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) userSocketMap.delete(username);
      }
      io.emit("users:update", connectedUsernames());
    });
  });

  return io;
}
