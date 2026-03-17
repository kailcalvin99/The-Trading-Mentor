import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTourGuideContext } from "@/contexts/TourGuideContext";
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
  Copy,
  Check,
  Lock,
  Zap,
  Trash2,
  AlertTriangle,
  Map,
  GraduationCap,
} from "lucide-react";
import { clearQuiz, getSkillLevel } from "@/components/OnboardingQuiz";

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
  [key: string]: unknown;
  defaultSession: string;
  preferredEntryStyle: string;
  defaultPairs: string;
}

interface RiskRulesData {
  [key: string]: unknown;
  startingBalance: string;
  maxDailyLossPct: string;
  maxTotalDrawdownPct: string;
}

export default function Settings() {
  const { user, refreshUser, tierLevel } = useAuth();
  const { resetTour } = useTourGuideContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const currentSkillLevel = getSkillLevel();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingTrading, setSavingTrading] = useState(false);
  const [savingRisk, setSavingRisk] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearingTrades, setClearingTrades] = useState(false);

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

  async function handleClearAllTrades() {
    setClearingTrades(true);
    try {
      const res = await fetch(`${API_BASE}/trades/all`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Journal cleared", description: "All trades have been deleted." });
        setClearConfirm(false);
      } else {
        toast({ title: "Error", description: "Failed to clear trades", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to clear trades", variant: "destructive" });
    } finally {
      setClearingTrades(false);
    }
  }

  const isPremium = tierLevel >= 2;

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

        <TradingViewWebhookCard isPremium={isPremium} />

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <GraduationCap className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Skill Assessment</h2>
            {currentSkillLevel && (
              <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${
                currentSkillLevel === "advanced" ? "bg-primary/10 text-primary border-primary/30" :
                currentSkillLevel === "intermediate" ? "bg-amber-500/10 text-amber-500 border-amber-500/30" :
                "bg-green-500/10 text-green-400 border-green-500/30"
              }`}>
                {currentSkillLevel}
              </span>
            )}
          </div>
          <div className="px-5 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Retake Skill Assessment</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Retake the onboarding quiz to update your skill level and recalibrate which features and academy lessons are shown to you. This will also reset your academy progress.
                </p>
              </div>
              <button
                onClick={() => {
                  clearQuiz();
                  navigate("/dashboard");
                  window.location.reload();
                }}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/30 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors shrink-0"
              >
                <GraduationCap className="h-4 w-4" />
                Retake Quiz
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <Map className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Platform Tour</h2>
          </div>
          <div className="px-5 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Take the Tour Again</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Restart the guided video tour from the beginning. It walks through all 11 platform features with video explanations.
                </p>
              </div>
              <button
                onClick={resetTour}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/30 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors shrink-0"
              >
                <Map className="h-4 w-4" />
                Start Tour
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card border border-red-500/30 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-red-500/30">
            <Trash2 className="h-5 w-5 text-red-500" />
            <h2 className="text-sm font-bold text-foreground">Danger Zone</h2>
          </div>
          <div className="px-5 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Clear all journal trades</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently deletes every trade in the journal. Use this to wipe test data before going live.
                </p>
              </div>
              {!clearConfirm ? (
                <button
                  onClick={() => setClearConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All Trades
                </button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Are you sure? This cannot be undone.
                  </div>
                  <button
                    onClick={() => setClearConfirm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearAllTrades}
                    disabled={clearingTrades}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {clearingTrades ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Yes, delete all
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TradingViewWebhookCard({ isPremium }: { isPremium: boolean }) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isPremium) {
      loadWebhookInfo();
    }
  }, [isPremium]);

  async function loadWebhookInfo() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/webhook/tradingview/info`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setWebhookUrl(data.webhookUrl);
      }
    } catch {}
    setLoading(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isPremium) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <Zap className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-sm font-bold text-foreground">TradingView Webhook</h2>
          <span className="ml-auto text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">PREMIUM</span>
        </div>
        <div className="px-5 py-8 text-center">
          <Lock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Upgrade to Premium</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Connect TradingView alerts to automatically create draft trades. Upgrade your plan to unlock this feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <Zap className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-bold text-foreground">TradingView Webhook</h2>
      </div>
      <div className="px-5 py-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Your Webhook URL</label>
          <p className="text-xs text-muted-foreground mb-2">
            Paste this URL into your TradingView alert to automatically create draft trades.
          </p>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-muted-foreground select-all focus:outline-none focus:ring-1 focus:ring-primary"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground mb-3">Setup Instructions</p>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Open a chart in <span className="text-foreground font-medium">TradingView</span> and click the <span className="text-foreground font-medium">Alert</span> button (clock icon)</li>
            <li>Set your alert conditions (price level, indicator signal, etc.)</li>
            <li>In the <span className="text-foreground font-medium">Notifications</span> tab, enable <span className="text-foreground font-medium">Webhook URL</span></li>
            <li>Paste your webhook URL from above into the URL field</li>
            <li>
              Set the alert message body to JSON:
              <pre className="mt-1.5 bg-background border border-border rounded-lg p-3 text-xs font-mono overflow-x-auto">
{`{
  "ticker": "{{ticker}}",
  "side": "{{strategy.order.action}}",
  "price": "{{close}}"
}`}
              </pre>
            </li>
            <li>Click <span className="text-foreground font-medium">Create</span> — trades will appear as drafts in your journal</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
