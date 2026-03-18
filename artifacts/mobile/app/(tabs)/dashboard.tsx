import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Switch,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Href, useRouter } from "expo-router";
import Colors from "@/constants/colors";
import { XPLevelCard, SpinWheelCard, SlotMachineCard } from "@/components/DashboardGamification";
import { useAuth } from "@/contexts/AuthContext";

const C = Colors.dark;

const WIDGET_PREFS_KEY = "dashboard-widget-prefs-v1";

interface WidgetPrefs {
  spinWheel: boolean;
  slotMachine: boolean;
  aiGreeting: boolean;
}

const DEFAULT_PREFS: WidgetPrefs = {
  spinWheel: false,
  slotMachine: false,
  aiGreeting: false,
};

function getESTNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + -5 * 3600000);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "LIVE NOW";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

interface Session {
  name: string;
  subtitle: string;
  startH: number;
  startM: number;
  endH: number;
  endM: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SESSIONS: Session[] = [
  { name: "NY Open", subtitle: "9:30 AM EST", startH: 9, startM: 30, endH: 10, endM: 0, color: "#00C896", icon: "trending-up" },
  { name: "Silver Bullet", subtitle: "10:00–11:00 AM EST", startH: 10, startM: 0, endH: 11, endM: 0, color: "#F59E0B", icon: "flash" },
  { name: "London Open", subtitle: "2:00–5:00 AM EST", startH: 2, startM: 0, endH: 5, endM: 0, color: "#818CF8", icon: "globe" },
];

const QUICK_NAV: Array<{ route: Href; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = [
  { route: "/", label: "Planner", icon: "checkbox-outline", color: "#00C896" },
  { route: "/academy", label: "Academy", icon: "school-outline", color: "#818CF8" },
  { route: "/tracker", label: "Risk", icon: "shield-outline", color: "#EF4444" },
  { route: "/journal", label: "Journal", icon: "book-outline", color: "#F59E0B" },
  { route: "/community", label: "Social", icon: "people-outline", color: "#06B6D4" },
  { route: "/analytics", label: "Analytics", icon: "bar-chart-outline", color: "#A855F7" },
  { route: "/subscription", label: "Subscription", icon: "card-outline", color: "#F472B6" },
  { route: "/settings", label: "Settings", icon: "settings-outline", color: "#94A3B8" },
];

const OPTIONAL_WIDGETS = [
  { key: "spinWheel" as keyof WidgetPrefs, label: "Daily Spin Wheel", desc: "Spin for a daily trading tip", icon: "gift-outline" as keyof typeof Ionicons.glyphMap },
  { key: "slotMachine" as keyof WidgetPrefs, label: "Slot Machine", desc: "Today's mission generator", icon: "trophy-outline" as keyof typeof Ionicons.glyphMap },
  { key: "aiGreeting" as keyof WidgetPrefs, label: "AI Greeting", desc: "Personalized daily message", icon: "chatbubble-ellipses-outline" as keyof typeof Ionicons.glyphMap },
];

function AIGreetingCard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")?.[0] || "Trader";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const tips = [
    "Always wait for the liquidity sweep before entering!",
    "The best setups happen at session opens — be ready!",
    "Patience is the most profitable trading skill.",
    "Silver Bullet window (10-11 AM) has the highest probability.",
    "Your journal is your most powerful trading tool.",
  ];
  const tip = tips[new Date().getDate() % tips.length];

  return (
    <View style={styles.aiCard}>
      <View style={styles.aiHeader}>
        <Text style={styles.aiEmoji}>🤖</Text>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.aiGreeting}>{greeting}, {firstName}!</Text>
          <Text style={styles.aiSubtitle}>Ready to trade today?</Text>
        </View>
      </View>
      <View style={styles.aiTipBox}>
        <Ionicons name="sparkles" size={13} color={C.accent} />
        <Text style={styles.aiTip}>{tip}</Text>
      </View>
    </View>
  );
}

function KillZoneCard() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Kill Zone Countdowns</Text>
      {SESSIONS.map((session, idx) => {
        const estNow = getESTNow();
        const nowMins = estNow.getHours() * 60 + estNow.getMinutes();
        const startMins = session.startH * 60 + session.startM;
        const endMins = session.endH * 60 + session.endM;
        const isLive = nowMins >= startMins && nowMins < endMins;
        const isEnded = nowMins >= endMins;

        const target = new Date(estNow);
        target.setHours(session.startH, session.startM, 0, 0);
        if (!isLive && estNow >= target) target.setDate(target.getDate() + 1);
        const msUntil = isLive ? 0 : target.getTime() - estNow.getTime();

        return (
          <View key={session.name} style={[styles.sessionRow, idx > 0 && styles.sessionBorder]}>
            <View style={[styles.sessionDot, { backgroundColor: isLive ? session.color : isEnded ? "#333" : C.cardBorder }]} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.sessionName, { color: isLive ? session.color : C.text }]}>{session.name}</Text>
              <Text style={styles.sessionSub}>{session.subtitle}</Text>
            </View>
            {isLive ? (
              <View style={[styles.liveBadge, { backgroundColor: session.color }]}>
                <Text style={styles.liveBadgeText}>LIVE</Text>
              </View>
            ) : isEnded ? (
              <Text style={styles.endedText}>ENDED</Text>
            ) : (
              <Text style={styles.countdownText}>{formatCountdown(msUntil)}</Text>
            )}
          </View>
        );
      })}
    </View>
  );
}

