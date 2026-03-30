import { type ReactNode, useState, useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { BetaTrialExpiredModal } from "./BetaTrialExpiredModal";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

function getToken(): string | null {
  try {
    return localStorage.getItem("ICT_TRADING_MENTOR_TOKEN");
  } catch {
    return null;
  }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function BetaTrialChecker({ children }: { children: ReactNode }) {
  const { user, isAdmin, logout } = useAuth();
  const [trialExpired, setTrialExpired] = useState(false);
  const [checked, setChecked] = useState(false);
  const location = useLocation();

  useEffect(() => {
    if (!user || isAdmin) {
      setTrialExpired(false);
      setChecked(true);
      return;
    }
    async function checkBetaStatus() {
      try {
        const res = await fetch(`${API_BASE}/auth/beta-status`, {
          credentials: "include",
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setTrialExpired(data.trialExpired === true);
        }
      } catch {
        // If check fails, don't block the user
      } finally {
        setChecked(true);
      }
    }
    checkBetaStatus();
  }, [user?.id, isAdmin]);

  // Re-check on location change (navigation)
  useEffect(() => {
    if (!user || isAdmin || !checked) return;
    async function recheck() {
      try {
        const res = await fetch(`${API_BASE}/auth/beta-status`, {
          credentials: "include",
          headers: authHeaders(),
        });
        if (res.ok) {
          const data = await res.json();
          setTrialExpired(data.trialExpired === true);
        }
      } catch {}
    }
    recheck();
  }, [location.pathname]);

  if (!checked) return null;

  return (
    <>
      {children}
      {trialExpired && <BetaTrialExpiredModal onLogout={logout} />}
    </>
  );
}

export function AuthGuard() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <BetaTrialChecker>
      <Outlet />
    </BetaTrialChecker>
  );
}

export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export function TierGuard({
  children,
  requiredTier,
}: {
  children: ReactNode;
  requiredTier: number;
}) {
  const { tierLevel, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin && tierLevel < requiredTier) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground">Upgrade Required</h2>
          <p className="text-muted-foreground">
            This feature requires a{" "}
            <span className="text-primary font-semibold">
              {requiredTier === 1 ? "Standard" : "Premium"}
            </span>{" "}
            subscription.
          </p>
          <a
            href="/pricing"
            className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            View Plans
          </a>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
