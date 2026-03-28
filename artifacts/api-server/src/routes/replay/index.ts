import { Router, type Request, type Response } from "express";
import { authRequired } from "../../middleware/auth";

const router = Router();

const TWELVE_DATA_BASE = "https://api.twelvedata.com/time_series";

const SYMBOL_MAP: Record<string, string> = {
  "EUR/USD": "EUR/USD",
  "GBP/USD": "GBP/USD",
  "GBP/JPY": "GBP/JPY",
  "NAS100": "QQQ",
  "US30": "DIA",
  "XAU/USD": "XAU/USD",
};

type SupportedInterval = "1m" | "5m" | "15m" | "1H" | "4H" | "Daily";

type TwelveDataInterval = "1min" | "5min" | "15min" | "1h" | "4h" | "1day";

const INTERVAL_MAP: Record<SupportedInterval, TwelveDataInterval> = {
  "1m": "1min",
  "5m": "5min",
  "15m": "15min",
  "1H": "1h",
  "4H": "4h",
  "Daily": "1day",
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

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}, 30 * 60 * 1000);

function isSupportedInterval(value: string): value is SupportedInterval {
  return value in INTERVAL_MAP;
}

function parseOutputSize(from: string, to: string, interval: SupportedInterval): number {
  const fromMs = new Date(from).getTime();
  const toMs = new Date(to).getTime();
  const diffMs = toMs - fromMs;
  const diffMinutes = diffMs / (1000 * 60);

  const intervalMinutes: Record<SupportedInterval, number> = {
    "1m": 1,
    "5m": 5,
    "15m": 15,
    "1H": 60,
    "4H": 240,
    "Daily": 1440,
  };

  const bars = Math.ceil(diffMinutes / intervalMinutes[interval]) + 10;
  return Math.min(Math.max(bars, 50), 5000);
}

router.get("/candles", authRequired, async (req: Request, res: Response): Promise<void> => {
  const { symbol, interval, from, to } = req.query as Record<string, string>;

  if (!symbol || !interval || !from || !to) {
    res.status(400).json({ error: "symbol, interval, from, and to are required" });
    return;
  }

  const tdSymbol = SYMBOL_MAP[symbol];
  if (!tdSymbol) {
    res.status(400).json({ error: `Unknown symbol: ${symbol}. Supported: ${Object.keys(SYMBOL_MAP).join(", ")}` });
    return;
  }

  if (!isSupportedInterval(interval)) {
    res.status(400).json({ error: `Unknown interval: ${interval}. Supported: ${Object.keys(INTERVAL_MAP).join(", ")}` });
    return;
  }

  const apiKey = process.env.TWELVE_DATA_API_KEY;
  if (!apiKey) {
    console.error("TWELVE_DATA_API_KEY environment variable is not set");
    res.status(500).json({ error: "Chart data is temporarily unavailable — API key not configured. Please contact support." });
    return;
  }

  const tdInterval = INTERVAL_MAP[interval];
  const cacheKey = `${tdSymbol}:${interval}:${from}:${to}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    res.json(cached.data);
    return;
  }

  try {
    const outputSize = parseOutputSize(from, to, interval);

    const startDatetime = `${from} 00:00:00`;
    const endDatetime = `${to} 23:59:59`;

    const params = new URLSearchParams({
      symbol: tdSymbol,
      interval: tdInterval,
      start_date: startDatetime,
      end_date: endDatetime,
      outputsize: String(outputSize),
      order: "ASC",
      apikey: apiKey,
    });

    const url = `${TWELVE_DATA_BASE}?${params}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: { "Accept": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Twelve Data API returned HTTP ${response.status}`);
    }

    const data = await response.json() as {
      status?: string;
      code?: number;
      message?: string;
      values?: Array<{
        datetime: string;
        open: string;
        high: string;
        low: string;
        close: string;
      }>;
    };

    if (data.status === "error" || data.code !== undefined) {
      const apiMessage = data.message ?? "Unknown API error";
      console.error(`Twelve Data API error for ${tdSymbol} ${tdInterval}: ${apiMessage} (code: ${data.code})`);

      if (data.code === 429) {
        res.status(429).json({ error: "Chart data quota exceeded for today. Please try again tomorrow or upgrade the data plan." });
        return;
      }
      if (data.code === 401 || data.code === 403) {
        res.status(500).json({ error: "Chart data is temporarily unavailable — invalid API key. Please contact support." });
        return;
      }

      res.status(502).json({ error: `Failed to load chart data: ${apiMessage}` });
      return;
    }

    const values = data.values;
    if (!values || values.length === 0) {
      res.status(404).json({ error: `No candle data found for ${symbol} on the ${interval} timeframe for the selected date range.` });
      return;
    }

    const candles: OhlcvCandle[] = values
      .map((v) => ({
        time: Math.floor(new Date(v.datetime.replace(" ", "T") + "Z").getTime() / 1000),
        open: parseFloat(v.open),
        high: parseFloat(v.high),
        low: parseFloat(v.low),
        close: parseFloat(v.close),
      }))
      .filter((c) => !isNaN(c.open) && !isNaN(c.high) && !isNaN(c.low) && !isNaN(c.close))
      .sort((a, b) => a.time - b.time);

    cache.set(cacheKey, { data: candles, expiresAt: Date.now() + CACHE_TTL_MS });

    res.json(candles);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`Error fetching candles for ${symbol} ${interval}:`, message);

    if (message.includes("timed out") || message.includes("TimeoutError")) {
      res.status(504).json({ error: "Chart data request timed out. Please try again." });
      return;
    }

    res.status(500).json({ error: "Failed to load chart data. Please try again in a moment." });
  }
});

export default router;
