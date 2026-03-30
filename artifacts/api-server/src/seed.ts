import { db, subscriptionTiersTable, adminSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { DEFAULT_ICT_SYSTEM_PROMPT } from "./routes/gemini/systemPrompts";
import { getStripeClient } from "./stripe/stripeClient";

const STANDARD_MONTHLY_PRICE = "24.99";
const STANDARD_ANNUAL_PRICE = "239.88";
const STANDARD_MONTHLY_CENTS = 2499;
const STANDARD_ANNUAL_CENTS = 23988;

const PREMIUM_MONTHLY_PRICE = "49.99";
const PREMIUM_ANNUAL_PRICE = "479.88";
const PREMIUM_MONTHLY_CENTS = 4999;
const PREMIUM_ANNUAL_CENTS = 47988;

const STANDARD_DESCRIPTION = "Includes everything a $30/mo trading journal gives you, plus full ICT education and unlimited AI mentorship";
const PREMIUM_DESCRIPTION = "The complete trading toolkit — journal, education, AI mentorship, analytics, and webhooks bundled for less than what others charge for a journal alone";

interface TierInfo {
  id: number;
  monthlyPrice: string;
  annualPrice: string;
  stripePriceIdMonthly: string | null;
  stripePriceIdAnnual: string | null;
}

async function isPriceValid(stripe: Awaited<ReturnType<typeof getStripeClient>>, priceId: string, expectedCents: number, expectedInterval: "month" | "year"): Promise<boolean> {
  try {
    const price = await stripe.prices.retrieve(priceId);
    return (
      price.active &&
      price.unit_amount === expectedCents &&
      price.currency === "usd" &&
      price.recurring?.interval === expectedInterval
    );
  } catch {
    return false;
  }
}

async function ensureStripePricesForTier(
  stripe: Awaited<ReturnType<typeof getStripeClient>>,
  tier: TierInfo,
  tierName: string,
  productDescription: string,
  monthlyCents: number,
  annualCents: number,
): Promise<{ monthlyId: string; annualId: string } | null> {
  const monthlyOk = tier.stripePriceIdMonthly
    ? await isPriceValid(stripe, tier.stripePriceIdMonthly, monthlyCents, "month")
    : false;
  const annualOk = tier.stripePriceIdAnnual
    ? await isPriceValid(stripe, tier.stripePriceIdAnnual, annualCents, "year")
    : false;

  if (monthlyOk && annualOk) {
    return null;
  }

  console.log(`Creating new Stripe prices for ${tierName} tier (monthly valid=${monthlyOk}, annual valid=${annualOk})...`);

  const products = await stripe.products.list({ limit: 100 });
  let productId: string;
  const existingProduct = products.data.find((p) => p.name === tierName && p.active);
  if (existingProduct) {
    productId = existingProduct.id;
  } else {
    const product = await stripe.products.create({ name: tierName, description: productDescription });
    productId = product.id;
  }

  const monthlyId = monthlyOk && tier.stripePriceIdMonthly
    ? tier.stripePriceIdMonthly
    : (await stripe.prices.create({
        product: productId,
        unit_amount: monthlyCents,
        currency: "usd",
        recurring: { interval: "month" },
        nickname: `${tierName} Monthly $${(monthlyCents / 100).toFixed(2)}`,
      })).id;

  const annualId = annualOk && tier.stripePriceIdAnnual
    ? tier.stripePriceIdAnnual
    : (await stripe.prices.create({
        product: productId,
        unit_amount: annualCents,
        currency: "usd",
        recurring: { interval: "year" },
        nickname: `${tierName} Annual $${(annualCents / 100).toFixed(2)}`,
      })).id;

  return { monthlyId, annualId };
}

async function ensureStripePrices(standardTier: TierInfo, premiumTier: TierInfo) {
  try {
    const stripe = await getStripeClient();

    const standardResult = await ensureStripePricesForTier(
      stripe, standardTier, "Standard",
      "Full ICT education, AI mentorship, risk management, and trading journal — everything a serious trader needs.",
      STANDARD_MONTHLY_CENTS, STANDARD_ANNUAL_CENTS,
    );
    if (standardResult) {
      await db
        .update(subscriptionTiersTable)
        .set({ stripePriceIdMonthly: standardResult.monthlyId, stripePriceIdAnnual: standardResult.annualId })
        .where(eq(subscriptionTiersTable.id, standardTier.id));
      console.log(`Standard Stripe prices saved: monthly=${standardResult.monthlyId}, annual=${standardResult.annualId}`);
    }

    const premiumResult = await ensureStripePricesForTier(
      stripe, premiumTier, "Premium",
      "The complete trading toolkit: ICT Academy, AI mentorship, Smart Journal, Analytics Dashboard, TradingView Webhooks, and priority support.",
      PREMIUM_MONTHLY_CENTS, PREMIUM_ANNUAL_CENTS,
    );
    if (premiumResult) {
      await db
        .update(subscriptionTiersTable)
        .set({ stripePriceIdMonthly: premiumResult.monthlyId, stripePriceIdAnnual: premiumResult.annualId })
        .where(eq(subscriptionTiersTable.id, premiumTier.id));
      console.log(`Premium Stripe prices saved: monthly=${premiumResult.monthlyId}, annual=${premiumResult.annualId}`);
    }

    const activeTiers = await db.select().from(subscriptionTiersTable);
    for (const t of activeTiers.filter((tier) => tier.level > 0)) {
      console.log(`[Stripe price check] ${t.name} (level=${t.level}): monthly=${t.stripePriceIdMonthly ?? "MISSING"}, annual=${t.stripePriceIdAnnual ?? "MISSING"}, dbPrice=$${t.monthlyPrice}/mo`);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to ensure Stripe prices:", message);
  }
}

export async function seedDefaults() {
  const existingTiers = await db.select().from(subscriptionTiersTable);

  if (existingTiers.length > 0) {
    const standardTier = existingTiers.find((t) => t.level === 1);
    if (standardTier) {
      const features = standardTier.features as string[];
      const needsPriceUpdate =
        standardTier.monthlyPrice !== STANDARD_MONTHLY_PRICE ||
        standardTier.annualPrice !== STANDARD_ANNUAL_PRICE ||
        standardTier.description !== STANDARD_DESCRIPTION;
      const needsFeatureUpdate = !features.includes("Prop Tracker");
      if (needsPriceUpdate || needsFeatureUpdate) {
        await db
          .update(subscriptionTiersTable)
          .set({
            monthlyPrice: STANDARD_MONTHLY_PRICE,
            annualPrice: STANDARD_ANNUAL_PRICE,
            annualDiscountPct: 20,
            description: STANDARD_DESCRIPTION,
            features: ["Full ICT Academy (39 lessons)", "Daily Planner", "Risk Shield", "Prop Tracker", "AI Mentor (unlimited)", "Achievement Badges"],
            stripePriceIdMonthly: null,
            stripePriceIdAnnual: null,
          })
          .where(eq(subscriptionTiersTable.id, standardTier.id));
      }
    }
    const premiumTier = existingTiers.find((t) => t.level === 2);
    if (premiumTier) {
      const needsPriceUpdate =
        premiumTier.monthlyPrice !== PREMIUM_MONTHLY_PRICE ||
        premiumTier.annualPrice !== PREMIUM_ANNUAL_PRICE ||
        premiumTier.description !== PREMIUM_DESCRIPTION;
      if (needsPriceUpdate) {
        await db
          .update(subscriptionTiersTable)
          .set({
            monthlyPrice: PREMIUM_MONTHLY_PRICE,
            annualPrice: PREMIUM_ANNUAL_PRICE,
            annualDiscountPct: 20,
            description: PREMIUM_DESCRIPTION,
            stripePriceIdMonthly: null,
            stripePriceIdAnnual: null,
          })
          .where(eq(subscriptionTiersTable.id, premiumTier.id));
      }
    }

    const refreshedTiers = await db.select().from(subscriptionTiersTable);
    const refreshedStandard = refreshedTiers.find((t) => t.level === 1);
    const refreshedPremium = refreshedTiers.find((t) => t.level === 2);
    if (refreshedStandard && refreshedPremium) {
      await ensureStripePrices(refreshedStandard, refreshedPremium);
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
        features: ["ICT Academy (5 lessons)", "Daily Planner", "AI Mentor (3 questions/day)"],
        description: "Get a taste of what The Trading Mentor can do",
        isActive: true,
      },
      {
        name: "Standard",
        level: 1,
        monthlyPrice: STANDARD_MONTHLY_PRICE,
        annualPrice: STANDARD_ANNUAL_PRICE,
        annualDiscountPct: 20,
        features: ["Full ICT Academy (39 lessons)", "Daily Planner", "Risk Shield", "Prop Tracker", "AI Mentor (unlimited)", "Achievement Badges"],
        description: STANDARD_DESCRIPTION,
        isActive: true,
      },
      {
        name: "Premium",
        level: 2,
        monthlyPrice: PREMIUM_MONTHLY_PRICE,
        annualPrice: PREMIUM_ANNUAL_PRICE,
        annualDiscountPct: 20,
        features: ["Full ICT Academy (39 lessons)", "Daily Planner", "Risk Shield", "Smart Journal", "Analytics Dashboard", "AI Mentor (unlimited)", "Achievement Badges", "Leaderboard Access", "TradingView Webhooks", "Priority Support"],
        description: PREMIUM_DESCRIPTION,
        isActive: true,
      },
    ]);

    const newTiers = await db.select().from(subscriptionTiersTable);
    const newStandard = newTiers.find((t) => t.level === 1);
    const newPremium = newTiers.find((t) => t.level === 2);
    if (newStandard && newPremium) {
      await ensureStripePrices(newStandard, newPremium);
    }
  }

  const ALL_DEFAULTS: Record<string, string> = {
    founder_limit: "20",
    founder_discount_pct: "20",
    beta_tester_discount_pct: "30",
    founder_discount_months: "6",
    annual_discount_pct: "20",
    app_name: "The Trading Mentor",
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
  };

  const existingSettings = await db.select().from(adminSettingsTable);
  const existingKeys = new Set(existingSettings.map((s) => s.key));

  const toInsert = Object.entries(ALL_DEFAULTS)
    .filter(([key]) => !existingKeys.has(key))
    .map(([key, value]) => ({ key, value }));

  if (toInsert.length > 0) {
    await db.insert(adminSettingsTable).values(toInsert);
  }

  const annualDiscountRow = existingSettings.find((s) => s.key === "annual_discount_pct");
  if (annualDiscountRow && annualDiscountRow.value === "17") {
    await db
      .update(adminSettingsTable)
      .set({ value: "20" })
      .where(eq(adminSettingsTable.key, "annual_discount_pct"));
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
