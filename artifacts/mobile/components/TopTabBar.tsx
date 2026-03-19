import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Colors from "@/constants/colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useDailyGamification } from "@/components/DashboardGamification";
import { emitOpenAvatarPicker } from "@/lib/avatarPickerBus";

const TOUR_DONE_KEY = "mobile-onboarding-tour-done";

const REQUIRED_TIER: Partial<Record<string, number>> = {
  journal: 2,
  analytics: 2,
};

const TAB_ICONS: Record<string, { default: keyof typeof Ionicons.glyphMap; selected: keyof typeof Ionicons.glyphMap }> = {
  dashboard:    { default: "home-outline",        selected: "home" },
  index:        { default: "calendar-outline",    selected: "calendar" },
  academy:      { default: "school-outline",      selected: "school" },
  videos:       { default: "play-circle-outline", selected: "play-circle" },
  tracker:      { default: "shield-outline",      selected: "shield" },
  journal:      { default: "book-outline",        selected: "book" },
  tags:         { default: "pricetag-outline",    selected: "pricetag" },
  community:    { default: "people-outline",      selected: "people" },
  analytics:    { default: "bar-chart-outline",   selected: "bar-chart" },
};

const TAB_LABELS: Record<string, string> = {
  dashboard:    "Dashboard",
  index:        "Planner",
  academy:      "Academy",
  videos:       "Videos",
  tracker:      "Risk",
  journal:      "Journal",
  tags:         "Tags",
  community:    "Social",
  analytics:    "Analytics",
};

type TabRoute = "dashboard" | "index" | "academy" | "videos" | "tracker" | "journal" | "tags" | "community" | "analytics";

const TAB_HREFS: Record<TabRoute, Href> = {
  dashboard:    "/dashboard",
  index:        "/",
  academy:      "/academy",
  videos:       "/videos",
  tracker:      "/tracker",
  journal:      "/journal",
  tags:         "/tags",
  community:    "/community",
  analytics:    "/analytics",
};

const BASE_TAB_ROUTES: TabRoute[] = ["dashboard", "index", "academy", "videos", "tracker", "journal", "tags", "community", "analytics"];
const LITE_TAB_ROUTES: TabRoute[] = ["dashboard", "academy", "journal"];

interface TopTabBarProps {
  pathname: string;
  onNavigate: (href: Href) => void;
  isAdmin?: boolean;
  tierLevel?: number;
  appMode?: "full" | "lite";
  userName?: string;
  communityBadge?: number;
}

