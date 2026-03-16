import { Tabs } from "expo-router";
import React from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AIAssistant from "@/components/AIAssistant";
import TopTabBar from "@/components/TopTabBar";

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  const contentPaddingTop = insets.top + 52;

  return (
    <>
      <Tabs
        tabBar={(props) => <TopTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: "none" },
          sceneStyle: { paddingTop: contentPaddingTop },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{ title: "Planner" }}
        />
        <Tabs.Screen
          name="academy"
          options={{ title: "Academy" }}
        />
        <Tabs.Screen
          name="tracker"
          options={{ title: "Risk" }}
        />
        <Tabs.Screen
          name="journal"
          options={{ title: "Journal" }}
        />
        <Tabs.Screen
          name="community"
          options={{ title: "Community" }}
        />
      </Tabs>
      <AIAssistant />
    </>
  );
}
