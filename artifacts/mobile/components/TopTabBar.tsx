import { Ionicons } from "@expo/vector-icons";
import { Href } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

const C = Colors.dark;

const TAB_ICONS: Record<string, { default: keyof typeof Ionicons.glyphMap; selected: keyof typeof Ionicons.glyphMap }> = {
  index:     { default: "checkbox-outline",  selected: "checkbox" },
  academy:   { default: "school-outline",    selected: "school" },
  tracker:   { default: "shield-outline",    selected: "shield" },
  journal:   { default: "book-outline",      selected: "book" },
  community: { default: "people-outline",    selected: "people" },
  analytics: { default: "bar-chart-outline", selected: "bar-chart" },
  settings:  { default: "settings-outline",  selected: "settings" },
};

const TAB_LABELS: Record<string, string> = {
  index:     "Planner",
  academy:   "Academy",
  tracker:   "Risk",
  journal:   "Journal",
  community: "Social",
  analytics: "Analytics",
  settings:  "Settings",
};

type TabRoute = "index" | "academy" | "tracker" | "journal" | "community" | "analytics" | "settings";

const TAB_HREFS: Record<TabRoute, Href> = {
  index:     "/",
  academy:   "/academy",
  tracker:   "/tracker",
  journal:   "/journal",
  community: "/community",
  analytics: "/analytics",
  settings:  "/settings",
};

const TAB_ROUTES: TabRoute[] = ["index", "academy", "tracker", "journal", "community", "analytics", "settings"];

interface TopTabBarProps {
  pathname: string;
  onNavigate: (href: Href) => void;
}

export default function TopTabBar({ pathname, onNavigate }: TopTabBarProps) {
  const insets = useSafeAreaInsets();

  const normalizedPath = pathname.replace(/^\/\(tabs\)\/?/, "/");
  const activeRoute: TabRoute = TAB_ROUTES.find(
    (route) => normalizedPath === TAB_HREFS[route]
  ) ?? "index";

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.bar}>
        {TAB_ROUTES.map((route) => {
          const isFocused = activeRoute === route;
          const icons = TAB_ICONS[route];
          const label = TAB_LABELS[route];
          const color = isFocused ? C.accent : C.tabIconDefault;

          return (
            <Pressable
              key={route}
              onPress={() => onNavigate(TAB_HREFS[route])}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={label}
            >
              <Ionicons
                name={isFocused ? icons.selected : icons.default}
                size={20}
                color={color}
              />
              <Text style={[styles.label, { color }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: C.backgroundSecondary,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  bar: {
    flexDirection: "row",
    height: 52,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  label: {
    fontSize: 9,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
});
