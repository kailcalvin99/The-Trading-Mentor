import { Href, Tabs, usePathname, useRouter } from "expo-router";
import React, { useCallback } from "react";
import { View } from "react-native";

import AIAssistant from "@/components/AIAssistant";
import TopTabBar from "@/components/TopTabBar";

export default function TabLayout() {
  const pathname = usePathname();
  const router = useRouter();

  const handleNavigate = useCallback(
    (href: Href) => {
      router.navigate(href);
    },
    [router]
  );

  return (
    <View style={{ flex: 1 }}>
      <TopTabBar
        pathname={pathname}
        onNavigate={handleNavigate}
      />
      <Tabs
        tabBar={() => null}
        screenOptions={{
          headerShown: false,
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
    </View>
  );
}
