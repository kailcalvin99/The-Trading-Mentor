import { Router } from "express";
import { db, usersTable, subscriptionTiersTable, userSubscriptionsTable, adminSettingsTable, tradesTable, conversations, messages, propAccountTable, communityPostsTable, communityRepliesTable, postLikesTable, passwordResetTokensTable } from "@workspace/db";
import { eq, sql, inArray, and, gt } from "drizzle-orm";
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

// FIX #6: return a masked token prefix only — never expose the full reset token
router.get("/password-resets", async (_req, res) => {
  try {
    const resets = await db
      .select({
        id: passwordResetTokensTable.id,
        token: passwordResetTokensTable.token,
        expiresAt: passwordResetTokensTable.expiresAt,
        used: passwordResetTokensTable.used,
        createdAt: passwordResetTokensTable.createdAt,
        userId: usersTable.id,
        userEmail: usersTable.email,
        userName: usersTable.name,
      })
      .from(passwordResetTokensTable)
      .innerJoin(usersTable, eq(passwordResetTokensTable.userId, usersTable.id))
      .where(
        and(
          eq(passwordResetTokensTable.used, false),
          gt(passwordResetTokensTable.expiresAt, new Date())
        )
      )
      .orderBy(passwordResetTokensTable.createdAt);

    const masked = resets.map(({ token, ...rest }) => ({
      ...rest,
      tokenHint: `${token.slice(0, 6)}${"*".repeat(10)}`,
    }));

    res.json({ resets: masked });
  } catch (err) {
    console.error("Get password resets error:", err);
    res.status(500).json({ error: "Failed to get password resets" });
  }
});

router.get("/psychology-analytics", async (_req, res) => {
  try {
    const allTrades = await db
      .select({
        behaviorTag: tradesTable.behaviorTag,
        entryTime: tradesTable.entryTime,
        createdAt: tradesTable.createdAt,
      })
      .from(tradesTable)
      .where(eq(tradesTable.isDraft, false));

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);

    const BEHAVIOR_LABELS = ["Disciplined", "FOMO", "Chased", "Greedy"] as const;

    const allTimeCounts: Record<string, number> = { Disciplined: 0, FOMO: 0, Chased: 0, Greedy: 0, Untagged: 0 };
    const weekCounts: Record<string, number> = { Disciplined: 0, FOMO: 0, Chased: 0, Greedy: 0, Untagged: 0 };

    let totalTrades = 0;
    let weekTrades = 0;
    let killZoneTotal = 0;
    let killZoneCompliant = 0;
    let weekKillZoneTotal = 0;
    let weekKillZoneCompliant = 0;

    function parseEntryTimeMins(entryTime: string | null): number | null {
      if (!entryTime) return null;
      const m = entryTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!m) return null;
      let h = parseInt(m[1]);
      const min = parseInt(m[2]);
      const period = m[3].toUpperCase();
      if (period === "PM" && h !== 12) h += 12;
      if (period === "AM" && h === 12) h = 0;
      return h * 60 + min;
    }

    function inKillZone(totalMins: number): boolean {
      return (
        totalMins >= 20 * 60 ||
        totalMins < 2 * 60 ||
        (totalMins >= 2 * 60 && totalMins < 5 * 60) ||
        (totalMins >= 7 * 60 && totalMins < 10 * 60) ||
        (totalMins >= 10 * 60 && totalMins < 12 * 60) ||
        (totalMins >= 13 * 60 + 30 && totalMins < 16 * 60)
      );
    }

    for (const trade of allTrades) {
      totalTrades++;
      const tag = BEHAVIOR_LABELS.find(l => l === trade.behaviorTag) ?? "Untagged";
      allTimeCounts[tag]++;

      const tradeMins = parseEntryTimeMins(trade.entryTime);
      if (tradeMins !== null) {
        killZoneTotal++;
        if (inKillZone(tradeMins)) killZoneCompliant++;
      }

      const tradeDate = trade.createdAt ? new Date(trade.createdAt) : null;
      if (tradeDate && tradeDate >= weekStart) {
        weekTrades++;
        weekCounts[tag]++;
        if (tradeMins !== null) {
          weekKillZoneTotal++;
          if (inKillZone(tradeMins)) weekKillZoneCompliant++;
        }
      }
    }

    const topWeekLeak = BEHAVIOR_LABELS.filter(l => l !== "Disciplined")
      .map(l => ({ tag: l, count: weekCounts[l] }))
      .sort((a, b) => b.count - a.count)[0];

    res.json({
      allTime: { counts: allTimeCounts, total: totalTrades },
      week: { counts: weekCounts, total: weekTrades },
      killZoneCompliance: {
        allTime: killZoneTotal > 0 ? Math.round((killZoneCompliant / killZoneTotal) * 100) : null,
        week: weekKillZoneTotal > 0 ? Math.round((weekKillZoneCompliant / weekKillZoneTotal) * 100) : null,
        allTimeParsed: killZoneTotal,
        weekParsed: weekKillZoneTotal,
      },
      topWeekLeak: topWeekLeak && topWeekLeak.count > 0 ? topWeekLeak : null,
    });
  } catch (err) {
    console.error("Psychology analytics error:", err);
    res.status(500).json({ error: "Failed to fetch psychology analytics" });
  }
});

export default router;
