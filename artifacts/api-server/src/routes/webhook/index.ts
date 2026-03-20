import { Router, type IRouter } from "express";
import { db, tradesTable, usersTable, userSubscriptionsTable, subscriptionTiersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authRequired } from "../../middleware/auth";

const router: IRouter = Router();

function getETHour(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hourPart = parts.find((p) => p.type === "hour");
  const minutePart = parts.find((p) => p.type === "minute");
  const hour = parseInt(hourPart?.value ?? "0", 10);
  const minute = parseInt(minutePart?.value ?? "0", 10);
  return hour + minute / 60;
}

function detectSession(date: Date): string {
  const etHour = getETHour(date);
  if (etHour >= 9.5 && etHour < 10.5) return "NY Open";
  if (etHour >= 10.0 && etHour < 11.0) return "Silver Bullet";
  if (etHour >= 2.0 && etHour < 5.0) return "London Open";
  return "";
}

function calculateRiskPct(entryPrice: number, sl: number, side: string): number | null {
  if (!entryPrice || !sl || entryPrice === sl) return null;
  const riskPoints = Math.abs(entryPrice - sl);
  const riskPct = (riskPoints / entryPrice) * 100;
  return Math.round(riskPct * 100) / 100;
}

router.get("/tradingview/info", authRequired, async (req, res) => {
  try {
    const isAdmin = req.user?.role === "admin";

    if (!isAdmin) {
      const sub = await db
        .select({ tierLevel: subscriptionTiersTable.level })
        .from(userSubscriptionsTable)
        .innerJoin(subscriptionTiersTable, eq(userSubscriptionsTable.tierId, subscriptionTiersTable.id))
        .where(eq(userSubscriptionsTable.userId, req.user!.userId))
        .limit(1);

      if (!sub.length || sub[0].tierLevel < 2) {
        res.status(403).json({ error: "Premium subscription required" });
        return;
      }
    }

    const [user] = await db
      .select({ webhookToken: usersTable.webhookToken })
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId));

    if (!user || !user.webhookToken) {
      res.status(404).json({ error: "Webhook token not found" });
      return;
    }

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || req.get("host") || "localhost";
    const protocol = domain.includes("localhost") ? "http" : "https";
    const webhookUrl = `${protocol}://${domain}/api/webhook/tradingview/${user.webhookToken}`;

    res.json({ webhookUrl, webhookToken: user.webhookToken });
  } catch (err) {
    console.error("Get webhook info error:", err);
    res.status(500).json({ error: "Failed to get webhook info" });
  }
});

router.post("/tradingview/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const { ticker, side, price, symbol, sl, tp, session, timestamp, timenow } = req.body;

    const [userRow] = await db
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.webhookToken, token));

    if (!userRow) {
      res.status(401).json({ error: "Invalid webhook token" });
      return;
    }

    const isAdmin = userRow.role === "admin";
    if (!isAdmin) {
      const sub = await db
        .select({ tierLevel: subscriptionTiersTable.level })
        .from(userSubscriptionsTable)
        .innerJoin(subscriptionTiersTable, eq(userSubscriptionsTable.tierId, subscriptionTiersTable.id))
        .where(eq(userSubscriptionsTable.userId, userRow.id))
        .limit(1);

      if (!sub.length || sub[0].tierLevel < 2) {
        res.status(403).json({ error: "Premium subscription required to use webhook alerts" });
        return;
      }
    }

    const resolvedTicker = ticker || symbol || "NQ1!";
    const resolvedSide = (side || "BUY").toUpperCase();
    const resolvedPrice = price ? parseFloat(price) : null;
    const resolvedSl = sl ? parseFloat(sl) : null;
    const resolvedTp = tp ? parseFloat(tp) : null;

    const payloadTimestamp = timestamp || timenow;
    const parsedAlertTime = payloadTimestamp ? new Date(payloadTimestamp) : null;
    const safeAlertTime = parsedAlertTime && !isNaN(parsedAlertTime.getTime()) ? parsedAlertTime : new Date();
    const detectedSession = session || detectSession(safeAlertTime);

    let autoRiskPct: number | null = null;
    if (resolvedPrice && resolvedSl) {
      autoRiskPct = calculateRiskPct(resolvedPrice, resolvedSl, resolvedSide);
    }

    const entryTimeStr = safeAlertTime.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
      timeZone: "America/New_York",
    });

    const [draft] = await db
      .insert(tradesTable)
      .values({
        userId: userRow.id,
        pair: resolvedTicker,
        entryTime: entryTimeStr,
        riskPct: (autoRiskPct ?? 0.5).toString(),
        liquiditySweep: false,
        isDraft: true,
        ticker: resolvedTicker,
        sideDirection: resolvedSide,
        entryPrice: resolvedPrice ? resolvedPrice.toString() : undefined,
        tradingSession: detectedSession || undefined,
        notes: undefined,
        stopLoss: resolvedSl ? resolvedSl.toString() : undefined,
        takeProfit: resolvedTp ? resolvedTp.toString() : undefined,
      })
      .returning();

    res.json({
      success: true,
      draftId: draft.id,
      message: "Draft trade created from TradingView alert",
      session: detectedSession,
      riskPct: autoRiskPct,
    });
  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).json({ error: "Failed to process webhook" });
  }
});

export default router;
