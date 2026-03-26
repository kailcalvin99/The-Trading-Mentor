import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";
import { useAppConfig } from "./AppConfigContext";

interface RoutineItem {
  key: string;
  label: string;
  desc: string;
  icon: string;
}

export interface TradePlanDefaults {
  targetSession: string;
  marketBias: string;
  drawOnLiquidity: string;
  zoneNotes: string;
  riskPct: string;
  detectedKillZone: string;
}

export const DEFAULT_TRADE_PLAN_DEFAULTS: TradePlanDefaults = {
  targetSession: "",
  marketBias: "",
  drawOnLiquidity: "",
  zoneNotes: "",
  riskPct: "",
  detectedKillZone: "",
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
  setTradePlanDefault: (key: keyof TradePlanDefaults, value: string) => void;
}

const PlannerContext = createContext<PlannerState | null>(null);

function getTodayKey() {
  return `planner_web_${new Date().toISOString().split("T")[0]}`;
}

function getTradePlanDefaultsKey() {
  return `planner_trade_defaults_${new Date().toISOString().split("T")[0]}`;
}

const FALLBACK_ITEMS: RoutineItem[] = [
  { key: "checkNews", label: "Open an economic calendar", desc: "Check for high-impact red folder news events today", icon: "Newspaper" },
  { key: "markNewsTime", label: "Note news times, wait 15 min", desc: "Mark the times — stay out for 15 min before & after major events", icon: "Clock" },
  { key: "findDailyTrend", label: "Identify HTF trend (daily chart)", desc: "Is price making higher highs/lows (bull) or lower highs/lows (bear)?", icon: "TrendingUp" },
  { key: "findHTFBias", label: "Set your market bias", desc: "Bullish, Bearish, or Neutral — fill in your Draw on Liquidity target", icon: "BarChart3" },
  { key: "markDOL", label: "Mark your Draw on Liquidity (DOL)", desc: "Where is price being drawn to? Previous highs, lows, or a key level?", icon: "Target" },
  { key: "markFVG", label: "Mark Fair Value Gaps (FVGs)", desc: "Highlight any unfilled imbalances on the 4H/1H chart", icon: "Layers" },
  { key: "markPrevDayHL", label: "Mark Previous Day H/L", desc: "Mark yesterday's high and low — these are key liquidity targets", icon: "ArrowUpDown" },
  { key: "markOrderBlocks", label: "Mark Order Blocks", desc: "Identify significant institutional order blocks near price", icon: "Square" },
  { key: "checkKillZone", label: "Confirm your kill zone", desc: "Only trade during London, NY Open, or Silver Bullet session EST", icon: "Clock" },
  { key: "setRisk", label: "Set your risk % for today", desc: "Max 1% per trade — enter your risk in the field below", icon: "Shield" },
  { key: "checkMindset", label: "Am I calm and focused?", desc: "If you're angry, tired, or distracted — sit out. No trade is worth it.", icon: "Heart" },
];

function loadTradePlanDefaults(): TradePlanDefaults {
  try {
    const raw = localStorage.getItem(getTradePlanDefaultsKey());
    if (raw) return { ...DEFAULT_TRADE_PLAN_DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_TRADE_PLAN_DEFAULTS };
}

export function PlannerProvider({ children }: { children: ReactNode }) {
  const { config } = useAppConfig();
  const [routineItems, setRoutineItems] = useState<Record<string, boolean>>({});
  const [todayKey, setTodayKey] = useState(getTodayKey);
  const [plannerLoaded, setPlannerLoaded] = useState(false);
  const [tradePlanDefaults, setTradePlanDefaultsState] = useState<TradePlanDefaults>(loadTradePlanDefaults);

  let routineConfig: RoutineItem[] = FALLBACK_ITEMS;
  try {
    const parsed = JSON.parse(config.routine_items || "[]");
    if (Array.isArray(parsed) && parsed.length > 0) routineConfig = parsed;
  } catch {}

  const routineKeys = useMemo(() => routineConfig.map((r) => r.key), [config.routine_items]);

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
        setTradePlanDefaultsState({ ...DEFAULT_TRADE_PLAN_DEFAULTS });
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

  const setTradePlanDefault = useCallback((key: keyof TradePlanDefaults, value: string) => {
    setTradePlanDefaultsState((prev) => {
      const next = { ...prev, [key]: value };
      try {
        localStorage.setItem(getTradePlanDefaultsKey(), JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const isRoutineComplete = plannerLoaded && routineKeys.length > 0 && routineKeys.every((k) => routineItems[k]);

  return (
    <PlannerContext.Provider value={{
      routineItems,
      routineConfig,
      isRoutineComplete,
      routineCompletedToday: isRoutineComplete,
      plannerLoaded,
      tradePlanDefaults,
      toggleItem,
      resetRoutine,
      setTradePlanDefault,
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
