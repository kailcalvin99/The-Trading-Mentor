import { db, subscriptionTiersTable, adminSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { DEFAULT_ICT_SYSTEM_PROMPT } from "./routes/gemini/index";

export async function seedDefaults() {
  const existingTiers = await db.select().from(subscriptionTiersTable);

  if (existingTiers.length > 0) {
    const standardTier = existingTiers.find((t) => t.level === 1);
    if (standardTier) {
      const features = standardTier.features as string[];
      const needsPriceUpdate = standardTier.monthlyPrice !== "14.99";
      const needsFeatureUpdate = !features.includes("Prop Tracker");
      if (needsPriceUpdate || needsFeatureUpdate) {
        await db
          .update(subscriptionTiersTable)
          .set({
            monthlyPrice: "14.99",
            annualPrice: "143.88",
            annualDiscountPct: 20,
            features: ["Full ICT Academy (39 lessons)", "Daily Planner", "Risk Shield", "Prop Tracker", "AI Mentor (unlimited)", "Daily Spin Wheel", "Achievement Badges"],
          })
          .where(eq(subscriptionTiersTable.id, standardTier.id));
      }
    }
    const premiumTier = existingTiers.find((t) => t.level === 2);
    if (premiumTier && premiumTier.monthlyPrice !== "30.00") {
      await db
        .update(subscriptionTiersTable)
        .set({ monthlyPrice: "30.00", annualPrice: "288.00", annualDiscountPct: 20 })
        .where(eq(subscriptionTiersTable.id, premiumTier.id));
    }
  }

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
        monthlyPrice: "14.99",
        annualPrice: "143.88",
        annualDiscountPct: 20,
        features: ["Full ICT Academy (39 lessons)", "Daily Planner", "Risk Shield", "Prop Tracker", "AI Mentor (unlimited)", "Daily Spin Wheel", "Achievement Badges"],
        description: "Everything you need to start trading seriously",
        isActive: true,
      },
      {
        name: "Premium",
        level: 2,
        monthlyPrice: "30.00",
        annualPrice: "288.00",
        annualDiscountPct: 20,
        features: ["Full ICT Academy (39 lessons)", "Daily Planner", "Risk Shield", "Smart Journal", "Analytics Dashboard", "AI Mentor (unlimited)", "Daily Spin Wheel", "Achievement Badges", "Leaderboard Access", "TradingView Webhooks", "Priority Support"],
        description: "The complete trading toolkit for serious traders",
        isActive: true,
      },
    ]);
  }

  const ALL_DEFAULTS: Record<string, string> = {
    founder_limit: "20",
    founder_discount_pct: "50",
    founder_discount_months: "6",
    annual_discount_pct: "17",
    app_name: "ICT AI Trading Mentor",
    app_tagline: "AI-Powered Trading Intelligence",
    cooldown_duration_hours: "4",
    consecutive_loss_threshold: "2",
    gate_lockout_minutes: "60",
    risk_daily_limit_pct: "2",
    risk_weekly_limit_pct: "4",
    routine_items: JSON.stringify([
      { key: "water", label: "Drink Water", desc: "Hydrate before you start trading", icon: "Droplets" },
      { key: "breathing", label: "Breathing Exercise", desc: "5 minutes of calm, focused breathing", icon: "Wind" },
      { key: "news", label: "Check for Big News Events", desc: "Are there any big news events today that could move the market?", icon: "Newspaper" },
      { key: "bias", label: "Check the Big Picture Chart", desc: "HTF (Higher Timeframe) — Is the market going up or down today?", icon: "BarChart3" },
    ]),
    ai_mentor_system_prompt: DEFAULT_ICT_SYSTEM_PROMPT,
    feature_discipline_gate: "true",
    feature_cooldown_timer: "true",
    feature_hall_of_fame: "true",
    feature_win_rate_estimator: "true",
    feature_casino_elements: "true",
    feature_daily_spin: "true",
  };

  const existingSettings = await db.select().from(adminSettingsTable);
  const existingKeys = new Set(existingSettings.map((s) => s.key));

  const toInsert = Object.entries(ALL_DEFAULTS)
    .filter(([key]) => !existingKeys.has(key))
    .map(([key, value]) => ({ key, value }));

  if (toInsert.length > 0) {
    await db.insert(adminSettingsTable).values(toInsert);
  }

  const promptRow = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "ai_mentor_system_prompt"));
  if (promptRow.length > 0 && promptRow[0].value) {
    const val = promptRow[0].value;
    const hasInstitutional = val.includes("INSTITUTIONAL FRONTEND ARCHITECT PROTOCOL");
    const hasUX = val.includes("UX ARCHITECT & PRODUCT STRATEGIST");
    const hasBackend = val.includes("SENIOR BACKEND ARCHITECT PROTOCOL");
    const hasSelfRecode = val.includes("SELF-RECODE PROTOCOL");

    if (!hasInstitutional && !hasUX && !hasBackend && !hasSelfRecode) {
      await db
        .update(adminSettingsTable)
        .set({ value: ALL_DEFAULTS.ai_mentor_system_prompt })
        .where(eq(adminSettingsTable.key, "ai_mentor_system_prompt"));
    }
  }
}
