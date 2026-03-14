import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const ROUTINE_KEYS = ["water", "breathing", "news", "bias"] as const;
type RoutineKey = (typeof ROUTINE_KEYS)[number];

interface PlannerState {
  routineItems: Record<RoutineKey, boolean>;
  isRoutineComplete: boolean;
  toggleItem: (key: RoutineKey) => void;
  resetRoutine: () => void;
}

const PlannerContext = createContext<PlannerState | null>(null);

function getTodayKey() {
  return `planner_web_${new Date().toISOString().split("T")[0]}`;
}

const DEFAULT_ITEMS: Record<RoutineKey, boolean> = {
  water: false,
  breathing: false,
  news: false,
  bias: false,
};

export function PlannerProvider({ children }: { children: ReactNode }) {
  const [routineItems, setRoutineItems] = useState<Record<RoutineKey, boolean>>({ ...DEFAULT_ITEMS });

  useEffect(() => {
    const key = getTodayKey();
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setRoutineItems(JSON.parse(stored));
      } catch {
        setRoutineItems({ ...DEFAULT_ITEMS });
      }
    }
  }, []);

  const persist = useCallback((items: Record<RoutineKey, boolean>) => {
    localStorage.setItem(getTodayKey(), JSON.stringify(items));
  }, []);

  const toggleItem = useCallback((key: RoutineKey) => {
    setRoutineItems((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      persist(next);
      return next;
    });
  }, [persist]);

  const resetRoutine = useCallback(() => {
    const reset = { ...DEFAULT_ITEMS };
    setRoutineItems(reset);
    persist(reset);
  }, [persist]);

  const isRoutineComplete = ROUTINE_KEYS.every((k) => routineItems[k]);

  return (
    <PlannerContext.Provider value={{ routineItems, isRoutineComplete, toggleItem, resetRoutine }}>
      {children}
    </PlannerContext.Provider>
  );
}

export function usePlanner() {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error("usePlanner must be used within PlannerProvider");
  return ctx;
}
