import { pgTable, serial, text, boolean, timestamp, integer, uuid, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { sql } from "drizzle-orm";

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("user"),
  isFounder: boolean("is_founder").notNull().default(false),
  founderNumber: integer("founder_number"),
  defaultSession: text("default_session"),
  preferredEntryStyle: text("preferred_entry_style"),
  defaultPairs: text("default_pairs"),
  appMode: text("app_mode").notNull().default("full"),
  defaultRiskPct: text("default_risk_pct"),
  lastLoginAt: timestamp("last_login_at"),
  webhookToken: uuid("webhook_token").default(sql`gen_random_uuid()`),
  academyProgress: text("academy_progress"),
  avatarUrl: text("avatar_url"),
  totalXp: integer("total_xp").notNull().default(0),
  loginStreak: integer("login_streak").notNull().default(0),
  lastLoginDate: text("last_login_date"),
  routineTimes: text("routine_times"),
  widgetPrefs: text("widget_prefs"),
  bio: text("bio"),
  twitterHandle: varchar("twitter_handle", { length: 64 }),
  discordHandle: varchar("discord_handle", { length: 64 }),
  isPublic: boolean("is_public").notNull().default(false),
  tradingRules: text("trading_rules"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
