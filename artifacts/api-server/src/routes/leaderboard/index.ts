import { Router, type IRouter } from "express";
import { db, tradesTable, usersTable, userSubscriptionsTable, subscriptionTiersTable } from "@workspace/db";
import { eq, and, not, sql } from "drizzle-orm";
import { authRequired } from "../../middleware/auth";

const router: IRouter = Router();

router.get("/", authRequired, async (req, res) => {
  try {
    const isAdmin = req.user?.role === "admin";

    if (!isAdmin) {
      const sub = await db
        .select({ tierLevel: subscriptionTiersTable.level })
        .from(userSubscriptionsTable)
        .innerJoin(subscriptionTiersTable, eq(userSubscriptionsTable.tierId, subscriptionTiersTable.id))
        .where(eq(userSubscriptionsTable.userId, req.user!.userId))
        .limit(1);

      if (!sub.length || sub[0].tierLevel < 2) {
        res.status(403).json({ error: "Premium subscription required" });
        return;
      }
    }

    const completedTrades = await db
      .select()
      .from(tradesTable)
      .where(and(not(tradesTable.isDraft), sql`${tradesTable.outcome} IS NOT NULL`));

    const userMap = new Map<number, {
      userId: number;
      wins: number;
      losses: number;
      total: number;
      disciplined: number;
    }>();

    for (const trade of completedTrades) {
      if (!userMap.has(trade.userId)) {
        userMap.set(trade.userId, { userId: trade.userId, wins: 0, losses: 0, total: 0, disciplined: 0 });
      }
      const entry = userMap.get(trade.userId)!;
      entry.total++;
      if (trade.outcome === "win") entry.wins++;
      if (trade.outcome === "loss") entry.losses++;
      if (trade.behaviorTag === "Disciplined") entry.disciplined++;
    }

    const userIds = Array.from(userMap.keys());
    if (userIds.length === 0) {
      res.json({ entries: [] });
      return;
    }

    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        isFounder: usersTable.isFounder,
        founderNumber: usersTable.founderNumber,
        isPublic: usersTable.isPublic,
        tierName: subscriptionTiersTable.name,
        tierLevel: subscriptionTiersTable.level,
      })
      .from(usersTable)
      .leftJoin(userSubscriptionsTable, eq(usersTable.id, userSubscriptionsTable.userId))
      .leftJoin(subscriptionTiersTable, eq(userSubscriptionsTable.tierId, subscriptionTiersTable.id))
      .where(eq(usersTable.isPublic, true));

    const userInfoMap = new Map(users.map((u) => [u.id, u]));

    const entries = Array.from(userMap.values())
      .filter((e) => e.total >= 1 && userInfoMap.has(e.userId))
      .map((e) => {
        const info = userInfoMap.get(e.userId)!;
        return {
          userId: e.userId,
          name: info.name,
          isFounder: info.isFounder,
          founderNumber: info.founderNumber,
          winRate: e.total > 0 ? (e.wins / e.total) * 100 : 0,
          totalTrades: e.total,
          disciplinedPct: e.total > 0 ? (e.disciplined / e.total) * 100 : 0,
          tierName: info.tierName || "Free",
          tierLevel: info.tierLevel || 0,
        };
      })
      .sort((a, b) => b.winRate - a.winRate)
      .map((e, i) => ({ ...e, rank: i + 1 }));

    res.json({ entries });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
});

export default router;
