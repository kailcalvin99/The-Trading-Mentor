import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tradesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (_req, res) => {
  try {
    const trades = await db
      .select()
      .from(tradesTable)
      .orderBy(desc(tradesTable.createdAt));
    res.json(
      trades.map((t) => ({
        ...t,
        riskPct: parseFloat(t.riskPct),
      }))
    );
  } catch {
    res.status(500).json({ error: "Failed to list trades" });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      pair,
      entryTime,
      riskPct,
      liquiditySweep,
      outcome,
      notes,
      behaviorTag,
      followedTimeRule,
      hasFvgConfirmation,
      stressLevel,
      isDraft,
      ticker,
      sideDirection,
    } = req.body;

    if (!pair || !entryTime || riskPct === undefined) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const [trade] = await db
      .insert(tradesTable)
      .values({
        pair,
        entryTime,
        riskPct: riskPct.toString(),
        liquiditySweep: liquiditySweep ?? false,
        outcome: outcome || null,
        notes: notes || null,
        behaviorTag: behaviorTag || null,
        followedTimeRule: followedTimeRule ?? null,
        hasFvgConfirmation: hasFvgConfirmation ?? null,
        stressLevel: stressLevel ?? null,
        isDraft: isDraft ?? false,
        ticker: ticker || null,
        sideDirection: sideDirection || null,
      })
      .returning();

    res.status(201).json({ ...trade, riskPct: parseFloat(trade.riskPct) });
  } catch {
    res.status(500).json({ error: "Failed to create trade" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(tradesTable).where(eq(tradesTable.id, id));
    res.status(204).end();
  } catch {
    res.status(500).json({ error: "Failed to delete trade" });
  }
});

export default router;
