import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { tradesTable } from "@workspace/db";
import { eq, desc, gte, lte, and, type SQL } from "drizzle-orm";
import { authRequired, tierRequired } from "../../middleware/auth";
import { ai } from "@workspace/integrations-gemini-ai";

const router: IRouter = Router();

router.get("/", authRequired, tierRequired(2), async (req, res) => {
  try {
    const userId = req.user!.userId;
    const trades = await db
      .select()
      .from(tradesTable)
      .where(eq(tradesTable.userId, userId))
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

router.get("/export/csv", authRequired, tierRequired(2), async (req, res) => {
  try {
    const rawQuery = req.query as Record<string, string | string[] | undefined>;
    const dateFrom = typeof rawQuery.dateFrom === "string" ? rawQuery.dateFrom : undefined;
    const dateTo = typeof rawQuery.dateTo === "string" ? rawQuery.dateTo : undefined;
    const outcome = typeof rawQuery.outcome === "string" ? rawQuery.outcome : undefined;

    const userId = req.user!.userId;
    const conditions: SQL[] = [
      eq(tradesTable.isDraft, false),
      eq(tradesTable.userId, userId),
    ];
    if (dateFrom) conditions.push(gte(tradesTable.createdAt, new Date(dateFrom)));
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      conditions.push(lte(tradesTable.createdAt, to));
    }
    if (outcome) conditions.push(eq(tradesTable.outcome, outcome));

    const trades = await db
      .select()
      .from(tradesTable)
      .where(and(...conditions))
      .orderBy(desc(tradesTable.createdAt));

    const stripModePrefix = (notes: string | null) => {
      if (!notes) return "";
      return notes.replace(/^\[(Conservative|Silver Bullet)\]\s*/, "").trim();
    };

    const escapeCsv = (value: string | number | boolean | null | undefined): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      "date",
      "instrument",
      "direction",
      "entry_price",
      "exit_price",
      "size",
      "pnl",
      "rr_achieved",
      "setup_score",
      "tags",
      "notes",
    ];

    const rows = trades.map((t) => [
      t.createdAt ? new Date(t.createdAt).toISOString().split("T")[0] : "",
      t.pair,
      t.sideDirection === "BUY" ? "long" : t.sideDirection === "SELL" ? "short" : (t.sideDirection ?? ""),
      "",
      "",
      "",
      t.outcome ?? "",
      "",
      t.setupScore !== null && t.setupScore !== undefined ? t.setupScore : "",
      t.behaviorTag ?? "",
      stripModePrefix(t.notes),
    ]);

    const csv = [
      headers.join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ].join("\n");

    const exportDate = new Date().toISOString().split("T")[0];
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="trades-${exportDate}.csv"`);
    res.send(csv);
  } catch (err) {
    console.error("CSV export error:", err);
    res.status(500).json({ error: "Failed to export trades" });
  }
});

router.post("/", authRequired, tierRequired(2), async (req, res) => {
  try {
    const userId = req.user!.userId;
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
      setupType,
    } = req.body;

    if (!pair || !entryTime || riskPct === undefined) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }

    const [trade] = await db
      .insert(tradesTable)
      .values({
        userId,
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
        setupType: setupType || null,
      })
      .returning();

    res.status(201).json({ ...trade, riskPct: parseFloat(trade.riskPct) });
  } catch (err) {
    console.error("[POST /trades] Failed to create trade:", err);
    res.status(500).json({ error: "Failed to create trade" });
  }
});

// FIX #3: ownership check — only the trade owner can get coaching
router.post("/:id/coach", authRequired, tierRequired(2), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: "Invalid trade ID" });
      return;
    }
    const userId = req.user!.userId;
    const [trade] = await db
      .select()
      .from(tradesTable)
      .where(and(eq(tradesTable.id, id), eq(tradesTable.userId, userId)));
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

// FIX #1: scope DELETE /all to only the authenticated user's own trades
router.delete("/all", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    await db.delete(tradesTable).where(eq(tradesTable.userId, userId));
    res.json({ message: "All your trades deleted" });
  } catch {
    res.status(500).json({ error: "Failed to delete trades" });
  }
});

// FIX #2: ownership check — only the trade owner can delete it
router.delete("/:id", authRequired, tierRequired(2), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id <= 0) {
      res.status(400).json({ error: "Invalid trade ID" });
      return;
    }
    const userId = req.user!.userId;
    const result = await db
      .delete(tradesTable)
      .where(and(eq(tradesTable.id, id), eq(tradesTable.userId, userId)))
      .returning({ id: tradesTable.id });
    if (result.length === 0) {
      res.status(404).json({ error: "Trade not found" });
      return;
    }
    res.status(204).end();
  } catch {
    res.status(500).json({ error: "Failed to delete trade" });
  }
});

export default router;
