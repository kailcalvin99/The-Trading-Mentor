import { type ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

export const WIDGET_PREFS_KEY = "dashboard-widget-prefs-v2";

export interface WidgetPrefs {
  notes: boolean;
  preTradeChecklist: boolean;
  morningRoutine: boolean;
  quickJournal: boolean;
  todaySchedule: boolean;
}

export const DEFAULT_WIDGET_PREFS: WidgetPrefs = {
  notes: false,
  preTradeChecklist: true,
  morningRoutine: true,
  quickJournal: true,
  todaySchedule: true,
};

export const WIDGET_CONFIG: Array<{
  key: keyof WidgetPrefs;
  label: string;
  desc: string;
  icon: ComponentProps<typeof Ionicons>["name"];
}> = [
  { key: "morningRoutine", label: "Morning Routine", desc: "Progress ring & checklist", icon: "sunny-outline" },
  { key: "quickJournal", label: "Quick Note", desc: "Log a quick note to journal", icon: "pencil-outline" },
  { key: "notes", label: "Quick Notes", desc: "Scratch-pad notes", icon: "create-outline" },
];
