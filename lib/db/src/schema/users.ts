import { pgTable, serial, text, boolean, timestamp, integer, uuid } from "drizzle-orm/pg-core";
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
  lastLoginAt: timestamp("last_login_at"),
  webhookToken: uuid("webhook_token").default(sql`gen_random_uuid()`),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof usersTable.$inferSelect;
