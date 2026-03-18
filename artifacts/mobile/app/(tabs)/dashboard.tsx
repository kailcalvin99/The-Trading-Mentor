import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  TextInput,
  type DimensionValue,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import Colors from "@/constants/colors";
import { SlotMachineCard, useDailyGamification } from "@/components/DashboardGamification";
import { useAuth } from "@/contexts/AuthContext";
import { useGetPropAccount } from "@workspace/api-client-react";
import {
  WIDGET_PREFS_KEY,
  DEFAULT_WIDGET_PREFS,
  type WidgetPrefs,
} from "@/constants/dashboardWidgets";

const TOUR_DONE_KEY = "mobile-onboarding-tour-done";

const C = Colors.dark;

const TRADE_PLAN_KEY = "dashboard-trade-plan";
const NOTES_KEY = "dashboard-notes";
const CHECKLIST_STORAGE_KEY = "ict-checklist-state";
const CHECKLIST_TTL_MS = 4 * 60 * 60 * 1000;
const RANKS = ["Apprentice", "Student", "Trader", "Pro", "Master", "ICT Legend"];

const PRE_TRADE_ITEMS = [
  { id: "htf_bias", label: "HTF Bias confirmed on Daily", icon: "trending-up" as const },
  { id: "kill_zone", label: "In a Kill Zone right now", icon: "time" as const },
  { id: "sweep_idm", label: "Liquidity sweep or IDM confirmed", icon: "water" as const },
  { id: "displacement_fvg", label: "Displacement with FVG or MSS", icon: "flash" as const },
];

function getTodayKey(base: string): string {
  return `${base}-${new Date().toDateString()}`;
}

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
  icon: React.ComponentProps<typeof Ionicons>["name"];
}

const SESSIONS: Session[] = [
  { name: "NY Open", subtitle: "9:30 AM EST", startH: 9, startM: 30, endH: 10, endM: 0, color: "#00C896", icon: "trending-up" },
  { name: "Silver Bullet", subtitle: "10:00–11:00 AM EST", startH: 10, startM: 0, endH: 11, endM: 0, color: "#F59E0B", icon: "flash" },
  { name: "London Open", subtitle: "2:00–5:00 AM EST", startH: 2, startM: 0, endH: 5, endM: 0, color: "#818CF8", icon: "globe" },
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
      <View style={styles.cardHeaderRow}>
        <Ionicons name="time-outline" size={15} color="#F59E0B" />
        <Text style={styles.cardLabel}>Kill Zone Countdowns</Text>
      </View>
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

function TradePlanWidget() {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(getTodayKey(TRADE_PLAN_KEY)).then((v) => {
      if (v) setText(v);
    });
  }, []);

  function handleChange(val: string) {
    setText(val);
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await AsyncStorage.setItem(getTodayKey(TRADE_PLAN_KEY), val);
      setSaved(true);
    }, 800);
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="document-text-outline" size={15} color={C.accent} />
        <Text style={styles.cardLabel}>Today's Trade Plan</Text>
        {saved && <Text style={styles.savedText}>Saved</Text>}
      </View>
      <TextInput
        style={styles.textArea}
        value={text}
        onChangeText={handleChange}
        placeholder={"Daily bias: Bullish / Bearish\nKey levels: \nSession target: \nEntry criteria: "}
        placeholderTextColor={C.textTertiary}
        multiline
        numberOfLines={5}
        textAlignVertical="top"
      />
    </View>
  );
}

function NotesWidget() {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(getTodayKey(NOTES_KEY)).then((v) => {
      if (v) setText(v);
    });
  }, []);

  function handleChange(val: string) {
    setText(val);
    setSaved(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await AsyncStorage.setItem(getTodayKey(NOTES_KEY), val);
      setSaved(true);
    }, 800);
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="pencil-outline" size={15} color="#818CF8" />
        <Text style={styles.cardLabel}>Quick Notes</Text>
        {saved && <Text style={styles.savedText}>Saved</Text>}
      </View>
      <TextInput
        style={styles.textArea}
        value={text}
        onChangeText={handleChange}
        placeholder="Jot down any observations, reminders, or thoughts..."
        placeholderTextColor={C.textTertiary}
        multiline
        numberOfLines={4}
        textAlignVertical="top"
      />
    </View>
  );
}

