import { Router, type IRouter } from "express";
import { db, tradesTable, usersTable, userSubscriptionsTable, subscriptionTiersTable } from "@workspace/db";
import { eq, and, not, sql } from "drizzle-orm";
import { authRequired } from "../../middleware/auth";

const router: IRouter = Router();

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedEntries: object[] | null = null;
let cacheExpiresAt = 0;

async function buildLeaderboard() {
  const rows = await db
    .select({
      userId: tradesTable.userId,
      wins: sql<number>`COUNT(*) FILTER (WHERE ${tradesTable.outcome} = 'win')`.mapWith(Number),
      losses: sql<number>`COUNT(*) FILTER (WHERE ${tradesTable.outcome} = 'loss')`.mapWith(Number),
      total: sql<number>`COUNT(*)`.mapWith(Number),
      disciplined: sql<number>`COUNT(*) FILTER (WHERE ${tradesTable.behaviorTag} = 'Disciplined')`.mapWith(Number),
    })
    .from(tradesTable)
    .where(and(not(tradesTable.isDraft), sql`${tradesTable.outcome} IS NOT NULL`))
    .groupBy(tradesTable.userId);

  if (rows.length === 0) return [];

  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      isFounder: usersTable.isFounder,
      founderNumber: usersTable.founderNumber,
      tierName: subscriptionTiersTable.name,
      tierLevel: subscriptionTiersTable.level,
    })
    .from(usersTable)
    .leftJoin(userSubscriptionsTable, eq(usersTable.id, userSubscriptionsTable.userId))
    .leftJoin(subscriptionTiersTable, eq(userSubscriptionsTable.tierId, subscriptionTiersTable.id))
    .where(eq(usersTable.isPublic, true));

  const userInfoMap = new Map(users.map((u) => [u.id, u]));

  return rows
    .filter((r) => r.total >= 1 && userInfoMap.has(r.userId))
    .map((r) => {
      const info = userInfoMap.get(r.userId)!;
      return {
        userId: r.userId,
        name: info.name,
        isFounder: info.isFounder,
        founderNumber: info.founderNumber,
        winRate: r.total > 0 ? (r.wins / r.total) * 100 : 0,
        totalTrades: r.total,
        disciplinedPct: r.total > 0 ? (r.disciplined / r.total) * 100 : 0,
        tierName: info.tierName || "Free",
        tierLevel: info.tierLevel || 0,
      };
    })
    .sort((a, b) => b.winRate - a.winRate)
    .map((e, i) => ({ ...e, rank: i + 1 }));
}

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

    const now = Date.now();
    if (!cachedEntries || now > cacheExpiresAt) {
      cachedEntries = await buildLeaderboard();
      cacheExpiresAt = now + CACHE_TTL_MS;
    }

    res.setHeader("Cache-Control", "public, max-age=300");
    res.json({ entries: cachedEntries, cachedAt: new Date(cacheExpiresAt - CACHE_TTL_MS).toISOString() });
  } catch (err) {
    console.error("Leaderboard error:", err);
    res.status(500).json({ error: "Failed to load leaderboard" });
  }
});

export default router;
