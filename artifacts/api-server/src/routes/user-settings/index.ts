import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, propAccountTable, cooldownEventsTable } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { authRequired } from "../../middleware/auth";

const router = Router();

function getUserPropFilter(userId: number) {
  return eq(propAccountTable.userId, userId);
}

router.get("/", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const [propAccount] = await db
      .select()
      .from(propAccountTable)
      .where(getUserPropFilter(userId))
      .limit(1);

    res.json({
      profile: {
        name: user.name,
        email: user.email,
      },
      tradingDefaults: {
        defaultSession: user.defaultSession || "",
        preferredEntryStyle: user.preferredEntryStyle || "",
        defaultPairs: user.defaultPairs || "",
      },
      riskRules: {
        startingBalance: propAccount ? parseFloat(propAccount.startingBalance) : 50000,
        maxDailyLossPct: propAccount ? parseFloat(propAccount.maxDailyLossPct) : 2,
        maxTotalDrawdownPct: propAccount ? parseFloat(propAccount.maxTotalDrawdownPct) : 10,
      },
    });
  } catch (err) {
    console.error("Get user settings error:", err);
    res.status(500).json({ error: "Failed to get settings" });
  }
});

router.patch("/", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { section, data } = req.body;

    if (!section || !data) {
      res.status(400).json({ error: "Section and data are required" });
      return;
    }

    if (section === "profile") {
      const profileUpdates: Partial<{
        name: string;
        email: string;
        passwordHash: string;
      }> = {};

      if (data.name && typeof data.name === "string" && data.name.trim()) {
        profileUpdates.name = data.name.trim();
      }

      if (data.email && typeof data.email === "string") {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
          res.status(400).json({ error: "Invalid email format" });
          return;
        }
        const normalizedEmail = data.email.toLowerCase().trim();
        const existing = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
        if (existing.length > 0 && existing[0].id !== userId) {
          res.status(409).json({ error: "Email already in use" });
          return;
        }
        profileUpdates.email = normalizedEmail;
      }

      if (data.currentPassword && data.newPassword) {
        if (typeof data.newPassword !== "string" || data.newPassword.length < 6) {
          res.status(400).json({ error: "New password must be at least 6 characters" });
          return;
        }
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
        if (!user) {
          res.status(404).json({ error: "User not found" });
          return;
        }
        const valid = await bcrypt.compare(data.currentPassword, user.passwordHash);
        if (!valid) {
          res.status(400).json({ error: "Current password is incorrect" });
          return;
        }
        profileUpdates.passwordHash = await bcrypt.hash(data.newPassword, 12);
      }

      if (Object.keys(profileUpdates).length > 0) {
        await db.update(usersTable).set(profileUpdates).where(eq(usersTable.id, userId));
      }

      res.json({ success: true, message: "Profile updated successfully" });
      return;
    }

    if (section === "tradingDefaults") {
      const tradingUpdates: Partial<{
        defaultSession: string | null;
        preferredEntryStyle: string | null;
        defaultPairs: string | null;
      }> = {};
      if (data.defaultSession !== undefined) tradingUpdates.defaultSession = data.defaultSession || null;
      if (data.preferredEntryStyle !== undefined) tradingUpdates.preferredEntryStyle = data.preferredEntryStyle || null;
      if (data.defaultPairs !== undefined) tradingUpdates.defaultPairs = data.defaultPairs || null;

      if (Object.keys(tradingUpdates).length > 0) {
        await db.update(usersTable).set(tradingUpdates).where(eq(usersTable.id, userId));
      }

      res.json({ success: true, message: "Trading defaults updated successfully" });
      return;
    }

    if (section === "riskRules") {
      const startingBalance = parseFloat(data.startingBalance);
      const maxDailyLossPct = parseFloat(data.maxDailyLossPct);
      const maxTotalDrawdownPct = parseFloat(data.maxTotalDrawdownPct);

      if (isNaN(startingBalance) || startingBalance <= 0) {
        res.status(400).json({ error: "Starting balance must be a positive number" });
        return;
      }
      if (isNaN(maxDailyLossPct) || maxDailyLossPct <= 0 || maxDailyLossPct > 100) {
        res.status(400).json({ error: "Max daily loss % must be between 0 and 100" });
        return;
      }
      if (isNaN(maxTotalDrawdownPct) || maxTotalDrawdownPct <= 0 || maxTotalDrawdownPct > 100) {
        res.status(400).json({ error: "Max total drawdown % must be between 0 and 100" });
        return;
      }

      const [existing] = await db
        .select()
        .from(propAccountTable)
        .where(getUserPropFilter(userId))
        .limit(1);

      if (existing) {
        const balanceChanged = parseFloat(existing.startingBalance) !== startingBalance;
        const updateData: Record<string, string | Date> = {
          maxDailyLossPct: maxDailyLossPct.toString(),
          maxTotalDrawdownPct: maxTotalDrawdownPct.toString(),
          updatedAt: new Date(),
        };
        if (balanceChanged) {
          updateData.startingBalance = startingBalance.toString();
          updateData.currentBalance = startingBalance.toString();
        }
        await db
          .update(propAccountTable)
          .set(updateData)
          .where(eq(propAccountTable.id, existing.id));
      } else {
        await db.insert(propAccountTable).values({
          userId,
          startingBalance: startingBalance.toString(),
          currentBalance: startingBalance.toString(),
          dailyLoss: "0",
          totalDrawdown: "0",
          maxDailyLossPct: maxDailyLossPct.toString(),
          maxTotalDrawdownPct: maxTotalDrawdownPct.toString(),
        });
      }

      res.json({ success: true, message: "Risk rules updated successfully" });
      return;
    }

    if (section === "appMode") {
      const { mode } = data;
      if (mode !== "full" && mode !== "lite") {
        res.status(400).json({ error: "Mode must be 'full' or 'lite'" });
        return;
      }
      await db.update(usersTable).set({ appMode: mode }).where(eq(usersTable.id, userId));
      res.json({ success: true, message: "App mode updated successfully" });
      return;
    }

    res.status(400).json({ error: "Invalid section. Use 'profile', 'tradingDefaults', 'riskRules', or 'appMode'" });
  } catch (err) {
    console.error("Update user settings error:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

router.post("/cooldown-event", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { eventType, triggerTags, durationSeconds } = req.body;
    if (!eventType || typeof eventType !== "string") {
      return res.status(400).json({ error: "eventType is required" });
    }
    await db.insert(cooldownEventsTable).values({
      userId,
      eventType,
      triggerTags: triggerTags || null,
      durationSeconds: durationSeconds || 300,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("Log cooldown event error:", err);
    res.status(500).json({ error: "Failed to log cooldown event" });
  }
});

export default router;
