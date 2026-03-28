import { pgTable, serial, text, numeric, boolean, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const subscriptionTiersTable = pgTable("subscription_tiers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  level: integer("level").notNull().default(0),
  monthlyPrice: numeric("monthly_price", { precision: 10, scale: 2 }).notNull().default("0"),
  annualPrice: numeric("annual_price", { precision: 10, scale: 2 }).notNull().default("0"),
  annualDiscountPct: integer("annual_discount_pct").notNull().default(0),
  features: jsonb("features").notNull().default([]),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  stripePriceIdMonthly: text("stripe_price_id_monthly"),
  stripePriceIdAnnual: text("stripe_price_id_annual"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userSubscriptionsTable = pgTable("user_subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  tierId: integer("tier_id").notNull().references(() => subscriptionTiersTable.id),
  status: text("status").notNull().default("active"),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  customMonthlyPrice: numeric("custom_monthly_price", { precision: 10, scale: 2 }),
  customAnnualPrice: numeric("custom_annual_price", { precision: 10, scale: 2 }),
  founderDiscount: boolean("founder_discount").notNull().default(false),
  founderDiscountEndsAt: timestamp("founder_discount_ends_at"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  stripeCheckoutSessionId: text("stripe_checkout_session_id"),
  startDate: timestamp("start_date").defaultNow().notNull(),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SubscriptionTier = typeof subscriptionTiersTable.$inferSelect;
export type UserSubscription = typeof userSubscriptionsTable.$inferSelect;
