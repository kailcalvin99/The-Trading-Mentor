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

interface CrumbCache {
  crumb: string;
  cookie: string;
  expiresAt: number;
}

const cache = new Map<string, CandleCache>();
const CACHE_TTL_MS = 60 * 60 * 1000;

let crumbCache: CrumbCache | null = null;

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}, 30 * 60 * 1000);

const YAHOO_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function fetchFreshCrumb(): Promise<{ crumb: string; cookie: string }> {
  const cookieRes = await fetch("https://fc.yahoo.com", {
    signal: AbortSignal.timeout(10000),
    headers: {
      "User-Agent": YAHOO_UA,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
  });

  const rawCookies = cookieRes.headers.getSetCookie?.() ?? [];
  if (rawCookies.length === 0) {
    throw new Error("No cookies returned from Yahoo consent endpoint");
  }
  const cookieHeader = rawCookies.map((c) => c.split(";")[0]).join("; ");

  const crumbRes = await fetch("https://query1.finance.yahoo.com/v1/test/getcrumb", {
    signal: AbortSignal.timeout(10000),
    headers: {
      "User-Agent": YAHOO_UA,
      "Accept": "text/plain, */*",
      "Cookie": cookieHeader,
    },
  });

  if (!crumbRes.ok) {
    throw new Error(`Failed to fetch Yahoo crumb: ${crumbRes.status}`);
  }

  const crumb = (await crumbRes.text()).trim();
  if (!crumb || crumb.length === 0) {
    throw new Error("Empty crumb returned from Yahoo Finance");
  }

  return { crumb, cookie: cookieHeader };
}

async function getYahooCrumb(): Promise<{ crumb: string; cookie: string }> {
  const now = Date.now();
  if (crumbCache && crumbCache.expiresAt > now) {
    return { crumb: crumbCache.crumb, cookie: crumbCache.cookie };
  }

  const auth = await fetchFreshCrumb();

  crumbCache = { crumb: auth.crumb, cookie: auth.cookie, expiresAt: now + CACHE_TTL_MS };
  return { crumb: auth.crumb, cookie: auth.cookie };
}

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

    const buildHeaders = (cookie: string | null): Record<string, string> => {
      const h: Record<string, string> = { "User-Agent": YAHOO_UA, "Accept": "application/json" };
      if (cookie) h["Cookie"] = cookie;
      return h;
    };

    const buildUrl = (c: string | null) => {
      const crumbParam = c ? `&crumb=${encodeURIComponent(c)}` : "";
      return `${YAHOO_V8}/${encodeURIComponent(yahooSymbol)}?period1=${period1}&period2=${period2}&interval=${yahooInterval}${crumbParam}`;
    };

    let crumb: string | null = null;
    let cookie: string | null = null;
    try {
      const auth = await getYahooCrumb();
      crumb = auth.crumb;
      cookie = auth.cookie;
    } catch (authErr) {
      console.warn("Yahoo crumb fetch failed, proceeding without auth:", authErr instanceof Error ? authErr.message : String(authErr));
    }

    let response = await fetch(buildUrl(crumb), {
      signal: AbortSignal.timeout(10000),
      headers: buildHeaders(cookie),
    });

    if (response.status === 401) {
      crumbCache = null;
      try {
        const retryAuth = await fetchFreshCrumb();
        crumbCache = { crumb: retryAuth.crumb, cookie: retryAuth.cookie, expiresAt: Date.now() + CACHE_TTL_MS };
        crumb = retryAuth.crumb;
        cookie = retryAuth.cookie;
        response = await fetch(buildUrl(crumb), {
          signal: AbortSignal.timeout(10000),
          headers: buildHeaders(cookie),
        });
      } catch (retryErr) {
        console.warn("Yahoo crumb retry failed:", retryErr instanceof Error ? retryErr.message : String(retryErr));
      }
    }

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
