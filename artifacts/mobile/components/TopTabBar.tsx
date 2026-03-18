import { Ionicons } from "@expo/vector-icons";
import { Href } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

const REQUIRED_TIER: Partial<Record<string, number>> = {
  journal: 2,
  analytics: 2,
};

const C = Colors.dark;

const TAB_ICONS: Record<string, { default: keyof typeof Ionicons.glyphMap; selected: keyof typeof Ionicons.glyphMap }> = {
  dashboard:    { default: "home-outline",        selected: "home" },
  index:        { default: "checkbox-outline",    selected: "checkbox" },
  academy:      { default: "school-outline",      selected: "school" },
  videos:       { default: "play-circle-outline", selected: "play-circle" },
  tracker:      { default: "shield-outline",      selected: "shield" },
  journal:      { default: "book-outline",        selected: "book" },
  community:    { default: "people-outline",      selected: "people" },
  analytics:    { default: "bar-chart-outline",   selected: "bar-chart" },
  subscription: { default: "card-outline",        selected: "card" },
  admin:        { default: "shield-half-outline", selected: "shield-half" },
};

const TAB_LABELS: Record<string, string> = {
  dashboard:    "Dashboard",
  index:        "Planner",
  academy:      "Academy",
  videos:       "Videos",
  tracker:      "Risk",
  journal:      "Journal",
  community:    "Social",
  analytics:    "Analytics",
  subscription: "Subscription",
  admin:        "Admin",
};

type TabRoute = "dashboard" | "index" | "academy" | "videos" | "tracker" | "journal" | "community" | "analytics" | "subscription" | "admin";

const TAB_HREFS: Record<TabRoute, Href> = {
  dashboard:    "/dashboard",
  index:        "/",
  academy:      "/academy",
  videos:       "/videos",
  tracker:      "/tracker",
  journal:      "/journal",
  community:    "/community",
  analytics:    "/analytics",
  subscription: "/subscription",
  admin:        "/admin",
};

const BASE_TAB_ROUTES: TabRoute[] = ["dashboard", "index", "academy", "videos", "tracker", "journal", "community", "analytics", "subscription"];

const LITE_TAB_ROUTES: TabRoute[] = ["dashboard", "academy", "tracker", "journal"];

interface TopTabBarProps {
  pathname: string;
  onNavigate: (href: Href) => void;
  isAdmin?: boolean;
  tierLevel?: number;
  appMode?: "full" | "lite";
}

export default function TopTabBar({ pathname, onNavigate, isAdmin = false, tierLevel = 0, appMode = "full" }: TopTabBarProps) {
  const insets = useSafeAreaInsets();

  const baseRoutes = appMode === "lite" ? LITE_TAB_ROUTES : BASE_TAB_ROUTES;
  const TAB_ROUTES: TabRoute[] = isAdmin
    ? [...baseRoutes, "admin"]
    : baseRoutes;

  const normalizedPath = pathname.replace(/^\/\(tabs\)\/?/, "/");
  const isSettingsActive = normalizedPath === "/settings";
  const activeRoute: TabRoute | undefined = TAB_ROUTES.find(
    (route) => normalizedPath === TAB_HREFS[route]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.bar}
          bounces={false}
          style={{ flex: 1 }}
        >
          {TAB_ROUTES.map((route) => {
            const isFocused = activeRoute === route;
            const icons = TAB_ICONS[route];
            const label = TAB_LABELS[route];
            const requiredTier = REQUIRED_TIER[route] ?? 0;
            const isLocked = !isAdmin && tierLevel < requiredTier;
            const color = isLocked ? C.cardBorder : isFocused ? C.accent : C.tabIconDefault;

            return (
              <Pressable
                key={route}
                onPress={() => onNavigate(TAB_HREFS[route])}
                style={styles.tab}
                accessibilityRole="tab"
                accessibilityState={{ selected: isFocused }}
                accessibilityLabel={label}
              >
                <View style={styles.iconWrapper}>
                  <Ionicons
                    name={isFocused ? icons.selected : icons.default}
                    size={20}
                    color={color}
                  />
                  {isLocked && (
                    <View style={styles.lockBadge}>
                      <Ionicons name="lock-closed" size={8} color={C.cardBorder} />
                    </View>
                  )}
                </View>
                <Text style={[styles.label, { color }]}>{label}</Text>
                {isFocused && <View style={[styles.indicator, { backgroundColor: C.accent }]} />}
              </Pressable>
            );
          })}
        </ScrollView>

        <Pressable
          onPress={() => onNavigate("/settings" as Href)}
          style={styles.pinnedTab}
          accessibilityRole="tab"
          accessibilityState={{ selected: isSettingsActive }}
          accessibilityLabel="Settings"
        >
          <Ionicons
            name={isSettingsActive ? "settings" : "settings-outline"}
            size={20}
            color={isSettingsActive ? C.accent : C.tabIconDefault}
          />
          <Text style={[styles.label, { color: isSettingsActive ? C.accent : C.tabIconDefault }]}>
            Settings
          </Text>
          {isSettingsActive && <View style={[styles.indicator, { backgroundColor: C.accent }]} />}
        </Pressable>
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
  row: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  bar: {
    flexDirection: "row",
    height: 52,
    paddingHorizontal: 4,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    gap: 2,
    position: "relative",
  },
  iconWrapper: {
    position: "relative",
  },
  lockBadge: {
    position: "absolute",
    bottom: -2,
    right: -4,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 6,
    width: 12,
    height: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  indicator: {
    position: "absolute",
    bottom: 0,
    left: 8,
    right: 8,
    height: 2,
    borderRadius: 1,
  },
  pinnedTab: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    gap: 2,
    position: "relative",
    borderLeftWidth: 1,
    borderLeftColor: C.cardBorder,
    height: 52,
  },
});
