import { Router, type IRouter } from "express";
import { db, tradesTable } from "@workspace/db";

const router: IRouter = Router();

router.post("/tradingview", async (req, res) => {
  try {
    const { ticker, side, price, symbol } = req.body;
    const resolvedTicker = ticker || symbol || "NQ1!";
    const resolvedSide = (side || "BUY").toUpperCase();
    const resolvedPrice = parseFloat(price) || 0;

    const [draft] = await db
      .insert(tradesTable)
      .values({
        pair: resolvedTicker,
        entryTime: new Date().toISOString(),
        riskPct: "0.5",
        liquiditySweep: false,
        isDraft: true,
        ticker: resolvedTicker,
        sideDirection: resolvedSide,
        notes: price ? `Auto-filled: ${resolvedSide} at ${resolvedPrice}` : undefined,
      })
      .returning();

    res.json({ success: true, draftId: draft.id, message: "Draft trade created from TradingView alert" });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

export default router;
