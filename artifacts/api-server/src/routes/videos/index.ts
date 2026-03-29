import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { videoWatchedTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authRequired } from "../../middleware/auth";

const router: IRouter = Router();

router.get("/watched", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const rows = await db
      .select({ videoId: videoWatchedTable.videoId })
      .from(videoWatchedTable)
      .where(eq(videoWatchedTable.userId, userId));
    const unique = [...new Set(rows.map((r) => r.videoId))];
    res.json({ watchedIds: unique });
  } catch {
    res.status(500).json({ error: "Failed to fetch watched videos" });
  }
});

router.post("/watched", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { videoId } = req.body;
    if (!videoId || typeof videoId !== "string") {
      res.status(400).json({ error: "videoId is required" });
      return;
    }

    await db
      .insert(videoWatchedTable)
      .values({ userId, videoId })
      .onConflictDoNothing();

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to mark video as watched" });
  }
});

router.delete("/watched/:videoId", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const videoId = String(req.params.videoId);
    await db
      .delete(videoWatchedTable)
      .where(and(eq(videoWatchedTable.userId, userId), eq(videoWatchedTable.videoId, videoId)));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to unmark video" });
  }
});

export default router;