function BottomSheet({
  visible,
  onClose,
  children,
  C,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  C: typeof Colors.dark;
}) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(400)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 200 }),
        Animated.timing(bgAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }),
        Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start();
    }
  }, [visible]);

  const backdropColor = bgAnim.interpolate({ inputRange: [0, 1], outputRange: ["rgba(0,0,0,0)", "rgba(0,0,0,0.6)"] });

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: backdropColor }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>
      <Animated.View
        style={[
          styles.sheetContainer,
          {
            backgroundColor: C.backgroundSecondary,
            borderTopColor: C.cardBorder,
            paddingBottom: insets.bottom + 12,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={[styles.sheetHandle, { backgroundColor: C.cardBorder }]} />
        {children}
      </Animated.View>
    </Modal>
  );
}

export default function TopTabBar({
  pathname,
  onNavigate,
  isAdmin = false,
  tierLevel = 0,
  appMode = "full",
  userName = "",
  communityBadge = 0,
}: TopTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors: C } = useTheme();
  const { setAppMode, user } = useAuth();
  const { xp, streak } = useDailyGamification();
  const level = Math.floor(xp / 100) + 1;
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const baseRoutes = appMode === "lite" ? LITE_TAB_ROUTES : BASE_TAB_ROUTES;
  const TAB_ROUTES: TabRoute[] = baseRoutes;

  const normalizedPath = pathname.replace(/^\/\(tabs\)\/?/, "/");

  const activeRoute: TabRoute | undefined = TAB_ROUTES.find(
    (route) => normalizedPath === TAB_HREFS[route]
  );

  const activeLabel = activeRoute ? TAB_LABELS[activeRoute] : "ICT Mentor";
  const isDashboard = normalizedPath === "/dashboard";

  const firstName = user?.name?.split(" ")?.[0] || "Trader";
  const avatarUrl = user?.avatarUrl;
  const initials = userName
    ? userName.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)
    : "U";

  function navigate(href: Href) {
    setMenuOpen(false);
    setProfileOpen(false);
    setTimeout(() => onNavigate(href), 80);
  }

  async function handleTourRestart() {
    setProfileOpen(false);
    await AsyncStorage.removeItem(TOUR_DONE_KEY);
    setTimeout(() => router.navigate("/"), 200);
  }

  function renderDashboardBar() {
    return (
      <View style={styles.bar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setMenuOpen(true)}
          accessibilityLabel="Open navigation menu"
          accessibilityRole="button"
        >
          <Ionicons name="menu" size={24} color={C.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dashAvatar, { backgroundColor: C.accent + "20", borderColor: C.accent + "40" }]}
          onPress={emitOpenAvatarPicker}
          accessibilityLabel="Change avatar"
          accessibilityRole="button"
          activeOpacity={0.7}
        >
          {avatarUrl ? (
            avatarUrl.startsWith("data:") || avatarUrl.startsWith("http") ? (
              <Image source={{ uri: avatarUrl }} style={styles.dashAvatarImage} />
            ) : (
              <Text style={styles.dashAvatarEmoji}>{avatarUrl}</Text>
            )
          ) : (
            <Text style={[styles.dashAvatarInitial, { color: C.accent }]}>{initials}</Text>
          )}
        </TouchableOpacity>

        <Text style={[styles.dashGreeting, { color: C.text }]} numberOfLines={1}>
          Hi, {firstName}.
        </Text>

        <View style={styles.rightRow}>
          <TouchableOpacity
            style={[styles.logTradeBtn, { backgroundColor: C.accent }]}
            onPress={() => router.navigate({ pathname: "/(tabs)/journal", params: { new: "1" } } as never)}
            accessibilityLabel="Log a trade"
            accessibilityRole="button"
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={13} color="#0A0A0F" />
            <Text style={styles.logTradeBtnText}>Log Trade</Text>
          </TouchableOpacity>

          <View style={[styles.dashBadge, { backgroundColor: C.backgroundTertiary, borderColor: C.cardBorder }]}>
            <Ionicons name="star" size={11} color={C.accent} />
            <Text style={[styles.dashBadgeText, { color: C.accent }]}>Lv.{level}</Text>
          </View>

          <View style={[styles.dashBadge, { backgroundColor: C.backgroundTertiary, borderColor: C.cardBorder }]}>
            <Ionicons name="flame" size={11} color={streak >= 7 ? "#EF4444" : "#F59E0B"} />
            <Text style={[styles.dashBadgeText, { color: streak >= 7 ? "#EF4444" : "#F59E0B" }]}>{streak}d</Text>
          </View>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.navigate("/swipe-mode" as Href)}
            accessibilityLabel="Swipe mode"
            accessibilityRole="button"
          >
            <Ionicons name="albums-outline" size={20} color={C.textSecondary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setProfileOpen(true)}
            accessibilityLabel="Open settings"
            accessibilityRole="button"
          >
            <Ionicons name="settings-outline" size={20} color={C.textSecondary} />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderDefaultBar() {
    return (
      <View style={styles.bar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setMenuOpen(true)}
          accessibilityLabel="Open navigation menu"
          accessibilityRole="button"
        >
          <Ionicons name="menu" size={24} color={C.text} />
        </TouchableOpacity>

        <Text style={[styles.activeLabel, { color: C.text }]} numberOfLines={1}>
          {activeLabel}
        </Text>

        <View style={styles.rightRow}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setProfileOpen(true)}
            accessibilityLabel="Open profile menu"
            accessibilityRole="button"
          >
            <View style={[styles.avatar, { backgroundColor: C.accent + "25", borderColor: C.accent + "50" }]}>
              <Text style={[styles.avatarText, { color: C.accent }]}>{initials}</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top,
            backgroundColor: C.backgroundSecondary,
            borderBottomColor: C.cardBorder,
          },
        ]}
      >
        {isDashboard ? renderDashboardBar() : renderDefaultBar()}
      </View>

      <BottomSheet visible={menuOpen} onClose={() => setMenuOpen(false)} C={C}>
        <Text style={[styles.sheetTitle, { color: C.textSecondary }]}>NAVIGATION</Text>
        {TAB_ROUTES.map((route) => {
          const isFocused = activeRoute === route;
          const icons = TAB_ICONS[route];
          const label = TAB_LABELS[route];
          const requiredTier = REQUIRED_TIER[route] ?? 0;
          const isLocked = !isAdmin && tierLevel < requiredTier;
          const color = isLocked ? C.textTertiary : isFocused ? C.accent : C.text;

          const hasBadge = route === "community" && communityBadge > 0;

          return (
            <TouchableOpacity
              key={route}
              onPress={() => !isLocked && navigate(TAB_HREFS[route])}
              style={[
                styles.menuItem,
                isFocused && { backgroundColor: C.accent + "15" },
                { borderColor: isFocused ? C.accent + "30" : "transparent" },
              ]}
              accessibilityRole="menuitem"
              accessibilityState={{ selected: isFocused }}
            >
              <View
                style={[
                  styles.menuIconBox,
                  { backgroundColor: isFocused ? C.accent + "20" : C.backgroundTertiary },
                ]}
              >
                <Ionicons
                  name={isFocused ? icons.selected : icons.default}
                  size={20}
                  color={color}
                />
                {hasBadge && (
                  <View style={styles.badgeDot}>
                    <Text style={styles.badgeText}>{communityBadge > 9 ? "9+" : communityBadge}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.menuLabel, { color }]}>{label}</Text>
              {hasBadge && !isLocked && !isFocused && (
                <View style={[styles.badgePill, { marginLeft: "auto" }]}>
                  <Text style={styles.badgePillText}>{communityBadge > 99 ? "99+" : communityBadge} new</Text>
                </View>
              )}
              {isLocked && (
                <Ionicons name="lock-closed-outline" size={14} color={C.textTertiary} style={{ marginLeft: "auto" }} />
              )}
              {isFocused && (
                <Ionicons name="chevron-forward" size={14} color={C.accent} style={{ marginLeft: "auto" }} />
              )}
            </TouchableOpacity>
          );
        })}

        {/* Learning Mode divider + toggle */}
        <View style={[styles.menuDivider, { backgroundColor: C.cardBorder }]} />
        <View style={styles.learningToggleRow}>
          <View style={[styles.menuIconBox, { backgroundColor: appMode === "lite" ? C.accent + "20" : C.backgroundTertiary }]}>
            <Ionicons name="school-outline" size={20} color={appMode === "lite" ? C.accent : C.textSecondary} />
          </View>
          <Text style={[styles.menuLabel, { color: appMode === "lite" ? C.accent : C.text, flex: 1 }]}>Learning Mode</Text>
          <Switch
            value={appMode === "lite"}
            onValueChange={(val) => setAppMode(val ? "lite" : "full")}
            trackColor={{ false: "#3A3A55", true: C.accent + "60" }}
            thumbColor={appMode === "lite" ? C.accent : "#55556A"}
            ios_backgroundColor="#3A3A55"
            style={styles.switch}
          />
        </View>
      </BottomSheet>

      <BottomSheet visible={profileOpen} onClose={() => setProfileOpen(false)} C={C}>
        <View style={styles.profileHeader}>
          <View style={[styles.profileAvatarLarge, { backgroundColor: C.accent + "20", borderColor: C.accent + "40" }]}>
            <Text style={[styles.profileAvatarText, { color: C.accent }]}>{initials}</Text>
          </View>
          <View>
            <Text style={[styles.profileName, { color: C.text }]}>{userName || "Trader"}</Text>
            <Text style={[styles.profileSub, { color: C.textSecondary }]}>ICT Trading Mentor</Text>
          </View>
        </View>
        <View style={[styles.profileDivider, { backgroundColor: C.cardBorder }]} />

        {[
          { icon: "card-outline" as const, label: "Subscription", href: "/subscription" as Href },
          { icon: "settings-outline" as const, label: "Settings", href: "/settings" as Href },
          ...(isAdmin ? [{ icon: "shield-half-outline" as const, label: "Admin Panel", href: "/admin" as Href }] : []),
        ].map(({ icon, label, href }) => (
          <TouchableOpacity
            key={label}
            onPress={() => navigate(href)}
            style={styles.profileItem}
          >
            <Ionicons name={icon} size={20} color={C.textSecondary} />
            <Text style={[styles.profileItemLabel, { color: C.text }]}>{label}</Text>
            <Ionicons name="chevron-forward" size={16} color={C.textTertiary} style={{ marginLeft: "auto" }} />
          </TouchableOpacity>
        ))}

        <TouchableOpacity onPress={handleTourRestart} style={styles.profileItem}>
          <Ionicons name="help-circle-outline" size={20} color={C.textSecondary} />
          <Text style={[styles.profileItemLabel, { color: C.text }]}>Help & Tour</Text>
          <Ionicons name="chevron-forward" size={16} color={C.textTertiary} style={{ marginLeft: "auto" }} />
        </TouchableOpacity>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    zIndex: 10,
  },
  bar: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  activeLabel: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  toggleLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
  },
  switch: {
    transform: Platform.OS === "ios" ? [{ scaleX: 0.75 }, { scaleY: 0.75 }] : [{ scaleX: 0.85 }, { scaleY: 0.85 }],
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },

  dashAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  dashAvatarImage: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  dashAvatarEmoji: {
    fontSize: 16,
    lineHeight: 20,
  },
  dashAvatarInitial: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  dashGreeting: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
  logTradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  logTradeBtnText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: "#0A0A0F",
  },
  dashBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  dashBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },

  sheetContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
    paddingHorizontal: 16,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  sheetTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    borderWidth: 1,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  menuLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },

  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 4,
    paddingBottom: 16,
    paddingTop: 4,
  },
  profileAvatarLarge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  profileAvatarText: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  profileName: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  profileSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  profileDivider: {
    height: 1,
    marginBottom: 12,
  },
  profileItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 4,
  },
  profileItemLabel: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  badgeDot: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#EF4444",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: "#fff",
  },
  badgePill: {
    backgroundColor: "#EF444420",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#EF444444",
  },
  badgePillText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#EF4444",
  },
  menuDivider: {
    height: 1,
    marginVertical: 8,
  },
  learningToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
  },
});
