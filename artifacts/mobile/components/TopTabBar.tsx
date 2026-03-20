import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  Modal,
  Platform,
  Pressable,
  Share,
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
  journal:      { default: "book-outline",        selected: "book" },
  tags:         { default: "pricetag-outline",    selected: "pricetag" },
  community:    { default: "people-outline",      selected: "people" },
  analytics:    { default: "bar-chart-outline",   selected: "bar-chart" },
};

const TAB_LABELS: Record<string, string> = {
  dashboard:    "Dashboard",
  index:        "Mission Control",
  academy:      "Academy",
  videos:       "Videos",
  journal:      "Journal",
  tags:         "Tags",
  community:    "Social",
  analytics:    "Analytics",
};

type TabRoute = "dashboard" | "index" | "academy" | "videos" | "journal" | "tags" | "community" | "analytics";

const TAB_HREFS: Record<TabRoute, Href> = {
  dashboard:    "/dashboard",
  index:        "/",
  academy:      "/academy",
  videos:       "/videos",
  journal:      "/journal",
  tags:         "/tags",
  community:    "/community",
  analytics:    "/analytics",
};

const BASE_TAB_ROUTES: TabRoute[] = ["dashboard", "index", "academy", "videos", "journal", "tags", "community", "analytics"];
const LITE_TAB_ROUTES: TabRoute[] = ["dashboard", "academy"];

