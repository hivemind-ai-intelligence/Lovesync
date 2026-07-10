import { pgTable, text, integer, doublePrecision, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const queueSongsTable = pgTable("queue_songs", {
  id: serial("id").primaryKey(),
  videoId: text("video_id").notNull(),
  title: text("title").notNull(),
  channel: text("channel").notNull(),
  thumbnail: text("thumbnail").notNull(),
  duration: text("duration").notNull(),
  addedAt: doublePrecision("added_at").notNull(),
  position: integer("position").notNull(),
});

export const insertQueueSongSchema = createInsertSchema(queueSongsTable).omit({
  id: true,
});
export type InsertQueueSong = z.infer<typeof insertQueueSongSchema>;
export type QueueSong = typeof queueSongsTable.$inferSelect;
