import { useState, useCallback } from "react";

export const ROUTINE_TIMES_KEY = "routine_times_v1";

export const DEFAULT_ROUTINE_TIMES: Record<string, string> = {
  water: "7:00 AM",
  breathing: "7:15 AM",
  news: "7:30 AM",
  bias: "8:00 AM",
};

export const ROUTINE_ITEMS = [
  { key: "water" as const, label: "Water & Physical Reset", icon: "💧", desc: "Hydrate, stretch, step outside 2 min" },
  { key: "breathing" as const, label: "5-Min Box Breathing", icon: "🧘", desc: "Inhale 4s → Hold 4s → Exhale 4s → Hold 4s" },
  { key: "news" as const, label: "Check for Big News Events", icon: "📰", desc: "Are there any big news events today?" },
  { key: "bias" as const, label: "Check the Big Picture Chart", icon: "📈", desc: "HTF — Is the market going up or down today?" },
];

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
