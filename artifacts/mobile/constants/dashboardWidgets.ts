import { type ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

export const WIDGET_PREFS_KEY = "dashboard-widget-prefs-v3";

export interface WidgetPrefs {
  notes: boolean;
  preTradeChecklist: boolean;
  morningRoutine: boolean;
  quickJournal: boolean;
  todaySchedule: boolean;
  liveprices: boolean;
  opentrade: boolean;
  economiccalendar: boolean;
  riskgauge: boolean;
  killzonetimer: boolean;
}

export const DEFAULT_WIDGET_PREFS: WidgetPrefs = {
  notes: false,
  preTradeChecklist: true,
  morningRoutine: true,
  quickJournal: true,
  todaySchedule: true,
  liveprices: true,
  opentrade: true,
  economiccalendar: true,
  riskgauge: true,
  killzonetimer: true,
};

export const WIDGET_CONFIG: Array<{
  key: keyof WidgetPrefs;
  label: string;
  desc: string;
  icon: ComponentProps<typeof Ionicons>["name"];
}> = [
  { key: "liveprices", label: "Live Market Prices", desc: "Real-time forex & index prices", icon: "pulse-outline" },
  { key: "killzonetimer", label: "Kill Zone Countdown", desc: "ICT session countdown timers", icon: "time-outline" },
  { key: "opentrade", label: "Open Trade Card", desc: "Track your active trade live", icon: "trending-up-outline" },
  { key: "riskgauge", label: "Daily Risk Gauge", desc: "Daily drawdown tracker", icon: "shield-outline" },
  { key: "economiccalendar", label: "Today's Events", desc: "High-impact economic calendar", icon: "calendar-outline" },
  { key: "morningRoutine", label: "Morning Routine", desc: "Progress ring & checklist", icon: "sunny-outline" },
  { key: "quickJournal", label: "Quick Note", desc: "Log a quick note to journal", icon: "pencil-outline" },
  { key: "notes", label: "Quick Notes", desc: "Scratch-pad notes", icon: "create-outline" },
];
