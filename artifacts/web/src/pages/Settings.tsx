import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  Settings as SettingsIcon,
  User,
  TrendingUp,
  Shield,
  Save,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const SESSION_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "london", label: "London Session" },
  { value: "new-york", label: "New York Session" },
  { value: "london-ny-overlap", label: "London/NY Overlap" },
  { value: "asian", label: "Asian Session" },
  { value: "all", label: "All Sessions" },
];

const ENTRY_STYLE_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "conservative", label: "Conservative" },
  { value: "silver-bullet", label: "Silver Bullet" },
];

interface ProfileData {
  name: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface TradingDefaultsData {
  defaultSession: string;
  preferredEntryStyle: string;
  defaultPairs: string;
}

interface RiskRulesData {
  startingBalance: string;
  maxDailyLossPct: string;
  maxTotalDrawdownPct: string;
}

export default function Settings() {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingTrading, setSavingTrading] = useState(false);
  const [savingRisk, setSavingRisk] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [tradingDefaults, setTradingDefaults] = useState<TradingDefaultsData>({
    defaultSession: "",
    preferredEntryStyle: "",
    defaultPairs: "",
  });

  const [riskRules, setRiskRules] = useState<RiskRulesData>({
    startingBalance: "50000",
    maxDailyLossPct: "2",
    maxTotalDrawdownPct: "10",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const res = await fetch(`${API_BASE}/user/settings`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setProfile({
          name: data.profile.name || "",
          email: data.profile.email || "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
        setTradingDefaults({
          defaultSession: data.tradingDefaults.defaultSession || "",
          preferredEntryStyle: data.tradingDefaults.preferredEntryStyle || "",
          defaultPairs: data.tradingDefaults.defaultPairs || "",
        });
        setRiskRules({
          startingBalance: data.riskRules.startingBalance?.toString() || "50000",
          maxDailyLossPct: data.riskRules.maxDailyLossPct?.toString() || "2",
          maxTotalDrawdownPct: data.riskRules.maxTotalDrawdownPct?.toString() || "10",
        });
      }
    } catch {
      toast({ title: "Error", description: "Failed to load settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function saveSection(section: string, data: Record<string, unknown>, setSaving: (v: boolean) => void) {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/user/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ section, data }),
      });
      const result = await res.json();
      if (res.ok) {
        toast({ title: "Saved", description: result.message || "Settings updated successfully" });
        if (section === "profile") {
          setProfile((p) => ({ ...p, currentPassword: "", newPassword: "", confirmPassword: "" }));
          await refreshUser();
        }
      } else {
        toast({ title: "Error", description: result.error || "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function handleSaveProfile() {
    if (profile.newPassword && profile.newPassword !== profile.confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match", variant: "destructive" });
      return;
    }
    if (profile.newPassword && !profile.currentPassword) {
      toast({ title: "Error", description: "Enter your current password to change it", variant: "destructive" });
      return;
    }
    const data: Record<string, string> = {};
    if (profile.name) data.name = profile.name;
    if (profile.email) data.email = profile.email;
    if (profile.currentPassword && profile.newPassword) {
      data.currentPassword = profile.currentPassword;
      data.newPassword = profile.newPassword;
    }
    saveSection("profile", data, setSavingProfile);
  }

  function handleSaveTrading() {
    saveSection("tradingDefaults", tradingDefaults, setSavingTrading);
  }

  function handleSaveRisk() {
    saveSection("riskRules", riskRules, setSavingRisk);
  }

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-20">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your profile, trading defaults, and risk rules</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Profile</h2>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-3">Leave password fields blank to keep your current password</p>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={profile.currentPassword}
                      onChange={(e) => setProfile({ ...profile, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={profile.newPassword}
                      onChange={(e) => setProfile({ ...profile, newPassword: e.target.value })}
                      placeholder="Enter new password (min 6 characters)"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm New Password</label>
                  <input
                    type="password"
                    value={profile.confirmPassword}
                    onChange={(e) => setProfile({ ...profile, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Profile
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Trading Defaults</h2>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Default Session</label>
              <p className="text-xs text-muted-foreground mb-1.5">Your preferred trading session</p>
              <select
                value={tradingDefaults.defaultSession}
                onChange={(e) => setTradingDefaults({ ...tradingDefaults, defaultSession: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {SESSION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Preferred Entry Style</label>
              <p className="text-xs text-muted-foreground mb-1.5">Your default trade entry approach</p>
              <select
                value={tradingDefaults.preferredEntryStyle}
                onChange={(e) => setTradingDefaults({ ...tradingDefaults, preferredEntryStyle: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {ENTRY_STYLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Default Pairs to Watch</label>
              <p className="text-xs text-muted-foreground mb-1.5">Comma-separated list of instruments you trade regularly</p>
              <input
                type="text"
                value={tradingDefaults.defaultPairs}
                onChange={(e) => setTradingDefaults({ ...tradingDefaults, defaultPairs: e.target.value })}
                placeholder="e.g. NQ1!, MNQ1!, ES1!, EUR/USD"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="pt-2">
              <button
                onClick={handleSaveTrading}
                disabled={savingTrading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {savingTrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Trading Defaults
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Risk Rules</h2>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Starting Balance ($)</label>
              <p className="text-xs text-muted-foreground mb-1.5">Your prop account starting balance</p>
              <input
                type="number"
                value={riskRules.startingBalance}
                onChange={(e) => setRiskRules({ ...riskRules, startingBalance: e.target.value })}
                placeholder="50000"
                min="0"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Max Daily Loss (%)</label>
              <p className="text-xs text-muted-foreground mb-1.5">Maximum percentage you can lose in a single day</p>
              <input
                type="number"
                value={riskRules.maxDailyLossPct}
                onChange={(e) => setRiskRules({ ...riskRules, maxDailyLossPct: e.target.value })}
                placeholder="2"
                min="0"
                max="100"
                step="0.5"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Max Total Drawdown (%)</label>
              <p className="text-xs text-muted-foreground mb-1.5">Maximum total drawdown before account is breached</p>
              <input
                type="number"
                value={riskRules.maxTotalDrawdownPct}
                onChange={(e) => setRiskRules({ ...riskRules, maxTotalDrawdownPct: e.target.value })}
                placeholder="10"
                min="0"
                max="100"
                step="0.5"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="pt-2">
              <button
                onClick={handleSaveRisk}
                disabled={savingRisk}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {savingRisk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Risk Rules
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
