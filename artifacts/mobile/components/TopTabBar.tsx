import { Ionicons } from "@expo/vector-icons";
import { Href } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Colors from "@/constants/colors";

const C = Colors.dark;

const TAB_ICONS: Record<string, { default: keyof typeof Ionicons.glyphMap; selected: keyof typeof Ionicons.glyphMap }> = {
  index:        { default: "checkbox-outline",    selected: "checkbox" },
  academy:      { default: "school-outline",      selected: "school" },
  tracker:      { default: "shield-outline",      selected: "shield" },
  journal:      { default: "book-outline",        selected: "book" },
  community:    { default: "people-outline",      selected: "people" },
  analytics:    { default: "bar-chart-outline",   selected: "bar-chart" },
  subscription: { default: "card-outline",        selected: "card" },
  admin:        { default: "shield-half-outline", selected: "shield-half" },
};

const TAB_LABELS: Record<string, string> = {
  index:        "Planner",
  academy:      "Academy",
  tracker:      "Risk",
  journal:      "Journal",
  community:    "Social",
  analytics:    "Analytics",
  subscription: "Subscription",
  admin:        "Admin",
};

type TabRoute = "index" | "academy" | "tracker" | "journal" | "community" | "analytics" | "subscription" | "admin";

const TAB_HREFS: Record<TabRoute, Href> = {
  index:        "/",
  academy:      "/academy",
  tracker:      "/tracker",
  journal:      "/journal",
  community:    "/community",
  analytics:    "/analytics",
  subscription: "/subscription",
  admin:        "/admin",
};

const BASE_TAB_ROUTES: TabRoute[] = ["index", "academy", "tracker", "journal", "community", "analytics", "subscription"];

interface TopTabBarProps {
  pathname: string;
  onNavigate: (href: Href) => void;
  isAdmin?: boolean;
}

export default function TopTabBar({ pathname, onNavigate, isAdmin = false }: TopTabBarProps) {
  const insets = useSafeAreaInsets();

  const TAB_ROUTES: TabRoute[] = isAdmin
    ? [...BASE_TAB_ROUTES, "admin"]
    : BASE_TAB_ROUTES;

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
