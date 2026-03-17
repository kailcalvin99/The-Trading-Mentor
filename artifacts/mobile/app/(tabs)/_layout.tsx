import { Href, Tabs, usePathname, useRouter } from "expo-router";
import React, { useCallback } from "react";
import { View } from "react-native";

import AIAssistant from "@/components/AIAssistant";
import TopTabBar from "@/components/TopTabBar";
import { useAuth } from "@/contexts/AuthContext";

export default function TabLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, subscription } = useAuth();

  const isAdmin = user?.role === "admin";
  const tierLevel = isAdmin ? 2 : (subscription?.tierLevel ?? 0);

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
        isAdmin={isAdmin}
        tierLevel={tierLevel}
      />
      <Tabs
        tabBar={() => null}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{ title: "Dashboard" }}
        />
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
        <Tabs.Screen
          name="analytics"
          options={{ title: "Analytics" }}
        />
        <Tabs.Screen
          name="subscription"
          options={{ title: "Subscription" }}
        />
        <Tabs.Screen
          name="settings"
          options={{ title: "Settings" }}
        />
        <Tabs.Screen
          name="admin"
          options={{ title: "Admin" }}
        />
      </Tabs>
      <AIAssistant />
    </View>
  );
}
