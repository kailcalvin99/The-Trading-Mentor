import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const betaInviteCodesTable = pgTable("beta_invite_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  usedByUserId: integer("used_by_user_id").references(() => usersTable.id),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type BetaInviteCode = typeof betaInviteCodesTable.$inferSelect;
