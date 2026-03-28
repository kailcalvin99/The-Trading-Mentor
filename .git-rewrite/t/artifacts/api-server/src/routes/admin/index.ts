import { Router } from "express";
import { db, usersTable, subscriptionTiersTable, userSubscriptionsTable, adminSettingsTable, tradesTable, conversations, messages, propAccountTable, communityPostsTable, communityRepliesTable, postLikesTable } from "@workspace/db";
import { eq, sql, inArray } from "drizzle-orm";
import { authRequired, adminRequired, clearAuthCookie } from "../../middleware/auth";
import { seedDefaults } from "../../seed";
import { getStripeClient } from "../../stripe/stripeClient";

const router = Router();

let configCache: Record<string, string> | null = null;

const PRIVATE_KEYS = new Set(["ai_mentor_system_prompt"]);

router.get("/app-config", async (_req, res) => {
  try {
    if (configCache) {
      const publicConfig: Record<string, string> = {};
      for (const [k, v] of Object.entries(configCache)) {
        if (!PRIVATE_KEYS.has(k)) publicConfig[k] = v;
      }
      res.json(publicConfig);
      return;
    }
    const settings = await db.select().from(adminSettingsTable);
    const map: Record<string, string> = {};
    settings.forEach((s) => { map[s.key] = s.value; });
    configCache = map;
    const publicConfig: Record<string, string> = {};
    for (const [k, v] of Object.entries(map)) {
      if (!PRIVATE_KEYS.has(k)) publicConfig[k] = v;
    }
    res.json(publicConfig);
  } catch (err) {
    console.error("Get app-config error:", err);
    res.status(500).json({ error: "Failed to get config" });
  }
});

export function invalidateConfigCache() {
  configCache = null;
}

router.use(authRequired, adminRequired);

router.get("/users", async (_req, res) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        email: usersTable.email,
        name: usersTable.name,
        role: usersTable.role,
        isFounder: usersTable.isFounder,
        founderNumber: usersTable.founderNumber,
        createdAt: usersTable.createdAt,
        subId: userSubscriptionsTable.id,
        tierId: userSubscriptionsTable.tierId,
        subStatus: userSubscriptionsTable.status,
        billingCycle: userSubscriptionsTable.billingCycle,
        founderDiscount: userSubscriptionsTable.founderDiscount,
        customMonthlyPrice: userSubscriptionsTable.customMonthlyPrice,
        customAnnualPrice: userSubscriptionsTable.customAnnualPrice,
        tierName: subscriptionTiersTable.name,
        tierLevel: subscriptionTiersTable.level,
        lastLoginAt: usersTable.lastLoginAt,
      })
      .from(usersTable)
      .leftJoin(userSubscriptionsTable, eq(usersTable.id, userSubscriptionsTable.userId))
      .leftJoin(subscriptionTiersTable, eq(userSubscriptionsTable.tierId, subscriptionTiersTable.id));

    res.json({ users });
  } catch (err) {
    console.error("Get users error:", err);
    res.status(500).json({ error: "Failed to get users" });
  }
});

