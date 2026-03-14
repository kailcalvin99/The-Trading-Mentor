import { db, subscriptionTiersTable, adminSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

export async function seedDefaults() {
  const existingTiers = await db.select().from(subscriptionTiersTable);
  if (existingTiers.length === 0) {
    await db.insert(subscriptionTiersTable).values([
      {
        name: "Free",
        level: 0,
        monthlyPrice: "0",
        annualPrice: "0",
        annualDiscountPct: 0,
        features: ["ICT Academy (5 lessons)", "Daily Planner", "AI Mentor (3 questions/day)", "Daily Spin Wheel"],
        description: "Get a taste of what ICT Trading Mentor can do",
        isActive: true,
      },
      {
        name: "Standard",
        level: 1,
        monthlyPrice: "29.99",
        annualPrice: "299.99",
        annualDiscountPct: 17,
        features: ["Full ICT Academy (39 lessons)", "Daily Planner", "Risk Shield", "AI Mentor (unlimited)", "Daily Spin Wheel", "Achievement Badges"],
        description: "Everything you need to start trading seriously",
        isActive: true,
      },
      {
        name: "Premium",
        level: 2,
        monthlyPrice: "59.99",
        annualPrice: "599.99",
        annualDiscountPct: 17,
        features: ["Full ICT Academy (39 lessons)", "Daily Planner", "Risk Shield", "Smart Journal", "Analytics Dashboard", "AI Mentor (unlimited)", "Daily Spin Wheel", "Achievement Badges", "Leaderboard Access", "TradingView Webhooks", "Priority Support"],
        description: "The complete trading toolkit for serious traders",
        isActive: true,
      },
    ]);
  }

  const existingSettings = await db.select().from(adminSettingsTable);
  if (existingSettings.length === 0) {
    await db.insert(adminSettingsTable).values([
      { key: "founder_limit", value: "20" },
      { key: "founder_discount_pct", value: "50" },
      { key: "founder_discount_months", value: "6" },
      { key: "annual_discount_pct", value: "17" },
    ]);
  }
}
