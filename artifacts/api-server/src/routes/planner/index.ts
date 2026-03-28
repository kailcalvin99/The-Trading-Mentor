import { Router } from "express";
import { db, plannerEntriesTable } from "@workspace/db";
import { eq, and, desc, gte, sql } from "drizzle-orm";
import { authRequired } from "../../middleware/auth";

const router = Router();

router.get("/", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const minDate = thirtyDaysAgo.toISOString().split("T")[0];

    const entries = await db
      .select()
      .from(plannerEntriesTable)
      .where(and(eq(plannerEntriesTable.userId, userId), gte(plannerEntriesTable.date, minDate)))
      .orderBy(desc(plannerEntriesTable.date))
      .limit(30);

    const result = entries.map((e) => ({
      date: e.date,
      data: JSON.parse(e.data),
    }));

    res.json({ entries: result });
  } catch (err) {
    console.error("Get planner entries error:", err);
    res.status(500).json({ error: "Failed to get planner entries" });
  }
});

router.get("/:date", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const date = req.params.date as string;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: "Date must be YYYY-MM-DD" });
      return;
    }

    const [entry] = await db
      .select()
      .from(plannerEntriesTable)
      .where(and(eq(plannerEntriesTable.userId, userId), eq(plannerEntriesTable.date, date)))
      .limit(1);

    if (entry) {
      res.json({ data: JSON.parse(entry.data) });
    } else {
      res.json({ data: {} });
    }
  } catch (err) {
    console.error("Get planner entry error:", err);
    res.status(500).json({ error: "Failed to get planner entry" });
  }
});

router.put("/:date", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const date = req.params.date as string;
    const { data } = req.body;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      res.status(400).json({ error: "Date must be YYYY-MM-DD" });
      return;
    }

    if (!data || typeof data !== "object") {
      res.status(400).json({ error: "data object is required" });
      return;
    }

    const dataStr = JSON.stringify(data);

    await db
      .insert(plannerEntriesTable)
      .values({ userId, date, data: dataStr })
      .onConflictDoUpdate({
        target: [plannerEntriesTable.userId, plannerEntriesTable.date],
        set: { data: dataStr },
      });

    res.json({ ok: true });
  } catch (err) {
    console.error("Upsert planner entry error:", err);
    res.status(500).json({ error: "Failed to save planner entry" });
  }
});

export default router;
