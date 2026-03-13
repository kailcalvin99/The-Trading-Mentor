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
  } catch (err) {
    res.status(500).json({ error: "Failed to list trades" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { pair, entryTime, riskPct, liquiditySweep, outcome, notes } = req.body;
    if (!pair || !entryTime || riskPct === undefined || liquiditySweep === undefined) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    const [trade] = await db
      .insert(tradesTable)
      .values({
        pair,
        entryTime,
        riskPct: riskPct.toString(),
        liquiditySweep,
        outcome: outcome || null,
        notes: notes || null,
      })
      .returning();
    res.status(201).json({ ...trade, riskPct: parseFloat(trade.riskPct) });
  } catch (err) {
    res.status(500).json({ error: "Failed to create trade" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(tradesTable).where(eq(tradesTable.id, id));
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: "Failed to delete trade" });
  }
});

export default router;
