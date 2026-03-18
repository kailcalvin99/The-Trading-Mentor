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
  Image,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
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
  { name: "London", subtitle: "2:00–5:00 AM EST", startH: 2, startM: 0, endH: 5, endM: 0, color: "#F59E0B", icon: "globe" },
  { name: "NY Open", subtitle: "9:30–10:00 AM EST", startH: 9, startM: 30, endH: 10, endM: 0, color: "#00C896", icon: "trending-up" },
  { name: "Silver Bullet", subtitle: "10:00–11:00 AM EST", startH: 10, startM: 0, endH: 11, endM: 0, color: "#EF4444", icon: "flash" },
  { name: "London Close", subtitle: "11 AM–12 PM EST", startH: 11, startM: 0, endH: 12, endM: 0, color: "#818CF8", icon: "time" },
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

function KillZoneStrip() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.kzStrip} contentContainerStyle={styles.kzStripContent}>
      {SESSIONS.map((session) => {
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
        const isNear = msUntil > 0 && msUntil <= 30 * 60 * 1000;

        return (
          <View
            key={session.name}
            style={[
              styles.kzCard,
              isLive && { borderColor: session.color, borderWidth: 1.5, shadowColor: session.color, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
            ]}
          >
            <View style={styles.kzCardRow1}>
              <View style={[styles.kzDot, { backgroundColor: isLive ? session.color : isNear ? "#F59E0B" : C.cardBorder }]} />
              <Text style={[styles.kzName, isLive && { color: session.color }]} numberOfLines={1}>{session.name}</Text>
              {isLive ? (
                <View style={[styles.kzBadge, { backgroundColor: session.color + "30" }]}>
                  <Text style={[styles.kzBadgeText, { color: session.color }]}>LIVE</Text>
                </View>
              ) : isEnded ? (
                <Text style={styles.kzEnded}>Done</Text>
              ) : (
                <Text style={[styles.kzCountdown, isNear && { color: "#F59E0B" }]}>{formatCountdown(msUntil)}</Text>
              )}
            </View>
            <Text style={styles.kzSub} numberOfLines={1}>{session.subtitle}</Text>
          </View>
        );
      })}
    </ScrollView>
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

const STOCK_AVATARS_MOBILE = [
  { id: "bull", emoji: "🐂", label: "Bull" },
  { id: "bear", emoji: "🐻", label: "Bear" },
  { id: "chart", emoji: "📈", label: "Chart" },
  { id: "candle", emoji: "🕯️", label: "Candle" },
  { id: "rocket", emoji: "🚀", label: "Rocket" },
  { id: "shield", emoji: "🛡️", label: "Shield" },
  { id: "flame", emoji: "🔥", label: "Flame" },
  { id: "crown", emoji: "👑", label: "Crown" },
];

export default function DashboardScreen() {
  const { user, setAvatarUrl } = useAuth();
  const router = useRouter();
  const firstName = user?.name?.split(" ")?.[0] || "Trader";
  const { xp, streak } = useDailyGamification();
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;

  const [prefs, setPrefs] = useState<WidgetPrefs>(DEFAULT_WIDGET_PREFS);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showMission, setShowMission] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

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

  const avatarUrl = user?.avatarUrl;
  const initials = user?.name?.charAt(0)?.toUpperCase() || "?";

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <AchievementsModal
        visible={showAchievements}
        onClose={() => setShowAchievements(false)}
        xp={xp}
        streak={streak}
      />
      <MissionModal visible={showMission} onClose={() => setShowMission(false)} />

      {/* Avatar Picker Modal */}
      <Modal visible={showAvatarPicker} transparent animationType="slide" onRequestClose={() => setShowAvatarPicker(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowAvatarPicker(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Choose Avatar</Text>
          <Text style={styles.modalSubtitle}>Pick a trading avatar or upload your photo</Text>
          <View style={styles.avatarGrid}>
            {STOCK_AVATARS_MOBILE.map((av) => (
              <TouchableOpacity
                key={av.id}
                style={[styles.avatarOption, avatarUrl === av.emoji && styles.avatarOptionSelected]}
                onPress={async () => {
                  await setAvatarUrl(av.emoji);
                  setShowAvatarPicker(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.avatarEmoji}>{av.emoji}</Text>
                <Text style={styles.avatarLabel}>{av.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.uploadRow}>
            <TouchableOpacity
              style={styles.uploadPhotoBtn}
              activeOpacity={0.7}
              onPress={async () => {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== "granted") return;
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: "images",
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.8,
                });
                if (!result.canceled && result.assets[0]) {
                  const manipulated = await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 200, height: 200 } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
                  );
                  const dataUrl = `data:image/jpeg;base64,${manipulated.base64}`;
                  await setAvatarUrl(dataUrl);
                  setShowAvatarPicker(false);
                }
              }}
            >
              <Ionicons name="image-outline" size={16} color={C.accent} />
              <Text style={styles.uploadPhotoBtnText}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.uploadPhotoBtn}
              activeOpacity={0.7}
              onPress={async () => {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== "granted") return;
                const result = await ImagePicker.launchCameraAsync({
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.8,
                });
                if (!result.canceled && result.assets[0]) {
                  const manipulated = await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 200, height: 200 } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
                  );
                  const dataUrl = `data:image/jpeg;base64,${manipulated.base64}`;
                  await setAvatarUrl(dataUrl);
                  setShowAvatarPicker(false);
                }
              }}
            >
              <Ionicons name="camera-outline" size={16} color={C.accent} />
              <Text style={styles.uploadPhotoBtnText}>Camera</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={styles.doneBtn} onPress={() => setShowAvatarPicker(false)}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Kill Zone Strip — pinned at top before scroll */}
      <View style={styles.kzStripWrapper}>
        <KillZoneStrip />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {/* Compact Header — single slim row ~40px */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.avatarBtn} onPress={() => setShowAvatarPicker(true)} activeOpacity={0.7}>
            {avatarUrl ? (
              avatarUrl.startsWith("data:") || avatarUrl.startsWith("http") ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatarBtnImage} />
              ) : (
                <Text style={styles.avatarBtnEmoji}>{avatarUrl}</Text>
              )
            ) : (
              <Text style={styles.avatarBtnInitial}>{initials}</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.headerGreeting} numberOfLines={1}>Hi, {user?.name?.split(" ")[0] || "Trader"}</Text>

          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.headerBadge} onPress={() => setShowAchievements(true)} activeOpacity={0.7}>
              <Ionicons name="star" size={13} color={C.accent} />
              <Text style={styles.headerBadgeText}>Lv.{level}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.headerBadge} onPress={() => setShowAchievements(true)} activeOpacity={0.7}>
              <Ionicons name="flame" size={13} color={streak >= 7 ? "#EF4444" : "#F59E0B"} />
              <Text style={[styles.headerBadgeText, { color: streak >= 7 ? "#EF4444" : "#F59E0B" }]}>{streak}d</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.headerBadge} onPress={() => setShowAchievements(true)} activeOpacity={0.7}>
              <Ionicons name="trophy" size={13} color="#F59E0B" />
            </TouchableOpacity>

            {prefs.todaysMission && (
              <TouchableOpacity style={styles.headerIconBtn} onPress={() => setShowMission(true)} activeOpacity={0.7}>
                <Ionicons name="gift-outline" size={16} color="#F59E0B" />
              </TouchableOpacity>
            )}
          </View>
        </View>

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

  kzStripWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  kzStrip: { height: 44 },
  kzStripContent: { gap: 6, paddingRight: 6, alignItems: "center" },
  kzCard: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 105,
    justifyContent: "center",
    gap: 1,
  },
  kzCardRow1: { flexDirection: "row", alignItems: "center", gap: 4 },
  kzSub: { fontSize: 8, color: C.textSecondary, fontFamily: "Inter_400Regular", marginLeft: 10 },
  kzDot: { width: 6, height: 6, borderRadius: 3 },
  kzName: { fontSize: 11, fontFamily: "Inter_700Bold", color: C.text },
  kzBadge: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1, marginLeft: "auto" },
  kzBadgeText: { fontSize: 8, fontFamily: "Inter_700Bold" },
  kzEnded: { fontSize: 9, color: C.textSecondary, marginLeft: "auto" },
  kzCountdown: { fontSize: 9, fontFamily: "Inter_700Bold", color: C.text, marginLeft: "auto" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    height: 40,
    marginBottom: 12,
    gap: 8,
  },
  headerGreeting: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    flex: 1,
  },

  avatarBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.accent + "20",
    borderWidth: 1,
    borderColor: C.accent + "40",
    alignItems: "center",
    justifyContent: "center",
    marginRight: "auto",
  },
  avatarBtnImage: { width: 32, height: 32, borderRadius: 16 },
  avatarBtnEmoji: { fontSize: 18, lineHeight: 22 },
  avatarBtnInitial: { fontSize: 14, fontFamily: "Inter_700Bold", color: C.accent },
  uploadRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  uploadPhotoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.backgroundTertiary,
    borderWidth: 1,
    borderColor: C.accent + "40",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  uploadPhotoBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.accent,
  },

  avatarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarOption: {
    width: 70,
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
    backgroundColor: C.backgroundTertiary,
  },
  avatarOptionSelected: {
    borderColor: C.accent,
    backgroundColor: C.accent + "15",
  },
  avatarEmoji: { fontSize: 28, marginBottom: 4 },
  avatarLabel: { fontSize: 10, color: C.textSecondary, fontFamily: "Inter_500Medium" },

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
