import { Router } from "express";
import {
  db,
  communityPostsTable,
  communityRepliesTable,
  postLikesTable,
  communitySubscriptionsTable,
  usersTable,
  tradesTable,
} from "@workspace/db";
import { eq, desc, and, sql, count, isNotNull, gt, inArray } from "drizzle-orm";
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
        authorIsPublic: usersTable.isPublic,
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

    const result = posts.map((p) => {
      const isAnon = !p.authorIsPublic && p.userId !== userId;
      return {
        ...p,
        authorName: isAnon ? "Anonymous" : p.authorName,
        authorIsFounder: isAnon ? false : p.authorIsFounder,
        authorFounderNumber: isAnon ? null : p.authorFounderNumber,
        authorRole: isAnon ? "user" : p.authorRole,
        liked: likedPostIds.includes(p.id),
      };
    });

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
        authorIsPublic: usersTable.isPublic,
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
        authorIsPublic: usersTable.isPublic,
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

    const postIsAnon = !post.authorIsPublic && post.userId !== userId;
    const anonymizedPost = {
      ...post,
      authorName: postIsAnon ? "Anonymous" : post.authorName,
      authorIsFounder: postIsAnon ? false : post.authorIsFounder,
      authorFounderNumber: postIsAnon ? null : post.authorFounderNumber,
      authorRole: postIsAnon ? "user" : post.authorRole,
    };

    const anonymizedReplies = replies.map((r) => {
      const isAnon = !r.authorIsPublic && r.userId !== userId;
      return {
        ...r,
        authorName: isAnon ? "Anonymous" : r.authorName,
        authorIsFounder: isAnon ? false : r.authorIsFounder,
        authorFounderNumber: isAnon ? null : r.authorFounderNumber,
        authorRole: isAnon ? "user" : r.authorRole,
      };
    });

    res.json({ ...anonymizedPost, liked: !!like, replies: anonymizedReplies });
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

router.get("/subscriptions", async (req, res) => {
  try {
    const userId = req.user!.userId;
    const subs = await db
      .select({ category: communitySubscriptionsTable.category })
      .from(communitySubscriptionsTable)
      .where(eq(communitySubscriptionsTable.userId, userId));
    res.json({ subscribed: subs.map((s) => s.category) });
  } catch (err) {
    console.error("GET /community/subscriptions error:", err);
    res.status(500).json({ error: "Failed to fetch subscriptions" });
  }
});

router.post("/subscriptions/toggle", async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { category } = req.body;
    const validCategories = ["strategy-talk", "daily-wins", "indicators", "trade-reviews", "wins", "questions", "general"];
    if (!validCategories.includes(category)) {
      res.status(400).json({ error: "Invalid category" });
      return;
    }

    const [existing] = await db
      .select()
      .from(communitySubscriptionsTable)
      .where(and(eq(communitySubscriptionsTable.userId, userId), eq(communitySubscriptionsTable.category, category)));

    if (existing) {
      await db
        .delete(communitySubscriptionsTable)
        .where(and(eq(communitySubscriptionsTable.userId, userId), eq(communitySubscriptionsTable.category, category)));
      res.json({ subscribed: false, category });
    } else {
      await db
        .insert(communitySubscriptionsTable)
        .values({ userId, category })
        .onConflictDoNothing();
      res.json({ subscribed: true, category });
    }
  } catch (err) {
    console.error("POST /community/subscriptions/toggle error:", err);
    res.status(500).json({ error: "Failed to toggle subscription" });
  }
});

router.get("/new-count", async (req, res) => {
  try {
    const userId = req.user!.userId;
    const since = req.query.since ? new Date(req.query.since as string) : new Date(Date.now() - 24 * 3600 * 1000);

    const subs = await db
      .select({ category: communitySubscriptionsTable.category })
      .from(communitySubscriptionsTable)
      .where(eq(communitySubscriptionsTable.userId, userId));

    const subscribedCategories = subs.map((s) => s.category);

    if (subscribedCategories.length === 0) {
      res.json({ count: 0 });
      return;
    }

    const [{ total }] = await db
      .select({ total: count() })
      .from(communityPostsTable)
      .where(
        and(
          gt(communityPostsTable.createdAt, since),
          inArray(communityPostsTable.category, subscribedCategories),
        ),
      );

    res.json({ count: total });
  } catch {
    res.json({ count: 0 });
  }
});

function computeLongestWinStreak(outcomes: string[]): number {
  let max = 0;
  let current = 0;
  for (const o of outcomes) {
    if (o === "win") {
      current++;
      if (current > max) max = current;
    } else {
      current = 0;
    }
  }
  return max;
}

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
      .where(and(eq(tradesTable.isDraft, false), eq(usersTable.isPublic, true)))
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
        createdAt: tradesTable.createdAt,
      })
      .from(tradesTable)
      .innerJoin(usersTable, eq(tradesTable.userId, usersTable.id))
      .where(and(eq(tradesTable.isDraft, false), isNotNull(tradesTable.outcome), eq(usersTable.isPublic, true)))
      .orderBy(tradesTable.userId, tradesTable.createdAt);

    type UserStat = {
      name: string;
      isFounder: boolean;
      founderNumber: number | null;
      wins: number;
      total: number;
      outcomes: string[];
    };

    const statMap: Record<number, UserStat> = {};
    for (const t of allTrades) {
      if (!t.userId) continue;
      if (!statMap[t.userId]) {
        statMap[t.userId] = {
          name: t.name,
          isFounder: t.isFounder,
          founderNumber: t.founderNumber,
          wins: 0,
          total: 0,
          outcomes: [],
        };
      }
      statMap[t.userId].total++;
      if (t.outcome === "win") statMap[t.userId].wins++;
      if (t.outcome) statMap[t.userId].outcomes.push(t.outcome);
    }

    const byWinRate = Object.entries(statMap)
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

    const byStreak = Object.entries(statMap)
      .filter(([, v]) => v.total >= 3)
      .map(([userId, v]) => ({
        userId: parseInt(userId),
        name: v.name,
        isFounder: v.isFounder,
        founderNumber: v.founderNumber,
        streak: computeLongestWinStreak(v.outcomes),
        total: v.total,
      }))
      .filter((e) => e.streak > 0)
      .sort((a, b) => b.streak - a.streak)
      .slice(0, 5);

    res.json({ byTradeCount, byWinRate, byStreak });
  } catch (err) {
    console.error("GET /community/leaderboard error:", err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

export default router;
