import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface UserData {
  id: number;
  email: string;
  name: string;
  role: string;
  isFounder: boolean;
  founderNumber: number | null;
  appMode: "full" | "lite";
  avatarUrl: string | null;
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
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string; isFounder?: boolean; founderNumber?: number }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasFeature: (feature: string) => boolean;
  tierLevel: number;
  isAdmin: boolean;
  appMode: "full" | "lite";
  setAppMode: (mode: "full" | "lite") => Promise<void>;
  setAvatarUrl: (url: string | null) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserData | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  // State for persistent admin status, initialized from localStorage
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
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setSubscription(data.subscription);
        // If the refreshed user is an admin, persist this status
        if (data.user?.role === "admin") {
          setIsPersistentAdmin(true);
          localStorage.setItem("ICT_TRADING_MENTOR_ADMIN", "true");
        }
      } else {
        setUser(null);
        setSubscription(null);
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
        setUser(data.user);
        await refreshUser();
        // If logged-in user is admin, make it persistent
        if (data.user?.role === "admin") {
          setIsPersistentAdmin(true);
          localStorage.setItem("ICT_TRADING_MENTOR_ADMIN", "true");
        }
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (error) {
      console.error("Error during login:", error);
      return { success: false, error: "Network error" };
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        await refreshUser();
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
      });
    } catch (error) {
      console.error("Error during logout API call:", error);
    }
    setUser(null);
    setSubscription(null);
    // As per user instruction, the persistent admin status is NOT cleared here.
    // It will "stay" until manually removed from localStorage.
  };

  // Modified isAdmin to include persistent admin status
  const isAdmin = (user?.role === "admin" || isPersistentAdmin);

  const hasFeature = (feature: string) => {
    if (isAdmin) return true; // Admins always have all features, now including persistent admins
    if (!subscription) return false;
    const features = subscription.tierFeatures as string[];
    return features.some((f) => f.toLowerCase().includes(feature.toLowerCase()));
  };

  const tierLevel = isAdmin ? 2 : (subscription?.tierLevel ?? 0); // Admins always get tier level 2 (Premium), granting full feature access
  const appMode: "full" | "lite" = isAdmin ? "full" : (user?.appMode ?? "full"); // Admins always get "full" app mode, bypassing any learning/lite restrictions

  const setAppMode = useCallback(async (mode: "full" | "lite") => {
    try {
      const res = await fetch(`${API_BASE}/user/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ section: "appMode", data: { mode } }),
      });
      if (res.ok) {
        setUser((prev) => prev ? { ...prev, appMode: mode } : null);
      }
    } catch (error) {
      console.error("Error setting app mode:", error);
    }
  }, []);

  const setAvatarUrl = useCallback(async (url: string | null) => {
    try {
      const res = await fetch(`${API_BASE}/user-settings/avatar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ avatarUrl: url }),
      });
      if (res.ok) {
        setUser((prev) => prev ? { ...prev, avatarUrl: url } : null);
      }
    } catch (error) {
      console.error("Error setting avatar URL:", error);
    }
  }, []);

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
