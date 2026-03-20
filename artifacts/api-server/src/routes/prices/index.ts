import { Router, type IRouter } from "express";

const router: IRouter = Router();

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";
const FINNHUB_BASE = "https://finnhub.io/api/v1";
const FX_FALLBACK_BASE = "https://open.er-api.com/v6/latest/USD";

interface PriceEntry {
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
  delayed: boolean;
  fetchedAt: number;
}

const priceCache = new Map<string, PriceEntry>();
const PRICE_TTL_MS = 15 * 1000;
const FX_CACHE_TTL_MS = 15 * 1000;

let fxCacheStore: { rates: Record<string, number>; fetchedAt: number } | null = null;

const EQUITY_INSTRUMENTS = [
  { symbol: "NQ", label: "NQ1!", finnhubSymbol: "QQQ", approx: true },
  { symbol: "ES", label: "ES1!", finnhubSymbol: "SPY", approx: true },
  { symbol: "YM", label: "YM1!", finnhubSymbol: "DIA", approx: true },
];

const FOREX_PAIRS = [
  { symbol: "EURUSD", label: "EUR/USD", oanda: "OANDA:EUR_USD", base: "EUR", quote: "USD" },
  { symbol: "GBPUSD", label: "GBP/USD", oanda: "OANDA:GBP_USD", base: "GBP", quote: "USD" },
  { symbol: "USDJPY", label: "USD/JPY", oanda: "OANDA:USD_JPY", base: "USD", quote: "JPY" },
];

async function fetchFinnhubQuote(ticker: string): Promise<{ c: number; pc: number } | null> {
  if (!FINNHUB_KEY) return null;
  try {
    const url = `${FINNHUB_BASE}/quote?symbol=${encodeURIComponent(ticker)}&token=${FINNHUB_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const data = await res.json() as { c: number; pc: number; error?: string };
    if (data.error || !data.c || data.c === 0) return null;
    return { c: data.c, pc: data.pc };
  } catch {
    return null;
  }
}

async function fetchFxFromFallback(): Promise<Record<string, number> | null> {
  if (fxCacheStore && Date.now() - fxCacheStore.fetchedAt < FX_CACHE_TTL_MS) {
    return fxCacheStore.rates;
  }
  try {
    const res = await fetch(FX_FALLBACK_BASE, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return fxCacheStore?.rates ?? null;
    const data = await res.json() as { result: string; rates: Record<string, number> };
    if (data.result === "success" && data.rates) {
      fxCacheStore = { rates: data.rates, fetchedAt: Date.now() };
      return data.rates;
    }
  } catch {}
  return fxCacheStore?.rates ?? null;
}

function calcForexFromRates(rates: Record<string, number>, base: string, quote: string): number | null {
  const usdPerBase = base === "USD" ? 1 : rates[base] ? 1 / rates[base] : null;
  const usdPerQuote = quote === "USD" ? 1 : rates[quote] ? 1 / rates[quote] : null;
  if (usdPerBase === null || usdPerQuote === null) return null;
  return usdPerBase / usdPerQuote;
}

router.get("/", async (req, res) => {
  const results: Array<{
    symbol: string;
    label: string;
    type: string;
    approx: boolean;
    price: number | null;
    prevClose: number | null;
    change: number | null;
    changePct: number | null;
    delayed: boolean;
    updatedAt: number | null;
  }> = [];

  for (const pair of FOREX_PAIRS) {
    const cached = priceCache.get(pair.symbol);
    let entry: PriceEntry | null = null;

    if (cached && Date.now() - cached.fetchedAt < PRICE_TTL_MS) {
      entry = cached;
    } else {
      let finnhubQuote: { c: number; pc: number } | null = null;
      let isDelayed = true;

      if (FINNHUB_KEY) {
        finnhubQuote = await fetchFinnhubQuote(pair.oanda);
        if (finnhubQuote) {
          isDelayed = false;
        }
      }

      if (finnhubQuote) {
        const change = finnhubQuote.c - finnhubQuote.pc;
        const changePct = finnhubQuote.pc !== 0 ? (change / finnhubQuote.pc) * 100 : 0;
        entry = {
          price: Math.round(finnhubQuote.c * 100000) / 100000,
          prevClose: Math.round(finnhubQuote.pc * 100000) / 100000,
          change: Math.round(change * 100000) / 100000,
          changePct: Math.round(changePct * 100) / 100,
          delayed: isDelayed,
          fetchedAt: Date.now(),
        };
      } else {
        const rates = await fetchFxFromFallback();
        if (rates) {
          const price = calcForexFromRates(rates, pair.base, pair.quote);
          if (price !== null) {
            const prev = cached?.price ?? price;
            const change = price - prev;
            const changePct = prev > 0 ? (change / prev) * 100 : 0;
            entry = {
              price: Math.round(price * 100000) / 100000,
              prevClose: Math.round(prev * 100000) / 100000,
              change: Math.round(change * 100000) / 100000,
              changePct: Math.round(changePct * 100) / 100,
              delayed: true,
              fetchedAt: Date.now(),
            };
          }
        } else {
          entry = cached ?? null;
        }
      }

      if (entry) priceCache.set(pair.symbol, entry);
    }

    results.push({
      symbol: pair.symbol,
      label: pair.label,
      type: "forex",
      approx: false,
      price: entry?.price ?? null,
      prevClose: entry?.prevClose ?? null,
      change: entry?.change ?? null,
      changePct: entry?.changePct ?? null,
      delayed: entry?.delayed ?? true,
      updatedAt: entry?.fetchedAt ?? null,
    });
  }

  for (const inst of EQUITY_INSTRUMENTS) {
    const cached = priceCache.get(inst.symbol);
    let entry: PriceEntry | null = null;

    if (cached && Date.now() - cached.fetchedAt < PRICE_TTL_MS) {
      entry = cached;
    } else if (FINNHUB_KEY) {
      const quote = await fetchFinnhubQuote(inst.finnhubSymbol);
      if (quote) {
        const change = quote.c - quote.pc;
        const changePct = quote.pc !== 0 ? (change / quote.pc) * 100 : 0;
        entry = {
          price: Math.round(quote.c * 100) / 100,
          prevClose: Math.round(quote.pc * 100) / 100,
          change: Math.round(change * 100) / 100,
          changePct: Math.round(changePct * 100) / 100,
          delayed: false,
          fetchedAt: Date.now(),
        };
        priceCache.set(inst.symbol, entry);
      } else {
        entry = cached ?? null;
      }
    } else {
      entry = cached ?? null;
    }

    results.push({
      symbol: inst.symbol,
      label: inst.label,
      type: "etf",
      approx: inst.approx,
      price: entry?.price ?? null,
      prevClose: entry?.prevClose ?? null,
      change: entry?.change ?? null,
      changePct: entry?.changePct ?? null,
      delayed: entry?.delayed ?? false,
      updatedAt: entry?.fetchedAt ?? null,
    });
  }

  res.json({ prices: results, hasKey: !!FINNHUB_KEY });
});

export default router;
