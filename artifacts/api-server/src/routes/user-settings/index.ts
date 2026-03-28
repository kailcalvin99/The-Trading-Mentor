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

    let academyProgress: string[] = [];
    if (user.academyProgress) {
      try { academyProgress = JSON.parse(user.academyProgress); } catch {}
    }

    let routineTimes: Record<string, string> | null = null;
    if (user.routineTimes) {
      try { routineTimes = JSON.parse(user.routineTimes); } catch {}
    }

    let widgetPrefs: Record<string, boolean> | null = null;
    if (user.widgetPrefs) {
      try { widgetPrefs = JSON.parse(user.widgetPrefs); } catch {}
    }

    let tradingRules: string[] | null = null;
    if (user.tradingRules) {
      try { tradingRules = JSON.parse(user.tradingRules); } catch {}
    }

    res.json({
      profile: {
        name: user.name,
        email: user.email,
        bio: user.bio || "",
        twitterHandle: user.twitterHandle || "",
        discordHandle: user.discordHandle || "",
        isPublic: user.isPublic ?? false,
        avatarUrl: user.avatarUrl || null,
      },
      tradingDefaults: {
        defaultSession: user.defaultSession || "",
        preferredEntryStyle: user.preferredEntryStyle || "",
        defaultPairs: user.defaultPairs || "",
        defaultRiskPct: user.defaultRiskPct || "0.5",
      },
      riskRules: {
        startingBalance: propAccount ? parseFloat(propAccount.startingBalance) : 50000,
        maxDailyLossPct: propAccount ? parseFloat(propAccount.maxDailyLossPct) : 2,
        maxTotalDrawdownPct: propAccount ? parseFloat(propAccount.maxTotalDrawdownPct) : 10,
      },
      gamification: {
        totalXp: user.totalXp ?? 0,
        loginStreak: user.loginStreak ?? 0,
        lastLoginDate: user.lastLoginDate || null,
      },
      academyProgress,
      routineTimes,
      widgetPrefs,
      tradingRules,
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

    if (section === "socialProfile") {
      const socialUpdates: Partial<{
        bio: string | null;
        twitterHandle: string | null;
        discordHandle: string | null;
        isPublic: boolean;
        avatarUrl: string | null;
      }> = {};

      if (data.bio !== undefined) {
        const bio = typeof data.bio === "string" ? data.bio.slice(0, 160).trim() : null;
        socialUpdates.bio = bio || null;
      }
      if (data.twitterHandle !== undefined) {
        const handle = typeof data.twitterHandle === "string" ? data.twitterHandle.trim().replace(/^@/, "").slice(0, 64) : null;
        socialUpdates.twitterHandle = handle || null;
      }
      if (data.discordHandle !== undefined) {
        const handle = typeof data.discordHandle === "string" ? data.discordHandle.trim().slice(0, 64) : null;
        socialUpdates.discordHandle = handle || null;
      }
      if (data.isPublic !== undefined) {
        socialUpdates.isPublic = Boolean(data.isPublic);
      }
      if (data.avatarUrl !== undefined) {
        // FIX #9: reject dangerous URL schemes to prevent stored XSS via avatar
        const rawUrl = typeof data.avatarUrl === "string" ? data.avatarUrl.trim() : null;
        if (rawUrl) {
          const lower = rawUrl.toLowerCase();
          if (lower.startsWith("javascript:") || (lower.startsWith("data:") && !lower.startsWith("data:image/"))) {
            res.status(400).json({ error: "Invalid avatar URL" });
            return;
          }
        }
        socialUpdates.avatarUrl = rawUrl || null;
      }

      if (Object.keys(socialUpdates).length > 0) {
        await db.update(usersTable).set(socialUpdates).where(eq(usersTable.id, userId));
      }

      res.json({ success: true, message: "Profile updated successfully" });
      return;
    }

    if (section === "profile") {
      const profileUpdates: Partial<{
        name: string;
        email: string;
        passwordHash: string;
        bio: string | null;
        twitterHandle: string | null;
        discordHandle: string | null;
        isPublic: boolean;
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
        if (typeof data.newPassword !== "string" || data.newPassword.length < 8) {
          res.status(400).json({ error: "New password must be at least 8 characters" });
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

      if (data.bio !== undefined) {
        profileUpdates.bio = typeof data.bio === "string" ? (data.bio.trim() || null) : null;
      }
      if (data.twitterHandle !== undefined) {
        const handle = (data.twitterHandle || "").replace(/^@/, "").trim();
        profileUpdates.twitterHandle = handle || null;
      }
      if (data.discordHandle !== undefined) {
        profileUpdates.discordHandle = (data.discordHandle || "").trim() || null;
      }
      if (data.isPublic !== undefined) {
        profileUpdates.isPublic = Boolean(data.isPublic);
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
        defaultRiskPct: string | null;
      }> = {};
      if (data.defaultSession !== undefined) tradingUpdates.defaultSession = data.defaultSession || null;
      if (data.preferredEntryStyle !== undefined) tradingUpdates.preferredEntryStyle = data.preferredEntryStyle || null;
      if (data.defaultPairs !== undefined) tradingUpdates.defaultPairs = data.defaultPairs || null;
      if (data.defaultRiskPct !== undefined) {
        const val = parseFloat(data.defaultRiskPct);
        tradingUpdates.defaultRiskPct = (!isNaN(val) && val > 0 && val <= 100) ? val.toString() : null;
      }

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

    if (section === "avatar") {
      const { avatarUrl } = data;
      if (avatarUrl !== null && typeof avatarUrl !== "string") {
        res.status(400).json({ error: "avatarUrl must be a string or null" });
        return;
      }
      // FIX #9: reject dangerous URL schemes
      if (avatarUrl) {
        const lower = avatarUrl.toLowerCase();
        if (lower.startsWith("javascript:") || (lower.startsWith("data:") && !lower.startsWith("data:image/"))) {
          res.status(400).json({ error: "Invalid avatar URL" });
          return;
        }
      }
      await db.update(usersTable).set({ avatarUrl: avatarUrl || null }).where(eq(usersTable.id, userId));
      res.json({ success: true, message: "Avatar updated successfully" });
      return;
    }

    if (section === "gamification") {
      const [currentUser] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
      if (!currentUser) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const updates: Record<string, number | string | null> = {};
      const currentXp = currentUser.totalXp ?? 0;
      const currentStreak = currentUser.loginStreak ?? 0;

      if (data.totalXp !== undefined && typeof data.totalXp === "number") {
        // FIX #7: cap XP to prevent self-inflation — max 500 XP gain per sync request
        const MAX_XP_GAIN_PER_REQUEST = 500;
        const newXp = Math.max(0, Math.floor(data.totalXp));
        updates.totalXp = Math.min(newXp, currentXp + MAX_XP_GAIN_PER_REQUEST);
      }
      if (data.loginStreak !== undefined && typeof data.loginStreak === "number") {
        // Allow streak to be set by client but cap to a sane maximum (365 days)
        updates.loginStreak = Math.max(0, Math.min(Math.floor(data.loginStreak), 365));
      }
      if (data.lastLoginDate !== undefined) {
        const dateStr = String(data.lastLoginDate || "");
        if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          updates.lastLoginDate = dateStr;
        } else if (dateStr) {
          const parsed = new Date(dateStr);
          if (!isNaN(parsed.getTime())) {
            updates.lastLoginDate = parsed.toISOString().split("T")[0];
          }
        } else {
          updates.lastLoginDate = null;
        }
      }

      if (Object.keys(updates).length > 0) {
        await db.update(usersTable).set(updates).where(eq(usersTable.id, userId));
      }
      res.json({ success: true, message: "Gamification updated successfully" });
      return;
    }

    if (section === "progress") {
      const { completedLessonIds } = data;
      if (!Array.isArray(completedLessonIds)) {
        res.status(400).json({ error: "completedLessonIds must be an array" });
        return;
      }
      const validated = completedLessonIds.filter(
        (id: unknown): id is string => typeof id === "string" && (id as string).length > 0
      );
      await db.update(usersTable).set({ academyProgress: JSON.stringify(validated) }).where(eq(usersTable.id, userId));
      res.json({ success: true, message: "Progress updated successfully" });
      return;
    }

    if (section === "routineTimes") {
      if (!data.times || typeof data.times !== "object") {
        res.status(400).json({ error: "times object is required" });
        return;
      }
      const serialized = JSON.stringify(data.times);
      if (serialized.length > 10_000) {
        res.status(400).json({ error: "Routine times data is too large" });
        return;
      }
      await db.update(usersTable).set({ routineTimes: serialized }).where(eq(usersTable.id, userId));
      res.json({ success: true, message: "Routine times updated successfully" });
      return;
    }

    if (section === "widgetPrefs") {
      if (!data.prefs || typeof data.prefs !== "object") {
        res.status(400).json({ error: "prefs object is required" });
        return;
      }
      const serialized = JSON.stringify(data.prefs);
      if (serialized.length > 10_000) {
        res.status(400).json({ error: "Widget preferences data is too large" });
        return;
      }
      await db.update(usersTable).set({ widgetPrefs: serialized }).where(eq(usersTable.id, userId));
      res.json({ success: true, message: "Widget preferences updated successfully" });
      return;
    }

    if (section === "tradingRules") {
      const { rules } = data;
      if (!Array.isArray(rules)) {
        res.status(400).json({ error: "rules must be an array" });
        return;
      }
      const validated = rules.filter(
        (r: unknown): r is string => typeof r === "string" && (r as string).trim().length > 0
      ).map((r: string) => r.trim().slice(0, 200));
      await db.update(usersTable).set({ tradingRules: JSON.stringify(validated) }).where(eq(usersTable.id, userId));
      res.json({ success: true, message: "Trading rules updated successfully" });
      return;
    }

    res.status(400).json({ error: "Invalid section. Use 'profile', 'socialProfile', 'tradingDefaults', 'riskRules', 'appMode', 'avatar', 'gamification', 'progress', 'routineTimes', 'widgetPrefs', or 'tradingRules'" });
  } catch (err) {
    console.error("Update user settings error:", err);
    res.status(500).json({ error: "Failed to update settings" });
  }
});

router.patch("/avatar", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const { avatarUrl } = req.body;
    if (avatarUrl !== undefined && avatarUrl !== null && typeof avatarUrl !== "string") {
      res.status(400).json({ error: "avatarUrl must be a string or null" });
      return;
    }
    // FIX #9: reject dangerous URL schemes
    if (avatarUrl) {
      const lower = avatarUrl.toLowerCase();
      if (lower.startsWith("javascript:") || (lower.startsWith("data:") && !lower.startsWith("data:image/"))) {
        res.status(400).json({ error: "Invalid avatar URL" });
        return;
      }
    }
    await db.update(usersTable).set({ avatarUrl: avatarUrl || null }).where(eq(usersTable.id, userId));
    res.json({ success: true, message: "Avatar updated successfully" });
  } catch (err) {
    console.error("Update avatar error:", err);
    res.status(500).json({ error: "Failed to update avatar" });
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
