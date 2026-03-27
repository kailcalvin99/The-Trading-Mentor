import { useState, useEffect, useCallback } from "react";
import { getESTNow, getNextKillZone } from "@/lib/timeUtils";

const BRIEFING_KEY_PREFIX = "ict-morning-briefing-";

function getTodayKey(userId?: number | string): string {
  const d = new Date();
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const userSegment = userId != null ? `${userId}-` : "";
  return `${BRIEFING_KEY_PREFIX}${userSegment}${dateStr}`;
}

export function isBriefingDismissedToday(userId?: number | string): boolean {
  try {
    return localStorage.getItem(getTodayKey(userId)) === "dismissed";
  } catch {
    return false;
  }
}

export function dismissBriefingToday(userId?: number | string): void {
  try {
    localStorage.setItem(getTodayKey(userId), "dismissed");
  } catch {}
}

export interface MorningBriefingData {
  todayPnL: number;
  todayPnLFormatted: string;
  hasTrades: boolean;
  drawdownPct: number;
  winStreak: number;
  nextKillZone: string;
  briefingMessage: string;
  actionItems: string[];
}

function computeWinStreak(trades: Array<{ outcome?: string | null; createdAt?: string | null; isDraft?: boolean | null }>): number {
  const completed = [...trades]
    .filter((t) => !t.isDraft && (t.outcome === "win" || t.outcome === "loss"))
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  let streak = 0;
  for (const t of completed) {
    if (t.outcome === "win") streak++;
    else break;
  }
  return streak;
}

function generateBriefingMessage(data: {
  firstName: string;
  todayPnL: number;
  hasTrades: boolean;
  drawdownPct: number;
  winStreak: number;
  nextKillZone: string;
}): { message: string; actions: string[] } {
  const { firstName, todayPnL, hasTrades, drawdownPct, winStreak, nextKillZone } = data;
  const hour = getESTNow().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  let message = `${greeting}, ${firstName}. `;

  if (!hasTrades) {
    message += `No trades logged yet today — the market is waiting. `;
  } else if (todayPnL > 0) {
    message += `You're up ${todayPnL.toFixed(1)}R today — solid start. `;
  } else if (todayPnL < 0) {
    message += `You're down ${Math.abs(todayPnL).toFixed(1)}R today. Stay disciplined and protect your remaining risk. `;
  } else {
    message += `Breakeven day so far — stay patient and let the setup come to you. `;
  }

  if (winStreak >= 3) {
    message += `You're on a ${winStreak}-trade win streak — excellent consistency. `;
  }

  if (drawdownPct > 5) {
    message += `Your drawdown is at ${drawdownPct.toFixed(1)}% — consider sizing down. `;
  }

  message += `Next kill zone: ${nextKillZone}.`;

  const actions: string[] = [];

  if (!hasTrades) {
    actions.push("Complete your morning routine before trading");
    actions.push(`Wait for the ${nextKillZone} window`);
  } else if (todayPnL < 0) {
    actions.push("Review your daily loss limit before next entry");
    actions.push("Journal your last trade to identify the mistake");
  } else {
    actions.push("Log any trades from today's session");
    actions.push("Check HTF bias for remaining sessions");
  }

  if (drawdownPct > 7) {
    actions.push("Consider going flat for the rest of the day");
  }

  return { message, actions };
}

export function useMorningBriefing(opts: {
  firstName: string;
  trades: Array<{ outcome?: string | null; pnl?: string | number | null; createdAt?: string | null; isDraft?: boolean | null }>;
  drawdownPct: number;
  userId?: number | string;
}) {
  const [dismissed, setDismissed] = useState(() => isBriefingDismissedToday(opts.userId));
  const [data, setData] = useState<MorningBriefingData | null>(null);

  useEffect(() => {
    setDismissed(isBriefingDismissedToday(opts.userId));
  }, [opts.userId]);

  useEffect(() => {
    if (dismissed) return;

    const today = new Date().toDateString();
    const todayTrades = opts.trades.filter((t) => {
      if (t.isDraft) return false;
      if (!t.createdAt) return false;
      return new Date(t.createdAt).toDateString() === today;
    });

    const todayPnL = todayTrades.reduce((sum, t) => {
      const v = parseFloat(String(t.pnl ?? "0"));
      return sum + (isNaN(v) ? 0 : v);
    }, 0);

    const winStreak = computeWinStreak(opts.trades);
    const nextKillZone = getNextKillZone();

    const { message, actions } = generateBriefingMessage({
      firstName: opts.firstName,
      todayPnL,
      hasTrades: todayTrades.length > 0,
      drawdownPct: opts.drawdownPct,
      winStreak,
      nextKillZone,
    });

    setData({
      todayPnL,
      todayPnLFormatted: todayPnL >= 0 ? `+${todayPnL.toFixed(1)}R` : `${todayPnL.toFixed(1)}R`,
      hasTrades: todayTrades.length > 0,
      drawdownPct: opts.drawdownPct,
      winStreak,
      nextKillZone,
      briefingMessage: message,
      actionItems: actions,
    });
  }, [opts.firstName, opts.trades, opts.drawdownPct, dismissed]);

  const dismiss = useCallback(() => {
    dismissBriefingToday(opts.userId);
    setDismissed(true);
  }, [opts.userId]);

  const shouldShow = !dismissed && data !== null;

  return { shouldShow, data, dismiss };
}
