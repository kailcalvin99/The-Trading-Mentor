import { pgTable, serial, text, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tradesTable = pgTable("trades", {
  id: serial("id").primaryKey(),
  pair: text("pair").notNull(),
  entryTime: text("entry_time").notNull(),
  riskPct: numeric("risk_pct", { precision: 5, scale: 2 }).notNull(),
  liquiditySweep: boolean("liquidity_sweep").notNull().default(false),
  outcome: text("outcome"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTradeSchema = createInsertSchema(tradesTable).omit({ id: true, createdAt: true });
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof tradesTable.$inferSelect;
