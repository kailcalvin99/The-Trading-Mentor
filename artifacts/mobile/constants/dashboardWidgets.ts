import { type ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

export const WIDGET_PREFS_KEY = "dashboard-widget-prefs-v2";

export interface WidgetPrefs {
  tradePlan: boolean;
  notes: boolean;
  preTradeChecklist: boolean;
  swipeMode: boolean;
  morningRoutine: boolean;
  stats: boolean;
  quickJournal: boolean;
  killZone: boolean;
}

export const DEFAULT_WIDGET_PREFS: WidgetPrefs = {
  tradePlan: true,
  notes: false,
  preTradeChecklist: true,
  swipeMode: true,
  morningRoutine: true,
  stats: true,
  quickJournal: true,
  killZone: true,
};

export const WIDGET_CONFIG: Array<{
  key: keyof WidgetPrefs;
  label: string;
  desc: string;
  icon: ComponentProps<typeof Ionicons>["name"];
}> = [
  { key: "killZone", label: "Kill Zone Strip", desc: "Session countdown timers", icon: "time-outline" },
  { key: "stats", label: "Stats Strip", desc: "Today's P&L, win rate, trades", icon: "stats-chart-outline" },
  { key: "morningRoutine", label: "Morning Routine", desc: "Progress ring & checklist", icon: "sunny-outline" },
  { key: "preTradeChecklist", label: "Pre-Trade Checklist", desc: "4-point readiness check", icon: "checkmark-circle-outline" },
  { key: "tradePlan", label: "Trade Plan", desc: "Today's bias & key levels", icon: "document-text-outline" },
  { key: "quickJournal", label: "Quick Journal", desc: "Log a quick note to journal", icon: "pencil-outline" },
  { key: "notes", label: "Quick Notes", desc: "Scratch-pad notes", icon: "create-outline" },
  { key: "swipeMode", label: "Swipe Mode Launcher", desc: "Launch academy lessons", icon: "school-outline" },
];
