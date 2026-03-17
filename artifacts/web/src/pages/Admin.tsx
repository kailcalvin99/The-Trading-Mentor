import { useState, useEffect, useRef, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppConfig } from "@/contexts/AppConfigContext";
import {
  Crown, Users, Settings, DollarSign, Save, Edit2, X, Check, Trash2,
  AlertTriangle, RotateCcw, ChevronDown, ChevronRight,
  Palette, Shield, Brain, ListChecks, ToggleLeft, Rocket, Clock, Target,
  Sparkles, Send, Loader2, BarChart3, FileText, Filter, TrendingUp, RefreshCw,
} from "lucide-react";

const MC_PROFILES = {
  Perfect: { winRate: 0.75, risk: 0.01, rewardRatio: 2.5, label: "Perfect Trader", color: "hsl(142, 76%, 36%)" },
  Median:  { winRate: 0.50, risk: 0.02, rewardRatio: 1.5, label: "Median Trader",  color: "hsl(217, 91%, 60%)" },
  Lousy:   { winRate: 0.28, risk: 0.05, rewardRatio: 1.2, label: "Lousy Trader",   color: "hsl(0, 84%, 60%)"   },
} as const;
type MCProfile = keyof typeof MC_PROFILES;

function runMonteCarlo(profile: MCProfile, seed: number): number[][] {
  const { winRate, risk, rewardRatio } = MC_PROFILES[profile];
  const START = 10_000;
  const TRADES = 1000;
  const PATHS = 100;
  const paths: number[][] = [];
  for (let p = 0; p < PATHS; p++) {
    const history: number[] = [START];
    let balance = START;
    for (let t = 0; t < TRADES; t++) {
      const riskAmt = balance * risk;
      if (Math.random() < winRate) {
        balance += riskAmt * rewardRatio;
      } else {
        balance -= riskAmt;
      }
      if (balance <= 0) { history.push(0); break; }
      history.push(balance);
    }
    paths.push(history);
    void seed;
  }
  return paths;
}

function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function MonteCarloChart({ paths }: { paths: number[][] }) {
  const W = 780, H = 320;
  const PAD = { left: 56, right: 16, top: 16, bottom: 32 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const allFinals = paths.map((p) => p[p.length - 1]);
  const p95 = [...allFinals].sort((a, b) => a - b)[Math.floor(allFinals.length * 0.95)];
  const rawMax = Math.max(p95 * 1.2, 12_000);

  const logMin = Math.log10(1);
  const logMax = Math.log10(rawMax + 1);
  const toY = (v: number) =>
    PAD.top + chartH - ((Math.log10(Math.max(v, 1)) - logMin) / (logMax - logMin)) * chartH;

  const SAMPLE = 10;
  function pathToPoints(history: number[]): string {
    const pts: string[] = [];
    for (let i = 0; i < history.length; i += SAMPLE) {
      const x = PAD.left + (i / 1000) * chartW;
      const y = toY(history[i]);
      pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    }
    const last = history.length - 1;
    const x = PAD.left + (last / 1000) * chartW;
    const y = toY(history[last]);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
    return pts.join(" ");
  }

  const startY = toY(10_000);
  const yLabels = [1_000, 10_000, 100_000, 1_000_000].filter((v) => v <= rawMax * 1.1);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 320 }}>
      {yLabels.map((v) => {
        const y = toY(v);
        return (
          <g key={v}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={10} fill="currentColor" fillOpacity={0.5}>{fmt(v)}</text>
          </g>
        );
      })}
      {[0, 250, 500, 750, 1000].map((t) => (
        <text key={t} x={PAD.left + (t / 1000) * chartW} y={H - 4} textAnchor="middle" fontSize={10} fill="currentColor" fillOpacity={0.4}>{t}</text>
      ))}
      {paths.map((history, i) => {
        const final = history[history.length - 1];
        const blown = final <= 0;
        const won = final > 10_000;
        const stroke = blown ? "#ef4444" : won ? "#22c55e" : "#6b7280";
        return (
          <polyline
            key={i}
            points={pathToPoints(history)}
            fill="none"
            stroke={stroke}
            strokeWidth={blown ? 1 : 0.8}
            strokeOpacity={blown ? 0.5 : won ? 0.35 : 0.25}
          />
        );
      })}
      <line x1={PAD.left} y1={startY} x2={W - PAD.right} y2={startY} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="6 4" />
      <text x={W - PAD.right + 2} y={startY + 4} fontSize={9} fill="#ef4444" fillOpacity={0.8}>$10k</text>
    </svg>
  );
}

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface AdminUser {
  id: number;
  email: string;
  name: string;
  role: string;
  isFounder: boolean;
  founderNumber: number | null;
  createdAt: string;
  tierName: string | null;
  tierLevel: number | null;
  subStatus: string | null;
  billingCycle: string | null;
  customMonthlyPrice: string | null;
  customAnnualPrice: string | null;
  tierId: number | null;
  lastLoginAt: string | null;
}

