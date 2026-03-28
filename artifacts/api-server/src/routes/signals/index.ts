import { Router } from "express";
import { db, tradesTable, plannerEntriesTable } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { authRequired } from "../../middleware/auth";

const router = Router();

interface FvgCache {
  data: FvgResult;
  expiresAt: number;
}

interface FvgResult {
  direction: "bullish" | "bearish" | "none";
  level: number;
  instrument: string;
  detected_at: string;
}

const fvgCache = new Map<string, FvgCache>();

function detectFvg(candles: Array<{ open: number; high: number; low: number; close: number }>): { direction: "bullish" | "bearish" | "none"; level: number } {
  if (candles.length < 3) return { direction: "none", level: 0 };

  const [c1, , c3] = candles.slice(-3);

  if (c3.low > c1.high) {
    const level = (c1.high + c3.low) / 2;
    return { direction: "bullish", level };
  }

  if (c3.high < c1.low) {
    const level = (c1.low + c3.high) / 2;
    return { direction: "bearish", level };
  }

  return { direction: "none", level: 0 };
}

function generateSimulatedCandles(instrument: string, count: number = 5): Array<{ open: number; high: number; low: number; close: number }> {
  const basePrice: Record<string, number> = {
    "NQ": 21000,
    "ES": 5800,
    "NQ1!": 21000,
    "ES1!": 5800,
    "EURUSD": 1.085,
    "GBPUSD": 1.265,
    "default": 5800,
  };

  const base = basePrice[instrument] ?? basePrice["default"];
  const volatility = base * 0.003;

  const now = Date.now();
  const seed = Math.floor(now / (15 * 1000));

  const candles: Array<{ open: number; high: number; low: number; close: number }> = [];
  let price = base;

  for (let i = 0; i < count; i++) {
    const pseudoRandom = Math.sin((seed + i) * 9301 + 49297) * 0.5 + 0.5;
    const direction = pseudoRandom > 0.5 ? 1 : -1;
    const bodySize = volatility * (0.3 + pseudoRandom * 0.7);
    const wickSize = volatility * 0.2;

    const open = price;
    const close = open + direction * bodySize;
    const high = Math.max(open, close) + wickSize;
    const low = Math.min(open, close) - wickSize;

    candles.push({ open, high, low, close });
    price = close;
  }

  return candles;
}

router.get("/fvg", authRequired, async (req, res) => {
  try {
    const instrument = (req.query.instrument as string) || "NQ";
    const cacheKey = instrument;
    const now = Date.now();

    const cached = fvgCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      res.json(cached.data);
      return;
    }

    const candles = generateSimulatedCandles(instrument, 5);
    const { direction, level } = detectFvg(candles);

    const result: FvgResult = {
      direction,
      level: parseFloat(level.toFixed(2)),
      instrument,
      detected_at: new Date().toISOString(),
    };

    fvgCache.set(cacheKey, { data: result, expiresAt: now + 15 * 1000 });

    res.json(result);
  } catch (err) {
    console.error("FVG signal error:", err);
    res.status(500).json({ error: "Failed to get FVG signal" });
  }
});

function getKillZoneStatus(): { active: boolean; name: string | null } {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const est = new Date(utc + -5 * 3600000);
  const h = est.getHours();
  const m = est.getMinutes();
  const mins = h * 60 + m;

  const zones = [
    { name: "London", start: 2 * 60, end: 5 * 60 },
    { name: "NY Open", start: 9 * 60 + 30, end: 10 * 60 },
    { name: "Silver Bullet", start: 10 * 60, end: 11 * 60 },
    { name: "London Close", start: 11 * 60, end: 12 * 60 },
  ];

  const active = zones.find((z) => mins >= z.start && mins < z.end);
  return { active: !!active, name: active?.name ?? null };
}

function hasHighImpactNewsSoon(): boolean {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const est = new Date(utc + -5 * 3600000);
  const h = est.getHours();
  const m = est.getMinutes();
  const mins = h * 60 + m;

  const highImpactTimes = [8 * 60 + 30, 10 * 60, 14 * 60];

  for (const t of highImpactTimes) {
    if (mins >= t - 15 && mins <= t + 5) return true;
  }
  return false;
}

const confidenceCache = new Map<string, { data: ConfidenceResult; expiresAt: number }>();

interface ConfidenceFactor {
  label: string;
  met: boolean;
}

interface ConfidenceResult {
  score: number;
  factors: ConfidenceFactor[];
}

router.get("/confidence", authRequired, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const instrument = (req.query.instrument as string) || "NQ";
    const cacheKey = `${userId}-${instrument}`;
    const now = Date.now();

    const cached = confidenceCache.get(cacheKey);
    if (cached && cached.expiresAt > now) {
      res.json(cached.data);
      return;
    }

    const killZone = getKillZoneStatus();
    const hasNews = hasHighImpactNewsSoon();

    const candles = generateSimulatedCandles(instrument, 5);
    const { direction: fvgDirection } = detectFvg(candles);
    const fvgPresent = fvgDirection !== "none";

    let htfBias: string | null = null;
    try {
      const today = new Date().toISOString().split("T")[0];
      const [entry] = await db
        .select()
        .from(plannerEntriesTable)
        .where(and(eq(plannerEntriesTable.userId, userId), eq(plannerEntriesTable.date, today)))
        .limit(1);

      if (entry) {
        const data = JSON.parse(entry.data);
        htfBias = data?.tradePlan?.bias || data?.bias || null;
      }
    } catch {
      htfBias = null;
    }

    const htfConfirmed = htfBias !== null && htfBias !== "" && htfBias !== "neutral";

    const factors: ConfidenceFactor[] = [
      {
        label: `Kill Zone: ${killZone.active ? `Active (${killZone.name})` : "Not Active"}`,
        met: killZone.active,
      },
      {
        label: fvgPresent
          ? `FVG: ${fvgDirection === "bullish" ? "Bullish" : "Bearish"} FVG found`
          : "FVG: No imbalance detected",
        met: fvgPresent,
      },
      {
        label: hasNews ? "News: High-impact news in next 15 min — WAIT" : "News: Clear",
        met: !hasNews,
      },
      {
        label: htfConfirmed
          ? `HTF Bias: ${htfBias ? htfBias.charAt(0).toUpperCase() + htfBias.slice(1) : ""} confirmed`
          : "HTF Bias: Not set in today's plan",
        met: htfConfirmed,
      },
    ];

    const metCount = factors.filter((f) => f.met).length;
    const score = Math.round((metCount / factors.length) * 100);

    const result: ConfidenceResult = { score, factors };

    confidenceCache.set(cacheKey, { data: result, expiresAt: now + 15 * 1000 });

    res.json(result);
  } catch (err) {
    console.error("Confidence signal error:", err);
    res.status(500).json({ error: "Failed to get confidence score" });
  }
});

export default router;
