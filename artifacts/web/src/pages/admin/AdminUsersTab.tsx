import {
  Crown, Edit2, X, Check, Trash2,
  AlertTriangle, Loader2, Filter, RefreshCcw, Copy, KeyRound,
} from "lucide-react";
import type { AdminUser, AdminTier, PasswordReset } from "./adminUtils";
import { getDaysSinceLogin, getLastActiveLabel } from "./useAdminData";

interface Props {
  users: AdminUser[];
  filteredUsers: AdminUser[];
  usersLoading: boolean;
  usersError: string | null;
  tiers: AdminTier[];
  passwordResets: PasswordReset[];
  editingUser: number | null;
  setEditingUser: (id: number | null) => void;
  editValues: Record<string, string>;
  setEditValues: (v: Record<string, string>) => void;
  saving: boolean;
  deleting: boolean;
  deleteConfirmId: number | null;
  setDeleteConfirmId: (id: number | null) => void;
  showInactiveOnly: boolean;
  setShowInactiveOnly: (v: boolean) => void;
  copiedResetId: number | null;
  setCopiedResetId: (id: number | null) => void;
  currentUserId: number | undefined;
  loadData: () => void;
  saveUserSub: (userId: number) => void;
  handleDeleteUser: (id: number) => void;
}

export function AdminUsersTab({
  users, filteredUsers, usersLoading, usersError, tiers,
  passwordResets, editingUser, setEditingUser, editValues, setEditValues,
  saving, deleting, deleteConfirmId, setDeleteConfirmId,
  showInactiveOnly, setShowInactiveOnly, copiedResetId, setCopiedResetId,
  currentUserId, loadData, saveUserSub, handleDeleteUser,
}: Props) {
  return (
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
          {usersLoading ? "Loading..." : `${filteredUsers.length} of ${users.length} users`}
        </span>
      </div>

      {usersLoading && (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading users...</span>
        </div>
      )}

      {!usersLoading && usersError && (
        <div className="flex items-center gap-3 px-4 py-4 bg-destructive/10 border border-destructive/30 rounded-xl text-destructive">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Failed to load users</p>
            <p className="text-xs mt-0.5 opacity-80">{usersError}</p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 hover:bg-destructive/20 transition-colors"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Retry
          </button>
        </div>
      )}

      {!usersLoading && !usersError && (
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
      )}

      {passwordResets.length > 0 && (
        <div className="bg-card border border-amber-500/30 rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-amber-500/5 border-b border-amber-500/20 flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-bold text-amber-500">Pending Password Resets ({passwordResets.length})</span>
          </div>
          <div className="divide-y divide-border">
            {passwordResets.map((r) => {
              const resetUrl = `${window.location.origin}${import.meta.env.BASE_URL}reset-password?token=${r.token}`;
              const expiresAt = new Date(r.expiresAt);
              const minutesLeft = Math.max(0, Math.round((expiresAt.getTime() - Date.now()) / 60000));
              return (
                <div key={r.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{r.userName}</p>
                    <p className="text-xs text-muted-foreground">{r.userEmail}</p>
                    <p className="text-xs text-amber-500 mt-0.5">Expires in {minutesLeft} minute{minutesLeft !== 1 ? "s" : ""}</p>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(resetUrl);
                      setCopiedResetId(r.id);
                      setTimeout(() => setCopiedResetId(null), 2000);
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-600 border border-amber-500/30 hover:bg-amber-500/20 transition-colors shrink-0"
                  >
                    {copiedResetId === r.id ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy Reset Link
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {deleteConfirmId !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-full">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Delete User</h3>
            </div>
            {deleteConfirmId === currentUserId ? (
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
                {deleteConfirmId === currentUserId ? "Delete My Account" : "Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
