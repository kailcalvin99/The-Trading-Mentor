export const API_BASE = import.meta.env.VITE_API_URL || "/api";

export function authHeaders(): Record<string, string> {
  const token = localStorage.getItem("ICT_TRADING_MENTOR_TOKEN");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  isFounder: boolean;
  founderNumber: number | null;
  createdAt: string;
  lastActivity?: string;
  lastLoginAt?: string | null | undefined;
  tradeCount?: number;
  subStatus?: string | null | undefined;
  tierId?: number | null | undefined;
  tierName?: string | null | undefined;
  customMonthlyPrice?: string | null | undefined;
  customAnnualPrice?: string | null | undefined;
}

export interface AdminTier {
  id: number;
  name: string;
  slug: string;
  price: number;
  interval: string;
  features: string[];
  stripePriceId?: string;
  level?: number;
  monthlyPrice?: string | null;
  annualPrice?: string | null;
  annualDiscountPct?: string | null;
  description?: string | null;
}

export interface PasswordReset {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}
