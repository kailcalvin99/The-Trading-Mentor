import { Save, X, Palette, Shield, Brain, ListChecks, ToggleLeft, Rocket, AlertTriangle, RotateCcw, Video } from "lucide-react";
import { SettingsSection, SettingInput, SettingToggle } from "./AdminSettingsUI";
import { TOUR_STEPS } from "@/components/tourConfig";

type RoutineItem = { key: string; label: string; desc: string; icon: string };

interface Props {
  settings: Record<string, string>;
  saving: boolean;
  saveMsg: string;
  resetStep: number;
  setResetStep: (v: number) => void;
  resetCode: string;
  setResetCode: (v: string) => void;
  resetting: boolean;
  updateSetting: (key: string, value: string) => void;
  toggleSetting: (key: string) => void;
  saveSettings: () => void;
  handleReset: () => void;
}

export function AdminPlatformTab({
  settings, saving, saveMsg, resetStep, setResetStep, resetCode, setResetCode,
  resetting, updateSetting, toggleSetting, saveSettings, handleReset,
}: Props) {
  let routineItems: RoutineItem[] = [];
  try { routineItems = JSON.parse(settings.routine_items || "[]"); } catch {}

  function updateRoutineItem(idx: number, field: keyof RoutineItem, value: string) {
    const copy = [...routineItems];
    copy[idx] = { ...copy[idx], [field]: value };
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

  return (
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
          <SettingInput label="Beta Tester Discount %" desc="Lifetime discount for beta testers who subscribe after their trial ends" value={settings.beta_tester_discount_pct || ""} onChange={(v) => updateSetting("beta_tester_discount_pct", v)} type="number" />
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

      <SettingsSection title="Tour Videos" icon={Video}>
        <p className="text-xs text-muted-foreground mb-4">
          Override the HeyGen video ID for each tour step. Leave blank to use the default ID from the codebase. Changes take effect immediately after saving.
        </p>
        <div className="space-y-3">
          {TOUR_STEPS.map((step, idx) => {
            const key = `tour_video_${idx}`;
            return (
              <div key={idx} className="bg-background border border-border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-xs font-semibold text-foreground">Step {idx + 1}: {step.title}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Route: {step.targetRoute}</p>
                  </div>
                  {settings[key] && (
                    <button
                      onClick={() => updateSetting(key, "")}
                      className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1 shrink-0"
                      title="Clear override"
                    >
                      <X className="h-3 w-3" />
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={settings[key] || ""}
                  onChange={(e) => updateSetting(key, e.target.value)}
                  placeholder={`Override video ID for step ${idx + 1}`}
                  className="w-full bg-muted/30 border border-border rounded px-2.5 py-1.5 text-xs font-mono"
                />
                {settings[key] && (
                  <a
                    href={`https://app.heygen.com/share/${settings[key]}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] text-primary hover:underline mt-1"
                  >
                    Preview override →
                  </a>
                )}
              </div>
            );
          })}
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
  );
}
