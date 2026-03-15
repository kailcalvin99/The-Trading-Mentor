import { Router } from "express";
import { db, subscriptionTiersTable, userSubscriptionsTable, adminSettingsTable, usersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { authRequired } from "../../middleware/auth";
import { getStripeClient } from "../../stripe/stripeClient";

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

router.post("/create-checkout-session", authRequired, async (req, res) => {
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

    if (tier.level === 0) {
      res.status(400).json({ error: "Free tier does not require payment" });
      return;
    }

    const priceId = billingCycle === "annual" ? tier.stripePriceIdAnnual : tier.stripePriceIdMonthly;
    if (!priceId) {
      res.status(400).json({ error: "Stripe pricing is not configured for this tier. Please run the Stripe seed script." });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const stripe = await getStripeClient();

    const existingSub = await db.select().from(userSubscriptionsTable).where(eq(userSubscriptionsTable.userId, req.user!.userId));
    let customerId = existingSub[0]?.stripeCustomerId || null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: String(user.id) },
      });
      customerId = customer.id;
    }

    if (existingSub[0]?.stripeSubscriptionId) {
      try {
        await stripe.subscriptions.cancel(existingSub[0].stripeSubscriptionId);
      } catch (cancelErr: any) {
        console.warn("Could not cancel old subscription:", cancelErr.message);
      }
    }

    const founderDiscountSetting = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "founder_discount_pct"));
    const founderDiscountPct = parseInt(founderDiscountSetting[0]?.value || "50");

    const sessionParams: any = {
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: `https://${process.env.REPLIT_DEV_DOMAIN || req.get("host")}/web/pricing?success=1`,
      cancel_url: `https://${process.env.REPLIT_DEV_DOMAIN || req.get("host")}/web/pricing?canceled=1`,
      metadata: {
        userId: String(user.id),
        tierId: String(tierId),
        billingCycle,
      },
    };

    if (user.isFounder && founderDiscountPct > 0) {
      const coupon = await stripe.coupons.create({
        percent_off: founderDiscountPct,
        duration: "repeating",
        duration_in_months: 6,
        name: `Founder ${founderDiscountPct}% Discount`,
      });
      sessionParams.discounts = [{ coupon: coupon.id }];
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    const subData: any = {
      userId: req.user!.userId,
      stripeCustomerId: customerId,
      stripeCheckoutSessionId: session.id,
      billingCycle,
      status: "pending",
    };

    if (existingSub.length > 0) {
      await db.update(userSubscriptionsTable)
        .set(subData)
        .where(eq(userSubscriptionsTable.userId, req.user!.userId));
    } else {
      await db.insert(userSubscriptionsTable).values({
        ...subData,
        tierId: tier.id,
        startDate: new Date(),
      });
    }

    res.json({ url: session.url });
  } catch (err: any) {
    console.error("Create checkout session error:", err);
    res.status(500).json({ error: err.message || "Failed to create checkout session" });
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

    if (tier.level !== 0) {
      res.status(400).json({ error: "Paid tiers require Stripe checkout. Use /create-checkout-session instead." });
      return;
    }

    const existingSub = await db.select().from(userSubscriptionsTable).where(eq(userSubscriptionsTable.userId, req.user!.userId));

    if (existingSub[0]?.stripeSubscriptionId) {
      try {
        const stripe = await getStripeClient();
        await stripe.subscriptions.cancel(existingSub[0].stripeSubscriptionId);
      } catch (cancelErr: any) {
        console.warn("Could not cancel Stripe subscription:", cancelErr.message);
      }
    }

    const subData = {
      userId: req.user!.userId,
      tierId,
      status: "active" as const,
      billingCycle,
      founderDiscount: false,
      founderDiscountEndsAt: null,
      stripeSubscriptionId: null,
      stripeCheckoutSessionId: null,
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
