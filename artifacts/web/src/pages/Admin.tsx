import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Crown, Users, Settings, DollarSign, Save, Edit2, X, Check } from "lucide-react";

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

export default function Admin() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"users" | "tiers" | "settings">("users");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [tiers, setTiers] = useState<AdminTier[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [editingUser, setEditingUser] = useState<number | null>(null);
  const [editingTier, setEditingTier] = useState<number | null>(null);
  const [editValues, setEditValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchOpts: RequestInit = { credentials: "include" };
  const headers = { "Content-Type": "application/json" };

  useEffect(() => {
    loadData();
  }, []);

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
      method: "PUT",
      ...fetchOpts,
      headers,
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
      method: "PUT",
      ...fetchOpts,
      headers,
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

  async function saveSettings() {
    setSaving(true);
    await fetch(`${API_BASE}/admin/settings`, {
      method: "PUT",
      ...fetchOpts,
      headers,
      body: JSON.stringify({ settings }),
    });
    setSaving(false);
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

      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        {[
          { key: "users" as const, label: "Users", icon: Users },
          { key: "tiers" as const, label: "Subscription Tiers", icon: DollarSign },
          { key: "settings" as const, label: "Settings", icon: Settings },
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
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">User</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Plan</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Custom Price</th>
                  <th className="text-left px-4 py-3 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
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
                      {editingUser === u.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => saveUserSub(u.id)}
                            disabled={saving}
                            className="p-1.5 bg-primary/10 text-primary rounded hover:bg-primary/20"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingUser(null)}
                            className="p-1.5 bg-muted text-muted-foreground rounded hover:bg-muted/80"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
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
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                    <input
                      value={editValues.monthlyPrice || ""}
                      onChange={(e) => setEditValues({ ...editValues, monthlyPrice: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Annual Price ($)</label>
                    <input
                      value={editValues.annualPrice || ""}
                      onChange={(e) => setEditValues({ ...editValues, annualPrice: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Annual Discount %</label>
                    <input
                      value={editValues.annualDiscountPct || ""}
                      onChange={(e) => setEditValues({ ...editValues, annualDiscountPct: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Description</label>
                    <input
                      value={editValues.description || ""}
                      onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                    />
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
                <p className="text-xs text-muted-foreground mb-2">Features</p>
                <div className="flex flex-wrap gap-2">
                  {(tier.features as string[]).map((f, i) => (
                    <span key={i} className="text-xs bg-muted px-2 py-1 rounded-lg text-foreground/70">{f}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "settings" && (
        <div className="bg-card border border-border rounded-xl p-6 max-w-lg">
          <h3 className="text-lg font-bold text-foreground mb-4">Global Settings</h3>
          <div className="space-y-4">
            {[
              { key: "founder_limit", label: "Founder Spots Limit", desc: "How many founder spots are available" },
              { key: "founder_discount_pct", label: "Founder Discount %", desc: "Discount percentage for founders" },
              { key: "founder_discount_months", label: "Founder Discount Duration (months)", desc: "How long the founder discount lasts" },
              { key: "annual_discount_pct", label: "Annual Billing Discount %", desc: "Discount for choosing annual billing" },
            ].map(({ key, label, desc }) => (
              <div key={key}>
                <label className="text-sm font-medium text-foreground mb-1 block">{label}</label>
                <p className="text-xs text-muted-foreground mb-1.5">{desc}</p>
                <input
                  value={settings[key] || ""}
                  onChange={(e) => setSettings({ ...settings, [key]: e.target.value })}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            ))}
          </div>
          <button
            onClick={saveSettings}
            disabled={saving}
            className="mt-6 bg-primary text-primary-foreground font-bold px-6 py-2.5 rounded-xl hover:opacity-90 flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      )}
    </div>
  );
}
