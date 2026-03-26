import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAppConfig } from "./AppConfigContext";

interface RoutineItem {
  key: string;
  label: string;
  desc: string;
  icon: string;
}

export interface TradePlanDefaults {
  targetSession: string;
}

export const DEFAULT_TRADE_PLAN_DEFAULTS: TradePlanDefaults = {
  targetSession: "",
};

interface PlannerState {
  routineItems: Record<string, boolean>;
  routineConfig: RoutineItem[];
  isRoutineComplete: boolean;
  routineCompletedToday: boolean;
  plannerLoaded: boolean;
  tradePlanDefaults: TradePlanDefaults;
  toggleItem: (key: string) => void;
  resetRoutine: () => void;
}

const PlannerContext = createContext<PlannerState | null>(null);

function getTodayKey() {
  return `planner_web_${new Date().toISOString().split("T")[0]}`;
}

const FALLBACK_ITEMS: RoutineItem[] = [
  { key: "water", label: "Drink Water", desc: "Hydrate before you start trading", icon: "Droplets" },
  { key: "breathing", label: "Breathing Exercise", desc: "5 minutes of calm, focused breathing", icon: "Wind" },
  { key: "news", label: "Check for Big News Events", desc: "Are there any big news events today that could move the market?", icon: "Newspaper" },
  { key: "bias", label: "Check the Big Picture Chart", desc: "HTF (Higher Timeframe) — Is the market going up or down today?", icon: "BarChart3" },
];

export function PlannerProvider({ children }: { children: ReactNode }) {
  const { config } = useAppConfig();
  const [routineItems, setRoutineItems] = useState<Record<string, boolean>>({});
  const [todayKey, setTodayKey] = useState(getTodayKey);
  const [plannerLoaded, setPlannerLoaded] = useState(false);

  let routineConfig: RoutineItem[] = FALLBACK_ITEMS;
  try {
    const parsed = JSON.parse(config.routine_items || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) routineConfig = parsed;
  } catch {}

  const routineKeys = routineConfig.map((r) => r.key);

  useEffect(() => {
    const key = todayKey;
    const stored = localStorage.getItem(key);
    const merged: Record<string, boolean> = {};
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        routineKeys.forEach((k) => { merged[k] = !!parsed[k]; });
      } catch {
        routineKeys.forEach((k) => { merged[k] = false; });
      }
    } else {
      routineKeys.forEach((k) => { merged[k] = false; });
    }
    setRoutineItems(merged);
    setPlannerLoaded(true);
  }, [config.routine_items, todayKey]);

  useEffect(() => {
    const msUntilMidnight = () => {
      const now = new Date();
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
      return midnight.getTime() - now.getTime();
    };
    let timeoutId: ReturnType<typeof setTimeout>;
    const scheduleReset = () => {
      timeoutId = setTimeout(() => {
        setTodayKey(getTodayKey());
        setPlannerLoaded(false);
        scheduleReset();
      }, msUntilMidnight());
    };
    scheduleReset();
    return () => clearTimeout(timeoutId);
  }, []);

  const persist = useCallback((items: Record<string, boolean>) => {
    localStorage.setItem(getTodayKey(), JSON.stringify(items));
  }, []);

  const toggleItem = useCallback((key: string) => {
    setRoutineItems((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      persist(next);
      return next;
    });
  }, [persist]);

  const resetRoutine = useCallback(() => {
    const reset: Record<string, boolean> = {};
    routineKeys.forEach((k) => { reset[k] = false; });
    setRoutineItems(reset);
    persist(reset);
  }, [routineKeys, persist]);

  const isRoutineComplete = plannerLoaded && routineKeys.length > 0 && routineKeys.every((k) => routineItems[k]);

  return (
    <PlannerContext.Provider value={{
      routineItems,
      routineConfig,
      isRoutineComplete,
      routineCompletedToday: isRoutineComplete,
      plannerLoaded,
      tradePlanDefaults: DEFAULT_TRADE_PLAN_DEFAULTS,
      toggleItem,
      resetRoutine,
    }}>
      {children}
    </PlannerContext.Provider>
  );
}

export function usePlanner() {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error("usePlanner must be used within PlannerProvider");
  return ctx;
}
