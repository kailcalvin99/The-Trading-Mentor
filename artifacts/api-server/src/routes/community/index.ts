import { Router } from "express";
import { db, communityPostsTable, communityRepliesTable, postLikesTable, usersTable, tradesTable } from "@workspace/db";
import { eq, desc, and, sql, count, isNotNull, gt } from "drizzle-orm";
import { authRequired } from "../../middleware/auth";

const router = Router();

router.use(authRequired);

router.get("/posts", async (req, res) => {
  try {
    const category = req.query.category as string | undefined;
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const offset = (page - 1) * limit;

    let query = db
      .select({
        id: communityPostsTable.id,
        userId: communityPostsTable.userId,
        category: communityPostsTable.category,
        title: communityPostsTable.title,
        body: communityPostsTable.body,
        likeCount: communityPostsTable.likeCount,
        replyCount: communityPostsTable.replyCount,
        createdAt: communityPostsTable.createdAt,
        authorName: usersTable.name,
        authorRole: usersTable.role,
        authorIsFounder: usersTable.isFounder,
        authorFounderNumber: usersTable.founderNumber,
      })
      .from(communityPostsTable)
      .innerJoin(usersTable, eq(communityPostsTable.userId, usersTable.id))
      .orderBy(desc(communityPostsTable.createdAt))
      .limit(limit)
      .offset(offset)
      .$dynamic();

    if (category && category !== "all") {
      query = query.where(eq(communityPostsTable.category, category));
    }

    const posts = await query;

    const userId = req.user!.userId;
    let likedPostIds: number[] = [];
    if (posts.length > 0) {
      const likes = await db
        .select({ postId: postLikesTable.postId })
        .from(postLikesTable)
        .where(eq(postLikesTable.userId, userId));
      likedPostIds = likes.map((l) => l.postId);
    }

    const result = posts.map((p) => ({
      ...p,
      liked: likedPostIds.includes(p.id),
    }));

    res.json({ posts: result, page, limit, hasMore: posts.length === limit });
  } catch (err) {
    console.error("GET /community/posts error:", err);
    res.status(500).json({ error: "Failed to fetch posts" });
  }
});

router.post("/posts", async (req, res) => {
  try {
    const { title, body, category } = req.body;
    if (!title || !body) {
      res.status(400).json({ error: "Title and body are required" });
      return;
    }

    const validCategories = ["strategy-talk", "daily-wins", "indicators", "trade-reviews", "wins", "questions", "general"];
    const cat = validCategories.includes(category) ? category : "general";

    const [post] = await db
      .insert(communityPostsTable)
      .values({
        userId: req.user!.userId,
        title: title.slice(0, 200),
        body: body.slice(0, 5000),
        category: cat,
      })
      .returning();

    res.json(post);
  } catch (err) {
    console.error("POST /community/posts error:", err);
    res.status(500).json({ error: "Failed to create post" });
  }
});

router.get("/posts/:id", async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) {
      res.status(400).json({ error: "Invalid post ID" });
      return;
    }

    const [post] = await db
      .select({
        id: communityPostsTable.id,
        userId: communityPostsTable.userId,
        category: communityPostsTable.category,
        title: communityPostsTable.title,
        body: communityPostsTable.body,
        likeCount: communityPostsTable.likeCount,
        replyCount: communityPostsTable.replyCount,
        createdAt: communityPostsTable.createdAt,
        authorName: usersTable.name,
        authorRole: usersTable.role,
        authorIsFounder: usersTable.isFounder,
        authorFounderNumber: usersTable.founderNumber,
      })
      .from(communityPostsTable)
      .innerJoin(usersTable, eq(communityPostsTable.userId, usersTable.id))
      .where(eq(communityPostsTable.id, postId));

    if (!post) {
      res.status(404).json({ error: "Post not found" });
      return;
    }

    const replies = await db
      .select({
        id: communityRepliesTable.id,
        postId: communityRepliesTable.postId,
        userId: communityRepliesTable.userId,
        body: communityRepliesTable.body,
        createdAt: communityRepliesTable.createdAt,
        authorName: usersTable.name,
        authorRole: usersTable.role,
        authorIsFounder: usersTable.isFounder,
        authorFounderNumber: usersTable.founderNumber,
      })
      .from(communityRepliesTable)
      .innerJoin(usersTable, eq(communityRepliesTable.userId, usersTable.id))
      .where(eq(communityRepliesTable.postId, postId))
      .orderBy(communityRepliesTable.createdAt);

    const userId = req.user!.userId;
    const [like] = await db
      .select()
      .from(postLikesTable)
      .where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, userId)));

    res.json({ ...post, liked: !!like, replies });
  } catch (err) {
    console.error("GET /community/posts/:id error:", err);
    res.status(500).json({ error: "Failed to fetch post" });
  }
});

