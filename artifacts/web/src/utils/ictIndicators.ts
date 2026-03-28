export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface FVG {
  id: string;
  type: "bullish" | "bearish";
  top: number;
  bottom: number;
  startTime: number;
  mitigated: boolean;
  mitigatedTime?: number;
}

export interface OrderBlock {
  id: string;
  type: "bullish" | "bearish";
  top: number;
  bottom: number;
  startTime: number;
  mitigated: boolean;
  mitigatedTime?: number;
}

export interface SwingPoint {
  time: number;
  price: number;
  type: "high" | "low";
  index: number;
}

export interface StructureLabel {
  time: number;
  price: number;
  label: "BOS" | "CHoCH";
  direction: "bullish" | "bearish";
}

export interface PDHLResult {
  pdh: number;
  pdl: number;
  pdDate: string;
}

export interface PremiumDiscountZone {
  high: number;
  low: number;
  mid: number;
}

const INTRADAY_TIMEFRAMES = ["1m", "5m", "15m"];

export function detectFVGs(candles: Candle[]): FVG[] {
  const fvgs: FVG[] = [];
  for (let i = 1; i < candles.length - 1; i++) {
    const c1 = candles[i - 1];
    const c2 = candles[i];
    const c3 = candles[i + 1];

    if (c3.low > c1.high) {
      fvgs.push({
        id: `fvg-bull-${i}`,
        type: "bullish",
        top: c3.low,
        bottom: c1.high,
        startTime: c2.time,
        mitigated: false,
      });
    }

    if (c1.low > c3.high) {
      fvgs.push({
        id: `fvg-bear-${i}`,
        type: "bearish",
        top: c1.low,
        bottom: c3.high,
        startTime: c2.time,
        mitigated: false,
      });
    }
  }
  return fvgs;
}

export function updateFVGMitigation(fvgs: FVG[], candles: Candle[]): FVG[] {
  return fvgs.map((fvg) => {
    if (fvg.mitigated) return fvg;
    for (const c of candles) {
      if (c.time <= fvg.startTime) continue;
      if (fvg.type === "bullish" && c.low <= fvg.bottom) {
        return { ...fvg, mitigated: true, mitigatedTime: c.time };
      }
      if (fvg.type === "bearish" && c.high >= fvg.top) {
        return { ...fvg, mitigated: true, mitigatedTime: c.time };
      }
    }
    return fvg;
  });
}

export function detectOrderBlocks(candles: Candle[]): OrderBlock[] {
  const obs: OrderBlock[] = [];
  const IMPULSE_CANDLES = 3;
  const IMPULSE_FACTOR = 1.5;

  for (let i = 1; i < candles.length - IMPULSE_CANDLES; i++) {
    const pivot = candles[i];
    const impulseCandles = candles.slice(i + 1, i + 1 + IMPULSE_CANDLES);

    const lookbackSlice = candles.slice(Math.max(0, i - 10), i);
    const avgRange =
      lookbackSlice.length > 0
        ? lookbackSlice.reduce((s, c) => s + (c.high - c.low), 0) / lookbackSlice.length
        : 0;

    if (avgRange === 0) continue;

    const bullishImpulse =
      impulseCandles.every((c) => c.close > c.open) &&
      impulseCandles[impulseCandles.length - 1].close - impulseCandles[0].open >
        avgRange * IMPULSE_FACTOR;

    const bearishImpulse =
      impulseCandles.every((c) => c.close < c.open) &&
      impulseCandles[0].open - impulseCandles[impulseCandles.length - 1].close >
        avgRange * IMPULSE_FACTOR;

    if (pivot.close < pivot.open && bullishImpulse) {
      obs.push({
        id: `ob-bull-${i}`,
        type: "bullish",
        top: pivot.high,
        bottom: pivot.low,
        startTime: pivot.time,
        mitigated: false,
      });
    }

    if (pivot.close > pivot.open && bearishImpulse) {
      obs.push({
        id: `ob-bear-${i}`,
        type: "bearish",
        top: pivot.high,
        bottom: pivot.low,
        startTime: pivot.time,
        mitigated: false,
      });
    }
  }
  return obs;
}

