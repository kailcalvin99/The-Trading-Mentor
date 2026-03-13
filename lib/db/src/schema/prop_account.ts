import { pgTable, serial, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const propAccountTable = pgTable("prop_account", {
  id: serial("id").primaryKey(),
  startingBalance: numeric("starting_balance", { precision: 12, scale: 2 }).notNull(),
  currentBalance: numeric("current_balance", { precision: 12, scale: 2 }).notNull(),
  dailyLoss: numeric("daily_loss", { precision: 12, scale: 2 }).notNull().default("0"),
  totalDrawdown: numeric("total_drawdown", { precision: 12, scale: 2 }).notNull().default("0"),
  maxDailyLossPct: numeric("max_daily_loss_pct", { precision: 5, scale: 2 }).notNull().default("2"),
  maxTotalDrawdownPct: numeric("max_total_drawdown_pct", { precision: 5, scale: 2 }).notNull().default("5"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPropAccountSchema = createInsertSchema(propAccountTable).omit({ id: true, updatedAt: true });
export type InsertPropAccount = z.infer<typeof insertPropAccountSchema>;
export type PropAccount = typeof propAccountTable.$inferSelect;
