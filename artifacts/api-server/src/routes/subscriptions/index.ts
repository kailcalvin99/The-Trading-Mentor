import { Router } from "express";
import { db, subscriptionTiersTable, userSubscriptionsTable, adminSettingsTable, usersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { authRequired } from "../../middleware/auth";

const router = Router();

router.get("/tiers", async (_req, res) => {
  try {
    const tiers = await db.select().from(subscriptionTiersTable).where(eq(subscriptionTiersTable.isActive, true));
    const founderLimitSetting = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "founder_limit"));
    const founderDiscountSetting = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "founder_discount_pct"));
    const annualDiscountSetting = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "annual_discount_pct"));

    const [{ founderCount }] = await db
      .select({ founderCount: count() })
      .from(usersTable)
      .where(eq(usersTable.isFounder, true));

    res.json({
      tiers: tiers.sort((a, b) => a.level - b.level),
      founderSpotsLeft: Math.max(0, parseInt(founderLimitSetting[0]?.value || "20") - Number(founderCount)),
      founderDiscountPct: parseInt(founderDiscountSetting[0]?.value || "50"),
      annualDiscountPct: parseInt(annualDiscountSetting[0]?.value || "17"),
    });
  } catch (err) {
    console.error("Get tiers error:", err);
    res.status(500).json({ error: "Failed to get subscription tiers" });
  }
});

router.post("/subscribe", authRequired, async (req, res) => {
  try {
    const { tierId, billingCycle } = req.body;

    if (!tierId || !billingCycle) {
      res.status(400).json({ error: "Tier ID and billing cycle are required" });
      return;
    }

    const [tier] = await db.select().from(subscriptionTiersTable).where(eq(subscriptionTiersTable.id, tierId));
    if (!tier) {
      res.status(404).json({ error: "Subscription tier not found" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));

    const founderDiscountMonthsSetting = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "founder_discount_months"));
    const founderDiscountMonths = founderDiscountMonthsSetting.length > 0 ? parseInt(founderDiscountMonthsSetting[0].value) : 6;

    const existingSub = await db.select().from(userSubscriptionsTable).where(eq(userSubscriptionsTable.userId, req.user!.userId));
    
    const subData = {
      userId: req.user!.userId,
      tierId,
      status: "active" as const,
      billingCycle,
      founderDiscount: user.isFounder,
      founderDiscountEndsAt: user.isFounder ? new Date(Date.now() + founderDiscountMonths * 30 * 24 * 60 * 60 * 1000) : null,
      startDate: new Date(),
    };

    if (existingSub.length > 0) {
      await db.update(userSubscriptionsTable)
        .set(subData)
        .where(eq(userSubscriptionsTable.userId, req.user!.userId));
    } else {
      await db.insert(userSubscriptionsTable).values(subData);
    }

    res.json({ success: true, tier: tier.name, billingCycle });
  } catch (err) {
    console.error("Subscribe error:", err);
    res.status(500).json({ error: "Subscription failed" });
  }
});

router.get("/my", authRequired, async (req, res) => {
  try {
    const subscription = await db
      .select({
        id: userSubscriptionsTable.id,
        tierId: userSubscriptionsTable.tierId,
        status: userSubscriptionsTable.status,
        billingCycle: userSubscriptionsTable.billingCycle,
        founderDiscount: userSubscriptionsTable.founderDiscount,
        founderDiscountEndsAt: userSubscriptionsTable.founderDiscountEndsAt,
        customMonthlyPrice: userSubscriptionsTable.customMonthlyPrice,
        customAnnualPrice: userSubscriptionsTable.customAnnualPrice,
        startDate: userSubscriptionsTable.startDate,
        endDate: userSubscriptionsTable.endDate,
        tierName: subscriptionTiersTable.name,
        tierLevel: subscriptionTiersTable.level,
        tierFeatures: subscriptionTiersTable.features,
        tierMonthlyPrice: subscriptionTiersTable.monthlyPrice,
        tierAnnualPrice: subscriptionTiersTable.annualPrice,
      })
      .from(userSubscriptionsTable)
      .innerJoin(subscriptionTiersTable, eq(userSubscriptionsTable.tierId, subscriptionTiersTable.id))
      .where(eq(userSubscriptionsTable.userId, req.user!.userId))
      .orderBy(userSubscriptionsTable.id)
      .limit(1);

    res.json({ subscription: subscription[0] || null });
  } catch (err) {
    console.error("Get subscription error:", err);
    res.status(500).json({ error: "Failed to get subscription" });
  }
});

export default router;
