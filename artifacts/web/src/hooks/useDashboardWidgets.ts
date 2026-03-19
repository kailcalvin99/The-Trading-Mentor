import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "dashboard-widget-prefs-v2";

export interface DashboardWidget {
  id: string;
  label: string;
  defaultOn: boolean;
}

export const DASHBOARD_WIDGETS: DashboardWidget[] = [
  { id: "mastermorning", label: "Master Morning Plan", defaultOn: true },
  { id: "tradingcalendar", label: "Trading Calendar", defaultOn: true },
  { id: "quickjournal", label: "Quick Note", defaultOn: true },
];

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

async function syncWidgetPrefsFromApi(): Promise<Record<string, boolean> | null> {
  try {
    const res = await fetch("/api/user-settings", { credentials: "include" });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.widgetPrefs && typeof data.widgetPrefs === "object") {
      return data.widgetPrefs;
    }
  } catch {}
  return null;
}

async function saveWidgetPrefsToApi(prefs: Record<string, boolean>): Promise<void> {
  try {
    await fetch("/api/user-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ section: "widgetPrefs", data: { prefs } }),
    });
  } catch {}
}

export function useDashboardWidgets() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(loadPrefs);

  useEffect(() => {
    syncWidgetPrefsFromApi().then((apiPrefs) => {
      if (apiPrefs) {
        const defaults = getDefaultPrefs();
        const merged = { ...defaults, ...apiPrefs };
        setPrefs(merged);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
      } else {
        const local = loadPrefs();
        const defaults = getDefaultPrefs();
        if (JSON.stringify(local) !== JSON.stringify(defaults)) {
          saveWidgetPrefsToApi(local);
        }
      }
    });

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
      saveWidgetPrefsToApi(next);
      return next;
    });
  }, []);

  const isEnabled = useCallback((id: string) => prefs[id] !== false, [prefs]);

  return { prefs, toggle, isEnabled };
}
