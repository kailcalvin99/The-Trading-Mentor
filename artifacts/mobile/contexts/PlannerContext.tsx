import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ROUTINE_KEYS = ["water", "breathing", "news", "bias"] as const;
type RoutineKey = (typeof ROUTINE_KEYS)[number];

interface PlannerState {
  routineItems: Record<RoutineKey, boolean>;
  isRoutineComplete: boolean;
  hasRedNews: boolean;
  toggleItem: (key: RoutineKey) => void;
  toggleRedNews: () => void;
  resetRoutine: () => void;
}

const PlannerContext = createContext<PlannerState | null>(null);

function getTodayKey() {
  return `planner_${new Date().toISOString().split("T")[0]}`;
}

const DEFAULT_ITEMS: Record<RoutineKey, boolean> = {
  water: false,
  breathing: false,
  news: false,
  bias: false,
};

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [routineItems, setRoutineItems] = useState<Record<RoutineKey, boolean>>({ ...DEFAULT_ITEMS });
  const [hasRedNews, setHasRedNews] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(getTodayKey()).then((val) => {
      if (val) {
        const saved = JSON.parse(val);
        setRoutineItems(saved.routineItems ?? DEFAULT_ITEMS);
        setHasRedNews(saved.hasRedNews ?? false);
      }
    });
  }, []);

  const persist = useCallback((items: Record<RoutineKey, boolean>, redNews: boolean) => {
    AsyncStorage.setItem(getTodayKey(), JSON.stringify({ routineItems: items, hasRedNews: redNews }));
  }, []);

  const toggleItem = useCallback(
    (key: RoutineKey) => {
      setRoutineItems((prev) => {
        const updated = { ...prev, [key]: !prev[key] };
        persist(updated, hasRedNews);
        return updated;
      });
    },
    [hasRedNews, persist]
  );

  const toggleRedNews = useCallback(() => {
    setHasRedNews((prev) => {
      persist(routineItems, !prev);
      return !prev;
    });
  }, [routineItems, persist]);

  const resetRoutine = useCallback(() => {
    setRoutineItems({ ...DEFAULT_ITEMS });
    setHasRedNews(false);
    persist({ ...DEFAULT_ITEMS }, false);
  }, [persist]);

  const isRoutineComplete = ROUTINE_KEYS.every((k) => routineItems[k]);

  return (
    <PlannerContext.Provider
      value={{ routineItems, isRoutineComplete, hasRedNews, toggleItem, toggleRedNews, resetRoutine }}
    >
      {children}
    </PlannerContext.Provider>
  );
}

export function usePlanner() {
  const ctx = useContext(PlannerContext);
  if (!ctx) throw new Error("usePlanner must be used within PlannerProvider");
  return ctx;
}
