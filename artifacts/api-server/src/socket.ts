import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import { logger } from "./lib/logger";

/** Shared playback state, kept in memory only (not persisted to the DB). */
interface PlaybackState {
  queueSongId: number | null;
  videoId: string | null;
  isPlaying: boolean;
  positionSeconds: number;
  /** epoch ms when positionSeconds was last authoritative */
  updatedAt: number;
}

const state: PlaybackState = {
  queueSongId: null,
  videoId: null,
  isPlaying: false,
  positionSeconds: 0,
  updatedAt: Date.now(),
};

/** Registers the Socket.IO server on the given HTTP server for real-time playback sync. */
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

    socket.emit("playback:sync", state);

    socket.on(
      "playback:update",
      (payload: Partial<PlaybackState>) => {
        Object.assign(state, payload, { updatedAt: Date.now() });
        socket.broadcast.emit("playback:sync", state);
      },
    );

    socket.on("queue:changed", () => {
      socket.broadcast.emit("queue:changed");
    });

    socket.on("disconnect", () => {
      logger.info({ username }, "Socket disconnected");
    });
  });

  return io;
}
