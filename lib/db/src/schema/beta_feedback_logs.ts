import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const betaFeedbackLogsTable = pgTable("beta_feedback_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  submitterRole: text("submitter_role").notNull(),
  category: text("category").notNull(),
  description: text("description").notNull(),
  rating: integer("rating").notNull(),
  pageContext: text("page_context"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BetaFeedbackLog = typeof betaFeedbackLogsTable.$inferSelect;
