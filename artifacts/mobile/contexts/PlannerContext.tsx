import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

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
  routineCompletedToday: boolean;
  hasRedNews: boolean;
  toggleItem: (key: RoutineKey) => void;
  toggleRedNews: () => void;
  resetRoutine: () => void;
  customItems: CustomRoutineItem[];
  addCustomItem: (label: string) => void;
  removeCustomItem: (id: string) => void;
  renameCustomItem: (id: string, label: string) => void;
  toggleCustomItem: (id: string) => void;
  snoozeCustomItem: (id: string) => void;
}

const PlannerContext = createContext<PlannerState | null>(null);

function getTodayKey() {
  return `planner_${new Date().toISOString().split("T")[0]}`;
}

function getTodayDate() {
  return new Date().toISOString().split("T")[0];
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
    Promise.all([
      AsyncStorage.getItem(CUSTOM_ITEMS_KEY),
      AsyncStorage.getItem(CUSTOM_ITEMS_LAST_RESET_KEY),
    ]).then(([val, lastReset]) => {
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
          AsyncStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(items));
          AsyncStorage.setItem(CUSTOM_ITEMS_LAST_RESET_KEY, today);
        }
      } catch {
        // corrupted data — reset
        AsyncStorage.removeItem(CUSTOM_ITEMS_KEY);
        AsyncStorage.removeItem(CUSTOM_ITEMS_LAST_RESET_KEY);
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(getTodayKey()).then((val) => {
      if (val) {
        const saved = JSON.parse(val);
        setRoutineItems(saved.routineItems ?? DEFAULT_ITEMS);
        setHasRedNews(saved.hasRedNews ?? false);
      }
    });
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
    AsyncStorage.setItem(getTodayKey(), JSON.stringify({ routineItems: items, hasRedNews: redNews }));
  }, []);

  const persistCustomItems = useCallback((items: CustomRoutineItem[]) => {
    AsyncStorage.setItem(CUSTOM_ITEMS_KEY, JSON.stringify(items));
    AsyncStorage.setItem(CUSTOM_ITEMS_LAST_RESET_KEY, getTodayDate());
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

  const renameCustomItem = useCallback((id: string, label: string) => {
    const trimmed = label.trim();
    if (!trimmed) return;
    setCustomItems((prev) => {
      const updated = prev.map((item) =>
        item.id === id ? { ...item, label: trimmed } : item
      );
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
        routineCompletedToday: isRoutineComplete,
        hasRedNews,
        toggleItem,
        toggleRedNews,
        resetRoutine,
        customItems,
        addCustomItem,
        removeCustomItem,
        renameCustomItem,
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
