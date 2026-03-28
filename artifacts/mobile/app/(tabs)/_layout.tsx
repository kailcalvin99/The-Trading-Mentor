import { Href, Tabs, usePathname, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AIAssistant from "@/components/AIAssistant";
import FloatingToolkit from "@/components/FloatingToolkit";
import TopTabBar from "@/components/TopTabBar";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet } from "@/lib/api";
import { ChromeCollapseProvider, useChromeCollapse } from "@/contexts/ChromeCollapseContext";
import { ScrollDirectionProvider } from "@/contexts/ScrollDirectionContext";

const COMMUNITY_LAST_VISIT_KEY = "community_last_visit";

const TOP_TAB_BAR_HEIGHT = 42;

const TAP_MOVE_THRESHOLD = 10;

function TabLayoutInner() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, appMode, isAdmin, tierLevel } = useAuth();
  const [communityBadge, setCommunityBadge] = useState(0);
  const [journalDraftBadge, setJournalDraftBadge] = useState(0);
  const insets = useSafeAreaInsets();

  const { resetIdleTimer, headerAnim, headerLayoutAnim, isCollapsed } = useChromeCollapse();

  const headerHeight = insets.top + TOP_TAB_BAR_HEIGHT;

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

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
    if (!user || (!isAdmin && tierLevel < 1)) return;
    const isOnJournalPage = pathname.includes("journal");
    if (isOnJournalPage) {
      setJournalDraftBadge(0);
      return;
    }
    async function pollDrafts() {
      try {
        const data = await apiGet<Array<{ isDraft?: boolean }>>("trades");
        const count = Array.isArray(data) ? data.filter((t) => t.isDraft).length : 0;
        setJournalDraftBadge(count);
      } catch {
        setJournalDraftBadge(0);
      }
    }
    pollDrafts();
    const id = setInterval(pollDrafts, 60 * 1000);
    return () => clearInterval(id);
  }, [user, tierLevel, isAdmin, pathname]);

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

  const headerTranslateY = headerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -headerHeight],
  });

  const contentPaddingTop = headerLayoutAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [headerHeight, 0],
  });

  function handleTouchStart(e: { nativeEvent: { pageX: number; pageY: number } }) {
    touchStartRef.current = { x: e.nativeEvent.pageX, y: e.nativeEvent.pageY };
  }

  function handleTouchEnd(e: { nativeEvent: { pageX: number; pageY: number } }) {
    if (!touchStartRef.current) return;
    const dx = Math.abs(e.nativeEvent.pageX - touchStartRef.current.x);
    const dy = Math.abs(e.nativeEvent.pageY - touchStartRef.current.y);
    touchStartRef.current = null;
    if (dx < TAP_MOVE_THRESHOLD && dy < TAP_MOVE_THRESHOLD) {
      resetIdleTimer();
    }
  }

  return (
    <View
      style={styles.root}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <Animated.View style={[styles.tabsWrapper, { paddingTop: contentPaddingTop }]}>
        <Tabs
          tabBar={() => null}
          screenOptions={{
            headerShown: false,
          }}
          initialRouteName="dashboard"
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
            name="tracker"
            options={{ title: "Prop Tracker" }}
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
          <Tabs.Screen
            name="code-editor"
            options={{ title: "Code Editor" }}
          />
        </Tabs>
      </Animated.View>

      <Animated.View
        style={[
          styles.headerWrapper,
          { transform: [{ translateY: headerTranslateY }] },
        ]}
        pointerEvents={isCollapsed ? "none" : "box-none"}
      >
        <TopTabBar
          pathname={pathname}
          onNavigate={handleNavigate}
          isAdmin={isAdmin}
          tierLevel={tierLevel}
          appMode={appMode}
          userName={user?.name ?? ""}
          communityBadge={communityBadge}
          journalDraftBadge={journalDraftBadge}
        />
      </Animated.View>

      <FloatingToolkit />
      <AIAssistant />
    </View>
  );
}

export default function TabLayout() {
  return (
    <ChromeCollapseProvider>
      <ScrollDirectionProvider>
        <TabLayoutInner />
      </ScrollDirectionProvider>
    </ChromeCollapseProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  headerWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  tabsWrapper: {
    flex: 1,
  },
});
