import { Router, type IRouter } from "express";
import { db, tradesTable, usersTable, userSubscriptionsTable, subscriptionTiersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { authRequired } from "../../middleware/auth";

const router: IRouter = Router();

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
    const { ticker, side, price, symbol } = req.body;

    const [user] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.webhookToken, token));

    if (!user) {
      res.status(401).json({ error: "Invalid webhook token" });
      return;
    }

    const resolvedTicker = ticker || symbol || "NQ1!";
    const resolvedSide = (side || "BUY").toUpperCase();
    const resolvedPrice = parseFloat(price) || 0;

    const [draft] = await db
      .insert(tradesTable)
      .values({
        userId: user.id,
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
