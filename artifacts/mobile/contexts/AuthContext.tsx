import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { apiGet, apiPost, apiPatch, apiPut, saveToken, deleteToken } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ACADEMY_PROGRESS_KEY = "ict-academy-progress";

async function prewarmAcademyProgress(): Promise<void> {
  try {
    const data = await apiGet<{ lessonIds: string[] }>("academy/progress");
    const serverIds: string[] = data.lessonIds || [];
    if (serverIds.length === 0) return;
    const raw = await AsyncStorage.getItem(ACADEMY_PROGRESS_KEY);
    const localIds: string[] = raw ? JSON.parse(raw).filter(Boolean) : [];
    const merged = Array.from(new Set([...localIds, ...serverIds]));
    await AsyncStorage.setItem(ACADEMY_PROGRESS_KEY, JSON.stringify(merged));
    if (merged.length > serverIds.length) {
      await apiPut("academy/progress", { lessonIds: merged });
    }
  } catch {}
}

interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
  isFounder: boolean;
  founderNumber: number | null;
  appMode?: "full" | "lite";
  avatarUrl?: string | null;
}

interface AuthSubscription {
  tierLevel: number;
  tierName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  subscription: AuthSubscription | null;
  loading: boolean;
  appMode: "full" | "lite";
  setAppMode: (mode: "full" | "lite") => void;
  setAvatarUrl: (url: string | null) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
}

interface AuthMeResponse {
  user: AuthUser;
  subscription: AuthSubscription | null;
}

interface AuthLoginResponse {
  token?: string;
  user: AuthUser;
  subscription?: AuthSubscription | null;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  subscription: null,
  loading: true,
  appMode: "full",
  setAppMode: () => {},
  setAvatarUrl: async () => {},
  refresh: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [subscription, setSubscription] = useState<AuthSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [appMode, setAppModeState] = useState<"full" | "lite">("full");

  const refresh = useCallback(async () => {
    try {
      const data = await apiGet<AuthMeResponse>("auth/me");
      setUser(data.user ?? null);
      setSubscription(data.subscription ?? null);
      if (data.user?.appMode === "lite" || data.user?.appMode === "full") {
        setAppModeState(data.user.appMode);
      }
      if (data.user) {
        prewarmAcademyProgress();
      }
    } catch {
      setUser(null);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const setAppMode = useCallback(async (mode: "full" | "lite") => {
    setAppModeState(mode);
    try {
      await apiPatch("user/settings", { section: "appMode", data: { mode } });
    } catch {}
  }, []);

  const setAvatarUrl = useCallback(async (url: string | null) => {
    setUser((prev) => prev ? { ...prev, avatarUrl: url } : null);
    try {
      await apiPatch("user-settings/avatar", { avatarUrl: url });
    } catch {}
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost("auth/logout", {});
    } catch {}
    await deleteToken();
    setUser(null);
    setSubscription(null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <AuthContext.Provider value={{ user, subscription, loading, appMode, setAppMode, setAvatarUrl, refresh, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export async function handleAuthResponse(data: AuthLoginResponse): Promise<void> {
  if (data.token) {
    await saveToken(data.token);
  }
}
