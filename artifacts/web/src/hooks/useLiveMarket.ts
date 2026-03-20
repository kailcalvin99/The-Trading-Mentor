import { useState, useEffect, useCallback, useRef } from "react";

export interface PriceItem {
  symbol: string;
  label: string;
  type: "forex" | "etf" | "index";
  approx: boolean;
  price: number | null;
  prevClose: number | null;
  change: number | null;
  changePct: number | null;
  delayed: boolean;
  updatedAt: number | null;
}

export interface CalendarEvent {
  time: string;
  event: string;
  country: string;
  impact: string;
  actual: string | null;
  estimate: string | null;
  prev: string | null;
}

export interface OpenTrade {
  id: number;
  instrument: string;
  side: string;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  session: string | null;
  createdAt: string;
  riskPct: number;
}

const REFRESH_INTERVAL = 15000;

const apiBase = import.meta.env.VITE_API_URL || "/api";

export function usePrices() {
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [hasKey, setHasKey] = useState(true);

  const fetchPrices = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/prices`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json() as { prices: PriceItem[]; hasKey: boolean };
      if (data.prices) {
        setPrices(data.prices);
        setLastUpdated(Date.now());
        setHasKey(data.hasKey !== false);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const id = setInterval(fetchPrices, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchPrices]);

  return { prices, loading, lastUpdated, hasKey };
}

export function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const doFetch = async () => {
      try {
        const res = await fetch(`${apiBase}/calendar/today`, { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json() as { events: CalendarEvent[] };
        if (data.events) setEvents(data.events);
      } catch {
      } finally {
        setLoading(false);
      }
    };

    doFetch();
    const id = setInterval(doFetch, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return { events, loading };
}

export function useOpenTrades() {
  const [trades, setTrades] = useState<OpenTrade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/trades/open`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json() as OpenTrade[];
      if (Array.isArray(data)) setTrades(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrades();
    const id = setInterval(fetchTrades, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchTrades]);

  return { trades, loading, refetch: fetchTrades };
}
