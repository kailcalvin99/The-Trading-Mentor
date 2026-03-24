import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { Alert } from "react-native";
import { apiGet, apiPost, apiPatch, apiPut, saveToken, deleteToken, setOn401Handler } from "@/lib/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { COURSE_CHAPTERS } from "@/data/academy-data";

const SESSION_CLEARED_KEY = "session_cleared_v1";

async function clearSessionOnce(): Promise<void> {
  try {
    const already = await AsyncStorage.getItem(SESSION_CLEARED_KEY);
    if (!already) {
      await SecureStore.deleteItemAsync("auth_token");
      await AsyncStorage.setItem(SESSION_CLEARED_KEY, "1");
    }
  } catch {}
}

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
  isAdmin: boolean;
  tierLevel: number;
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
  isAdmin: false,
  tierLevel: 0,
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
  const sessionExpiredShown = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const data = await apiGet<AuthMeResponse>("auth/me");
      setUser(data.user ?? null);
      setSubscription(data.subscription ?? null);
      if (data.user) {
        const totalLessons = COURSE_CHAPTERS.reduce((sum, ch) => sum + ch.lessons.length, 0);
        let completedIds: string[] = [];
        try {
          const progressData = await apiGet<{ lessonIds: string[] }>("academy/progress");
          completedIds = progressData.lessonIds || [];
        } catch {
          try {
            const raw = await AsyncStorage.getItem(ACADEMY_PROGRESS_KEY);
            completedIds = raw ? JSON.parse(raw).filter(Boolean) : [];
          } catch {}
        }
        const uniqueCompleted = new Set<string>(completedIds).size;
        const allDone = totalLessons > 0 && uniqueCompleted >= totalLessons;
        setAppModeState(allDone ? "full" : "lite");
        prewarmAcademyProgress();
      }
    } catch {
      setUser(null);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const setAppMode = useCallback((mode: "full" | "lite") => {
    setAppModeState(mode);
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
    const handler = () => {
      if (!user) return;
      if (sessionExpiredShown.current) return;
      sessionExpiredShown.current = true;
      logout().finally(() => {
        sessionExpiredShown.current = false;
      });
      Alert.alert(
        "Session Expired",
        "Your session has expired. Please log in again.",
        [{ text: "OK" }]
      );
    };
    setOn401Handler(handler);
    return () => {
      setOn401Handler(null);
    };
  }, [logout, user]);

  useEffect(() => {
    clearSessionOnce().then(() => refresh());
  }, [refresh]);

  const isAdmin = user?.role === "admin";
  const tierLevel = isAdmin ? 2 : (subscription?.tierLevel ?? 0);

  return (
    <AuthContext.Provider value={{ user, subscription, isAdmin, tierLevel, loading, appMode, setAppMode, setAvatarUrl, refresh, logout }}>
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
