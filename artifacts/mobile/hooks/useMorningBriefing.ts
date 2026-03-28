import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BRIEFING_KEY_PREFIX = "ict-morning-briefing-";

function getLocalDateStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getTodayKey(userId?: number | string): string {
  const userSegment = userId != null ? `${userId}-` : "";
  return `${BRIEFING_KEY_PREFIX}${userSegment}${getLocalDateStr()}`;
}

async function isBriefingDismissedToday(userId?: number | string): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(getTodayKey(userId));
    return val === "dismissed";
  } catch {
    return false;
  }
}

async function storeDismissedToday(userId?: number | string): Promise<void> {
  try {
    await AsyncStorage.setItem(getTodayKey(userId), "dismissed");
  } catch {}
}

function getESTHour(): number {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      hour12: false,
    });
    const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
    return Number(parts.hour);
  } catch {
    const now = new Date();
    return new Date(now.getTime() + now.getTimezoneOffset() * 60000 + -5 * 3600000).getHours();
  }
}

function getESTMinutes(): { hours: number; minutes: number } {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
    return { hours: Number(parts.hour), minutes: Number(parts.minute) };
  } catch {
    const now = new Date();
    const est = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + -5 * 3600000);
    return { hours: est.getHours(), minutes: est.getMinutes() };
  }
}

const SESSIONS = [
  { name: "London Open", startH: 2, startM: 0 },
  { name: "NY Open", startH: 9, startM: 30 },
  { name: "Silver Bullet", startH: 10, startM: 0 },
  { name: "London Close", startH: 11, startM: 0 },
];

function getNextKillZone(): string {
  const { hours, minutes } = getESTMinutes();
  const nowMins = hours * 60 + minutes;
  for (const session of SESSIONS) {
    const sessionMins = session.startH * 60 + session.startM;
    if (sessionMins > nowMins) {
      const diff = sessionMins - nowMins;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      if (h > 0) return `${session.name} in ${h}h ${m}m`;
      return `${session.name} in ${m}m`;
    }
  }
  return "London Open (tomorrow 2 AM EST)";
}

function computeWinStreak(
  trades: Array<{ outcome?: string | null; createdAt?: string | null; isDraft?: boolean | null }>
): number {
  const completed = [...trades]
    .filter(Boolean)
    .filter((t) => !t.isDraft && (t.outcome === "win" || t.outcome === "loss"))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  let streak = 0;
  for (const t of completed) {
    if (t.outcome === "win") streak++;
    else break;
  }
  return streak;
}

export interface MorningBriefingData {
  briefingMessage: string;
  actionItems: string[];
  todayPnL: number;
  todayPnLFormatted: string;
  hasTrades: boolean;
  drawdownPct: number;
  winStreak: number;
  nextKillZone: string;
}

function computeBriefingData(
  firstName: string,
  trades: Array<{ outcome?: string | null; pnl?: string | number | null; createdAt?: string | null; isDraft?: boolean | null }>,
  drawdownPct: number
): MorningBriefingData {
  const hour = getESTHour();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const today = new Date().toDateString();
  const todayTrades = trades.filter(Boolean).filter((t) => {
    if (t.isDraft) return false;
    if (!t.createdAt) return false;
    return new Date(t.createdAt).toDateString() === today;
  });

  const todayPnL = todayTrades.reduce((sum, t) => {
    const v = parseFloat(String(t.pnl ?? "0"));
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  const winStreak = computeWinStreak(trades);
  const nextKillZone = getNextKillZone();
  const hasTrades = todayTrades.length > 0;

  let message = `${greeting}, ${firstName}. `;
  if (!hasTrades) {
    message += `No trades logged yet today — stay patient and wait for the setup. `;
  } else if (todayPnL > 0) {
    message += `You're up ${todayPnL.toFixed(1)}R today — solid start. `;
  } else if (todayPnL < 0) {
    message += `Down ${Math.abs(todayPnL).toFixed(1)}R today — protect your remaining risk. `;
  } else {
    message += `Breakeven so far — stay disciplined and let the setup come to you. `;
  }

  if (winStreak >= 3) {
    message += `${winStreak}-trade win streak — excellent consistency. `;
  }

  if (drawdownPct > 5) {
    message += `Drawdown at ${drawdownPct.toFixed(1)}% — consider sizing down. `;
  }

  message += `Next kill zone: ${nextKillZone}.`;

  const actions: string[] = [];
  if (!hasTrades) {
    actions.push("Complete morning routine before trading");
    actions.push(`Target the ${nextKillZone} window`);
  } else if (todayPnL < 0) {
    actions.push("Check daily loss limit before next entry");
    actions.push("Journal your last trade to identify mistakes");
  } else {
    actions.push("Log today's trades in journal");
    actions.push("Check HTF bias for remaining sessions");
  }
  if (drawdownPct > 7) {
    actions.push("Consider going flat for rest of the day");
  }

  return {
    briefingMessage: message,
    actionItems: actions,
    todayPnL,
    todayPnLFormatted: todayPnL >= 0 ? `+${todayPnL.toFixed(1)}R` : `${todayPnL.toFixed(1)}R`,
    hasTrades,
    drawdownPct,
    winStreak,
    nextKillZone,
  };
}

export function useMorningBriefing(opts: {
  firstName: string;
  trades: Array<{ outcome?: string | null; pnl?: string | number | null; createdAt?: string | null; isDraft?: boolean | null }>;
  drawdownPct: number;
  userId?: number | string;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [checked, setChecked] = useState(false);
  const [data, setData] = useState<MorningBriefingData | null>(null);

  useEffect(() => {
    isBriefingDismissedToday(opts.userId).then((isDismissed) => {
      setDismissed(isDismissed);
      setChecked(true);
    });
  }, [opts.userId]);

  useEffect(() => {
    if (!checked || dismissed) return;
    const briefing = computeBriefingData(opts.firstName, opts.trades, opts.drawdownPct);
    setData(briefing);
  }, [checked, dismissed, opts.firstName, opts.trades, opts.drawdownPct]);

  const dismiss = useCallback(async () => {
    await storeDismissedToday(opts.userId);
    setDismissed(true);
  }, [opts.userId]);

  const shouldShow = checked && !dismissed && data !== null;

  return { shouldShow, data, dismiss };
}