router.put("/users/:id/subscription", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { tierId, customMonthlyPrice, customAnnualPrice, status } = req.body;

    const existing = await db.select().from(userSubscriptionsTable).where(eq(userSubscriptionsTable.userId, userId));

    const updates: Record<string, unknown> = {};
    if (tierId !== undefined) updates.tierId = tierId;
    if (customMonthlyPrice !== undefined) updates.customMonthlyPrice = customMonthlyPrice;
    if (customAnnualPrice !== undefined) updates.customAnnualPrice = customAnnualPrice;
    if (status !== undefined) updates.status = status;

    if (existing.length > 0) {
      await db.update(userSubscriptionsTable).set(updates).where(eq(userSubscriptionsTable.userId, userId));
    } else {
      await db.insert(userSubscriptionsTable).values({
        userId,
        tierId: tierId || 1,
        status: status || "active",
        billingCycle: "monthly",
        ...updates,
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Update subscription error:", err);
    res.status(500).json({ error: "Failed to update subscription" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const isSelfDelete = req.user!.userId === userId;

    const [targetUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!targetUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [sub] = await db.select().from(userSubscriptionsTable).where(eq(userSubscriptionsTable.userId, userId));
    if (sub?.stripeSubscriptionId) {
      try {
        const stripe = await getStripeClient();
        await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
      } catch (stripeErr) {
        console.error("Failed to cancel Stripe subscription during user delete:", stripeErr);
        res.status(502).json({ error: "Could not cancel the user's Stripe subscription. Please cancel it manually in the Stripe dashboard first, then try again." });
        return;
      }
    }

    const userPosts = await db.select({ id: communityPostsTable.id }).from(communityPostsTable).where(eq(communityPostsTable.userId, userId));
    if (userPosts.length > 0) {
      const postIds = userPosts.map(p => p.id);
      await db.delete(postLikesTable).where(inArray(postLikesTable.postId, postIds));
      await db.delete(communityRepliesTable).where(inArray(communityRepliesTable.postId, postIds));
    }
    await db.delete(postLikesTable).where(eq(postLikesTable.userId, userId));
    await db.delete(communityRepliesTable).where(eq(communityRepliesTable.userId, userId));
    await db.delete(communityPostsTable).where(eq(communityPostsTable.userId, userId));

    await db.delete(messages).where(
      sql`conversation_id IN (SELECT id FROM conversations WHERE user_id = ${userId})`
    );
    await db.delete(conversations).where(eq(conversations.userId, userId));
    await db.delete(propAccountTable).where(eq(propAccountTable.userId, userId));
    await db.delete(userSubscriptionsTable).where(eq(userSubscriptionsTable.userId, userId));
    await db.delete(usersTable).where(eq(usersTable.id, userId));

    if (isSelfDelete) {
      clearAuthCookie(res);
    }

    res.json({ success: true, selfDeleted: isSelfDelete, message: `User ${targetUser.email} deleted` });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

router.get("/tiers", async (_req, res) => {
  try {
    const tiers = await db.select().from(subscriptionTiersTable);
    res.json({ tiers: tiers.sort((a, b) => a.level - b.level) });
  } catch (err) {
    console.error("Get tiers error:", err);
    res.status(500).json({ error: "Failed to get tiers" });
  }
});

router.put("/tiers/:id", async (req, res) => {
  try {
    const tierId = parseInt(req.params.id);
    const { name, monthlyPrice, annualPrice, annualDiscountPct, features, description, isActive } = req.body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (monthlyPrice !== undefined) updates.monthlyPrice = monthlyPrice;
    if (annualPrice !== undefined) updates.annualPrice = annualPrice;
    if (annualDiscountPct !== undefined) updates.annualDiscountPct = annualDiscountPct;
    if (features !== undefined) updates.features = features;
    if (description !== undefined) updates.description = description;
    if (isActive !== undefined) updates.isActive = isActive;

    await db.update(subscriptionTiersTable).set(updates).where(eq(subscriptionTiersTable.id, tierId));

    res.json({ success: true });
  } catch (err) {
    console.error("Update tier error:", err);
    res.status(500).json({ error: "Failed to update tier" });
  }
});

router.get("/settings", async (_req, res) => {
  try {
    const settings = await db.select().from(adminSettingsTable);
    const settingsMap: Record<string, string> = {};
    settings.forEach((s) => { settingsMap[s.key] = s.value; });
    res.json({ settings: settingsMap });
  } catch (err) {
    console.error("Get settings error:", err);
    res.status(500).json({ error: "Failed to get settings" });
  }
});

router.put("/settings", async (req, res) => {
  try {
    const { settings } = req.body;
    for (const [key, value] of Object.entries(settings as Record<string, string>)) {
      const existing = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, key));
      if (existing.length > 0) {
        await db.update(adminSettingsTable).set({ value, updatedAt: new Date() }).where(eq(adminSettingsTable.key, key));
      } else {
        await db.insert(adminSettingsTable).values({ key, value });
      }
    }
    invalidateConfigCache();
    res.json({ success: true });
  } catch (err) {
    console.error("Update settings error:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

router.post("/reset", async (req, res) => {
  try {
    const { confirmCode } = req.body;
    if (confirmCode !== "RESET-EVERYTHING") {
      res.status(400).json({ error: "Invalid confirmation code" });
      return;
    }

    await db.delete(messages);
    await db.delete(conversations);
    await db.delete(tradesTable);
    await db.delete(propAccountTable);
    await db.delete(userSubscriptionsTable);
    await db.delete(adminSettingsTable);
    await db.delete(subscriptionTiersTable);
    await db.delete(usersTable);

    await seedDefaults();
    invalidateConfigCache();

    clearAuthCookie(res);
    res.json({ success: true, message: "Full reset complete. All data has been wiped." });
  } catch (err) {
    console.error("Hard reset error:", err);
    res.status(500).json({ error: "Failed to perform reset" });
  }
});

export default router;
