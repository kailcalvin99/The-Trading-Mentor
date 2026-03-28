import { pgTable, serial, integer, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const videoWatchedTable = pgTable("video_watched", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  videoId: text("video_id").notNull(),
  watchedAt: timestamp("watched_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("video_watched_user_video_idx").on(table.userId, table.videoId),
]);

export type VideoWatched = typeof videoWatchedTable.$inferSelect;
