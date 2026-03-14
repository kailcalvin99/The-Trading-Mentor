import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

const ROUTINE_KEYS = ["water", "breathing", "news", "bias"] as const;
type RoutineKey = (typeof ROUTINE_KEYS)[number];

interface CustomRoutineItem {
  id: string;
  label: string;
  checked: boolean;
  snoozedDate: string | null;
}

interface PlannerState {
  routineItems: Record<RoutineKey, boolean>;
  isRoutineComplete: boolean;
  hasRedNews: boolean;
  toggleItem: (key: RoutineKey) => void;
  toggleRedNews: () => void;
  resetRoutine: () => void;
  customItems: CustomRoutineItem[];
  addCustomItem: (label: string) => void;
  removeCustomItem: (id: string) => void;
  toggleCustomItem: (id: string) => void;
  snoozeCustomItem: (id: string) => void;
}

const PlannerContext = createContext<PlannerState | null>(null);

function getNYDate(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });
}

function getTodayKey() {
  return `planner_${getNYDate()}`;
}

function getTodayDate() {
  return getNYDate();
}

const CUSTOM_ITEMS_KEY = "planner_custom_items";
const CUSTOM_ITEMS_LAST_RESET_KEY = "planner_custom_items_last_reset";

const DEFAULT_ITEMS: Record<RoutineKey, boolean> = {
  water: false,
  breathing: false,
  news: false,
  bias: false,
};

export function PlannerProvider({ children }: { children: React.ReactNode }) {
  const [routineItems, setRoutineItems] = useState<Record<RoutineKey, boolean>>({ ...DEFAULT_ITEMS });
  const [hasRedNews, setHasRedNews] = useState(false);
  const [customItems, setCustomItems] = useState<CustomRoutineItem[]>([]);
  const [lastLoadedDate, setLastLoadedDate] = useState(getTodayDate());

  const loadCustomItems = useCallback((forceReset = false) => {
    const val = localStorage.getItem(CUSTOM_ITEMS_KEY);
    const lastReset = localStorage.getItem(CUSTOM_ITEMS_LAST_RESET_KEY);
    if (!val) return;
    try {
      const saved: CustomRoutineItem[] = JSON.parse(val);
      const today = getTodayDate();
      const needsReset = forceReset || lastReset !== today;
      const items = needsReset
        ? saved.map((item) => ({
            ...item,
            checked: false,
            snoozedDate: item.snoozedDate === today ? today : null,
          }))
        : saved.map((item) => ({
            ...item,
            snoozedDate: item.snoozedDate === today ? today : null,
          }));
      setCustomItems(items);
      if (needsReset) {
        localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(items));
        localStorage.setItem(CUSTOM_ITEMS_LAST_RESET_KEY, today);
      }
    } catch {
      localStorage.removeItem(CUSTOM_ITEMS_KEY);
      localStorage.removeItem(CUSTOM_ITEMS_LAST_RESET_KEY);
    }
  }, []);

  useEffect(() => {
    const val = localStorage.getItem(getTodayKey());
    if (val) {
      try {
        const saved = JSON.parse(val);
        setRoutineItems(saved.routineItems ?? { ...DEFAULT_ITEMS });
        setHasRedNews(saved.hasRedNews ?? false);
      } catch {}
    }
    loadCustomItems();
  }, [loadCustomItems]);

  useEffect(() => {
    const interval = setInterval(() => {
      const today = getTodayDate();
      if (today !== lastLoadedDate) {
        setLastLoadedDate(today);
        setRoutineItems({ ...DEFAULT_ITEMS });
        setHasRedNews(false);
        loadCustomItems(true);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [lastLoadedDate, loadCustomItems]);

  const persist = useCallback((items: Record<RoutineKey, boolean>, redNews: boolean) => {
    localStorage.setItem(getTodayKey(), JSON.stringify({ routineItems: items, hasRedNews: redNews }));
  }, []);

  const persistCustomItems = useCallback((items: CustomRoutineItem[]) => {
    localStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(items));
    localStorage.setItem(CUSTOM_ITEMS_LAST_RESET_KEY, getTodayDate());
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

  const addCustomItem = useCallback((label: string) => {
    setCustomItems((prev) => {
      const newItem: CustomRoutineItem = {
        id: Date.now().toString(),
        label: label.trim(),
        checked: false,
        snoozedDate: null,
      };
      const updated = [...prev, newItem];
      persistCustomItems(updated);
      return updated;
    });
  }, [persistCustomItems]);

  const removeCustomItem = useCallback((id: string) => {
    setCustomItems((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      persistCustomItems(updated);
      return updated;
    });
  }, [persistCustomItems]);

  const toggleCustomItem = useCallback((id: string) => {
    setCustomItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      );
      persistCustomItems(updated);
      return updated;
    });
  }, [persistCustomItems]);

  const snoozeCustomItem = useCallback((id: string) => {
    setCustomItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, snoozedDate: getTodayDate() } : item
      );
      persistCustomItems(updated);
      return updated;
    });
  }, [persistCustomItems]);

  const isRoutineComplete = ROUTINE_KEYS.every((k) => routineItems[k]);

  return (
    <PlannerContext.Provider
      value={{
        routineItems,
        isRoutineComplete,
        hasRedNews,
        toggleItem,
        toggleRedNews,
        resetRoutine,
        customItems,
        addCustomItem,
        removeCustomItem,
        toggleCustomItem,
        snoozeCustomItem,
      }}
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

export type { RoutineKey, CustomRoutineItem };
