import { type ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";

export const WIDGET_PREFS_KEY = "dashboard-widget-prefs-v2";

export interface WidgetPrefs {
  todaysMission: boolean;
  tradePlan: boolean;
  notes: boolean;
  preTradeChecklist: boolean;
  riskShield: boolean;
  swipeMode: boolean;
  aiGreeting: boolean;
}

export const DEFAULT_WIDGET_PREFS: WidgetPrefs = {
  todaysMission: true,
  tradePlan: true,
  notes: false,
  preTradeChecklist: true,
  riskShield: true,
  swipeMode: true,
  aiGreeting: false,
};

export const WIDGET_CONFIG: Array<{
  key: keyof WidgetPrefs;
  label: string;
  desc: string;
  icon: ComponentProps<typeof Ionicons>["name"];
}> = [
  { key: "todaysMission", label: "Today's Mission", desc: "Daily mission generator", icon: "gift-outline" },
  { key: "tradePlan", label: "Trade Plan", desc: "Today's trade plan notes", icon: "document-text-outline" },
  { key: "notes", label: "Quick Notes", desc: "Scratch-pad notes", icon: "pencil-outline" },
  { key: "preTradeChecklist", label: "Pre-Trade Checklist", desc: "4-point readiness check", icon: "checkmark-circle-outline" },
  { key: "riskShield", label: "Risk Shield", desc: "Daily P&L and drawdown", icon: "shield-outline" },
  { key: "swipeMode", label: "Swipe Mode Launcher", desc: "Launch academy lessons", icon: "school-outline" },
  { key: "aiGreeting", label: "AI Greeting", desc: "Personalized daily message", icon: "chatbubble-ellipses-outline" },
];
