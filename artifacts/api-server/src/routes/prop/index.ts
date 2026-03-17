import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { propAccountTable } from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";
import { authRequired } from "../../middleware/auth";

const router: IRouter = Router();

function getUserFilter(userId: number | undefined) {
  if (userId) {
    return eq(propAccountTable.userId, userId);
  }
  return isNull(propAccountTable.userId);
}

router.get("/account", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const [account] = await db
      .select()
      .from(propAccountTable)
      .where(getUserFilter(userId))
      .limit(1);
    if (!account) {
      res.status(404).json({ error: "No account found" });
      return;
    }
    res.json({
      id: account.id,
      startingBalance: parseFloat(account.startingBalance),
      currentBalance: parseFloat(account.currentBalance),
      dailyLoss: parseFloat(account.dailyLoss),
      totalDrawdown: parseFloat(account.totalDrawdown),
      maxDailyLossPct: parseFloat(account.maxDailyLossPct),
      maxTotalDrawdownPct: parseFloat(account.maxTotalDrawdownPct),
      updatedAt: account.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get account" });
  }
});

router.post("/account", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { startingBalance, maxDailyLossPct = 2, maxTotalDrawdownPct = 5 } = req.body;
    if (!startingBalance || startingBalance <= 0) {
      res.status(400).json({ error: "Invalid balance" });
      return;
    }

    const existing = await db
      .select()
      .from(propAccountTable)
      .where(getUserFilter(userId))
      .limit(1);

    let account;
    if (existing.length > 0) {
      const [updated] = await db
        .update(propAccountTable)
        .set({
          startingBalance: startingBalance.toString(),
          currentBalance: startingBalance.toString(),
          dailyLoss: "0",
          totalDrawdown: "0",
          maxDailyLossPct: maxDailyLossPct.toString(),
          maxTotalDrawdownPct: maxTotalDrawdownPct.toString(),
          updatedAt: new Date(),
        })
        .where(eq(propAccountTable.id, existing[0].id))
        .returning();
      account = updated;
    } else {
      const [created] = await db
        .insert(propAccountTable)
        .values({
          userId,
          startingBalance: startingBalance.toString(),
          currentBalance: startingBalance.toString(),
          dailyLoss: "0",
          totalDrawdown: "0",
          maxDailyLossPct: maxDailyLossPct.toString(),
          maxTotalDrawdownPct: maxTotalDrawdownPct.toString(),
        })
        .returning();
      account = created;
    }

    res.json({
      id: account.id,
      startingBalance: parseFloat(account.startingBalance),
      currentBalance: parseFloat(account.currentBalance),
      dailyLoss: parseFloat(account.dailyLoss),
      totalDrawdown: parseFloat(account.totalDrawdown),
      maxDailyLossPct: parseFloat(account.maxDailyLossPct),
      maxTotalDrawdownPct: parseFloat(account.maxTotalDrawdownPct),
      updatedAt: account.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to save account" });
  }
});

router.post("/account/daily-loss", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { amount } = req.body;
    if (amount === undefined || amount === null) {
      res.status(400).json({ error: "Amount required" });
      return;
    }
    const numericAmount = typeof amount === "number" ? amount : parseFloat(amount);
    if (!isFinite(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ error: "Amount must be a positive number" });
      return;
    }

    const [existing] = await db
      .select()
      .from(propAccountTable)
      .where(getUserFilter(userId))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "No account found" });
      return;
    }

    const currentDailyLoss = parseFloat(existing.dailyLoss) + numericAmount;
    const newBalance = parseFloat(existing.currentBalance) - numericAmount;
    const totalDrawdown = parseFloat(existing.startingBalance) - newBalance;

    const [updated] = await db
      .update(propAccountTable)
      .set({
        dailyLoss: currentDailyLoss.toString(),
        currentBalance: newBalance.toString(),
        totalDrawdown: Math.max(0, totalDrawdown).toString(),
        updatedAt: new Date(),
      })
      .where(eq(propAccountTable.id, existing.id))
      .returning();

    res.json({
      id: updated.id,
      startingBalance: parseFloat(updated.startingBalance),
      currentBalance: parseFloat(updated.currentBalance),
      dailyLoss: parseFloat(updated.dailyLoss),
      totalDrawdown: parseFloat(updated.totalDrawdown),
      maxDailyLossPct: parseFloat(updated.maxDailyLossPct),
      maxTotalDrawdownPct: parseFloat(updated.maxTotalDrawdownPct),
      updatedAt: updated.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to update" });
  }
});

router.post("/account/reset-daily", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const [existing] = await db
      .select()
      .from(propAccountTable)
      .where(getUserFilter(userId))
      .limit(1);
    if (!existing) {
      res.status(404).json({ error: "No account found" });
      return;
    }

    const [updated] = await db
      .update(propAccountTable)
      .set({ dailyLoss: "0", updatedAt: new Date() })
      .where(eq(propAccountTable.id, existing.id))
      .returning();

    res.json({
      id: updated.id,
      startingBalance: parseFloat(updated.startingBalance),
      currentBalance: parseFloat(updated.currentBalance),
      dailyLoss: parseFloat(updated.dailyLoss),
      totalDrawdown: parseFloat(updated.totalDrawdown),
      maxDailyLossPct: parseFloat(updated.maxDailyLossPct),
      maxTotalDrawdownPct: parseFloat(updated.maxTotalDrawdownPct),
      updatedAt: updated.updatedAt,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to reset" });
  }
});

export default router;