function PreTradeChecklistWidget() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const load = () => {
      AsyncStorage.getItem(CHECKLIST_STORAGE_KEY).then((raw) => {
        if (!raw) return;
        try {
          const data = JSON.parse(raw);
          const ageMs = Date.now() - (data.timestamp || 0);
          if (ageMs > CHECKLIST_TTL_MS) {
            AsyncStorage.removeItem(CHECKLIST_STORAGE_KEY);
            setChecked({});
          } else {
            setChecked(data.checked || {});
          }
        } catch {
          setChecked({});
        }
      });
    };
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function toggle(id: string) {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    await AsyncStorage.setItem(
      CHECKLIST_STORAGE_KEY,
      JSON.stringify({ checked: next, timestamp: Date.now() })
    );
  }

  const allDone = PRE_TRADE_ITEMS.every((item) => checked[item.id]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="checkmark-circle-outline" size={15} color="#00C896" />
        <Text style={styles.cardLabel}>Pre-Trade Checklist</Text>
        {allDone && (
          <View style={styles.unlockedBadge}>
            <Text style={styles.unlockedBadgeText}>✓ Ready</Text>
          </View>
        )}
      </View>
      {PRE_TRADE_ITEMS.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.checklistItem}
          onPress={() => toggle(item.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, checked[item.id] && styles.checkboxChecked]}>
            {checked[item.id] && <Ionicons name="checkmark" size={12} color="#0A0A0F" />}
          </View>
          <Ionicons
            name={item.icon}
            size={14}
            color={checked[item.id] ? C.accent : C.textSecondary}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.checklistLabel, checked[item.id] && styles.checklistLabelDone]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function RiskShieldWidget() {
  const router = useRouter();
  const { data: account } = useGetPropAccount();

  const startingBalance = account?.startingBalance ?? 0;
  const dailyLoss = account?.dailyLoss ?? 0;
  const maxDailyLossPct = account?.maxDailyLossPct ?? 2;
  const maxDrawdownPct = account?.maxTotalDrawdownPct ?? 10;
  const balance = account?.currentBalance ?? startingBalance;
  const dailyLossPct = startingBalance > 0 ? (dailyLoss / startingBalance) * 100 : 0;
  const totalDrawdownPct = startingBalance > 0 ? ((startingBalance - balance) / startingBalance) * 100 : 0;
  const hasData = startingBalance > 0;

  const dailyColor = dailyLossPct >= maxDailyLossPct ? "#EF4444" : dailyLossPct >= maxDailyLossPct * 0.75 ? "#F59E0B" : "#00C896";
  const drawdownColor = totalDrawdownPct >= maxDrawdownPct ? "#EF4444" : totalDrawdownPct >= maxDrawdownPct * 0.75 ? "#F59E0B" : "#818CF8";

  return (
    <TouchableOpacity
      style={[styles.card, styles.riskCard]}
      onPress={() => router.navigate("/tracker")}
      activeOpacity={0.85}
    >
      <View style={styles.cardHeaderRow}>
        <Ionicons name="shield-checkmark-outline" size={15} color="#EF4444" />
        <Text style={styles.cardLabel}>Risk Shield</Text>
        <Ionicons name="chevron-forward" size={14} color={C.textSecondary} style={{ marginLeft: "auto" }} />
      </View>
      {!hasData ? (
        <Text style={styles.riskSubtitle}>
          Set up your prop account in the Risk Shield to track daily P&L and drawdown
        </Text>
      ) : (
        <View style={styles.riskRow}>
          <View style={styles.riskStat}>
            <Text style={[styles.riskStatValue, { color: dailyColor }]}>
              {dailyLossPct.toFixed(2)}%
            </Text>
            <Text style={styles.riskStatLabel}>Daily Loss</Text>
            <Text style={styles.riskStatLimit}>Limit: {maxDailyLossPct}%</Text>
          </View>
          <View style={styles.riskDivider} />
          <View style={styles.riskStat}>
            <Text style={[styles.riskStatValue, { color: drawdownColor }]}>
              {totalDrawdownPct.toFixed(2)}%
            </Text>
            <Text style={styles.riskStatLabel}>Drawdown</Text>
            <Text style={styles.riskStatLimit}>Limit: {maxDrawdownPct}%</Text>
          </View>
          <View style={styles.riskDivider} />
          <View style={styles.riskStat}>
            <Text style={[styles.riskStatValue, { color: C.text }]}>
              ${balance.toLocaleString()}
            </Text>
            <Text style={styles.riskStatLabel}>Balance</Text>
            <Text style={styles.riskStatLimit}>
              {balance >= startingBalance ? "+" : ""}{(balance - startingBalance).toLocaleString()}
            </Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

function SwipeModeCard() {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={[styles.card, styles.swipeCard]}
      onPress={() => router.navigate({ pathname: "/swipe-mode" })}
      activeOpacity={0.85}
    >
      <View style={styles.swipeCardInner}>
        <View style={styles.swipeIconBox}>
          <Ionicons name="school" size={28} color={C.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.swipeTitle}>Start Swipe Mode</Text>
          <Text style={styles.swipeSubtitle}>Flip through ICT lessons in the Academy</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={C.accent} />
      </View>
    </TouchableOpacity>
  );
}

function AchievementsModal({ visible, onClose, xp, streak }: {
  visible: boolean;
  onClose: () => void;
  xp: number;
  streak: number;
}) {
  const level = Math.floor(xp / 100) + 1;
  const rankIdx = Math.min(Math.floor((level - 1) / 2), RANKS.length - 1);

  const achievements = [
    { icon: "flame", color: "#F59E0B", label: `${streak}-Day Streak`, done: streak >= 1 },
    { icon: "star", color: C.accent, label: `Level ${level} — ${RANKS[rankIdx]}`, done: true },
    { icon: "trophy", color: "#F59E0B", label: "7-Day Streak", done: streak >= 7 },
    { icon: "medal", color: "#818CF8", label: "100 XP Milestone", done: xp >= 100 },
    { icon: "ribbon", color: "#EF4444", label: "500 XP Legend", done: xp >= 500 },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <Text style={styles.modalTitle}>Achievements</Text>
        <Text style={styles.modalSubtitle}>Your trading milestones</Text>
        {achievements.map((a, i) => (
          <View key={i} style={styles.achievementRow}>
            <View style={[styles.achieveIcon, { backgroundColor: a.color + "20" }]}>
              <Ionicons name={a.icon as React.ComponentProps<typeof Ionicons>["name"]} size={20} color={a.color} />
            </View>
            <Text style={[styles.achieveLabel, !a.done && { color: C.textSecondary }]}>{a.label}</Text>
            {a.done ? (
              <Ionicons name="checkmark-circle" size={18} color="#00C896" />
            ) : (
              <Ionicons name="lock-closed" size={16} color={C.cardBorder} />
            )}
          </View>
        ))}
        <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
          <Text style={styles.doneBtnText}>Close</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function MissionModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={styles.modalSheet}>
        <View style={styles.modalHandle} />
        <SlotMachineCard />
        <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
          <Text style={styles.doneBtnText}>Got It!</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

export default function DashboardScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const firstName = user?.name?.split(" ")?.[0] || "Trader";
  const { xp, streak } = useDailyGamification();
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;

  const [prefs, setPrefs] = useState<WidgetPrefs>(DEFAULT_WIDGET_PREFS);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showMission, setShowMission] = useState(false);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(WIDGET_PREFS_KEY).then((raw) => {
        if (raw) {
          try {
            setPrefs({ ...DEFAULT_WIDGET_PREFS, ...JSON.parse(raw) });
          } catch {
          }
        } else {
          setPrefs(DEFAULT_WIDGET_PREFS);
        }
      });
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AchievementsModal
        visible={showAchievements}
        onClose={() => setShowAchievements(false)}
        xp={xp}
        streak={streak}
      />
      <MissionModal visible={showMission} onClose={() => setShowMission(false)} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Compact Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Dashboard</Text>
            <Text style={styles.subtitle}>Welcome back, {firstName}</Text>
          </View>
          <View style={styles.headerIcons}>
            {/* Level badge */}
            <TouchableOpacity style={styles.headerBadge} onPress={() => setShowAchievements(true)} activeOpacity={0.7}>
              <Ionicons name="star" size={13} color={C.accent} />
              <Text style={styles.headerBadgeText}>Lv.{level}</Text>
            </TouchableOpacity>

            {/* Streak badge */}
            <TouchableOpacity style={styles.headerBadge} onPress={() => setShowAchievements(true)} activeOpacity={0.7}>
              <Ionicons name="flame" size={13} color={streak >= 7 ? "#EF4444" : "#F59E0B"} />
              <Text style={[styles.headerBadgeText, { color: streak >= 7 ? "#EF4444" : "#F59E0B" }]}>{streak}d</Text>
            </TouchableOpacity>

            {/* Achievements icon */}
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowAchievements(true)} activeOpacity={0.7}>
              <Ionicons name="trophy-outline" size={18} color={C.textSecondary} />
            </TouchableOpacity>

            {/* Tour restart icon */}
            <TouchableOpacity
              style={styles.headerIconBtn}
              onPress={async () => {
                await AsyncStorage.removeItem(TOUR_DONE_KEY);
                router.navigate("/");
              }}
              activeOpacity={0.7}
              accessibilityLabel="Restart onboarding tour"
            >
              <Ionicons name="help-circle-outline" size={18} color={C.textSecondary} />
            </TouchableOpacity>

            {/* Today's Mission gift icon */}
            {prefs.todaysMission && (
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowMission(true)} activeOpacity={0.7}>
                <Ionicons name="gift-outline" size={18} color="#F59E0B" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* XP mini progress bar */}
        <View style={styles.xpBarRow}>
          <View style={styles.xpBarTrack}>
            <View style={[styles.xpBarFill, { width: `${xpInLevel}%` as DimensionValue }]} />
          </View>
          <Text style={styles.xpBarText}>{xpInLevel}/100 XP</Text>
        </View>

        {/* Kill Zone Countdowns — always shown */}
        <KillZoneCard />

        {/* Trade Plan */}
        {prefs.tradePlan && <TradePlanWidget />}

        {/* Pre-Trade Checklist */}
        {prefs.preTradeChecklist && <PreTradeChecklistWidget />}

        {/* Risk Shield Mini */}
        {prefs.riskShield && <RiskShieldWidget />}

        {/* Swipe Mode Launcher */}
        {prefs.swipeMode && <SwipeModeCard />}

        {/* Notes */}
        {prefs.notes && <NotesWidget />}

        {/* AI Greeting */}
        {prefs.aiGreeting && <AIGreetingCard />}

        <View style={{ height: Platform.OS === "ios" ? 100 : 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: { flex: 1 },
  content: { padding: 16 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  headerLeft: { flex: 1 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: C.text },
  subtitle: { fontSize: 12, color: C.textSecondary, marginTop: 1 },

  headerIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: C.backgroundSecondary,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: C.accent,
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.backgroundSecondary,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: "center",
    justifyContent: "center",
  },

  xpBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  xpBarTrack: {
    flex: 1,
    height: 3,
    backgroundColor: C.cardBorder,
    borderRadius: 2,
    overflow: "hidden",
  },
  xpBarFill: {
    height: 3,
    backgroundColor: C.accent,
    borderRadius: 2,
  },
  xpBarText: {
    fontSize: 10,
    color: C.textTertiary,
    fontFamily: "Inter_500Medium",
  },

  card: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    marginBottom: 14,
    overflow: "hidden",
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    flex: 1,
  },
  savedText: {
    fontSize: 11,
    color: "#00C896",
    fontFamily: "Inter_500Medium",
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

  textArea: {
    backgroundColor: C.backgroundTertiary,
    borderRadius: 10,
    marginHorizontal: 14,
    marginBottom: 14,
    padding: 10,
    fontSize: 13,
    color: C.text,
    fontFamily: "Inter_400Regular",
    minHeight: 90,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },

  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    marginRight: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  checklistLabel: {
    flex: 1,
    fontSize: 13,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  checklistLabelDone: {
    color: C.text,
  },
  unlockedBadge: {
    backgroundColor: "#00C89620",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  unlockedBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#00C896",
  },

  riskCard: {
    borderColor: "#EF444420",
  },
  riskSubtitle: {
    fontSize: 12,
    color: C.textSecondary,
    paddingHorizontal: 14,
    paddingBottom: 12,
    lineHeight: 18,
  },
  riskRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  riskStat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  riskStatValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  riskStatLabel: {
    fontSize: 10,
    color: C.textSecondary,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  riskStatLimit: {
    fontSize: 9,
    color: C.textTertiary,
    fontFamily: "Inter_400Regular",
  },
  riskDivider: {
    width: 1,
    backgroundColor: C.cardBorder,
    marginHorizontal: 8,
  },

  swipeCard: {
    borderColor: C.accent + "30",
  },
  swipeCardInner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    gap: 12,
  },
  swipeIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.accent + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  swipeTitle: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: C.text,
    marginBottom: 2,
  },
  swipeSubtitle: {
    fontSize: 12,
    color: C.textSecondary,
  },

  aiCard: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.accent + "25",
    padding: 16,
    marginBottom: 14,
  },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12, flexShrink: 1 },
  aiEmoji: { fontSize: 32, flexShrink: 0 },
  aiGreeting: { fontSize: 15, fontFamily: "Inter_700Bold", color: C.text, flexShrink: 1 },
  aiSubtitle: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  aiTipBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: C.accent + "10", borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: C.accent + "20",
  },
  aiTip: { flex: 1, fontSize: 13, color: C.text, lineHeight: 19 },

  achievementRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    gap: 12,
  },
  achieveIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  achieveLabel: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: C.text,
  },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  modalSheet: {
    backgroundColor: C.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    borderTopWidth: 1,
    borderColor: C.cardBorder,
  },
  modalHandle: { width: 36, height: 4, backgroundColor: C.cardBorder, borderRadius: 2, alignSelf: "center", marginBottom: 18 },
  modalTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 4 },
  modalSubtitle: { fontSize: 13, color: C.textSecondary, marginBottom: 20 },

  doneBtn: {
    marginTop: 16,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  doneBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
});
