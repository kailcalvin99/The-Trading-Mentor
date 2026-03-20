import { Href, Tabs, usePathname, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

import AIAssistant from "@/components/AIAssistant";
import TopTabBar from "@/components/TopTabBar";
import KillZoneStrip from "@/components/KillZoneStrip";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet } from "@/lib/api";

const COMMUNITY_LAST_VISIT_KEY = "community_last_visit";

export default function TabLayout() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, subscription, appMode } = useAuth();
  const [communityBadge, setCommunityBadge] = useState(0);

  const isAdmin = user?.role === "admin";
  const tierLevel = isAdmin ? 2 : (subscription?.tierLevel ?? 0);

  useEffect(() => {
    async function checkNewPosts() {
      try {
        const lastVisit = await AsyncStorage.getItem(COMMUNITY_LAST_VISIT_KEY);
        const since = lastVisit ? new Date(parseInt(lastVisit, 10)).toISOString() : new Date(Date.now() - 24 * 3600000).toISOString();
        const data = await apiGet<{ count: number }>(`community/new-count?since=${encodeURIComponent(since)}`);
        setCommunityBadge(data.count);
      } catch {
        setCommunityBadge(0);
      }
    }
    if (user) {
      checkNewPosts();
      const id = setInterval(checkNewPosts, 3 * 60 * 1000);
      return () => clearInterval(id);
    }
  }, [user]);

  useEffect(() => {
    if (pathname.includes("community")) {
      setCommunityBadge(0);
    }
  }, [pathname]);

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
        appMode={appMode}
        userName={user?.name ?? ""}
        communityBadge={communityBadge}
      />
      {appMode !== "lite" && <KillZoneStrip />}
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
          options={{ title: "Mission Control" }}
        />
        <Tabs.Screen
          name="academy"
          options={{ title: "Academy" }}
        />
        <Tabs.Screen
          name="videos"
          options={{ title: "Videos" }}
        />
        <Tabs.Screen
          name="journal"
          options={{ title: "Journal" }}
        />
        <Tabs.Screen
          name="tags"
          options={{ title: "Tags" }}
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