interface TopTabBarProps {
  pathname: string;
  onNavigate: (href: Href) => void;
  isAdmin?: boolean;
  tierLevel?: number;
  appMode?: "full" | "lite";
  userName?: string;
  communityBadge?: number;
  journalDraftBadge?: number;
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

function NavDropdown({
  visible,
  onClose,
  topBarHeight,
  topInset,
  children,
  C,
}: {
  visible: boolean;
  onClose: () => void;
  topBarHeight: number;
  topInset: number;
  children: React.ReactNode;
  C: typeof Colors.dark;
}) {
  const translateY = useRef(new Animated.Value(-300)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scaleY = useRef(new Animated.Value(0.7)).current;
  const bgAnim = useRef(new Animated.Value(0)).current;

  const [rendered, setRendered] = useState(false);

  useEffect(() => {
    if (visible) {
      setRendered(true);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 18, stiffness: 220, mass: 0.8 }),
        Animated.spring(scaleY, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 220, mass: 0.8 }),
        Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(bgAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: -300, duration: 220, useNativeDriver: true }),
        Animated.timing(scaleY, { toValue: 0.7, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(bgAnim, { toValue: 0, duration: 200, useNativeDriver: false }),
      ]).start(() => setRendered(false));
    }
  }, [visible]);

  const backdropColor = bgAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(0,0,0,0)", "rgba(0,0,0,0.55)"],
  });

  if (!rendered && !visible) return null;

  return (
    <Modal visible={rendered} transparent animationType="none" onRequestClose={onClose}>
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: backdropColor }]} pointerEvents="box-none">
          <Pressable
            style={[StyleSheet.absoluteFill, { top: topInset + topBarHeight }]}
            onPress={onClose}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.dropdownContainer,
            {
              top: topInset + topBarHeight,
              backgroundColor: C.backgroundSecondary,
              borderColor: C.cardBorder,
              transform: [
                { translateY },
                { scaleY },
              ],
              opacity,
            },
          ]}
        >
          {children}
        </Animated.View>
      </View>
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
  journalDraftBadge = 0,
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

  async function handleInviteFriends() {
    try {
      await Share.share({
        message: "Join me on ICT Trading Mentor — the best app for mastering ICT concepts and leveling up your trading! Download it now.",
        title: "Invite Friends to ICT Trading Mentor",
      });
    } catch {
    }
  }

  function renderDashboardBar() {
    return (
      <View style={styles.bar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setMenuOpen((v) => !v)}
          accessibilityLabel="Open navigation menu"
          accessibilityRole="button"
        >
          <Ionicons name="menu" size={24} color={C.text} />
        </TouchableOpacity>

        <Image
          source={require("../assets/images/icon.png")}
          style={styles.appIcon}
          resizeMode="contain"
        />

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
            accessibilityLabel="Open profile"
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

  function renderDefaultBar() {
    return (
      <View style={styles.bar}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setMenuOpen((v) => !v)}
          accessibilityLabel="Open navigation menu"
          accessibilityRole="button"
        >
          <Ionicons name="menu" size={24} color={C.text} />
        </TouchableOpacity>

        <Image
          source={require("../assets/images/icon.png")}
          style={styles.appIcon}
          resizeMode="contain"
        />

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
            backgroundColor: C.backgroundSecondary,
            borderBottomColor: C.cardBorder,
          },
        ]}
      >
        <View style={{ height: insets.top }} />
        {isDashboard ? renderDashboardBar() : renderDefaultBar()}
      </View>

      <NavDropdown
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        topBarHeight={42}
        topInset={insets.top}
        C={C}
      >
        {/* Full Mode toggle — prominent, at the top */}
        <View style={[styles.fullModeRow, { backgroundColor: C.backgroundTertiary, borderColor: C.cardBorder }]}>
          <View style={[styles.fullModeIconBox, { backgroundColor: appMode === "full" ? C.accent + "20" : C.backgroundSecondary }]}>
            <Ionicons
              name={appMode === "full" ? "flash" : "flash-outline"}
              size={18}
              color={appMode === "full" ? C.accent : C.textSecondary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.fullModeLabel, { color: appMode === "full" ? C.accent : C.text }]}>Full Mode</Text>
            <Text style={[styles.fullModeSub, { color: C.textSecondary }]}>
              {appMode === "full" ? "All features enabled" : "Learning Mode active"}
            </Text>
          </View>
          <Switch
            value={appMode === "full"}
            onValueChange={(val) => setAppMode(val ? "full" : "lite")}
            trackColor={{ false: "#3A3A55", true: C.accent + "80" }}
            thumbColor={appMode === "full" ? C.accent : "#55556A"}
            ios_backgroundColor="#3A3A55"
            style={styles.switch}
          />
        </View>

        <View style={[styles.dropdownDivider, { backgroundColor: C.cardBorder }]} />

        <Text style={[styles.sheetTitle, { color: C.textSecondary }]}>NAVIGATION</Text>
        {TAB_ROUTES.map((route) => {
          const isFocused = activeRoute === route;
          const icons = TAB_ICONS[route];
          const label = TAB_LABELS[route];
          const requiredTier = REQUIRED_TIER[route] ?? 0;
          const isLocked = !isAdmin && tierLevel < requiredTier;
          const color = isLocked ? C.textTertiary : isFocused ? C.accent : C.text;

          const hasBadge = (route === "community" && communityBadge > 0) || (route === "journal" && journalDraftBadge > 0);
          const badgeCount = route === "community" ? communityBadge : route === "journal" ? journalDraftBadge : 0;

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
                    <Text style={styles.badgeText}>{badgeCount > 9 ? "9+" : badgeCount}</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.menuLabel, { color }]}>{label}</Text>
              {hasBadge && !isLocked && !isFocused && (
                <View style={[styles.badgePill, { marginLeft: "auto" }]}>
                  <Text style={styles.badgePillText}>{badgeCount > 99 ? "99+" : badgeCount} new</Text>
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
      </NavDropdown>

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

        {/* Subscription full row */}
        <TouchableOpacity
          onPress={() => navigate("/subscription" as Href)}
          style={styles.profileItem}
        >
          <Ionicons name="card-outline" size={20} color={C.textSecondary} />
          <Text style={[styles.profileItemLabel, { color: C.text }]}>Subscription</Text>
          <Ionicons name="chevron-forward" size={16} color={C.textTertiary} style={{ marginLeft: "auto" }} />
        </TouchableOpacity>

        {/* Settings + Admin as compact icon+label grid row */}
        <View style={styles.compactRow}>
          <TouchableOpacity
            onPress={() => navigate("/settings" as Href)}
            style={[styles.compactItem, { backgroundColor: C.backgroundTertiary, borderColor: C.cardBorder }]}
          >
            <Ionicons name="settings-outline" size={18} color={C.textSecondary} />
            <Text style={[styles.compactItemLabel, { color: C.text }]}>Settings</Text>
          </TouchableOpacity>
          {isAdmin && (
            <TouchableOpacity
              onPress={() => navigate("/admin" as Href)}
              style={[styles.compactItem, { backgroundColor: C.backgroundTertiary, borderColor: C.cardBorder }]}
            >
              <Ionicons name="shield-half-outline" size={18} color={C.textSecondary} />
              <Text style={[styles.compactItemLabel, { color: C.text }]}>Admin</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={[styles.profileDivider, { backgroundColor: C.cardBorder, marginTop: 8 }]} />

        {/* Help & Tour + Invite Friends as icon-only row */}
        <View style={styles.iconActionRow}>
          <TouchableOpacity
            onPress={handleTourRestart}
            style={styles.iconActionBtn}
          >
            <View style={[styles.iconActionCircle, { backgroundColor: C.backgroundTertiary, borderColor: C.cardBorder }]}>
              <Ionicons name="help-circle-outline" size={22} color={C.textSecondary} />
            </View>
            <Text style={[styles.iconActionLabel, { color: C.textSecondary }]}>Help & Tour</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleInviteFriends}
            style={styles.iconActionBtn}
          >
            <View style={[styles.iconActionCircle, { backgroundColor: C.backgroundTertiary, borderColor: C.cardBorder }]}>
              <Ionicons name="person-add-outline" size={22} color={C.textSecondary} />
            </View>
            <Text style={[styles.iconActionLabel, { color: C.textSecondary }]}>Invite Friends</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    zIndex: 10,
    minHeight: 42,
  },
  bar: {
    height: 42,
    maxHeight: 42,
    overflow: "hidden",
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
  rightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto",
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
    minWidth: 60,
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
  appIcon: {
    width: 26,
    height: 26,
    borderRadius: 6,
  },

  dropdownContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    maxHeight: 600,
  },
  dropdownDivider: {
    height: 1,
    marginVertical: 10,
  },
  fullModeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 2,
  },
  fullModeIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  fullModeLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.1,
  },
  fullModeSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
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
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 3,
    borderWidth: 1,
  },
  menuIconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    overflow: "visible",
  },
  menuLabel: {
    fontSize: 14,
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

  compactRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  compactItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  compactItemLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },

  iconActionRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 4,
    paddingTop: 4,
    paddingBottom: 4,
    justifyContent: "flex-start",
  },
  iconActionBtn: {
    alignItems: "center",
    gap: 5,
    minWidth: 64,
  },
  iconActionCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconActionLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
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
});
