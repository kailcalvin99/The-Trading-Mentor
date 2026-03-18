import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "dashboard-widget-prefs-v2";

export interface DashboardWidget {
  id: string;
  label: string;
  defaultOn: boolean;
}

export const DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: "killzone", label: "Kill Zone Countdown", defaultOn: true },
  { id: "stats", label: "Today's Stats Strip", defaultOn: true },
  { id: "morningroutine", label: "Morning Routine", defaultOn: true },
  { id: "checklist", label: "Pre-Trade Checklist", defaultOn: true },
  { id: "tradeplan", label: "Today's Trade Plan", defaultOn: true },
  { id: "riskshield", label: "Risk Shield Mini", defaultOn: true },
  { id: "quickjournal", label: "Quick Journal Entry", defaultOn: true },
];

// Always-on widgets not shown in customizer
export const ALWAYS_ON_WIDGETS = ["greeting", "mission"] as const;

function getDefaultPrefs(): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  DASHBOARD_WIDGETS.forEach((w) => { result[w.id] = w.defaultOn; });
  return result;
}

function loadPrefs(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      const defaults = getDefaultPrefs();
      return { ...defaults, ...parsed };
    }
  } catch {}
  return getDefaultPrefs();
}

export function useDashboardWidgets() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(loadPrefs);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        setPrefs(loadPrefs());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const toggle = useCallback((id: string) => {
    setPrefs((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const isEnabled = useCallback((id: string) => prefs[id] !== false, [prefs]);

  return { prefs, toggle, isEnabled };
}
