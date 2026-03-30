import { Router, type Request, type Response } from "express";
import Stripe from "stripe";
import { db, subscriptionTiersTable, userSubscriptionsTable, adminSettingsTable, usersTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { authRequired } from "../../middleware/auth";
import { getStripeClient } from "../../stripe/stripeClient";

const router = Router();

router.get("/tiers", async (_req: Request, res: Response) => {
  try {
    const tiers = await db.select().from(subscriptionTiersTable).where(eq(subscriptionTiersTable.isActive, true));
    const founderLimitSetting = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "founder_limit"));
    const founderDiscountSetting = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "founder_discount_pct"));
    const annualDiscountSetting = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "annual_discount_pct"));
    const betaTesterDiscountSetting = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "beta_tester_discount_pct"));

    const [{ founderCount }] = await db
      .select({ founderCount: count() })
      .from(usersTable)
      .where(eq(usersTable.isFounder, true));

    const founderLimit = parseInt(founderLimitSetting[0]?.value || "20");
    res.json({
      tiers: tiers.sort((a, b) => a.level - b.level),
      founderSpotsLeft: Math.max(0, founderLimit - Number(founderCount)),
      founderLimit,
      founderDiscountPct: parseInt(founderDiscountSetting[0]?.value || "50"),
      annualDiscountPct: parseInt(annualDiscountSetting[0]?.value || "20"),
      betaTesterDiscountPct: parseInt(betaTesterDiscountSetting[0]?.value || "30"),
    });
  } catch (err) {
    console.error("Get tiers error:", err);
    res.status(500).json({ error: "Failed to get subscription tiers" });
  }
});

router.post("/create-checkout-session", authRequired, async (req: Request, res: Response) => {
  try {
    const { tierId, billingCycle } = req.body as { tierId: number; billingCycle: string };

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

    const founderDiscountSetting = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "founder_discount_pct"));
    const founderDiscountPct = parseInt(founderDiscountSetting[0]?.value || "50");

    const betaDiscountSetting = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "beta_tester_discount_pct"));

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
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
        oldStripeSubscriptionId: existingSub[0]?.stripeSubscriptionId || "",
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
    } else if (
      user.isBetaTester &&
      user.betaTrialEndsAt &&
      new Date(user.betaTrialEndsAt) < new Date()
    ) {
      const betaDiscountPct = parseInt(betaDiscountSetting[0]?.value || "30");
      if (betaDiscountPct > 0) {
        const coupon = await stripe.coupons.create({
          percent_off: betaDiscountPct,
          duration: "forever",
          name: `Beta Tester ${betaDiscountPct}% Thank-You Discount`,
        });
        sessionParams.discounts = [{ coupon: coupon.id }];
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    if (existingSub.length > 0) {
      await db.update(userSubscriptionsTable)
        .set({
          stripeCustomerId: customerId,
          stripeCheckoutSessionId: session.id,
        })
        .where(eq(userSubscriptionsTable.userId, req.user!.userId));
    } else {
      const [freeTier] = await db.select().from(subscriptionTiersTable).where(eq(subscriptionTiersTable.level, 0));
      await db.insert(userSubscriptionsTable).values({
        userId: req.user!.userId,
        tierId: freeTier?.id ?? tier.id,
        stripeCustomerId: customerId,
        stripeCheckoutSessionId: session.id,
        billingCycle,
        status: "active",
        startDate: new Date(),
      });
    }

    res.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create checkout session";
    console.error("Create checkout session error:", err);
    res.status(500).json({ error: message });
  }
});

router.post("/subscribe", authRequired, async (req: Request, res: Response) => {
  try {
    const { tierId, billingCycle } = req.body as { tierId: number; billingCycle: string };

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
      const stripe = await getStripeClient();
      try {
        await stripe.subscriptions.cancel(existingSub[0].stripeSubscriptionId);
      } catch (cancelErr: unknown) {
        const msg = cancelErr instanceof Error ? cancelErr.message : "unknown error";
        console.error("Failed to cancel Stripe subscription:", msg);
        res.status(502).json({ error: "Could not cancel your current subscription with Stripe. Please try again or contact support." });
        return;
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
      stripeCustomerId: null,
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

router.get("/my", authRequired, async (req: Request, res: Response) => {
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
