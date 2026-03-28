import { Router } from "express";
import { db, tradesTable } from "@workspace/db";
import { and, eq, or } from "drizzle-orm";
import { authRequired, tierRequired } from "../../middleware/auth";

const router = Router();

function getSessionForTime(entryTime: string): string {
  if (!entryTime) return "Other";
  const match = entryTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return "Other";
  let hour = parseInt(match[1]);
  const period = match[3]?.toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  const mins = hour * 60 + parseInt(match[2]);
  if (mins >= 2 * 60 && mins < 7 * 60) return "London";
  if (mins >= 8 * 60 && mins < 10 * 60) return "London/NY Overlap";
  if (mins >= 10 * 60 && mins < 11 * 60) return "NY Kill Zone";
  if (mins >= 11 * 60 && mins < 13 * 60) return "NY Lunch";
  if (mins >= 13 * 60 && mins < 15 * 60) return "NY Afternoon";
  return "Other";
}

function isHighNewsDay(dateStr: string): boolean {
  const d = new Date(dateStr);
  const day = d.getDay();
  return day === 3 || day === 5;
}

router.get("/ict-breakdown", authRequired, tierRequired(2), async (req, res) => {
  try {
    const userId = req.user!.userId;

    const trades = await db
      .select()
      .from(tradesTable)
      .where(
        and(
          eq(tradesTable.userId, userId),
          eq(tradesTable.isDraft, false),
          or(eq(tradesTable.outcome, "win"), eq(tradesTable.outcome, "loss"))
        )
      );

    const sessionMap: Record<string, { wins: number; losses: number; totalR: number }> = {};

    for (const t of trades) {
      const session = getSessionForTime(t.entryTime);
      if (!sessionMap[session]) {
        sessionMap[session] = { wins: 0, losses: 0, totalR: 0 };
      }
      if (t.outcome === "win") {
        sessionMap[session].wins++;
        sessionMap[session].totalR += parseFloat(t.riskPct);
      } else if (t.outcome === "loss") {
        sessionMap[session].losses++;
        sessionMap[session].totalR -= parseFloat(t.riskPct);
      }
    }

    const sessionPerformance = Object.entries(sessionMap)
      .map(([session, data]) => {
        const total = data.wins + data.losses;
        return {
          session,
          wins: data.wins,
          losses: data.losses,
          total,
          winRate: total > 0 ? Math.round((data.wins / total) * 100) : 0,
          avgR: total > 0 ? parseFloat((data.totalR / total).toFixed(2)) : 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    const fvgTrades = trades.filter((t) => t.hasFvgConfirmation === true);
    const fvgTp = fvgTrades.filter((t) => t.outcome === "win").length;
    const fvgSl = fvgTrades.filter((t) => t.outcome === "loss").length;

    const newsDayTrades = trades.filter((t) => t.createdAt && isHighNewsDay(t.createdAt.toString()));
    const cleanDayTrades = trades.filter((t) => t.createdAt && !isHighNewsDay(t.createdAt.toString()));

    const newsDayWins = newsDayTrades.filter((t) => t.outcome === "win").length;
    const cleanDayWins = cleanDayTrades.filter((t) => t.outcome === "win").length;

    const newsDayWinRate = newsDayTrades.length > 0 ? Math.round((newsDayWins / newsDayTrades.length) * 100) : 0;
    const cleanDayWinRate = cleanDayTrades.length > 0 ? Math.round((cleanDayWins / cleanDayTrades.length) * 100) : 0;

    res.json({
      sessionPerformance,
      fvgHitRate: {
        total: fvgTrades.length,
        tp: fvgTp,
        sl: fvgSl,
        hitRate: fvgTrades.length > 0 ? Math.round((fvgTp / fvgTrades.length) * 100) : 0,
      },
      newsDayImpact: {
        newsDay: {
          total: newsDayTrades.length,
          wins: newsDayWins,
          winRate: newsDayWinRate,
        },
        cleanDay: {
          total: cleanDayTrades.length,
          wins: cleanDayWins,
          winRate: cleanDayWinRate,
        },
      },
    });
  } catch (err) {
    console.error("ICT analytics error:", err);
    res.status(500).json({ error: "Failed to get ICT analytics" });
  }
});

export default router;
