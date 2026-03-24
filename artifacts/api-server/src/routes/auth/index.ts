import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { db, usersTable, userSubscriptionsTable, subscriptionTiersTable, adminSettingsTable, passwordResetTokensTable } from "@workspace/db";
import { eq, count, and, gt } from "drizzle-orm";
import { signToken, authRequired, setAuthCookie, clearAuthCookie } from "../../middleware/auth";

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many login attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Too many reset requests. Please try again in 1 hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

// FIX #5: rate limit registration to prevent bot account creation
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { error: "Too many registration attempts. Please try again in 1 hour." },
  standardHeaders: true,
  legacyHeaders: false,
});

// FIX #14: rate limit the reset-password consumption endpoint
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many reset attempts. Please try again in 15 minutes." },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();

router.get("/setup-status", async (_req, res) => {
  try {
    const result = await db.select({ total: count() }).from(usersTable);
    const totalUsers = result[0]?.total ?? 0;
    res.json({ needsSetup: totalUsers === 0 });
  } catch (err) {
    console.error("Setup status error:", err);
    res.json({ needsSetup: false });
  }
});

router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: "Email, password, and name are required" });
      return;
    }

    // FIX #15: raise minimum password length to 8 characters
    if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const founderLimitSetting = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "founder_limit"));
    // FIX #16: bounds-check founder limit — must be a positive integer
    const rawFounderLimit = founderLimitSetting.length > 0 ? parseInt(founderLimitSetting[0].value) : 20;
    const founderLimit = Number.isFinite(rawFounderLimit) && rawFounderLimit > 0 ? rawFounderLimit : 20;

    const [founderCountResult] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.isFounder, true));
    const currentFounderCount = founderCountResult.count;
    const [userCountResult] = await db.select({ count: count() }).from(usersTable);
    const currentUserCount = userCountResult.count;
    const isFounder = currentFounderCount < founderLimit;
    const founderNumber = isFounder ? currentFounderCount + 1 : null;

    // FIX #4: read admin email from environment variable — never hardcode personal emails
    const adminEmail = (process.env.ADMIN_EMAIL || "").toLowerCase().trim();
    const isAdmin = currentUserCount === 0 || (adminEmail !== "" && normalizedEmail === adminEmail);

    const [user] = await db.insert(usersTable).values({
      email: normalizedEmail,
      passwordHash,
      name: name.trim(),
      role: isAdmin ? "admin" : "user",
      isFounder,
      founderNumber,
    }).returning();

    const defaultTier = await db.select().from(subscriptionTiersTable).where(eq(subscriptionTiersTable.level, 1));
    if (defaultTier.length > 0) {
      const founderDiscountMonthsSetting = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "founder_discount_months"));
      const founderDiscountMonths = founderDiscountMonthsSetting.length > 0 ? parseInt(founderDiscountMonthsSetting[0].value) : 6;
      const founderDiscountEndsAt = isFounder ? new Date(Date.now() + founderDiscountMonths * 30 * 24 * 60 * 60 * 1000) : null;

      await db.insert(userSubscriptionsTable).values({
        userId: user.id,
        tierId: defaultTier[0].id,
        status: "active",
        billingCycle: "monthly",
        founderDiscount: isFounder,
        founderDiscountEndsAt,
      });
    }

    const token = signToken({ userId: user.id, email: user.email });
    setAuthCookie(res, token);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isFounder: user.isFounder,
        founderNumber: user.founderNumber,
      },
      isFounder,
      founderNumber,
    });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase().trim()));
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    await db.update(usersTable).set({ lastLoginAt: new Date() }).where(eq(usersTable.id, user.id));

    const token = signToken({ userId: user.id, email: user.email });
    setAuthCookie(res, token);

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isFounder: user.isFounder,
        founderNumber: user.founderNumber,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", authRequired, async (req, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.user!.userId));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const subscription = await db
      .select({
        id: userSubscriptionsTable.id,
        tierId: userSubscriptionsTable.tierId,
        status: userSubscriptionsTable.status,
        billingCycle: userSubscriptionsTable.billingCycle,
        founderDiscount: userSubscriptionsTable.founderDiscount,
        founderDiscountEndsAt: userSubscriptionsTable.founderDiscountEndsAt,
        customMonthlyPrice: userSubscriptionsTable.customMonthlyPrice,
        customAnnualPrice: userSubscriptionsTable.customAnnualPrice,
        startDate: userSubscriptionsTable.startDate,
        endDate: userSubscriptionsTable.endDate,
        tierName: subscriptionTiersTable.name,
        tierLevel: subscriptionTiersTable.level,
        tierFeatures: subscriptionTiersTable.features,
      })
      .from(userSubscriptionsTable)
      .innerJoin(subscriptionTiersTable, eq(userSubscriptionsTable.tierId, subscriptionTiersTable.id))
      .where(eq(userSubscriptionsTable.userId, user.id))
      .orderBy(userSubscriptionsTable.id)
      .limit(1);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isFounder: user.isFounder,
        founderNumber: user.founderNumber,
        appMode: user.appMode || "full",
        avatarUrl: user.avatarUrl || null,
      },
      subscription: subscription[0] || null,
    });
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ error: "Failed to get user info" });
  }
});

router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ success: true });
});

router.post("/forgot-password", forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.json({ success: true });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, normalizedEmail));

    if (!user) {
      res.json({ success: true });
      return;
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await db.insert(passwordResetTokensTable).values({
      userId: user.id,
      token,
      expiresAt,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ error: "Failed to process request" });
  }
});

// FIX #14: reset-password now has a rate limiter
router.post("/reset-password", resetPasswordLimiter, async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({ error: "Token and password are required" });
      return;
    }

    // FIX #15: enforce 8-character minimum consistently
    if (typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const [resetRecord] = await db
      .select()
      .from(passwordResetTokensTable)
      .where(
        and(
          eq(passwordResetTokensTable.token, token),
          eq(passwordResetTokensTable.used, false),
          gt(passwordResetTokensTable.expiresAt, new Date())
        )
      );

    if (!resetRecord) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await db.update(usersTable)
      .set({ passwordHash })
      .where(eq(usersTable.id, resetRecord.userId));

    await db.update(passwordResetTokensTable)
      .set({ used: true })
      .where(eq(passwordResetTokensTable.userId, resetRecord.userId));

    res.json({ success: true });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ error: "Failed to reset password" });
  }
});

export default router;
