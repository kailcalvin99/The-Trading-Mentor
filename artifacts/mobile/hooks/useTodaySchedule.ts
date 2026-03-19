import { useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";

export const ROUTINE_TIMES_KEY = "routine_times_v1";

export const DEFAULT_ROUTINE_TIMES: Record<string, string> = {
  water: "7:00 AM",
  breathing: "7:15 AM",
  news: "7:30 AM",
  bias: "8:00 AM",
};

export const ROUTINE_ITEMS = [
  { key: "water" as const, label: "Water & Physical Reset", icon: "water-outline" as const, desc: "Hydrate, stretch, step outside 2 min" },
  { key: "breathing" as const, label: "5-Min Box Breathing", icon: "body-outline" as const, desc: "Inhale 4s → Hold 4s → Exhale 4s → Hold 4s" },
  { key: "news" as const, label: "Check for Big News Events", icon: "newspaper-outline" as const, desc: "Are there any big news events today?" },
  { key: "bias" as const, label: "Check the Big Picture Chart", icon: "trending-up-outline" as const, desc: "HTF — Is the market going up or down today?" },
];

export const SESSION_SCHEDULE = [
  { name: "NY Open", subtitle: "9:30 AM EST — Main session opens", startH: 9, startM: 30, endH: 10, endM: 0, color: "#00C896", icon: "trending-up" as const },
  { name: "Silver Bullet", subtitle: "10:00–11:00 AM EST — Prime ICT window", startH: 10, startM: 0, endH: 11, endM: 0, color: "#F59E0B", icon: "flash" as const },
  { name: "London Open", subtitle: "2:00–5:00 AM EST — European session", startH: 2, startM: 0, endH: 5, endM: 0, color: "#818CF8", icon: "globe" as const },
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

export function useTodaySchedule(routineItemsChecked: Record<string, boolean>) {
  const [routineTimes, setRoutineTimes] = useState<Record<string, string>>({ ...DEFAULT_ROUTINE_TIMES });

  const loadTimes = useCallback(async () => {
    const raw = await AsyncStorage.getItem(ROUTINE_TIMES_KEY);
    if (raw) {
      try {
        setRoutineTimes({ ...DEFAULT_ROUTINE_TIMES, ...JSON.parse(raw) });
      } catch {}
    }

    try {
      const { apiGet } = await import("@/lib/api");
      const res = await apiGet<{ routineTimes?: Record<string, string> | null }>("user-settings");
      if (res.routineTimes && typeof res.routineTimes === "object") {
        const merged = { ...DEFAULT_ROUTINE_TIMES, ...res.routineTimes };
        setRoutineTimes(merged);
        AsyncStorage.setItem(ROUTINE_TIMES_KEY, JSON.stringify(merged));
      } else if (raw) {
        try {
          const localTimes = JSON.parse(raw);
          const hasCustom = Object.keys(localTimes).some((k) => localTimes[k] !== DEFAULT_ROUTINE_TIMES[k]);
          if (hasCustom) {
            const { apiPatch } = await import("@/lib/api");
            apiPatch("user-settings", { section: "routineTimes", data: { times: localTimes } }).catch(() => {});
          }
        } catch {}
      }
    } catch {}
  }, []);

  const saveTime = useCallback((key: string, value: string) => {
    const valid = /^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(value.trim());
    if (!valid) {
      Alert.alert("Invalid Time", "Use format like 7:30 AM or 10:00 PM");
      return;
    }
    setRoutineTimes((prev) => {
      const updated = { ...prev, [key]: value.trim() };
      AsyncStorage.setItem(ROUTINE_TIMES_KEY, JSON.stringify(updated));
      import("@/lib/api").then(({ apiPatch }) => {
        apiPatch("user-settings", { section: "routineTimes", data: { times: updated } }).catch(() => {});
      });
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
      color: "#00C896",
      icon: item.icon,
      desc: item.desc,
    })),
    ...SESSION_SCHEDULE.map((s) => ({
      id: s.name,
      label: s.name,
      timeStr: s.subtitle.split(" — ")[0],
      mins: s.startH * 60 + s.startM,
      checked: false,
      type: "session" as const,
      color: s.color,
      icon: s.icon,
      desc: s.subtitle,
    })),
  ].sort((a, b) => a.mins - b.mins);

  return { routineTimes, loadTimes, saveTime, sortedSchedule };
}
