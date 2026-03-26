import { Router, type Request, type Response } from "express";
import { authRequired } from "../../middleware/auth";

const router = Router();

const YAHOO_V8 = "https://query1.finance.yahoo.com/v8/finance/chart";

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

    const period1 = Math.floor(fromDate.getTime() / 1000);
    const period2 = Math.floor(toDate.getTime() / 1000);
    const url = `${YAHOO_V8}/${encodeURIComponent(yahooSymbol)}?period1=${period1}&period2=${period2}&interval=${yahooInterval}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ICT-Mentor/1.0)",
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance returned ${response.status}`);
    }

    const data = await response.json() as {
      chart?: {
        result?: Array<{
          timestamp?: number[];
          indicators?: {
            quote?: Array<{
              open?: (number | null)[];
              high?: (number | null)[];
              low?: (number | null)[];
              close?: (number | null)[];
            }>;
          };
        }>;
        error?: unknown;
      };
    };

    const result = data?.chart?.result?.[0];
    if (!result) {
      throw new Error("No data returned from Yahoo Finance");
    }

    const timestamps = result.timestamp ?? [];
    const quote = result.indicators?.quote?.[0] ?? {};
    const opens = quote.open ?? [];
    const highs = quote.high ?? [];
    const lows = quote.low ?? [];
    const closes = quote.close ?? [];

    const baseCandles: OhlcvCandle[] = timestamps
      .map((ts, i) => ({
        time: ts,
        open: opens[i] ?? null,
        high: highs[i] ?? null,
        low: lows[i] ?? null,
        close: closes[i] ?? null,
      }))
      .filter(
        (c): c is OhlcvCandle =>
          c.open !== null && c.high !== null && c.low !== null && c.close !== null,
      )
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
