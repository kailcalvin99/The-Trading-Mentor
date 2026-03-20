import { Router, type IRouter } from "express";

const router: IRouter = Router();

const FINNHUB_KEY = process.env.FINNHUB_API_KEY || "";
const FINNHUB_BASE = "https://finnhub.io/api/v1";

interface CalendarEvent {
  time: string;
  event: string;
  country: string;
  impact: string;
  actual: string | null;
  estimate: string | null;
  prev: string | null;
}

let calendarCache: { events: CalendarEvent[]; fetchedAt: number; date: string } | null = null;
const CALENDAR_TTL_MS = 60 * 60 * 1000;

function getTodayDateStr(): string {
  return new Date().toISOString().split("T")[0];
}

const HIGH_IMPACT_COUNTRIES = ["US", "EU", "UK", "JP", "CA", "AU", "CH", "NZ", "GB"];

async function fetchFromFinnhub(from: string, to: string): Promise<CalendarEvent[] | null> {
  if (!FINNHUB_KEY) return null;
  try {
    const url = `${FINNHUB_BASE}/calendar/economic?from=${from}&to=${to}&token=${FINNHUB_KEY}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json() as { economicCalendar?: Array<{
      time: string; event: string; country: string;
      impact: string; actual: string | null; estimate: string | null; prev: string | null;
    }> };
    const all = data.economicCalendar ?? [];
    return all
      .filter((e) => {
        const impact = (e.impact || "").toLowerCase();
        const country = (e.country || "").toUpperCase();
        return impact === "high" && HIGH_IMPACT_COUNTRIES.includes(country);
      })
      .map((e) => ({
        time: e.time, event: e.event, country: e.country,
        impact: e.impact, actual: e.actual ?? null, estimate: e.estimate ?? null, prev: e.prev ?? null,
      }))
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  } catch {
    return null;
  }
}

async function fetchFromTradingEconomics(dateStr: string): Promise<CalendarEvent[] | null> {
  try {
    const url = `https://api.tradingeconomics.com/calendar/importance/1/2/${dateStr}/${dateStr}?c=guest:guest&f=json`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json() as Array<{
      Date?: string; Country?: string; Event?: string; Importance?: number;
      Actual?: string; Forecast?: string; Previous?: string;
    }>;
    if (!Array.isArray(data) || data.length === 0) return null;

    const relevant = data.filter((e) => {
      const country = (e.Country || "").toUpperCase();
      return HIGH_IMPACT_COUNTRIES.includes(country);
    });

    return relevant
      .filter((e) => (e.Importance ?? 1) >= 3)
      .map((e) => ({
        time: e.Date ?? dateStr,
        event: e.Event ?? "",
        country: e.Country ?? "",
        impact: "high",
        actual: e.Actual && e.Actual !== "" ? e.Actual : null,
        estimate: e.Forecast && e.Forecast !== "" ? e.Forecast : null,
        prev: e.Previous && e.Previous !== "" ? e.Previous : null,
      }));
  } catch {
    return null;
  }
}

router.get("/today", async (req, res) => {
  const todayStr = getTodayDateStr();

  if (calendarCache && calendarCache.date === todayStr && Date.now() - calendarCache.fetchedAt < CALENDAR_TTL_MS) {
    res.json({ events: calendarCache.events, source: "cache" });
    return;
  }

  let events: CalendarEvent[] | null = null;

  events = await fetchFromFinnhub(todayStr, todayStr);

  if (!events || events.length === 0) {
    events = await fetchFromTradingEconomics(todayStr);
  }

  if (events === null) {
    const cached = calendarCache?.events ?? [];
    res.json({ events: cached, error: "Calendar data unavailable" });
    return;
  }

  calendarCache = { events, fetchedAt: Date.now(), date: todayStr };
  res.json({ events });
});

export default router;