function QuickNavCard() {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>Quick Navigation</Text>
      <View style={styles.navGrid}>
        {QUICK_NAV.map((item) => (
          <TouchableOpacity
            key={item.label}
            style={styles.navItem}
            onPress={() => router.navigate(item.route)}
            activeOpacity={0.7}
          >
            <View style={[styles.navIcon, { backgroundColor: item.color + "18" }]}>
              <Ionicons name={item.icon} size={22} color={item.color} />
            </View>
            <Text style={styles.navLabel}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function EditModal({ visible, prefs, onClose, onToggle }: {
  visible: boolean;
  prefs: WidgetPrefs;
  onClose: () => void;
  onToggle: (key: keyof WidgetPrefs) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Edit Dashboard</Text>
        <Text style={styles.modalSubtitle}>Toggle optional widgets on or off</Text>
        {OPTIONAL_WIDGETS.map((widget) => (
          <View key={widget.key} style={styles.widgetRow}>
            <View style={[styles.widgetIcon, { backgroundColor: C.backgroundTertiary }]}>
              <Ionicons name={widget.icon} size={20} color={C.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.widgetLabel}>{widget.label}</Text>
              <Text style={styles.widgetDesc}>{widget.desc}</Text>
            </View>
            <Switch
              value={prefs[widget.key]}
              onValueChange={() => onToggle(widget.key)}
              trackColor={{ false: C.cardBorder, true: C.accent + "60" }}
              thumbColor={prefs[widget.key] ? C.accent : C.textSecondary}
            />
          </View>
        ))}
        <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
          <Text style={styles.doneBtnText}>Done</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function DashboardScreen() {
  const [prefs, setPrefs] = useState<WidgetPrefs>(DEFAULT_PREFS);
  const [editVisible, setEditVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(WIDGET_PREFS_KEY).then((raw) => {
      if (raw) {
        try {
          setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
        } catch {
        }
      }
    });
  }, []);

  const toggleWidget = useCallback((key: keyof WidgetPrefs) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem(WIDGET_PREFS_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <EditModal
        visible={editVisible}
        prefs={prefs}
        onClose={() => setEditVisible(false)}
        onToggle={toggleWidget}
      />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>Your trading home base</Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => setEditVisible(true)}
            activeOpacity={0.7}
            accessibilityLabel="Edit Dashboard"
          >
            <Ionicons name="pencil" size={16} color={C.accent} />
          </TouchableOpacity>
        </View>

        {/* Core Card 1: XP / Streak */}
        <Text style={styles.sectionTitle}>Your Progress</Text>
        <XPLevelCard />

        {/* Core Card 2: Kill Zone Countdowns */}
        <KillZoneCard />

        {/* Core Card 3: Quick Nav */}
        <QuickNavCard />

        {/* Optional Widgets */}
        {prefs.aiGreeting && <AIGreetingCard />}
        {prefs.slotMachine && <SlotMachineCard />}
        {prefs.spinWheel && <SpinWheelCard />}

        <View style={{ height: Platform.OS === "ios" ? 100 : 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: { flex: 1 },
  content: { padding: 16 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.text },
  subtitle: { fontSize: 13, color: C.textSecondary, marginTop: 2 },
  editBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: C.backgroundSecondary, borderWidth: 1, borderColor: C.cardBorder,
    alignItems: "center", justifyContent: "center",
  },

  sectionTitle: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.textSecondary,
    textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10, marginTop: 2,
  },

  card: {
    backgroundColor: C.backgroundSecondary, borderRadius: 16, borderWidth: 1,
    borderColor: C.cardBorder, marginBottom: 14, overflow: "hidden",
  },
  cardLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.textSecondary,
    textTransform: "uppercase", letterSpacing: 1.2, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 10,
  },

  sessionRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12 },
  sessionBorder: { borderTopWidth: 1, borderTopColor: C.cardBorder },
  sessionDot: { width: 10, height: 10, borderRadius: 5 },
  sessionName: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 1 },
  sessionSub: { fontSize: 11, color: C.textSecondary },
  liveBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  liveBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
  endedText: { fontSize: 11, color: C.textSecondary, fontFamily: "Inter_500Medium" },
  countdownText: { fontSize: 13, fontFamily: "Inter_700Bold", color: C.text },

  navGrid: { flexDirection: "row", flexWrap: "wrap", padding: 10, gap: 8 },
  navItem: { width: "30%", alignItems: "center", padding: 10, borderRadius: 12, backgroundColor: C.backgroundTertiary },
  navIcon: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  navLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.text, textAlign: "center" },

  aiCard: {
    backgroundColor: C.backgroundSecondary, borderRadius: 16, borderWidth: 1,
    borderColor: C.accent + "25", padding: 16, marginBottom: 14,
    overflow: "hidden",
  },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12, flexShrink: 1 },
  aiEmoji: { fontSize: 36, flexShrink: 0 },
  aiGreeting: { fontSize: 16, fontFamily: "Inter_700Bold", color: C.text, flexShrink: 1 },
  aiSubtitle: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  aiTipBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: C.accent + "10", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.accent + "20" },
  aiTip: { flex: 1, fontSize: 13, color: C.text, lineHeight: 19 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  modalSheet: {
    backgroundColor: C.backgroundSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: Platform.OS === "ios" ? 40 : 24,
    borderTopWidth: 1, borderColor: C.cardBorder,
  },
  modalHandle: { width: 36, height: 4, backgroundColor: C.cardBorder, borderRadius: 2, alignSelf: "center", marginBottom: 18 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: C.textSecondary, marginBottom: 20 },
  widgetRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 14,
    borderTopWidth: 1, borderTopColor: C.cardBorder,
  },
  widgetIcon: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  widgetLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: C.text, marginBottom: 2 },
  widgetDesc: { fontSize: 12, color: C.textSecondary },
  doneBtn: {
    marginTop: 20, backgroundColor: C.accent, borderRadius: 14,
    paddingVertical: 14, alignItems: "center",
  },
  doneBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
});
