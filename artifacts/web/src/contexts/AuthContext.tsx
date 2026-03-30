import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "ICT_TRADING_MENTOR_TOKEN";

interface UserData {
  id: number;
  email: string;
  name: string;
  role: string;
  isFounder: boolean;
  founderNumber: number | null;
  appMode: "full" | "lite";
  avatarUrl: string | null;
  quizDone: boolean;
  tourShown: boolean;
  isBetaTester: boolean;
  betaTrialEndsAt: string | null;
}

interface SubscriptionData {
  id: number;
  tierId: number;
  status: string;
  billingCycle: string;
  founderDiscount: boolean;
  founderDiscountEndsAt: string | null;
  tierName: string;
  tierLevel: number;
  tierFeatures: string[];
  tierMonthlyPrice?: string;
  tierAnnualPrice?: string;
  customMonthlyPrice?: string | null;
  customAnnualPrice?: string | null;
}

interface AuthContextType {
  user: UserData | null;
  subscription: SubscriptionData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: string }>;
  register: (email: string, password: string, name: string, inviteCode?: string) => Promise<{ success: boolean; error?: string; isFounder?: boolean; founderNumber?: number }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasFeature: (feature: string) => boolean;
  tierLevel: number;
  isAdmin: boolean;
  appMode: "full" | "lite";
  setAppMode: (mode: "full" | "lite") => Promise<{ success: boolean; error?: string }>;
  setAvatarUrl: (url: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

function clearStoredToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const prevModeRef = useRef<"full" | "lite">("full");

  const [isPersistentAdmin, setIsPersistentAdmin] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem("ICT_TRADING_MENTOR_ADMIN");
      return stored === "true";
    } catch (e) {
      console.error("Error reading from localStorage:", e);
      return false;
    }
  });

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/me`, {
        credentials: "include",
        headers: authHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setSubscription(data.subscription);
        if (data.user?.role === "admin") {
          setIsPersistentAdmin(true);
          localStorage.setItem("ICT_TRADING_MENTOR_ADMIN", "true");
        } else if (data.user) {
          setIsPersistentAdmin(false);
          try { localStorage.removeItem("ICT_TRADING_MENTOR_ADMIN"); } catch {}
        }
      } else {
        setUser(null);
        setSubscription(null);
        setIsPersistentAdmin(false);
        try { localStorage.removeItem("ICT_TRADING_MENTOR_ADMIN"); } catch {}
      }
    } catch (error) {
      console.error("Error refreshing user:", error);
      setUser(null);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token) storeToken(data.token);
        setLoading(true);
        await refreshUser();
        if (data.user?.role === "admin") {
          setIsPersistentAdmin(true);
          localStorage.setItem("ICT_TRADING_MENTOR_ADMIN", "true");
        } else {
          setIsPersistentAdmin(false);
          try { localStorage.removeItem("ICT_TRADING_MENTOR_ADMIN"); } catch {}
        }
        return { success: true, role: data.user?.role as string | undefined };
      }
      return { success: false, error: data.error };
    } catch (error) {
      console.error("Error during login:", error);
      return { success: false, error: "Network error" };
    }
  };

  const register = async (email: string, password: string, name: string, inviteCode?: string) => {
    try {
      const body: Record<string, string> = { email, password, name };
      if (inviteCode) body.inviteCode = inviteCode;
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.token) storeToken(data.token);
        setLoading(true);
        await refreshUser();
        setIsPersistentAdmin(false);
        try { localStorage.removeItem("ICT_TRADING_MENTOR_ADMIN"); } catch {}
        return { success: true, isFounder: data.isFounder, founderNumber: data.founderNumber };
      }
      return { success: false, error: data.error };
    } catch (error) {
      console.error("Error during registration:", error);
      return { success: false, error: "Network error" };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: authHeaders(),
      });
    } catch (error) {
      console.error("Error during logout API call:", error);
    }
    clearStoredToken();
    try { localStorage.removeItem("ICT_TRADING_MENTOR_ADMIN"); } catch {}
    setIsPersistentAdmin(false);
    setUser(null);
    setSubscription(null);
  };

  const isAdmin = user?.role === "admin" || isPersistentAdmin;

  const MAX_TIER_LEVEL = 2;

  const hasFeature = (feature: string) => {
    if (isAdmin) return true;
    if (!subscription) return false;
    const features = subscription.tierFeatures as string[];
    return features.some((f) => f.toLowerCase().includes(feature.toLowerCase()));
  };

  const tierLevel = isAdmin ? MAX_TIER_LEVEL : (subscription?.tierLevel ?? 0);
  const appMode: "full" | "lite" = user?.appMode ?? "full";

  const setAppMode = useCallback(async (mode: "full" | "lite"): Promise<{ success: boolean; error?: string }> => {
    setUser((prev) => {
      prevModeRef.current = prev?.appMode ?? "full";
      return prev ? { ...prev, appMode: mode } : null;
    });
    try {
      const res = await fetch(`${API_BASE}/user/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ section: "appMode", data: { mode } }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const errMsg = (errData as { error?: string }).error || `Server error (${res.status})`;
        console.error("Failed to update app mode:", errMsg);
        setUser((prev) => prev ? { ...prev, appMode: prevModeRef.current } : null);
        return { success: false, error: errMsg };
      }
      return { success: true };
    } catch (error) {
      console.error("Error setting app mode:", error);
      setUser((prev) => prev ? { ...prev, appMode: prevModeRef.current } : null);
      return { success: false, error: "Network error — could not save your mode preference." };
    }
  }, []);

  const setAvatarUrl = useCallback(async (url: string | null) => {
    try {
      const res = await fetch(`${API_BASE}/user-settings/avatar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        credentials: "include",
        body: JSON.stringify({ avatarUrl: url }),
      });
      if (res.ok) {
        setUser((prev) => prev ? { ...prev, avatarUrl: url } : null);
        await refreshUser();
      }
    } catch (error) {
      console.error("Error setting avatar URL:", error);
    }
  }, [refreshUser]);

  return (
    <AuthContext.Provider value={{ user, subscription, loading, login, register, logout, refreshUser, hasFeature, tierLevel, isAdmin, appMode, setAppMode, setAvatarUrl }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
