import { Router } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable, userSubscriptionsTable, subscriptionTiersTable, adminSettingsTable } from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { signToken, authRequired, setAuthCookie } from "../../middleware/auth";

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

router.post("/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      res.status(400).json({ error: "Email, password, and name are required" });
      return;
    }

    if (typeof password !== "string" || password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
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
    const founderLimit = founderLimitSetting.length > 0 ? parseInt(founderLimitSetting[0].value) : 20;

    const [founderCountResult] = await db.select({ count: count() }).from(usersTable).where(eq(usersTable.isFounder, true));
    const currentFounderCount = founderCountResult.count;
    const [userCountResult] = await db.select({ count: count() }).from(usersTable);
    const currentUserCount = userCountResult.count;
    const isFounder = currentFounderCount < founderLimit;
    const founderNumber = isFounder ? currentFounderCount + 1 : null;

    const ADMIN_EMAIL = "alexcalvin.ac@gmail.com";
    const isAdmin = currentUserCount === 0 || normalizedEmail === ADMIN_EMAIL;

    const [user] = await db.insert(usersTable).values({
      email: normalizedEmail,
      passwordHash,
      name: name.trim(),
      role: isAdmin ? "admin" : "user",
      isFounder,
      founderNumber,
    }).returning();

    const freeTier = await db.select().from(subscriptionTiersTable).where(eq(subscriptionTiersTable.level, 0));
    if (freeTier.length > 0) {
      const founderDiscountMonthsSetting = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "founder_discount_months"));
      const founderDiscountMonths = founderDiscountMonthsSetting.length > 0 ? parseInt(founderDiscountMonthsSetting[0].value) : 6;
      const founderDiscountEndsAt = isFounder ? new Date(Date.now() + founderDiscountMonths * 30 * 24 * 60 * 60 * 1000) : null;

      await db.insert(userSubscriptionsTable).values({
        userId: user.id,
        tierId: freeTier[0].id,
        status: "active",
        billingCycle: "monthly",
        founderDiscount: isFounder,
        founderDiscountEndsAt,
      });
    }

    const token = signToken({ userId: user.id, email: user.email });
    setAuthCookie(res, token);

    res.status(201).json({
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

router.post("/login", async (req, res) => {
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
      },
      subscription: subscription[0] || null,
    });
  } catch (err) {
    console.error("Get me error:", err);
    res.status(500).json({ error: "Failed to get user info" });
  }
});

router.post("/logout", (_req, res) => {
  res.clearCookie("token", { path: "/" });
  res.json({ success: true });
});

export default router;
