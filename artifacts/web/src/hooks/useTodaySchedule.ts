import { useState, useCallback } from "react";

export const ROUTINE_TIMES_KEY = "routine_times_v1";

export const DEFAULT_ROUTINE_TIMES: Record<string, string> = {
  checkNews: "7:00 AM",
  markNewsTime: "7:05 AM",
  findDailyTrend: "7:15 AM",
  findHTFBias: "7:20 AM",
  markDOL: "7:25 AM",
  markFVG: "7:30 AM",
  markPrevDayHL: "7:35 AM",
  markOrderBlocks: "7:40 AM",
  checkKillZone: "7:45 AM",
  setRisk: "7:50 AM",
  checkMindset: "7:55 AM",
};

export type SmartMoneyKey =
  | "checkNews"
  | "markNewsTime"
  | "findDailyTrend"
  | "findHTFBias"
  | "markDOL"
  | "markFVG"
  | "markPrevDayHL"
  | "markOrderBlocks"
  | "checkKillZone"
  | "setRisk"
  | "checkMindset";

export const SMART_MONEY_SECTIONS = [
  {
    id: 1,
    title: "Check the News",
    color: "#F59E0B",
    items: [
      { key: "checkNews" as SmartMoneyKey, label: "Open an economic calendar", desc: "Check for high-impact red folder news events today" },
      { key: "markNewsTime" as SmartMoneyKey, label: "Note news times, wait 15 min", desc: "Mark the times — stay out for 15 min before & after major events" },
    ],
  },
  {
    id: 2,
    title: "Find the Big Trend",
    color: "#00C896",
    items: [
      { key: "findDailyTrend" as SmartMoneyKey, label: "Identify HTF trend (daily chart)", desc: "Is price making higher highs/lows (bull) or lower highs/lows (bear)?" },
      { key: "findHTFBias" as SmartMoneyKey, label: "Set your market bias", desc: "Bullish, Bearish, or Neutral — fill in your Draw on Liquidity target" },
      { key: "markDOL" as SmartMoneyKey, label: "Mark your Draw on Liquidity (DOL)", desc: "Where is price being drawn to? Previous highs, lows, or a key level?" },
    ],
  },
  {
    id: 3,
    title: "Mark Your Zones",
    color: "#818CF8",
    items: [
      { key: "markFVG" as SmartMoneyKey, label: "Mark Fair Value Gaps (FVGs)", desc: "Highlight any unfilled imbalances on the 4H/1H chart" },
      { key: "markPrevDayHL" as SmartMoneyKey, label: "Mark Previous Day H/L", desc: "Mark yesterday's high and low — these are key liquidity targets" },
      { key: "markOrderBlocks" as SmartMoneyKey, label: "Mark Order Blocks", desc: "Identify significant institutional order blocks near price" },
    ],
  },
  {
    id: 4,
    title: "Check the Clock",
    color: "#06B6D4",
    items: [
      { key: "checkKillZone" as SmartMoneyKey, label: "Confirm your kill zone", desc: "Only trade during London (2–5 AM), NY Open (7–10 AM), or Silver Bullet (10–11 AM) EST" },
    ],
  },
  {
    id: 5,
    title: "Risk and Mindset",
    color: "#EF4444",
    items: [
      { key: "setRisk" as SmartMoneyKey, label: "Set your risk % for today", desc: "Max 1% per trade — enter your risk in the field below" },
      { key: "checkMindset" as SmartMoneyKey, label: "Am I calm and focused?", desc: "If you're angry, tired, or distracted — sit out. No trade is worth it." },
    ],
  },
];

export const ROUTINE_ITEMS = SMART_MONEY_SECTIONS.flatMap((s) =>
  s.items.map((item) => ({
    key: item.key,
    label: item.label,
    icon: "",
    desc: item.desc,
  }))
);

export function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

function loadRoutineTimes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ROUTINE_TIMES_KEY);
    if (raw) return { ...DEFAULT_ROUTINE_TIMES, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_ROUTINE_TIMES };
}

function saveRoutineTimes(times: Record<string, string>) {
  localStorage.setItem(ROUTINE_TIMES_KEY, JSON.stringify(times));
}

export function useTodaySchedule(routineItemsChecked: Record<string, boolean>) {
  const [routineTimes, setRoutineTimes] = useState<Record<string, string>>(() => loadRoutineTimes());

  const saveTime = useCallback((key: string, value: string) => {
    const trimmed = value.trim();
    setRoutineTimes((prev) => {
      const updated = { ...prev, [key]: trimmed || DEFAULT_ROUTINE_TIMES[key] };
      saveRoutineTimes(updated);
      return updated;
    });
  }, []);

  const sortedSchedule = [
    ...ROUTINE_ITEMS.map((item) => ({
      id: item.key,
      label: item.label,
      timeStr: routineTimes[item.key] || DEFAULT_ROUTINE_TIMES[item.key],
      mins: parseTimeToMinutes(routineTimes[item.key] || DEFAULT_ROUTINE_TIMES[item.key]),
      checked: routineItemsChecked[item.key] ?? false,
      type: "routine" as const,
      icon: item.icon,
      desc: item.desc,
    })),
  ].sort((a, b) => a.mins - b.mins);

  return { routineTimes, saveTime, sortedSchedule };
}
