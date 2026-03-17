import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tradesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { authRequired } from "../../middleware/auth";
import { ai } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();

router.get("/", authRequired, async (_req, res) => {
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

router.post("/", authRequired, async (req, res) => {
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
      setupScore,
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
        setupScore: setupScore ?? null,
      })
      .returning();

    res.status(201).json({ ...trade, riskPct: parseFloat(trade.riskPct) });
  } catch {
    res.status(500).json({ error: "Failed to create trade" });
  }
});

router.post("/:id/coach", authRequired, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: "Invalid trade ID" });
      return;
    }
    const [trade] = await db.select().from(tradesTable).where(eq(tradesTable.id, id));
    if (!trade) {
      res.status(404).json({ error: "Trade not found" });
      return;
    }
    if (trade.isDraft) {
      res.status(400).json({ error: "Cannot coach a draft trade" });
      return;
    }
    if (trade.coachFeedback) {
      res.json({ feedback: trade.coachFeedback });
      return;
    }

    const prompt = `You are an expert ICT (Inner Circle Trader) coach. Analyze this trade and provide a short, personalised critique in 3-5 sentences. First acknowledge what was done well, then give one specific critique based on ICT methodology, and finally one actionable tip for next time. Keep it supportive but honest. Use plain language.

Trade Data:
- Pair: ${trade.pair}
- Side: ${trade.sideDirection || "N/A"}
- Outcome: ${trade.outcome || "N/A"}
- Risk: ${trade.riskPct}%
- Entry Time: ${trade.entryTime}
- Liquidity Sweep: ${trade.liquiditySweep ? "Yes" : "No"}
- FVG Confirmation: ${trade.hasFvgConfirmation === true ? "Yes" : trade.hasFvgConfirmation === false ? "No" : "N/A"}
- Followed Time Rule (10-11 AM): ${trade.followedTimeRule === true ? "Yes" : trade.followedTimeRule === false ? "No" : "N/A"}
- Stress Level: ${trade.stressLevel ?? "N/A"}/10
- Behavior Tag: ${trade.behaviorTag || "N/A"}
- Notes: ${trade.notes || "None"}

Respond with ONLY the coaching feedback — no headers, no bullet points, just flowing sentences.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const feedback = response.text?.trim() || "";
    if (feedback) {
      await db.update(tradesTable).set({ coachFeedback: feedback }).where(eq(tradesTable.id, id));
    }

    res.json({ feedback });
  } catch (err) {
    console.error("Coach error:", err);
    res.status(500).json({ error: "Failed to generate coaching feedback" });
  }
});

router.delete("/all", authRequired, async (_req, res) => {
  try {
    await db.delete(tradesTable);
    res.json({ message: "All trades deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete trades" });
  }
});

router.delete("/:id", authRequired, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: "Invalid trade ID" });
      return;
    }
    await db.delete(tradesTable).where(eq(tradesTable.id, id));
    res.status(204).end();
  } catch {
    res.status(500).json({ error: "Failed to delete trade" });
  }
});

export default router;