router.post("/posts/:id/replies", async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) {
      res.status(400).json({ error: "Invalid post ID" });
      return;
    }

    const { body } = req.body;
    if (!body) {
      res.status(400).json({ error: "Body is required" });
      return;
    }

    const [postExists] = await db
      .select({ id: communityPostsTable.id })
      .from(communityPostsTable)
      .where(eq(communityPostsTable.id, postId));

    if (!postExists) {
      res.status(404).json({ error: "Post not found" });
      return;
    }
    const [reply] = await db
      .insert(communityRepliesTable)
      .values({
        postId,
        userId: req.user!.userId,
        body: body.slice(0, 5000),
      })
      .returning();

    await db
      .update(communityPostsTable)
      .set({ replyCount: sql`${communityPostsTable.replyCount} + 1` })
      .where(eq(communityPostsTable.id, postId));

    res.json(reply);
  } catch (err) {
    console.error("POST /community/posts/:id/replies error:", err);
    res.status(500).json({ error: "Failed to create reply" });
  }
});

router.post("/posts/:id/like", async (req, res) => {
  try {
    const postId = parseInt(req.params.id, 10);
    if (isNaN(postId)) {
      res.status(400).json({ error: "Invalid post ID" });
      return;
    }

    const userId = req.user!.userId;

    const [existing] = await db
      .select()
      .from(postLikesTable)
      .where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, userId)));

    if (existing) {
      await db
        .delete(postLikesTable)
        .where(and(eq(postLikesTable.postId, postId), eq(postLikesTable.userId, userId)));
    } else {
      await db.insert(postLikesTable).values({ postId, userId }).onConflictDoNothing();
    }

    const [{ total }] = await db
      .select({ total: count() })
      .from(postLikesTable)
      .where(eq(postLikesTable.postId, postId));

    await db
      .update(communityPostsTable)
      .set({ likeCount: total })
      .where(eq(communityPostsTable.id, postId));

    res.json({ liked: !existing });
  } catch (err) {
    console.error("POST /community/posts/:id/like error:", err);
    res.status(500).json({ error: "Failed to toggle like" });
  }
});

router.get("/new-count", async (req, res) => {
  try {
    const since = req.query.since ? new Date(req.query.since as string) : new Date(Date.now() - 24 * 3600 * 1000);
    const [{ total }] = await db
      .select({ total: count() })
      .from(communityPostsTable)
      .where(gt(communityPostsTable.createdAt, since));
    res.json({ count: total });
  } catch {
    res.json({ count: 0 });
  }
});

router.get("/leaderboard", async (req, res) => {
  try {
    const byTradeCount = await db
      .select({
        userId: tradesTable.userId,
        name: usersTable.name,
        isFounder: usersTable.isFounder,
        founderNumber: usersTable.founderNumber,
        tradeCount: count(tradesTable.id),
      })
      .from(tradesTable)
      .innerJoin(usersTable, eq(tradesTable.userId, usersTable.id))
      .where(eq(tradesTable.isDraft, false))
      .groupBy(tradesTable.userId, usersTable.name, usersTable.isFounder, usersTable.founderNumber)
      .orderBy(desc(count(tradesTable.id)))
      .limit(5);

    const allTrades = await db
      .select({
        userId: tradesTable.userId,
        name: usersTable.name,
        isFounder: usersTable.isFounder,
        founderNumber: usersTable.founderNumber,
        outcome: tradesTable.outcome,
      })
      .from(tradesTable)
      .innerJoin(usersTable, eq(tradesTable.userId, usersTable.id))
      .where(and(eq(tradesTable.isDraft, false), isNotNull(tradesTable.outcome)));

    const winRateMap: Record<number, { name: string; isFounder: boolean; founderNumber: number | null; wins: number; total: number }> = {};
    for (const t of allTrades) {
      if (!t.userId) continue;
      if (!winRateMap[t.userId]) winRateMap[t.userId] = { name: t.name, isFounder: t.isFounder, founderNumber: t.founderNumber, wins: 0, total: 0 };
      winRateMap[t.userId].total++;
      if (t.outcome === "win") winRateMap[t.userId].wins++;
    }

    const byWinRate = Object.entries(winRateMap)
      .filter(([, v]) => v.total >= 3)
      .map(([userId, v]) => ({
        userId: parseInt(userId),
        name: v.name,
        isFounder: v.isFounder,
        founderNumber: v.founderNumber,
        winRate: Math.round((v.wins / v.total) * 100),
        total: v.total,
      }))
      .sort((a, b) => b.winRate - a.winRate)
      .slice(0, 5);

    res.json({ byTradeCount, byWinRate });
  } catch (err) {
    console.error("GET /community/leaderboard error:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

export default router;