export function updateOBMitigation(obs: OrderBlock[], candles: Candle[]): OrderBlock[] {
  return obs.map((ob) => {
    if (ob.mitigated) return ob;
    for (const c of candles) {
      if (c.time <= ob.startTime) continue;
      if (ob.type === "bullish" && c.low <= ob.bottom) {
        return { ...ob, mitigated: true, mitigatedTime: c.time };
      }
      if (ob.type === "bearish" && c.high >= ob.top) {
        return { ...ob, mitigated: true, mitigatedTime: c.time };
      }
    }
    return ob;
  });
}

function isSwingHigh(candles: Candle[], i: number, lookback = 3): boolean {
  const c = candles[i];
  for (let j = i - lookback; j <= i + lookback; j++) {
    if (j === i || j < 0 || j >= candles.length) continue;
    if (candles[j].high >= c.high) return false;
  }
  return true;
}

function isSwingLow(candles: Candle[], i: number, lookback = 3): boolean {
  const c = candles[i];
  for (let j = i - lookback; j <= i + lookback; j++) {
    if (j === i || j < 0 || j >= candles.length) continue;
    if (candles[j].low <= c.low) return false;
  }
  return true;
}

export function detectSwingPoints(candles: Candle[], lookback = 3): SwingPoint[] {
  const points: SwingPoint[] = [];
  for (let i = lookback; i < candles.length - lookback; i++) {
    if (isSwingHigh(candles, i, lookback)) {
      points.push({ time: candles[i].time, price: candles[i].high, type: "high", index: i });
    }
    if (isSwingLow(candles, i, lookback)) {
      points.push({ time: candles[i].time, price: candles[i].low, type: "low", index: i });
    }
  }
  return points;
}

export function detectMarketStructure(
  candles: Candle[],
  swings: SwingPoint[]
): StructureLabel[] {
  const labels: StructureLabel[] = [];
  const highs = swings.filter((s) => s.type === "high").sort((a, b) => a.index - b.index);
  const lows = swings.filter((s) => s.type === "low").sort((a, b) => a.index - b.index);

  for (let i = 1; i < highs.length; i++) {
    const prev = highs[i - 1];
    const curr = highs[i];
    const candlesAfter = candles.slice(curr.index);
    const closeAbove = candlesAfter.find((c) => c.close > prev.price);
    if (!closeAbove) continue;

    const prevLowsBetween = lows.filter(
      (l) => l.index > prev.index && l.index < curr.index
    );
    labels.push({
      time: closeAbove.time,
      price: prev.price,
      label: prevLowsBetween.length > 0 ? "BOS" : "CHoCH",
      direction: "bullish",
    });
  }

  for (let i = 1; i < lows.length; i++) {
    const prev = lows[i - 1];
    const curr = lows[i];
    const candlesAfter = candles.slice(curr.index);
    const closeBelow = candlesAfter.find((c) => c.close < prev.price);
    if (!closeBelow) continue;

    const prevHighsBetween = highs.filter(
      (h) => h.index > prev.index && h.index < curr.index
    );
    labels.push({
      time: closeBelow.time,
      price: prev.price,
      label: prevHighsBetween.length > 0 ? "BOS" : "CHoCH",
      direction: "bearish",
    });
  }

  return labels.sort((a, b) => a.time - b.time);
}

export function isIntradayTimeframe(tf: string): boolean {
  return INTRADAY_TIMEFRAMES.includes(tf);
}

/**
 * Kill zones in ET (Eastern Time). We use a deterministic approach:
 * For intraday chart candles we look at UTC timestamps and compute the
 * session windows for each day in the candle set. Since ET is UTC-5
 * (EST, Nov–Mar) or UTC-4 (EDT, Mar–Nov), we use UTC-5 as the
 * conservative fixed offset (matches spec's quoted times most of the year
 * for the key sessions). The three sessions are:
 *   London Kill Zone:   2:00 – 5:00 AM ET  → 7:00–10:00 UTC (EST) / 6:00–9:00 (EDT)
 *   NY Open Kill Zone:  7:00 – 10:00 AM ET → 12:00–15:00 UTC (EST) / 11:00–14:00 (EDT)
 *   Silver Bullet:     10:00 – 11:00 AM ET → 15:00–16:00 UTC (EST) / 14:00–15:00 (EDT)
 *
 * We detect whether each day's candles are in DST by checking a sample candle.
 */
