import { Router, type Request, type Response } from "express";
import { authRequired } from "../../middleware/auth";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

const router = Router();

const SYMBOL_MAP: Record<string, string> = {
  "EUR/USD": "EURUSD=X",
  "GBP/USD": "GBPUSD=X",
  "GBP/JPY": "GBPJPY=X",
  "NAS100": "NQ=F",
  "US30": "YM=F",
  "XAU/USD": "GC=F",
};

type SupportedInterval = "1m" | "5m" | "15m" | "1H" | "4H" | "Daily";

type YahooChartInterval =
  | "1m"
  | "2m"
  | "5m"
  | "15m"
  | "30m"
  | "60m"
  | "90m"
  | "1h"
  | "1d"
  | "5d"
  | "1wk"
  | "1mo"
  | "3mo";

const INTERVAL_MAP: Record<SupportedInterval, YahooChartInterval> = {
  "1m": "1m",
  "5m": "5m",
  "15m": "15m",
  "1H": "1h",
  "4H": "1h",
  "Daily": "1d",
};

interface OhlcvCandle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface CandleCache {
  data: OhlcvCandle[];
  expiresAt: number;
}

const cache = new Map<string, CandleCache>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function isSupportedInterval(value: string): value is SupportedInterval {
  return value in INTERVAL_MAP;
}

function aggregateTo4H(hourlyCandles: OhlcvCandle[]): OhlcvCandle[] {
  if (hourlyCandles.length === 0) return [];

  const fourHourMs = 4 * 60 * 60;
  const buckets = new Map<number, OhlcvCandle>();

  for (const candle of hourlyCandles) {
    const bucketKey = Math.floor(candle.time / fourHourMs) * fourHourMs;
    const existing = buckets.get(bucketKey);
    if (!existing) {
      buckets.set(bucketKey, {
        time: bucketKey,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      });
    } else {
      existing.high = Math.max(existing.high, candle.high);
      existing.low = Math.min(existing.low, candle.low);
      existing.close = candle.close;
    }
  }

  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

router.get("/candles", authRequired, async (req: Request, res: Response): Promise<void> => {
  const { symbol, interval, from, to } = req.query as Record<string, string>;

  if (!symbol || !interval || !from || !to) {
    res.status(400).json({ error: "symbol, interval, from, and to are required" });
    return;
  }

  const yahooSymbol = SYMBOL_MAP[symbol];
  if (!yahooSymbol) {
    res.status(400).json({ error: `Unknown symbol: ${symbol}` });
    return;
  }

  if (!isSupportedInterval(interval)) {
    res.status(400).json({ error: `Unknown interval: ${interval}` });
    return;
  }

  const yahooInterval: YahooChartInterval = INTERVAL_MAP[interval];

  const cacheKey = `${yahooSymbol}:${interval}:${from}:${to}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.data);
    return;
  }

  try {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setUTCHours(23, 59, 59, 999);

    const raw = await yahooFinance.chart(yahooSymbol, {
      period1: fromDate,
      period2: toDate,
      interval: yahooInterval,
    });

    const baseCandles: OhlcvCandle[] = raw.quotes
      .filter(
        (q): q is typeof q & { open: number; high: number; low: number; close: number } =>
          q.open !== null && q.high !== null && q.low !== null && q.close !== null,
      )
      .map((q) => ({
        time: Math.floor(q.date.getTime() / 1000),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
      }))
      .sort((a, b) => a.time - b.time);

    const candles = interval === "4H" ? aggregateTo4H(baseCandles) : baseCandles;

    cache.set(cacheKey, { data: candles, expiresAt: Date.now() + CACHE_TTL_MS });

    res.json(candles);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error fetching candles:", message);
    res.status(500).json({ error: "Failed to fetch candlestick data" });
  }
});

export default router;
