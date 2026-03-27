import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { Users, Settings, DollarSign, BarChart3, Code2 } from "lucide-react";
import { AdminAIPanel } from "./admin/AdminAIPanel";
import { AdminUsersTab } from "./admin/AdminUsersTab";
import { AdminSubscriptionsTab } from "./admin/AdminSubscriptionsTab";
import { AdminPlatformTab } from "./admin/AdminPlatformTab";
import { AdminDevToolsTab } from "./admin/AdminDevToolsTab";
import { useMonteCarlo } from "./admin/useMonteCarlo";
import { useAdminData } from "./admin/useAdminData";

export default function Admin() {
  const { user, logout } = useAuth();
  const { reload: reloadConfig } = useAppConfig();
  const [tab, setTab] = useState<"users" | "subscriptions" | "platform" | "analytics" | "devtools">("users");

  const mc = useMonteCarlo();
  const data = useAdminData(reloadConfig, logout);
  const {
    users, usersLoading, usersError, tiers, settings,
    editingUser, setEditingUser, editingTier, setEditingTier,
    tierFeatureEdit, setTierFeatureEdit, newFeature, setNewFeature,
    editValues, setEditValues, saving, saveMsg,
    resetStep, setResetStep, resetCode, setResetCode, resetting,
    showInactiveOnly, setShowInactiveOnly, deleteConfirmId, setDeleteConfirmId,
    deleting, passwordResets, copiedResetId, setCopiedResetId,
    loadData, saveUserSub, saveTier, saveTierFeatures,
    updateSetting, toggleSetting, saveSettings, handleDeleteUser, handleReset,
    filteredUsers,
  } = data;

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
          { key: "subscriptions" as const, label: "Subscriptions", icon: DollarSign },
          { key: "platform" as const, label: "Platform Settings", icon: Settings },
          { key: "analytics" as const, label: "Analytics", icon: BarChart3 },
          { key: "devtools" as const, label: "Developer Tools", icon: Code2 },
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
        <AdminUsersTab
          users={users}
          filteredUsers={filteredUsers}
          usersLoading={usersLoading}
          usersError={usersError}
          tiers={tiers}
          passwordResets={passwordResets}
          editingUser={editingUser}
          setEditingUser={setEditingUser}
          editValues={editValues}
          setEditValues={setEditValues}
          saving={saving}
          deleting={deleting}
          deleteConfirmId={deleteConfirmId}
          setDeleteConfirmId={setDeleteConfirmId}
          showInactiveOnly={showInactiveOnly}
          setShowInactiveOnly={setShowInactiveOnly}
          copiedResetId={copiedResetId}
          setCopiedResetId={setCopiedResetId}
          currentUserId={user?.id}
          loadData={loadData}
          saveUserSub={saveUserSub}
          handleDeleteUser={handleDeleteUser}
        />
      )}

      {tab === "subscriptions" && (
        <AdminSubscriptionsTab
          tiers={tiers}
          editingTier={editingTier}
          setEditingTier={setEditingTier}
          tierFeatureEdit={tierFeatureEdit}
          setTierFeatureEdit={setTierFeatureEdit}
          newFeature={newFeature}
          setNewFeature={setNewFeature}
          editValues={editValues}
          setEditValues={setEditValues}
          saving={saving}
          saveTier={saveTier}
          saveTierFeatures={saveTierFeatures}
        />
      )}

      {tab === "platform" && (
        <AdminPlatformTab
          settings={settings}
          saving={saving}
          saveMsg={saveMsg}
          resetStep={resetStep}
          setResetStep={setResetStep}
          resetCode={resetCode}
          setResetCode={setResetCode}
          resetting={resetting}
          updateSetting={updateSetting}
          toggleSetting={toggleSetting}
          saveSettings={saveSettings}
          handleReset={handleReset}
        />
      )}

      {tab === "analytics" && (
        <AdminAIPanel
          settings={settings}
          updateSetting={updateSetting}
          saveSettings={saveSettings}
          saving={saving}
        />
      )}

      {tab === "devtools" && <AdminDevToolsTab mc={mc} />}
    </div>
  );
}