export function getKillZoneTimestamps(
  candles: Candle[]
): Array<{ start: number; end: number; color: string; label: string }> {
  if (candles.length === 0) return [];

  const result: Array<{ start: number; end: number; color: string; label: string }> = [];

  function isEDT(utcYear: number, utcMonth: number, utcDay: number): boolean {
    const d = new Date(Date.UTC(utcYear, utcMonth, utcDay, 12, 0, 0));
    const nyHour = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }).formatToParts(d).find((p) => p.type === "hour")?.value;
    return nyHour !== undefined && parseInt(nyHour) === 8;
  }

  const KILL_ZONES_ET = [
    { label: "London", startH: 2, startM: 0, endH: 5, endM: 0, color: "#818cf8" },
    { label: "NY Open", startH: 7, startM: 0, endH: 10, endM: 0, color: "#F59E0B" },
    { label: "Silver Bullet", startH: 10, startM: 0, endH: 11, endM: 0, color: "#ef4444" },
  ];

  const days = new Map<string, { year: number; month: number; day: number }>();
  for (const c of candles) {
    const d = new Date(c.time * 1000);
    const yr = d.getUTCFullYear();
    const mo = d.getUTCMonth();
    const dy = d.getUTCDate();
    const key = `${yr}-${mo}-${dy}`;
    if (!days.has(key)) days.set(key, { year: yr, month: mo, day: dy });
  }

  for (const { year, month, day } of days.values()) {
    const edt = isEDT(year, month, day);
    const offsetH = edt ? 4 : 5;

    for (const kz of KILL_ZONES_ET) {
      const startUtcH = kz.startH + offsetH;
      const endUtcH = kz.endH + offsetH;
      const startDate = new Date(Date.UTC(year, month, day, startUtcH, kz.startM, 0));
      const endDate = new Date(Date.UTC(year, month, day, endUtcH, kz.endM, 0));
      result.push({
        start: Math.floor(startDate.getTime() / 1000),
        end: Math.floor(endDate.getTime() / 1000),
        color: kz.color,
        label: kz.label,
      });
    }
  }

  return result;
}

export function calcPDHL(candles: Candle[]): PDHLResult | null {
  if (candles.length === 0) return null;

  const last = candles[candles.length - 1];
  const lastDate = new Date(last.time * 1000);
  const lastDayStart = Date.UTC(
    lastDate.getUTCFullYear(),
    lastDate.getUTCMonth(),
    lastDate.getUTCDate()
  );
  const prevDayStart = lastDayStart - 86400000;

  const prevDayCandles = candles.filter((c) => {
    const ts = c.time * 1000;
    return ts >= prevDayStart && ts < lastDayStart;
  });

  if (prevDayCandles.length === 0) return null;

  const pdh = Math.max(...prevDayCandles.map((c) => c.high));
  const pdl = Math.min(...prevDayCandles.map((c) => c.low));
  const pdDate = new Date(prevDayStart).toISOString().split("T")[0];

  return { pdh, pdl, pdDate };
}

export function calcPremiumDiscount(
  visibleCandles: Candle[],
  fromTime?: number,
  toTime?: number
): PremiumDiscountZone | null {
  if (visibleCandles.length < 2) return null;

  let window = visibleCandles;
  if (fromTime !== undefined && toTime !== undefined) {
    const filtered = visibleCandles.filter(
      (c) => c.time >= fromTime && c.time <= toTime
    );
    if (filtered.length >= 2) window = filtered;
  }

  const high = Math.max(...window.map((c) => c.high));
  const low = Math.min(...window.map((c) => c.low));
  const mid = (high + low) / 2;

  return { high, low, mid };
}
