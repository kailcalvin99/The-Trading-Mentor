import { useState, useEffect } from "react";
import { API_BASE, authHeaders, type AdminUser, type AdminTier, type PasswordReset } from "./adminUtils";

export function getDaysSinceLogin(lastLoginAt: string | null | undefined): number | null {
  if (!lastLoginAt) return null;
  const lastLogin = new Date(lastLoginAt);
  const now = new Date();
  return Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
}

export function getLastActiveLabel(lastLoginAt: string | null | undefined): string {
  if (!lastLoginAt) return "Never";
  const days = getDaysSinceLogin(lastLoginAt);
  if (days === null) return "Never";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export function useAdminData(
  reloadConfig: () => Promise<void>,
  logout: () => Promise<void>
) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState<string | null>(null);
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
  const [passwordResets, setPasswordResets] = useState<PasswordReset[]>([]);
  const [copiedResetId, setCopiedResetId] = useState<number | null>(null);

  const fetchOpts: RequestInit = { credentials: "include" };
  const headers = { "Content-Type": "application/json", ...authHeaders() };

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setUsersLoading(true);
    setUsersError(null);
    try {
      const [usersResult, tiersResult, settingsResult, resetsResult] = await Promise.allSettled([
        fetch(`${API_BASE}/admin/users`, { ...fetchOpts, headers }),
        fetch(`${API_BASE}/admin/tiers`, { ...fetchOpts, headers }),
        fetch(`${API_BASE}/admin/settings`, { ...fetchOpts, headers }),
        fetch(`${API_BASE}/admin/password-resets`, { ...fetchOpts, headers }),
      ]);

      if (usersResult.status === "fulfilled") {
        const usersRes = usersResult.value;
        if (usersRes.ok) {
          setUsers((await usersRes.json()).users);
        } else {
          const errData = await usersRes.json().catch(() => ({}));
          setUsersError(errData.error || `Failed to load users (${usersRes.status})`);
          console.error("Failed to load users:", usersRes.status, errData);
        }
      } else {
        console.error("Network error loading users:", usersResult.reason);
        setUsersError("Network error: could not reach the server.");
      }

      if (tiersResult.status === "fulfilled" && tiersResult.value.ok)
        setTiers((await tiersResult.value.json()).tiers);
      if (settingsResult.status === "fulfilled" && settingsResult.value.ok)
        setSettings((await settingsResult.value.json()).settings);
      if (resetsResult.status === "fulfilled" && resetsResult.value.ok)
        setPasswordResets((await resetsResult.value.json()).resets);
    } catch (err) {
      console.error("Admin loadData error:", err);
      setUsersError("Unexpected error loading admin data.");
    } finally {
      setUsersLoading(false);
    }
  }

  async function saveUserSub(userId: number) {
    setSaving(true);
    const tierId = editValues.tierId ? parseInt(editValues.tierId) : undefined;
    const customMonthlyPrice = editValues.customMonthlyPrice || undefined;
    const customAnnualPrice = editValues.customAnnualPrice || undefined;
    const status = editValues.status || undefined;
    const res = await fetch(`${API_BASE}/admin/users/${userId}/subscription`, {
      method: "PUT", ...fetchOpts, headers,
      body: JSON.stringify({ tierId, customMonthlyPrice, customAnnualPrice, status }),
    });
    if (res.ok) {
      const matchedTier = tierId ? tiers.find((t) => t.id === tierId) : undefined;
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId
            ? {
                ...u,
                tierId: tierId ?? u.tierId,
                tierName: matchedTier ? matchedTier.name : u.tierName,
                customMonthlyPrice: customMonthlyPrice ?? u.customMonthlyPrice,
                customAnnualPrice: customAnnualPrice ?? u.customAnnualPrice,
                subStatus: status ?? u.subStatus,
              }
            : u
        )
      );
      setEditingUser(null);
    } else {
      const errData = await res.json().catch(() => ({}));
      setSaveMsg((errData as Record<string, string>).error || "Failed to save subscription.");
      setTimeout(() => setSaveMsg(""), 3000);
    }
    setSaving(false);
  }

  async function saveTier(tierId: number) {
    setSaving(true);
    const monthlyPrice = editValues.monthlyPrice;
    const annualPrice = editValues.annualPrice;
    const annualDiscountPct = editValues.annualDiscountPct ? parseInt(editValues.annualDiscountPct) : undefined;
    const description = editValues.description;
    const res = await fetch(`${API_BASE}/admin/tiers/${tierId}`, {
      method: "PUT", ...fetchOpts, headers,
      body: JSON.stringify({ monthlyPrice, annualPrice, annualDiscountPct, description }),
    });
    if (res.ok) {
      setTiers((prev) =>
        prev.map((t) =>
          t.id === tierId
            ? {
                ...t,
                monthlyPrice: monthlyPrice ?? t.monthlyPrice,
                annualPrice: annualPrice ?? t.annualPrice,
                annualDiscountPct: annualDiscountPct !== undefined ? String(annualDiscountPct) : t.annualDiscountPct,
                description: description ?? t.description,
              }
            : t
        )
      );
      setEditingTier(null);
    } else {
      const errData = await res.json().catch(() => ({}));
      setSaveMsg((errData as Record<string, string>).error || "Failed to save tier.");
      setTimeout(() => setSaveMsg(""), 3000);
    }
    setSaving(false);
  }

  async function saveTierFeatures(tierId: number, features: string[]) {
    setSaving(true);
    const res = await fetch(`${API_BASE}/admin/tiers/${tierId}`, {
      method: "PUT", ...fetchOpts, headers,
      body: JSON.stringify({ features }),
    });
    if (res.ok) {
      setTiers((prev) =>
        prev.map((t) => (t.id === tierId ? { ...t, features } : t))
      );
    } else {
      const errData = await res.json().catch(() => ({}));
      setSaveMsg((errData as Record<string, string>).error || "Failed to save tier features.");
      setTimeout(() => setSaveMsg(""), 3000);
    }
    setSaving(false);
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

  async function handleDeleteUser(userId: number) {
    setDeleting(true);
    try {
      const res = await fetch(`${API_BASE}/admin/users/${userId}`, {
        method: "DELETE", ...fetchOpts, headers,
      });
      let data: unknown;
      try {
        data = await res.json();
      } catch {
        alert("Delete request failed — server may be unreachable");
        return;
      }
      const parsed = typeof data === "object" && data !== null ? data as Record<string, unknown> : {};
      if (res.ok) {
        if (parsed.selfDeleted) {
          await logout();
          localStorage.clear();
          sessionStorage.clear();
          window.location.href = import.meta.env.BASE_URL || "/web/";
        } else {
          setDeleteConfirmId(null);
          loadData();
        }
      } else {
        const errMsg = typeof parsed.error === "string" ? parsed.error : "Failed to delete user";
        alert(errMsg);
      }
    } catch {
      alert("Delete request failed — server may be unreachable");
    } finally {
      setDeleting(false);
    }
  }

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

  const filteredUsers = showInactiveOnly
    ? users.filter((u) => {
        const days = getDaysSinceLogin(u.lastLoginAt);
        return days === null || days >= 30;
      })
    : users;

  return {
    users, usersLoading, usersError, tiers, settings,
    editingUser, setEditingUser,
    editingTier, setEditingTier,
    tierFeatureEdit, setTierFeatureEdit,
    newFeature, setNewFeature,
    editValues, setEditValues,
    saving, saveMsg,
    resetStep, setResetStep,
    resetCode, setResetCode,
    resetting,
    showInactiveOnly, setShowInactiveOnly,
    deleteConfirmId, setDeleteConfirmId,
    deleting,
    passwordResets,
    copiedResetId, setCopiedResetId,
    loadData, saveUserSub, saveTier, saveTierFeatures,
    updateSetting, toggleSetting, saveSettings,
    handleDeleteUser, handleReset,
    filteredUsers,
  };
}
