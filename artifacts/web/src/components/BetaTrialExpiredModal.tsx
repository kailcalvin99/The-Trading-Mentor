import { useState, useEffect } from "react";
import { FlaskConical, Gift, CreditCard, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

interface Props {
  onLogout: () => Promise<void>;
}

export function BetaTrialExpiredModal({ onLogout }: Props) {
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [discountPct, setDiscountPct] = useState(30);

  useEffect(() => {
    fetch(`${API_BASE}/subscriptions/tiers`)
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.betaTesterDiscountPct === "number") {
          setDiscountPct(data.betaTesterDiscountPct);
        }
      })
      .catch(() => {});
  }, []);

  async function handleDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/account`, {
        method: "DELETE",
        credentials: "include",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Failed to delete account");
      }
      await onLogout();
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete account");
      setDeleting(false);
    }
  }

  function handleChoosePlan() {
    navigate("/pricing");
  }

  if (showDeleteConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-card border border-destructive/40 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex justify-center mb-4">
            <div className="h-14 w-14 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
              <AlertTriangle className="h-7 w-7 text-destructive" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-foreground text-center mb-2">Delete Account?</h2>
          <p className="text-sm text-muted-foreground text-center mb-6 leading-relaxed">
            This will permanently delete your account and all your data — trades, journal entries, and progress.
            This action <span className="text-destructive font-semibold">cannot be undone</span>.
          </p>

          {deleteError && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5 text-sm text-destructive mb-4">
              {deleteError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
              className="flex-1 px-4 py-3 rounded-lg text-sm font-medium border border-border text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold bg-destructive text-destructive-foreground hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  Yes, Delete
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full shadow-2xl">
        <div className="flex justify-center mb-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
            <FlaskConical className="h-7 w-7 text-primary" />
          </div>
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1 mb-3">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-semibold text-amber-500">BETA TRIAL ENDED</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">Your beta trial has ended</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Thank you for being a beta tester. Your 30-day free trial has expired.
            To continue using the app, please choose a plan — or delete your account if you no longer want access.
          </p>
        </div>

        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-5 flex items-start gap-3">
          <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
            <FlaskConical className="h-4 w-4 text-primary" />
            <Gift className="h-4 w-4 text-primary" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1 bg-primary/20 border border-primary/40 rounded-full px-2 py-0.5 mb-1">
              <span className="text-[10px] font-bold text-primary tracking-wide">BETA THANK-YOU OFFER</span>
            </div>
            <p className="text-sm font-semibold text-foreground">
              Get {discountPct}% off forever — applied automatically at checkout.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleChoosePlan}
            className="w-full bg-primary text-primary-foreground font-semibold py-3.5 rounded-lg hover:brightness-110 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <CreditCard className="h-4 w-4" />
            Choose a Plan
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-full bg-transparent border border-destructive/40 text-destructive font-medium py-3 rounded-lg hover:bg-destructive/5 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <Trash2 className="h-4 w-4" />
            Delete My Account
          </button>
        </div>
      </div>
    </div>
  );
}
