import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
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
};

const TAB_LABELS: Record<string, string> = {
  index:     "Planner",
  academy:   "Academy",
  tracker:   "Risk",
  journal:   "Journal",
  community: "Community",
};

export default function TopTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top },
      ]}
    >
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const icons = TAB_ICONS[route.name] ?? { default: "ellipse-outline", selected: "ellipse" };
          const label = TAB_LABELS[route.name] ?? route.name;
          const color = isFocused ? C.accent : C.tabIconDefault;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={styles.tab}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={label}
            >
              <Ionicons
                name={isFocused ? icons.selected : icons.default}
                size={22}
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
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
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
