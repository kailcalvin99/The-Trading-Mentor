import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

export const cooldownEventsTable = pgTable("cooldown_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  eventType: text("event_type").notNull(),
  triggerTags: text("trigger_tags"),
  durationSeconds: integer("duration_seconds").notNull().default(300),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
