import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export interface AppConfig {
  app_name: string;
  app_tagline: string;
  founder_limit: string;
  founder_discount_pct: string;
  founder_discount_months: string;
  annual_discount_pct: string;
  cooldown_duration_hours: string;
  consecutive_loss_threshold: string;
  gate_lockout_minutes: string;
  risk_daily_limit_pct: string;
  risk_weekly_limit_pct: string;
  routine_items: string;
  ai_mentor_system_prompt: string;
  feature_discipline_gate: string;
  feature_cooldown_timer: string;
  feature_hall_of_fame: string;
  feature_win_rate_estimator: string;
  feature_casino_elements: string;
  [key: string]: string;
}

const DEFAULTS: AppConfig = {
  app_name: "The Trading Mentor",
  app_tagline: "AI-Powered Trading Intelligence",
  founder_limit: "20",
  founder_discount_pct: "50",
  founder_discount_months: "6",
  annual_discount_pct: "17",
  cooldown_duration_hours: "4",
  consecutive_loss_threshold: "2",
  gate_lockout_minutes: "60",
  risk_daily_limit_pct: "2",
  risk_weekly_limit_pct: "4",
  routine_items: "[]",
  ai_mentor_system_prompt: "",
  feature_discipline_gate: "true",
  feature_cooldown_timer: "true",
  feature_hall_of_fame: "true",
  feature_win_rate_estimator: "true",
  feature_casino_elements: "true",
};

interface AppConfigCtx {
  config: AppConfig;
  loading: boolean;
  reload: () => Promise<void>;
  isFeatureEnabled: (key: string) => boolean;
  getNumber: (key: string, fallback: number) => number;
}

const AppConfigContext = createContext<AppConfigCtx>({
  config: DEFAULTS,
  loading: true,
  reload: async () => {},
  isFeatureEnabled: () => true,
  getNumber: (_, fb) => fb,
});

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/admin/app-config`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setConfig({ ...DEFAULTS, ...data });
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const isFeatureEnabled = useCallback((key: string) => {
    const val = config[key];
    return val !== "false" && val !== "0";
  }, [config]);

  const getNumber = useCallback((key: string, fallback: number) => {
    const val = parseFloat(config[key]);
    return isNaN(val) ? fallback : val;
  }, [config]);

  return (
    <AppConfigContext.Provider value={{ config, loading, reload: load, isFeatureEnabled, getNumber }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  return useContext(AppConfigContext);
}