interface AdminTier {
  id: number;
  name: string;
  level: number;
  monthlyPrice: string;
  annualPrice: string;
  annualDiscountPct: number;
  features: string[];
  description: string;
  isActive: boolean;
}

function SettingsSection({ title, icon: Icon, children, defaultOpen = false }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 bg-card hover:bg-muted/30 transition-colors"
      >
        <Icon className="h-5 w-5 text-primary shrink-0" />
        <span className="text-sm font-bold text-foreground flex-1 text-left">{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="px-5 py-4 bg-card/50 border-t border-border space-y-4">{children}</div>}
    </div>
  );
}

function SettingInput({ label, desc, value, onChange, type = "text", placeholder }: {
  label: string;
  desc?: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm font-medium text-foreground mb-1 block">{label}</label>
      {desc && <p className="text-xs text-muted-foreground mb-1.5">{desc}</p>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
      />
    </div>
  );
}

function SettingToggle({ label, desc, checked, onChange }: {
  label: string;
  desc?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <button
        onClick={() => onChange(!checked)}
        className={`mt-0.5 w-10 h-6 rounded-full transition-colors shrink-0 ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${checked ? "translate-x-4" : "translate-x-0"}`} />
      </button>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </div>
    </div>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const { reload: reloadConfig } = useAppConfig();
  const [tab, setTab] = useState<"users" | "tiers" | "settings" | "ai" | "simulator">("users");
  const [mcProfile, setMcProfile] = useState<MCProfile>("Median");
  const [mcSeed, setMcSeed] = useState(0);
  const mcPaths = useMemo(() => runMonteCarlo(mcProfile, mcSeed), [mcProfile, mcSeed]);
  const mcStats = useMemo(() => {
    const START = 10_000;
    const finals = mcPaths.map((p) => p[p.length - 1]);
    const blown = finals.filter((f) => f <= 0).length;
    const profitable = finals.filter((f) => f > START).length;
    const sorted = [...finals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const best = Math.max(...finals);
    const worst = Math.min(...finals);
    return { blown, profitable, median, best, worst };
  }, [mcPaths]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tiers, setTiers] = useState<AdminTier[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [editingTier, setEditingTier] = useState<number | null>(null);
  const [tierFeatureEdit, setTierFeatureEdit] = useState<number | null>(null);
  const [newFeature, setNewFeature] = useState("");
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [resetStep, setResetStep] = useState(0);
  const [resetCode, setResetCode] = useState("");
  const [resetting, setResetting] = useState(false);
  const [showInactiveOnly, setShowInactiveOnly] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchOpts: RequestInit = { credentials: "include" };
  const headers = { "Content-Type": "application/json" };

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    try {
      const [usersRes, tiersRes, settingsRes] = await Promise.all([
        fetch(`${API_BASE}/admin/users`, { ...fetchOpts, headers }),
        fetch(`${API_BASE}/admin/tiers`, { ...fetchOpts, headers }),
        fetch(`${API_BASE}/admin/settings`, { ...fetchOpts, headers }),
      ]);
      if (usersRes.ok) setUsers((await usersRes.json()).users);
      if (tiersRes.ok) setTiers((await tiersRes.json()).tiers);
      if (settingsRes.ok) setSettings((await settingsRes.json()).settings);
    } catch {}
  }

  async function saveUserSub(userId: number) {
    setSaving(true);
    await fetch(`${API_BASE}/admin/users/${userId}/subscription`, {
      method: "PUT", ...fetchOpts, headers,
      body: JSON.stringify({
        tierId: editValues.tierId ? parseInt(editValues.tierId) : undefined,
        customMonthlyPrice: editValues.customMonthlyPrice || undefined,
        customAnnualPrice: editValues.customAnnualPrice || undefined,
        status: editValues.status || undefined,
      }),
    });
    setEditingUser(null);
    setSaving(false);
    loadData();
  }

  async function saveTier(tierId: number) {
    setSaving(true);
    await fetch(`${API_BASE}/admin/tiers/${tierId}`, {
      method: "PUT", ...fetchOpts, headers,
      body: JSON.stringify({
        monthlyPrice: editValues.monthlyPrice,
        annualPrice: editValues.annualPrice,
        annualDiscountPct: editValues.annualDiscountPct ? parseInt(editValues.annualDiscountPct) : undefined,
        description: editValues.description,
      }),
    });
    setEditingTier(null);
    setSaving(false);
    loadData();
  }

  async function saveTierFeatures(tierId: number, features: string[]) {
    setSaving(true);
    await fetch(`${API_BASE}/admin/tiers/${tierId}`, {
      method: "PUT", ...fetchOpts, headers,
      body: JSON.stringify({ features }),
    });
    setSaving(false);
    loadData();
  }

  function updateSetting(key: string, value: string) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  function toggleSetting(key: string) {
    setSettings((s) => ({ ...s, [key]: s[key] === "true" ? "false" : "true" }));
  }

  async function saveSettings() {
    setSaving(true);
    setSaveMsg("");
    try {
      await fetch(`${API_BASE}/admin/settings`, {
        method: "PUT", ...fetchOpts, headers,
        body: JSON.stringify({ settings }),
      });
      await reloadConfig();
      setSaveMsg("Settings saved successfully!");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch {
      setSaveMsg("Failed to save settings.");
    }
    setSaving(false);
  }

  function getDaysSinceLogin(lastLoginAt: string | null): number | null {
    if (!lastLoginAt) return null;
    const lastLogin = new Date(lastLoginAt);
    const now = new Date();
    return Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
  }

  function getLastActiveLabel(lastLoginAt: string | null): string {
    if (!lastLoginAt) return "Never";
    const days = getDaysSinceLogin(lastLoginAt);
    if (days === null) return "Never";
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  }

  async function handleDeleteUser(userId: number) {
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: "DELETE", ...fetchOpts, headers,
      });
      const data = await res.json();
      if (res.ok) {
        if (data.selfDeleted) {
          window.location.href = import.meta.env.BASE_URL || "/web/";
        } else {
          setDeleteConfirmId(null);
          loadData();
        }
      } else {
        alert(data.error || "Failed to delete user");
      }
    } catch {
      alert("Failed to delete user");
    }
    setDeleting(false);
  }

  const filteredUsers = showInactiveOnly
    ? users.filter((u) => {
        const days = getDaysSinceLogin(u.lastLoginAt);
        return days === null || days >= 30;
      })
    : users;

  async function handleReset() {
    if (resetCode !== "RESET-EVERYTHING") return;
    setResetting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/reset`, {
        method: "POST", ...fetchOpts, headers,
        body: JSON.stringify({ confirmCode: resetCode }),
      });
      if (res.ok) {
        localStorage.clear();
        window.location.href = import.meta.env.BASE_URL || "/web/";
      } else {
        const data = await res.json();
        alert(data.error || "Reset failed");
      }
    } catch { alert("Reset failed"); }
    setResetting(false);
  }

  let routineItems: { key: string; label: string; desc: string; icon: string }[] = [];
  try { routineItems = JSON.parse(settings.routine_items || "[]"); } catch {}

  function updateRoutineItem(idx: number, field: string, value: string) {
    const copy = [...routineItems];
    (copy[idx] as any)[field] = value;
    updateSetting("routine_items", JSON.stringify(copy));
  }

  function addRoutineItem() {
    const copy = [...routineItems, { key: `item_${Date.now()}`, label: "New Item", desc: "Description", icon: "CheckCircle" }];
    updateSetting("routine_items", JSON.stringify(copy));
  }

  function removeRoutineItem(idx: number) {
    const copy = routineItems.filter((_, i) => i !== idx);
    updateSetting("routine_items", JSON.stringify(copy));
  }

  if (user?.role !== "admin") {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
        <Settings className="h-6 w-6 text-primary" />
        Admin Dashboard
      </h1>

      <div className="flex gap-2 mb-6 border-b border-border pb-2 flex-wrap">
        {[
          { key: "users" as const, label: "Users", icon: Users },
          { key: "tiers" as const, label: "Subscription Tiers", icon: DollarSign },
          { key: "settings" as const, label: "Settings", icon: Settings },
          { key: "ai" as const, label: "AI Assistant", icon: Sparkles },
          { key: "simulator" as const, label: "Monte Carlo", icon: TrendingUp },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === "users" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowInactiveOnly(!showInactiveOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                showInactiveOnly
                  ? "bg-amber-500/10 border border-amber-500/30 text-amber-500"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Filter className="h-3.5 w-3.5" />
              Inactive (30+ days)
            </button>
            <span className="text-xs text-muted-foreground">
              {filteredUsers.length} of {users.length} users
            </span>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Last Active</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Custom Price</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => {
                    const daysSince = getDaysSinceLogin(u.lastLoginAt);
                    const isInactive = daysSince === null || daysSince >= 30;
                    return (
                      <tr key={u.id} className="border-b border-border/50 hover:bg-muted/10">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <p className="font-medium text-foreground">{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.email}</p>
                            </div>
                            {u.isFounder && (
                              <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5">
                                <Crown className="h-3 w-3 text-amber-500" />
                                <span className="text-[10px] font-bold text-amber-500">#{u.founderNumber}</span>
                              </span>
                            )}
                            {u.role === "admin" && (
                              <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">ADMIN</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                            u.subStatus === "active" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          }`}>
                            {u.subStatus || "None"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {editingUser === u.id ? (
                            <select
                              value={editValues.tierId || u.tierId || ""}
                              onChange={(e) => setEditValues({ ...editValues, tierId: e.target.value })}
                              className="bg-background border border-border rounded px-2 py-1 text-sm"
                            >
                              {tiers.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-foreground">{u.tierName || "None"}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${isInactive ? "text-amber-500" : "text-muted-foreground"}`}>
                            {getLastActiveLabel(u.lastLoginAt)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {editingUser === u.id ? (
                            <div className="flex gap-2">
                              <input
                                placeholder="Monthly $"
                                value={editValues.customMonthlyPrice || ""}
                                onChange={(e) => setEditValues({ ...editValues, customMonthlyPrice: e.target.value })}
                                className="bg-background border border-border rounded px-2 py-1 text-sm w-24"
                              />
                              <input
                                placeholder="Annual $"
                                value={editValues.customAnnualPrice || ""}
                                onChange={(e) => setEditValues({ ...editValues, customAnnualPrice: e.target.value })}
                                className="bg-background border border-border rounded px-2 py-1 text-sm w-24"
                              />
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              {u.customMonthlyPrice ? `$${u.customMonthlyPrice}/mo` : "Standard"}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {editingUser === u.id ? (
                              <>
                                <button onClick={() => saveUserSub(u.id)} disabled={saving} className="p-1.5 bg-primary/10 text-primary rounded hover:bg-primary/20">
                                  <Check className="h-4 w-4" />
                                </button>
                                <button onClick={() => setEditingUser(null)} className="p-1.5 bg-muted text-muted-foreground rounded hover:bg-muted/80">
                                  <X className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingUser(u.id);
                                    setEditValues({
                                      tierId: String(u.tierId || ""),
                                      customMonthlyPrice: u.customMonthlyPrice || "",
                                      customAnnualPrice: u.customAnnualPrice || "",
                                    });
                                  }}
                                  className="p-1.5 text-muted-foreground hover:text-foreground"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(u.id)}
                                  className="p-1.5 text-muted-foreground hover:text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {deleteConfirmId !== null && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-destructive/10 rounded-full">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Delete User</h3>
                </div>
                {deleteConfirmId === user?.id ? (
                  <p className="text-sm text-muted-foreground">
                    You are about to <span className="text-destructive font-medium">delete your own account</span>. You will be logged out immediately. When you re-register with your admin email, you will automatically receive admin access again.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to permanently delete <span className="text-foreground font-medium">{users.find((u) => u.id === deleteConfirmId)?.name}</span>? This will remove all their data including conversations, subscriptions, and community posts. This cannot be undone.
                  </p>
                )}
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground border border-border"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleDeleteUser(deleteConfirmId)}
                    disabled={deleting}
                    className="px-4 py-2 rounded-lg text-sm font-bold bg-destructive text-white hover:opacity-90 disabled:opacity-40 flex items-center gap-2"
                  >
                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    {deleteConfirmId === user?.id ? "Delete My Account" : "Delete User"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "tiers" && (
        <div className="grid gap-4">
          {tiers.map((tier) => (
            <div key={tier.id} className="bg-card border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground">{tier.name}</h3>
                  <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Level {tier.level}</span>
                </div>
                {editingTier === tier.id ? (
                  <div className="flex gap-1">
                    <button onClick={() => saveTier(tier.id)} disabled={saving} className="p-1.5 bg-primary/10 text-primary rounded hover:bg-primary/20">
                      <Check className="h-4 w-4" />
                    </button>
                    <button onClick={() => setEditingTier(null)} className="p-1.5 bg-muted text-muted-foreground rounded hover:bg-muted/80">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditingTier(tier.id);
                      setEditValues({
                        monthlyPrice: tier.monthlyPrice,
                        annualPrice: tier.annualPrice,
                        annualDiscountPct: String(tier.annualDiscountPct),
                        description: tier.description || "",
                      });
                    }}
                    className="p-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              {editingTier === tier.id ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Monthly Price ($)</label>
                    <input value={editValues.monthlyPrice || ""} onChange={(e) => setEditValues({ ...editValues, monthlyPrice: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Annual Price ($)</label>
                    <input value={editValues.annualPrice || ""} onChange={(e) => setEditValues({ ...editValues, annualPrice: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Annual Discount %</label>
                    <input value={editValues.annualDiscountPct || ""} onChange={(e) => setEditValues({ ...editValues, annualDiscountPct: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                    <input value={editValues.description || ""} onChange={(e) => setEditValues({ ...editValues, description: e.target.value })} className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm" />
                  </div>
                </div>
              ) : (
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Monthly</p>
                    <p className="text-lg font-bold text-foreground">${tier.monthlyPrice}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Annual</p>
                    <p className="text-lg font-bold text-foreground">${tier.annualPrice}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Annual Discount</p>
                    <p className="text-lg font-bold text-foreground">{tier.annualDiscountPct}%</p>
                  </div>
                </div>
              )}

              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-muted-foreground">Features</p>
                  <button
                    onClick={() => setTierFeatureEdit(tierFeatureEdit === tier.id ? null : tier.id)}
                    className="text-xs text-primary hover:underline"
                  >
                    {tierFeatureEdit === tier.id ? "Done Editing" : "Edit Features"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(tier.features as string[]).map((f, i) => (
                    <span key={i} className="text-xs bg-muted px-2 py-1 rounded-lg text-foreground/70 flex items-center gap-1">
                      {f}
                      {tierFeatureEdit === tier.id && (
                        <button
                          onClick={() => {
                            const updated = tier.features.filter((_, fi) => fi !== i);
                            saveTierFeatures(tier.id, updated);
                          }}
                          className="text-destructive hover:text-destructive/80 ml-1"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                {tierFeatureEdit === tier.id && (
                  <div className="flex gap-2 mt-2">
                    <input
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      placeholder="New feature text..."
                      className="flex-1 bg-background border border-border rounded-lg px-3 py-1.5 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newFeature.trim()) {
                          saveTierFeatures(tier.id, [...tier.features, newFeature.trim()]);
                          setNewFeature("");
                        }
                      }}
                    />
                    <button
                      onClick={() => {
                        if (newFeature.trim()) {
                          saveTierFeatures(tier.id, [...tier.features, newFeature.trim()]);
                          setNewFeature("");
                        }
                      }}
                      className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-sm hover:bg-primary/20"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "settings" && (
        <div className="space-y-3 max-w-2xl">
          <SettingsSection title="Branding" icon={Palette} defaultOpen>
            <SettingInput label="App Name" desc="The name shown in the header, login page, and browser tab" value={settings.app_name || ""} onChange={(v) => updateSetting("app_name", v)} />
            <SettingInput label="Tagline" desc="Subtitle shown on the login page" value={settings.app_tagline || ""} onChange={(v) => updateSetting("app_tagline", v)} />
          </SettingsSection>

          <SettingsSection title="Founder Program" icon={Rocket}>
            <div className="grid sm:grid-cols-2 gap-4">
              <SettingInput label="Founder Spots Limit" desc="Total founder spots available" value={settings.founder_limit || ""} onChange={(v) => updateSetting("founder_limit", v)} type="number" />
              <SettingInput label="Founder Discount %" desc="Discount percentage for founders" value={settings.founder_discount_pct || ""} onChange={(v) => updateSetting("founder_discount_pct", v)} type="number" />
              <SettingInput label="Discount Duration (months)" desc="How many months the founder discount lasts" value={settings.founder_discount_months || ""} onChange={(v) => updateSetting("founder_discount_months", v)} type="number" />
              <SettingInput label="Annual Billing Discount %" desc="Discount for choosing annual billing" value={settings.annual_discount_pct || ""} onChange={(v) => updateSetting("annual_discount_pct", v)} type="number" />
            </div>
          </SettingsSection>

          <SettingsSection title="Discipline & Risk" icon={Shield}>
            <div className="grid sm:grid-cols-2 gap-4">
              <SettingInput label="Cooldown Duration (hours)" desc="How long a cooldown period lasts after consecutive losses" value={settings.cooldown_duration_hours || ""} onChange={(v) => updateSetting("cooldown_duration_hours", v)} type="number" />
              <SettingInput label="Consecutive Loss Threshold" desc="Number of consecutive losses that triggers a cooldown" value={settings.consecutive_loss_threshold || ""} onChange={(v) => updateSetting("consecutive_loss_threshold", v)} type="number" />
              <SettingInput label="Discipline Gate Lockout (minutes)" desc="How long the discipline gate locks you out" value={settings.gate_lockout_minutes || ""} onChange={(v) => updateSetting("gate_lockout_minutes", v)} type="number" />
              <SettingInput label="Daily Risk Limit %" desc="Maximum percentage of account risked per day" value={settings.risk_daily_limit_pct || ""} onChange={(v) => updateSetting("risk_daily_limit_pct", v)} type="number" />
              <SettingInput label="Weekly Risk Limit %" desc="Maximum percentage of account risked per week" value={settings.risk_weekly_limit_pct || ""} onChange={(v) => updateSetting("risk_weekly_limit_pct", v)} type="number" />
            </div>
          </SettingsSection>

          <SettingsSection title="Daily Planner" icon={ListChecks}>
            <p className="text-xs text-muted-foreground mb-3">
              Configure the checklist items that appear in every trader's daily planner before they start trading.
            </p>
            <div className="space-y-3">
              {routineItems.map((item, idx) => (
                <div key={idx} className="bg-background border border-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-mono">#{idx + 1}</span>
                    <button onClick={() => removeRoutineItem(idx)} className="text-destructive/60 hover:text-destructive">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-2">
                    <input value={item.label} onChange={(e) => updateRoutineItem(idx, "label", e.target.value)} placeholder="Label" className="bg-muted/30 border border-border rounded px-2 py-1.5 text-sm" />
                    <input value={item.icon} onChange={(e) => updateRoutineItem(idx, "icon", e.target.value)} placeholder="Icon name" className="bg-muted/30 border border-border rounded px-2 py-1.5 text-sm" />
                  </div>
                  <input value={item.desc} onChange={(e) => updateRoutineItem(idx, "desc", e.target.value)} placeholder="Description" className="w-full bg-muted/30 border border-border rounded px-2 py-1.5 text-sm" />
                </div>
              ))}
              <button onClick={addRoutineItem} className="w-full border border-dashed border-border rounded-lg py-2 text-sm text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors">
                + Add Routine Item
              </button>
            </div>
          </SettingsSection>

          <SettingsSection title="AI Mentor" icon={Brain}>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Custom System Prompt</label>
              <p className="text-xs text-muted-foreground mb-2">Override the default ICT mentor personality. Leave blank to use the built-in prompt.</p>
              <textarea
                value={settings.ai_mentor_system_prompt || ""}
                onChange={(e) => updateSetting("ai_mentor_system_prompt", e.target.value)}
                placeholder="Leave blank for default ICT mentor prompt..."
                rows={8}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono resize-y"
              />
            </div>
          </SettingsSection>

          <SettingsSection title="Feature Toggles" icon={ToggleLeft}>
            <p className="text-xs text-muted-foreground mb-3">
              Enable or disable features across the entire platform.
            </p>
            <div className="space-y-4">
              <SettingToggle label="Discipline Gate" desc="Require traders to complete their routine before accessing trading tools" checked={settings.feature_discipline_gate === "true"} onChange={() => toggleSetting("feature_discipline_gate")} />
              <SettingToggle label="Cooldown Timer" desc="Automatically trigger a cooldown after consecutive losses" checked={settings.feature_cooldown_timer === "true"} onChange={() => toggleSetting("feature_cooldown_timer")} />
              <SettingToggle label="Hall of Fame" desc="Show the leaderboard / Hall of Fame page" checked={settings.feature_hall_of_fame === "true"} onChange={() => toggleSetting("feature_hall_of_fame")} />
              <SettingToggle label="Win Rate Estimator" desc="Show the win rate estimation tool" checked={settings.feature_win_rate_estimator === "true"} onChange={() => toggleSetting("feature_win_rate_estimator")} />
              <SettingToggle label="Casino Elements" desc="Enable gamification features (streaks, XP, achievements)" checked={settings.feature_casino_elements === "true"} onChange={() => toggleSetting("feature_casino_elements")} />
              <SettingToggle label="Daily Spin" desc="Enable the daily reward spin wheel" checked={settings.feature_daily_spin === "true"} onChange={() => toggleSetting("feature_daily_spin")} />
            </div>
          </SettingsSection>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={saveSettings}
              disabled={saving}
              className="bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-xl hover:opacity-90 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving..." : "Save All Settings"}
            </button>
            {saveMsg && (
              <span className={`text-sm font-medium ${saveMsg.includes("success") ? "text-primary" : "text-destructive"}`}>
                {saveMsg}
              </span>
            )}
          </div>

          <SettingsSection title="Danger Zone" icon={AlertTriangle}>
            <p className="text-sm text-muted-foreground mb-4">
              Hard reset will permanently delete ALL data -- every user account, trade, conversation, and subscription. The site will return to its fresh setup state where the first person to register becomes admin.
            </p>

            {resetStep === 0 && (
              <button
                onClick={() => setResetStep(1)}
                className="bg-destructive/10 border border-destructive/30 text-destructive font-bold px-6 py-2.5 rounded-xl hover:bg-destructive/20 flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Hard Reset Everything
              </button>
            )}

            {resetStep === 1 && (
              <div className="bg-destructive/5 border border-destructive/30 rounded-xl p-4 space-y-3">
                <p className="text-sm font-bold text-destructive">Are you absolutely sure?</p>
                <p className="text-xs text-muted-foreground">
                  This will delete ALL users, trades, journals, conversations, and subscriptions. Everyone (including you) will need to create a new account. This cannot be undone.
                </p>
                <p className="text-xs text-muted-foreground">
                  Type <strong className="text-destructive">RESET-EVERYTHING</strong> to confirm:
                </p>
                <input
                  type="text"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="Type RESET-EVERYTHING"
                  className="w-full bg-background border border-destructive/30 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-destructive/50"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    disabled={resetCode !== "RESET-EVERYTHING" || resetting}
                    className="bg-destructive text-white font-bold px-6 py-2.5 rounded-xl hover:opacity-90 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {resetting ? "Resetting..." : "Confirm Hard Reset"}
                  </button>
                  <button
                    onClick={() => { setResetStep(0); setResetCode(""); }}
                    className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground border border-border"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </SettingsSection>
        </div>
      )}

      {tab === "ai" && <AdminAIPanel settings={settings} updateSetting={updateSetting} saveSettings={saveSettings} saving={saving} />}

      {tab === "simulator" && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Monte Carlo Simulator
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                100 random life paths · 1000 trades each · $10,000 starting balance · log scale
              </p>
            </div>
            <button
              onClick={() => setMcSeed((s) => s + 1)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Re-run
            </button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {(["Perfect", "Median", "Lousy"] as MCProfile[]).map((p) => (
              <button
                key={p}
                onClick={() => setMcProfile(p)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
                  mcProfile === p
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {MC_PROFILES[p].label}
                <span className="ml-2 text-xs opacity-60">
                  {(MC_PROFILES[p].winRate * 100).toFixed(0)}% WR · {(MC_PROFILES[p].risk * 100).toFixed(0)}% risk · {MC_PROFILES[p].rewardRatio}× RR
                </span>
              </button>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden p-4">
            <MonteCarloChart paths={mcPaths} />
            <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-green-500 inline-block rounded" />Profitable path</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-red-500 inline-block rounded" />Blown account</span>
              <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-gray-500 inline-block rounded" />Flat/slight loss</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-5 border-t-2 border-red-500 border-dashed" />$10k start</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: "Profitable", value: `${mcStats.profitable}%`, sub: "of paths above $10k", color: "text-green-500" },
              { label: "Blown", value: `${mcStats.blown}%`, sub: "of paths hit $0", color: "text-red-500" },
              { label: "Median Outcome", value: fmt(mcStats.median), sub: "middle path final", color: "text-foreground" },
              { label: "Best Path", value: fmt(mcStats.best), sub: "top outcome", color: "text-primary" },
              { label: "Worst Path", value: fmt(mcStats.worst <= 0 ? 0 : mcStats.worst), sub: "bottom outcome", color: "text-muted-foreground" },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground">What this means</h3>
            <div className="grid sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground mb-1">Perfect Trader (75% WR · 1% risk · 2.5× RR)</p>
                <p>Mathematically explosive growth. Nearly all 100 paths finish well above $10k. The compounding of a positive expected value at low risk means even unlucky paths rarely blow. This is the power of genuine edge + discipline.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Median Trader (50% WR · 2% risk · 1.5× RR)</p>
                <p>Barely positive expected value but 2× the risk. Some paths grow, many drift sideways or slowly decline. A few blow. This is most retail traders — they have a slight edge but risk too much and give it back over time.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Lousy Trader (28% WR · 5% risk · 1.2× RR)</p>
                <p>Negative expected value with massive risk. Almost all paths blow the account. The 1.2× reward ratio doesn't come close to compensating for the 72% loss rate. High risk accelerates the inevitable to zero.</p>
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Key insight:</span> Risk size matters as much as win rate. The Median Trader's edge is erased by over-risking. The Perfect Trader wins because of three things working together: a real edge (75% WR), disciplined reward targeting (2.5×), and conservative position sizing (1%). Remove any one of them and the picture changes dramatically.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminAIPanel({ settings, updateSetting, saveSettings, saving }: {
  settings: Record<string, string>;
  updateSetting: (key: string, value: string) => void;
  saveSettings: () => Promise<void>;
  saving: boolean;
}) {
  const [adminMessages, setAdminMessages] = useState<{ role: string; content: string }[]>([]);
  const [adminInput, setAdminInput] = useState("");
  const [adminStreaming, setAdminStreaming] = useState(false);
  const [adminConvId, setAdminConvId] = useState<number | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [draftPromptLoading, setDraftPromptLoading] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fetchOpts: RequestInit = { credentials: "include" };
  const headers = { "Content-Type": "application/json" };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [adminMessages]);

  async function ensureConversation(): Promise<number> {
    if (adminConvId) return adminConvId;
    const res = await fetch(`${API_BASE}/gemini/conversations`, {
      method: "POST", ...fetchOpts, headers,
      body: JSON.stringify({ title: "Admin AI Session" }),
    });
    const data = await res.json();
    setAdminConvId(data.id);
    return data.id;
  }

  async function streamAdminMessage(msg: string, convId: number) {
    const response = await fetch(`${API_BASE}/gemini/conversations/${convId}/messages`, {
      method: "POST", ...fetchOpts, headers,
      body: JSON.stringify({
        content: msg,
        pageContext: { currentPage: "Admin Dashboard", route: "/admin", isAdmin: true },
      }),
    });
    const reader = response.body?.getReader();
    if (!reader) return "";

    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          if (parsed.content) {
            fullText += parsed.content;
            setAdminMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: fullText };
              return updated;
            });
          }
          if (parsed.done) break;
        } catch {}
      }
    }
    return fullText;
  }

  async function sendAdminMessage() {
    if (!adminInput.trim() || adminStreaming) return;
    const msg = adminInput.trim();
    setAdminInput("");
    setAdminMessages(prev => [...prev, { role: "user", content: msg }]);
    setAdminStreaming(true);
    setAdminMessages(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      const convId = await ensureConversation();
      await streamAdminMessage(msg, convId);
    } catch {
      setAdminMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Error getting response." };
        return updated;
      });
    }
    setAdminStreaming(false);
  }

  async function generateSummary() {
    setSummaryLoading(true);
    setSummaryText("");
    try {
      const convId = await ensureConversation();
      setAdminMessages(prev => [...prev,
        { role: "user", content: "Generate a comprehensive platform health summary. Include user growth, subscription distribution, trading activity, win rates, and any concerns." },
        { role: "assistant", content: "" },
      ]);
      const result = await streamAdminMessage(
        "Generate a comprehensive platform health summary. Include user growth, subscription distribution, trading activity, win rates, and any concerns. Use the get_platform_stats and list_users_summary tools to gather real data.",
        convId,
      );
      setSummaryText(result);
    } catch {
      setSummaryText("Failed to generate summary.");
    }
    setSummaryLoading(false);
  }

  async function generatePromptDraft() {
    setDraftPromptLoading(true);
    setDraftPrompt("");
    try {
      const convId = await ensureConversation();
      setAdminMessages(prev => [...prev,
        { role: "user", content: "Draft an improved AI mentor system prompt based on current platform usage patterns." },
        { role: "assistant", content: "" },
      ]);
      const result = await streamAdminMessage(
        "Draft an improved AI mentor system prompt for this trading platform. Use the suggest_system_prompt tool to get the current prompt, then create an enhanced version. Output ONLY the new system prompt text, no other commentary.",
        convId,
      );
      setDraftPrompt(result);
    } catch {
      setDraftPrompt("Failed to generate prompt draft.");
    }
    setDraftPromptLoading(false);
  }

  function applyDraftPrompt() {
    if (draftPrompt) {
      updateSetting("ai_mentor_system_prompt", draftPrompt);
      saveSettings();
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Admin AI Chat</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Ask about platform activity, user engagement, or anything else. The AI has access to admin tools.
        </p>

        <div className="bg-card border border-border rounded-xl overflow-hidden h-[400px] flex flex-col">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {adminMessages.length === 0 && (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <Sparkles className="h-8 w-8 text-primary/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Ask the AI about your platform</p>
                </div>
              </div>
            )}
            {adminMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}{adminStreaming && i === adminMessages.length - 1 && msg.role === "assistant" ? "\u258B" : ""}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-border flex gap-2">
            <input
              type="text"
              value={adminInput}
              onChange={(e) => setAdminInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendAdminMessage()}
              placeholder="Ask about users, stats, activity..."
              disabled={adminStreaming}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={sendAdminMessage}
              disabled={!adminInput.trim() || adminStreaming}
              className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shrink-0 disabled:opacity-40"
            >
              {adminStreaming ? <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" /> : <Send className="h-4 w-4 text-primary-foreground" />}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-bold">Platform Health Summary</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            AI-generated overview of platform usage, user activity, and trading statistics.
          </p>
          <button
            onClick={generateSummary}
            disabled={summaryLoading}
            className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-500/20 disabled:opacity-40"
          >
            {summaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            Generate Summary
          </button>
          {summaryText && (
            <div className="mt-3 bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
              {summaryText}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5 text-blue-500" />
            <h3 className="text-sm font-bold">AI-Draft System Prompt</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Generate an improved mentor system prompt. Review before applying.
          </p>
          <button
            onClick={generatePromptDraft}
            disabled={draftPromptLoading}
            className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-500 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-500/20 disabled:opacity-40"
          >
            {draftPromptLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Draft New Prompt
          </button>
          {draftPrompt && (
            <div className="mt-3 space-y-2">
              <div className="bg-muted/50 rounded-lg p-3 text-xs whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
                {draftPrompt}
              </div>
              <button
                onClick={applyDraftPrompt}
                disabled={saving}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-40"
              >
                <Save className="h-4 w-4" />
                Apply & Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
