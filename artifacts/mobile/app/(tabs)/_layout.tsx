import { BlurView } from "expo-blur";
import { isLiquidGlassAvailable } from "expo-glass-effect";
import { Tabs } from "expo-router";
import { Icon, Label, NativeTabs } from "expo-router/unstable-native-tabs";
import { SymbolView } from "expo-symbols";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet } from "react-native";

import Colors from "@/constants/colors";
import AIAssistant from "@/components/AIAssistant";

const C = Colors.dark;

function NativeTabLayout() {
  return (
    <>
    <NativeTabs>
      <NativeTabs.Trigger name="index">
        <Icon sf={{ default: "checklist", selected: "checklist" }} />
        <Label>Planner</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="academy">
        <Icon sf={{ default: "graduationcap", selected: "graduationcap.fill" }} />
        <Label>Academy</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tracker">
        <Icon sf={{ default: "shield.checkered", selected: "shield.checkered" }} />
        <Label>Risk</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="journal">
        <Icon sf={{ default: "book", selected: "book.fill" }} />
        <Label>Journal</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
    <AIAssistant />
    </>
  );
}

function ClassicTabLayout() {
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";

  return (
    <>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.tabIconDefault,
        headerShown: false,
        tabBarStyle: {
          ...(isIOS ? { position: "absolute" as const } : {}),
          backgroundColor: isIOS ? "transparent" : C.backgroundSecondary,
          borderTopWidth: 1,
          borderTopColor: C.cardBorder,
          elevation: 0,
          ...(isWeb ? { height: 64 } : {}),
        },
        tabBarBackground: isIOS
          ? () => (
              <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
            )
          : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Planner",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="checklist" tintColor={color} size={24} />
            ) : (
              <Ionicons name="checkbox-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="academy"
        options={{
          title: "Academy",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="graduationcap.fill" tintColor={color} size={24} />
            ) : (
              <Ionicons name="school-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="tracker"
        options={{
          title: "Risk",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="shield.checkered" tintColor={color} size={24} />
            ) : (
              <Ionicons name="shield-outline" size={22} color={color} />
            ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: "Journal",
          tabBarIcon: ({ color }) =>
            isIOS ? (
              <SymbolView name="book.fill" tintColor={color} size={24} />
            ) : (
              <Ionicons name="book-outline" size={22} color={color} />
            ),
        }}
      />
    </Tabs>
    <AIAssistant />
    </>
  );
}

export default function TabLayout() {
  if (isLiquidGlassAvailable()) {
    return <NativeTabLayout />;
  }
  return <ClassicTabLayout />;
}
