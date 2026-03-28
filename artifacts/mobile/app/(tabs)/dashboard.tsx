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
  Switch,
  PanResponder,
  Animated,
  Alert,
  RefreshControl,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Polyline, Defs, LinearGradient, Stop, Polygon } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter, useFocusEffect } from "expo-router";
import Colors from "@/constants/colors";
import { SlotMachineCard, useDailyGamification } from "@/components/DashboardGamification";
import { useAuth } from "@/contexts/AuthContext";
import { useGetPropAccount, useListTrades } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import MorningBriefingWidget from "@/components/MorningBriefingWidget";
import { usePlanner } from "@/contexts/PlannerContext";
import {
  WIDGET_PREFS_KEY,
  DEFAULT_WIDGET_PREFS,
  WIDGET_CONFIG,
  type WidgetPrefs,
} from "@/constants/dashboardWidgets";
import {
  LivePriceStripWidget,
  OpenTradeCardWidget,
  EconomicCalendarWidget,
  DailyRiskGaugeWidget,
  KillZoneCountdownWidget,
} from "@/components/LiveMarketWidgets";
import { COURSE_CHAPTERS } from "@/data/academy-data";
import { apiGet } from "@/lib/api";
import { useScrollCollapseProps } from "@/contexts/ScrollDirectionContext";
import NewsModal from "@/components/NewsModal";
import PnLCalendarBottomSheet from "@/components/PnLCalendarBottomSheet";

const ROUTINE_DISPLAY: Array<{ key: "water" | "breathing" | "news" | "bias"; label: string; icon: React.ComponentProps<typeof Ionicons>["name"]; why: string }> = [
  { key: "water", label: "Drink water", icon: "water-outline", why: "Dehydration reduces focus and decision-making quality." },
  { key: "breathing", label: "5-min breathing", icon: "leaf-outline", why: "Calms the nervous system, reducing impulsive trading decisions." },
  { key: "news", label: "Check news", icon: "newspaper-outline", why: "News catalysts drive session volatility — know what's moving." },
  { key: "bias", label: "Set daily bias", icon: "trending-up-outline", why: "A clear bias prevents emotional flip-flopping mid-session." },
];

const C = Colors.dark;

const TRADE_PLAN_KEY = "daily_trade_plan_v1";
const NOTES_KEY = "dashboard-notes";
const CHECKLIST_STORAGE_KEY = "ict-checklist-state";
const CHECKLIST_TTL_MS = 4 * 60 * 60 * 1000;
const QUICK_JOURNAL_KEY = "ict-quick-journal-notes";
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
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => parseInt(parts.find((p) => p.type === type)?.value ?? "0");
  return new Date(get("year"), get("month") - 1, get("day"), get("hour") === 24 ? 0 : get("hour"), get("minute"), get("second"));
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
      <View style={styles.aiTipBox}>
        <Ionicons name="sparkles" size={13} color={C.accent} />
        <Text style={styles.aiTip}>{tip}</Text>
      </View>
    </View>
  );
}


const SCREEN_WIDTH = Dimensions.get("window").width - 32;

function mobileScoreToGrade(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

function MobileCumulativePnLChart() {
  const router = useRouter();
  const { data: apiTrades } = useListTrades();
  const trades = (apiTrades || []) as Array<{
    pnl?: string | number | null;
    createdAt?: string | null;
    isDraft?: boolean | null;
  }>;

  const completed = trades
    .filter((t) => !t.isDraft && t.createdAt && t.pnl !== null && t.pnl !== undefined)
    .slice()
    .reverse();

  let cumulative = 0;
  const points = completed.map((t) => {
    const pnl = parseFloat(String(t.pnl ?? "0"));
    cumulative += isNaN(pnl) ? 0 : pnl;
    return parseFloat(cumulative.toFixed(2));
  });

  const hasData = points.length >= 1;
  const isPositive = cumulative >= 0;
  const chartColor = isPositive ? "#00C896" : "#EF4444";

  const W = SCREEN_WIDTH - 28;
  const H = 80;
  const PADDING_X = 4;
  const PADDING_Y = 8;

  let polylinePoints = "";
  let polygonPoints = "";

  if (hasData) {
    const minY = Math.min(...points);
    const maxY = Math.max(...points);
    const rangeY = maxY - minY || 1;

    const toX = (i: number) =>
      points.length === 1
        ? W / 2
        : PADDING_X + (i / (points.length - 1)) * (W - PADDING_X * 2);
    const toY = (v: number) => H - PADDING_Y - ((v - minY) / rangeY) * (H - PADDING_Y * 2);

    const coords = points.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`);
    polylinePoints = coords.join(" ");
    polygonPoints = `${PADDING_X},${H} ${coords.join(" ")} ${(W - PADDING_X).toFixed(1)},${H}`;
  }

  return (
    <View style={[mobileChartStyles.card]}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="trending-up-outline" size={14} color={C.accent} />
        <Text style={styles.cardLabel}>Cumulative P&L</Text>
        {hasData && (
          <View style={[mobileChartStyles.badge, { backgroundColor: isPositive ? "#00C89620" : "#EF444420", borderColor: isPositive ? "#00C89640" : "#EF444440" }]}>
            <Text style={[mobileChartStyles.badgeText, { color: chartColor }]}>
              {isPositive ? "+" : ""}{cumulative.toFixed(1)}R
            </Text>
          </View>
        )}
        <TouchableOpacity onPress={() => router.navigate({ pathname: "/(tabs)/analytics" })} activeOpacity={0.7} style={{ marginLeft: hasData ? 4 : "auto" }}>
          <Text style={styles.editLink}>Analytics ↗</Text>
        </TouchableOpacity>
      </View>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
        {!hasData ? (
          <View style={mobileChartStyles.emptyBox}>
            <Text style={mobileChartStyles.emptyText}>Log trades to see your equity curve</Text>
          </View>
        ) : (
          <Svg width={W} height={H}>
            <Defs>
              <LinearGradient id="mobileGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
                <Stop offset="100%" stopColor={chartColor} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>
            <Polygon points={polygonPoints} fill="url(#mobileGrad)" />
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={chartColor}
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        )}
      </View>
    </View>
  );
}

function MobileLastTradeGradeCard() {
  const router = useRouter();
  const { data: apiTrades } = useListTrades();
  const trades = (apiTrades || []) as Array<{
    pnl?: string | number | null;
    createdAt?: string | null;
    isDraft?: boolean | null;
    setupScore?: string | number | null;
    pair?: string | null;
    ticker?: string | null;
    instrument?: string | null;
  }>;

  const lastTrade = trades.find((t) => !t.isDraft);

  if (!lastTrade) {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="ribbon-outline" size={14} color={C.accent} />
          <Text style={styles.cardLabel}>Last Trade Grade</Text>
          <TouchableOpacity onPress={() => router.navigate({ pathname: "/(tabs)/journal" })} activeOpacity={0.7} style={{ marginLeft: "auto" }}>
            <Text style={styles.editLink}>Journal ↗</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular", paddingHorizontal: 14, paddingBottom: 12 }}>
          No trades logged yet
        </Text>
      </View>
    );
  }

  const rawScore = lastTrade.setupScore;
  const score = rawScore !== null && rawScore !== undefined ? parseFloat(String(rawScore)) : null;
  const grade = mobileScoreToGrade(score);
  const symbol = lastTrade.ticker || lastTrade.pair || lastTrade.instrument || "—";
  const pnl = lastTrade.pnl !== null && lastTrade.pnl !== undefined ? parseFloat(String(lastTrade.pnl)) : null;
  const dateStr = lastTrade.createdAt
    ? new Date(lastTrade.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

  const gradeColor =
    grade === "A+" || grade === "A" ? "#00C896"
    : grade === "B" ? "#F59E0B"
    : grade === "C" ? "#F97316"
    : grade === "D" ? "#EF4444"
    : C.textSecondary;

  const pnlIsPositive = pnl !== null && pnl > 0;
  const pnlIsNegative = pnl !== null && pnl < 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="ribbon-outline" size={14} color={C.accent} />
        <Text style={styles.cardLabel}>Last Trade Grade</Text>
        <TouchableOpacity onPress={() => router.navigate({ pathname: "/(tabs)/journal" })} activeOpacity={0.7} style={{ marginLeft: "auto" }}>
          <Text style={styles.editLink}>Journal ↗</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingBottom: 14, gap: 14 }}>
        <View style={[mobileChartStyles.gradeBox, { borderColor: gradeColor + "50", backgroundColor: gradeColor + "18" }]}>
          <Text style={[mobileChartStyles.gradeText, { color: gradeColor }]}>{grade}</Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Text style={{ fontSize: 15, fontFamily: "Inter_700Bold", color: C.text }}>{symbol}</Text>
            {dateStr ? <Text style={{ fontSize: 11, color: C.textSecondary, fontFamily: "Inter_400Regular" }}>{dateStr}</Text> : null}
          </View>
          {score !== null ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ flex: 1, height: 4, backgroundColor: C.backgroundTertiary, borderRadius: 2, overflow: "hidden", maxWidth: 96 }}>
                <View style={{ height: 4, backgroundColor: gradeColor, borderRadius: 2, width: `${Math.min(score, 100)}%` }} />
              </View>
              <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.textSecondary }}>{Math.round(score)}/100</Text>
            </View>
          ) : (
            <Text style={{ fontSize: 11, color: C.textSecondary, fontFamily: "Inter_400Regular" }}>No setup score</Text>
          )}
          {pnl !== null && (
            <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: pnlIsPositive ? "#00C896" : pnlIsNegative ? "#EF4444" : C.textSecondary }}>
              {pnlIsPositive ? "+" : ""}{pnl.toFixed(1)}R
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

function TodayScheduleWidget() {
  const router = useRouter();
  const { routineItems, showRoutineWidget } = usePlanner();
  if (!showRoutineWidget) return null;

  const total = ROUTINE_DISPLAY.length;
  const doneCount = ROUTINE_DISPLAY.filter((item) => routineItems[item.key]).length;
  const allDone = doneCount === total;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="calendar-outline" size={14} color={C.accent} />
        <Text style={styles.cardLabel}>Routine Progress</Text>
        {allDone && (
          <View style={styles.doneBadge}>
            <Text style={styles.doneBadgeText}>Done ✓</Text>
          </View>
        )}
        <TouchableOpacity
          onPress={() => router.navigate({ pathname: "/(tabs)" })}
          activeOpacity={0.7}
          style={{ marginLeft: "auto" }}
        >
          <Text style={styles.editLink}>Mission Control ↗</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.routineContent}>
        <View style={[styles.routineRing, allDone && { borderColor: "#00C896" }]}>
          <Text style={[styles.routineRingText, allDone && { color: "#00C896" }]}>{doneCount}/{total}</Text>
          <Text style={styles.routineRingLabel}>done</Text>
        </View>
        <View style={{ flex: 1, gap: 6 }}>
          {ROUTINE_DISPLAY.map((item) => {
            const done = routineItems[item.key];
            return (
              <View key={item.key} style={styles.routineItem}>
                <Ionicons
                  name={done ? "checkmark-circle" : "ellipse-outline"}
                  size={14}
                  color={done ? "#00C896" : C.textTertiary}
                />
                <Text style={[styles.routineItemLabel, done && styles.routineItemLabelDone]} numberOfLines={1}>
                  {item.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function StatsStripWidget({ onCalendarPress }: { onCalendarPress?: () => void }) {
  const router = useRouter();
  const { data: apiTrades } = useListTrades();
  const trades = (apiTrades || []).filter(Boolean) as Array<{
    outcome?: string | null;
    pnl?: string | number | null;
    createdAt?: string | null;
    isDraft?: boolean | null;
  }>;

  const today = new Date().toDateString();
  const todayTrades = trades.filter((t) => {
    if (t.isDraft) return false;
    if (!t.createdAt) return false;
    return new Date(t.createdAt).toDateString() === today;
  });
  const todayCompleted = todayTrades.filter((t) => t.outcome === "win" || t.outcome === "loss");
  const todayWins = todayCompleted.filter((t) => t.outcome === "win").length;
  const winRate = todayCompleted.length > 0 ? Math.round((todayWins / todayCompleted.length) * 100) : null;
  const todayPnL = todayTrades.reduce((sum, t) => {
    const v = parseFloat(String(t.pnl ?? "0"));
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  const estNowH = getESTNow().getHours();
  const estNowM = getESTNow().getMinutes();
  const estMins = estNowH * 60 + estNowM;
  const activeSession = SESSIONS.find(
    (s) => estMins >= s.startH * 60 + s.startM && estMins < s.endH * 60 + s.endM
  );

  const stats = [
    {
      label: "Today P&L",
      value: todayTrades.length > 0 ? `${todayPnL >= 0 ? "+" : ""}${todayPnL.toFixed(1)}R` : "—",
      color: todayPnL > 0 ? "#00C896" : todayPnL < 0 ? "#EF4444" : C.textSecondary,
    },
    {
      label: "Win Rate",
      value: winRate !== null ? `${winRate}%` : "—",
      color: winRate !== null && winRate >= 50 ? "#00C896" : winRate !== null ? "#F59E0B" : C.textSecondary,
    },
    {
      label: "This Week",
      value: todayCompleted.length > 0 ? String(todayCompleted.length) : "—",
      color: C.text,
    },
    {
      label: "Session",
      value: activeSession ? activeSession.name : "Closed",
      color: activeSession ? activeSession.color : C.textSecondary,
    },
  ];

  return (
    <View style={styles.statsStrip}>
      <View style={[styles.cardHeaderRow, { paddingBottom: 8 }]}>
        <Ionicons name="stats-chart-outline" size={14} color={C.accent} />
        <Text style={styles.cardLabel}>Today's Stats</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {onCalendarPress && (
            <TouchableOpacity
              onPress={onCalendarPress}
              activeOpacity={0.7}
              style={{ padding: 4, borderRadius: 8, backgroundColor: C.backgroundTertiary, borderWidth: 1, borderColor: C.cardBorder }}
              accessibilityLabel="Open P&L Calendar"
            >
              <Ionicons name="calendar-outline" size={14} color={C.accent} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => router.navigate({ pathname: "/(tabs)/analytics" })} activeOpacity={0.7}>
            <Text style={styles.editLink}>Analytics ↗</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.statsRow}>
        {stats.map((s, i) => (
          <React.Fragment key={s.label}>
            {i > 0 && <View style={styles.statDivider} />}
            <View style={styles.statPill}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

function MorningRoutineWidget({ showWhy = false }: { showWhy?: boolean }) {
  const router = useRouter();
  const { routineItems, isRoutineComplete, showRoutineWidget, toggleItem } = usePlanner();
  const [newsModalVisible, setNewsModalVisible] = useState(false);
  if (!showRoutineWidget) return null;

  const doneCount = ROUTINE_DISPLAY.filter((item) => routineItems[item.key]).length;
  const totalCount = ROUTINE_DISPLAY.length;

  function handleRoutineItemPress(key: "water" | "breathing" | "news" | "bias") {
    if (key === "news" && !routineItems[key]) {
      setNewsModalVisible(true);
    } else {
      toggleItem(key);
    }
  }

  return (
    <View style={styles.card}>
      <NewsModal
        visible={newsModalVisible}
        onClose={() => setNewsModalVisible(false)}
        onDone={() => {
          setNewsModalVisible(false);
          toggleItem("news");
        }}
      />
      <View style={styles.cardHeaderRow}>
        <Ionicons name="sunny-outline" size={14} color="#E53E3E" />
        <Text style={styles.cardLabel}>Morning Routine</Text>
        {isRoutineComplete && (
          <View style={styles.doneBadge}>
            <Text style={styles.doneBadgeText}>Done ✓</Text>
          </View>
        )}
        <TouchableOpacity onPress={() => router.navigate({ pathname: "/(tabs)" })} activeOpacity={0.7} style={{ marginLeft: "auto" }}>
          <Text style={styles.editLink}>Planner ↗</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.routineContent}>
        <View style={styles.routineRing}>
          <Text style={styles.routineRingText}>{doneCount}/{totalCount}</Text>
          <Text style={styles.routineRingLabel}>done</Text>
        </View>
        <View style={{ flex: 1, gap: showWhy ? 10 : 6 }}>
          {ROUTINE_DISPLAY.map((item) => {
            const done = routineItems[item.key];
            return (
              <TouchableOpacity
                key={item.key}
                style={styles.routineItem}
                onPress={() => handleRoutineItemPress(item.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.routineCheckbox, done && styles.routineCheckboxDone]}>
                  {done && <Ionicons name="checkmark" size={10} color="#0A0A0F" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.routineItemLabel, done && styles.routineItemLabelDone]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {showWhy && (
                    <Text style={styles.routineWhyText} numberOfLines={2}>{item.why}</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

function MasterRoutineWidget() {
  const { routineItems, isRoutineComplete, showRoutineWidget, toggleItem, customItems, addCustomItem, removeCustomItem, renameCustomItem, toggleCustomItem } = usePlanner();
  const [newItemText, setNewItemText] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [newsModalVisible, setNewsModalVisible] = useState(false);
  if (!showRoutineWidget) return null;

  const doneCount = ROUTINE_DISPLAY.filter((item) => routineItems[item.key]).length;
  const totalCount = ROUTINE_DISPLAY.length;

  function handleAdd() {
    const trimmed = newItemText.trim();
    if (!trimmed) return;
    addCustomItem(trimmed);
    setNewItemText("");
    setShowAdd(false);
  }

  function startEdit(item: { id: string; label: string }) {
    setEditingId(item.id);
    setEditText(item.label);
  }

  function saveEdit() {
    if (!editingId) return;
    renameCustomItem(editingId, editText);
    setEditingId(null);
    setEditText("");
  }

  function handleRoutineItemPress(key: "water" | "breathing" | "news" | "bias") {
    if (key === "news" && !routineItems[key]) {
      setNewsModalVisible(true);
    } else {
      toggleItem(key);
    }
  }

  return (
    <View style={styles.card}>
      <NewsModal
        visible={newsModalVisible}
        onClose={() => setNewsModalVisible(false)}
        onDone={() => {
          setNewsModalVisible(false);
          toggleItem("news");
        }}
      />
      <View style={styles.cardHeaderRow}>
        <Ionicons name="sunny-outline" size={14} color="#E53E3E" />
        <Text style={styles.cardLabel}>Master Routine</Text>
        {isRoutineComplete && (
          <View style={styles.doneBadge}>
            <Text style={styles.doneBadgeText}>Done ✓</Text>
          </View>
        )}
        <View style={{ marginLeft: "auto", flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Text style={{ fontSize: 11, color: C.textSecondary, fontFamily: "Inter_500Medium" }}>{doneCount}/{totalCount}</Text>
        </View>
      </View>

      {/* Morning Routine items */}
      {ROUTINE_DISPLAY.map((item) => {
        const done = routineItems[item.key];
        return (
          <TouchableOpacity
            key={item.key}
            style={mrStyles.routineRow}
            onPress={() => handleRoutineItemPress(item.key)}
            activeOpacity={0.7}
          >
            <View style={[mrStyles.checkbox, done && mrStyles.checkboxDone]}>
              {done && <Ionicons name="checkmark" size={11} color="#0A0A0F" />}
            </View>
            <Text style={[mrStyles.routineLabel, done && mrStyles.routineLabelDone]}>{item.label}</Text>
          </TouchableOpacity>
        );
      })}

      {/* Add to My Routine control sits here, between Morning Routine and My Routine */}
      <View style={mrStyles.divider} />

      {showAdd ? (
        <View style={mrStyles.addRow}>
          <TextInput
            style={mrStyles.addInput}
            value={newItemText}
            onChangeText={setNewItemText}
            placeholder="Add to My Routine..."
            placeholderTextColor={C.textTertiary}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleAdd}
          />
          <TouchableOpacity onPress={handleAdd} style={[mrStyles.addBtn, !newItemText.trim() && { opacity: 0.4 }]} disabled={!newItemText.trim()}>
            <Ionicons name="checkmark" size={16} color="#0A0A0F" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { setShowAdd(false); setNewItemText(""); }} style={{ padding: 6 }}>
            <Ionicons name="close" size={16} color={C.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={mrStyles.addTrigger} onPress={() => setShowAdd(true)} activeOpacity={0.7}>
          <Ionicons name="add-circle-outline" size={14} color={C.accent} />
          <Text style={mrStyles.addTriggerText}>+ Add to My Routine</Text>
        </TouchableOpacity>
      )}

      {/* My Routine — user's persistent custom items */}
      {customItems.length > 0 && (
        <>
          <View style={mrStyles.divider} />
          <Text style={mrStyles.sectionLabel}>My Routine</Text>
          {customItems.map((item) => (
            <View key={item.id} style={mrStyles.customRow}>
              {editingId === item.id ? (
                <>
                  <TextInput
                    style={[mrStyles.addInput, { flex: 1 }]}
                    value={editText}
                    onChangeText={setEditText}
                    autoFocus
                    returnKeyType="done"
                    onSubmitEditing={saveEdit}
                  />
                  <TouchableOpacity onPress={saveEdit} style={[mrStyles.addBtn, !editText.trim() && { opacity: 0.4 }]} disabled={!editText.trim()}>
                    <Ionicons name="checkmark" size={14} color="#0A0A0F" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setEditingId(null)} style={{ padding: 6 }}>
                    <Ionicons name="close" size={14} color={C.textSecondary} />
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity style={mrStyles.customLeft} onPress={() => toggleCustomItem(item.id)} activeOpacity={0.7}>
                    <View style={[mrStyles.checkbox, item.checked && mrStyles.checkboxDone]}>
                      {item.checked && <Ionicons name="checkmark" size={11} color="#0A0A0F" />}
                    </View>
                    <Text style={[mrStyles.routineLabel, item.checked && mrStyles.routineLabelDone]}>{item.label}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => startEdit(item)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={{ padding: 6 }}>
                    <Ionicons name="pencil-outline" size={14} color={C.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() =>
                      Alert.alert("Remove", `Remove "${item.label}" from routine?`, [
                        { text: "Cancel", style: "cancel" },
                        { text: "Remove", style: "destructive", onPress: () => removeCustomItem(item.id) },
                      ])
                    }
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    style={{ padding: 6 }}
                  >
                    <Ionicons name="trash-outline" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          ))}
        </>
      )}
    </View>
  );
}


const mrStyles = StyleSheet.create({
  routineRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 9, gap: 10 },
  checkbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" },
  checkboxDone: { backgroundColor: C.accent, borderColor: C.accent },
  routineLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.text, flex: 1 },
  routineLabelDone: { textDecorationLine: "line-through", color: C.textSecondary },
  divider: { height: 1, backgroundColor: C.cardBorder, marginHorizontal: 14 },
  customRow: { flexDirection: "row", alignItems: "center", paddingLeft: 14, paddingRight: 6, paddingVertical: 9, gap: 4 },
  customLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  addRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8, gap: 6 },
  addInput: { flex: 1, fontSize: 14, color: C.text, fontFamily: "Inter_500Medium", paddingVertical: 6 },
  addBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  addTrigger: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
  addTriggerText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.accent },
  sectionLabel: { fontSize: 10, fontFamily: "Inter_700Bold", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 0.8, paddingHorizontal: 14, paddingTop: 6, paddingBottom: 2 },
});

const BIAS_TO_API: Record<string, string> = { bull: "bullish", bear: "bearish", neutral: "neutral" };
const BIAS_FROM_API: Record<string, string> = { bullish: "bull", bearish: "bear", neutral: "neutral" };
const SESSION_FROM_API: Record<string, string> = { "new-york": "ny-open", london: "london", "silver-bullet": "silver-bullet" };

const PLANNER_BIAS_CHIPS: Array<{ key: "bull" | "neutral" | "bear"; label: string; icon: string; color: string }> = [
  { key: "bull", label: "Bullish", icon: "📈", color: "#00C896" },
  { key: "neutral", label: "Neutral", icon: "➡️", color: "#F59E0B" },
  { key: "bear", label: "Bearish", icon: "📉", color: "#EF4444" },
];

function TradePlanWidget({ refreshTrigger }: { refreshTrigger?: number }) {
  const router = useRouter();
  const [selectedBias, setSelectedBias] = useState<"bull" | "neutral" | "bear" | null>(null);
  const [targetSession, setTargetSession] = useState<string | null>(null);
  const [keyLevels, setKeyLevels] = useState<Array<{ id: string; price: string; label?: string }>>([]);

  const loadPlan = useCallback(() => {
    (async () => {
      const v = await AsyncStorage.getItem(TRADE_PLAN_KEY);
      if (v) {
        try {
          const parsed = JSON.parse(v);
          setSelectedBias(parsed.bias || null);
          setTargetSession(parsed.targetSession || null);
          setKeyLevels(Array.isArray(parsed.keyLevels) ? parsed.keyLevels.slice(0, 3) : []);
        } catch {}
      }
      try {
        const dateStr = new Date().toISOString().split("T")[0];
        const res = await apiGet<{ data: any }>(`planner/${dateStr}`);
        if (res.data && Object.keys(res.data).length > 0) {
          const tp = res.data.tradePlan || res.data;
          const apiBias = tp.bias ? (BIAS_FROM_API[tp.bias] || tp.bias) : null;
          const apiSession = tp.sessionFocus ? (SESSION_FROM_API[tp.sessionFocus] || tp.sessionFocus) : (tp.targetSession || null);
          setSelectedBias((apiBias === "bull" || apiBias === "neutral" || apiBias === "bear") ? apiBias : null);
          setTargetSession(apiSession);
          const levels = tp.keyLevels ?? [];
          setKeyLevels(Array.isArray(levels) ? levels.slice(0, 3) : []);
        }
      } catch {}
    })();
  }, []);

  useFocusEffect(loadPlan);

  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) loadPlan();
  }, [refreshTrigger, loadPlan]);

  async function tapBias(key: "bull" | "neutral" | "bear") {
    const newBias = selectedBias === key ? null : key;
    setSelectedBias(newBias);
    const existing = await AsyncStorage.getItem(TRADE_PLAN_KEY);
    let localData: Record<string, unknown> = {};
    if (existing) {
      try { localData = JSON.parse(existing); } catch {}
    }
    localData.bias = newBias;
    await AsyncStorage.setItem(TRADE_PLAN_KEY, JSON.stringify(localData));
    try {
      const { apiGet, apiPut } = await import("@/lib/api");
      const dateStr = new Date().toISOString().split("T")[0];
      let serverData: Record<string, unknown> = {};
      try {
        const res = await apiGet<{ data: Record<string, unknown> }>(`planner/${dateStr}`);
        if (res.data && Object.keys(res.data).length > 0) serverData = res.data;
      } catch {}
      const tradePlan = (serverData.tradePlan as Record<string, unknown>) || {};
      tradePlan.bias = newBias ? (BIAS_TO_API[newBias] || newBias) : null;
      serverData.tradePlan = tradePlan;
      apiPut(`planner/${dateStr}`, { data: serverData }).catch(() => {});
    } catch {}
  }

  const activeChip = PLANNER_BIAS_CHIPS.find((c) => c.key === selectedBias);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="document-text-outline" size={14} color={C.accent} />
        <Text style={styles.cardLabel}>Today's Trade Plan</Text>
        <TouchableOpacity onPress={() => router.navigate({ pathname: "/(tabs)" })} activeOpacity={0.7} style={{ marginLeft: "auto" }}>
          <Text style={styles.editLink}>Edit ↗</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.biasChipsRow}>
        {PLANNER_BIAS_CHIPS.map((chip) => {
          const isActive = selectedBias === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[
                styles.biasChip,
                isActive && { borderColor: chip.color, backgroundColor: chip.color + "18" },
              ]}
              onPress={() => tapBias(chip.key)}
              activeOpacity={0.7}
            >
              <Text style={styles.biasChipEmoji}>{chip.icon}</Text>
              <Text style={[styles.biasChipText, isActive && { color: chip.color }]}>{chip.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.biasSummary}>
        {selectedBias && activeChip ? (
          <>
            <View style={[styles.biasBadge, { backgroundColor: activeChip.color + "20" }]}>
              <Text style={[styles.biasBadgeText, { color: activeChip.color }]}>
                {activeChip.icon} {activeChip.label} Bias
              </Text>
            </View>
            {targetSession ? (
              <Text style={styles.planDetailText}>Session: {targetSession}</Text>
            ) : null}
            {keyLevels.length > 0 ? (
              <View style={styles.keyLevelsRow}>
                <Text style={[styles.planDetailText, { marginBottom: 3 }]}>Key Levels:</Text>
                {keyLevels.map((kl) => (
                  <View key={kl.id} style={styles.keyLevelChip}>
                    <Text style={styles.keyLevelText}>
                      {kl.label ? `${kl.label}: ` : ""}{kl.price}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <TouchableOpacity onPress={() => router.navigate({ pathname: "/(tabs)" })} activeOpacity={0.7}>
                <Text style={[styles.planDetailText, { color: C.accent }]}>Add key levels in Planner →</Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <Text style={styles.planDetailText}>Tap a bias chip or open Planner to set today's plan.</Text>
        )}
      </View>
    </View>
  );
}

interface MobileFvgSignal {
  direction: "bullish" | "bearish" | "none";
  level: number;
  instrument: string;
  detected_at: string;
}

interface MobileConfidenceFactor {
  label: string;
  met: boolean;
}

interface MobileConfidenceData {
  score: number;
  factors: MobileConfidenceFactor[];
}

function useMobileLiveSignals(instrument = "NQ") {
  const [fvg, setFvg] = useState<MobileFvgSignal | null>(null);
  const [confidence, setConfidence] = useState<MobileConfidenceData | null>(null);

  const fetchSignals = useCallback(async () => {
    try {
      const [fvgData, confData] = await Promise.all([
        apiGet<MobileFvgSignal>(`signals/fvg?instrument=${instrument}`),
        apiGet<MobileConfidenceData>(`signals/confidence?instrument=${instrument}`),
      ]);
      setFvg(fvgData);
      setConfidence(confData);
    } catch {}
  }, [instrument]);

  useEffect(() => {
    fetchSignals();
    const id = setInterval(fetchSignals, 15000);
    return () => clearInterval(id);
  }, [fetchSignals]);

  return { fvg, confidence, fetchSignals };
}

function FvgSignalMobileCard({ fvg }: { fvg: MobileFvgSignal | null }) {

  const isBullish = fvg?.direction === "bullish";
  const isBearish = fvg?.direction === "bearish";
  const hasGap = isBullish || isBearish;

  const directionColor = isBullish ? "#00C896" : isBearish ? "#EF4444" : C.textSecondary;

  function formatRelativeTime(isoStr: string): string {
    const diff = Date.now() - new Date(isoStr).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="flash-outline" size={14} color={C.accent} />
        <Text style={styles.cardLabel}>Fair Value Gap (FVG)</Text>
      </View>
      {!fvg ? (
        <Text style={{ fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular", paddingHorizontal: 14, paddingBottom: 12 }}>Scanning 5m chart…</Text>
      ) : (
        <View style={{ paddingHorizontal: 14, paddingBottom: 12, gap: 10 }}>
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 20,
            borderWidth: 1,
            alignSelf: "flex-start",
            borderColor: directionColor + "40",
            backgroundColor: directionColor + "15",
          }}>
            {hasGap && (
              <Ionicons name={isBullish ? "arrow-up" : "arrow-down"} size={13} color={directionColor} />
            )}
            <Text style={{ fontSize: 12, fontFamily: "Inter_700Bold", color: directionColor }}>
              {hasGap ? (isBullish ? "Bullish FVG" : "Bearish FVG") + " detected" : "No FVG detected"}
            </Text>
          </View>
          {hasGap && (
            <View style={{ flexDirection: "row", gap: 16 }}>
              <View>
                <Text style={{ fontSize: 10, color: C.textSecondary, fontFamily: "Inter_400Regular" }}>Instrument</Text>
                <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: C.text }}>{fvg.instrument}</Text>
              </View>
              <View>
                <Text style={{ fontSize: 10, color: C.textSecondary, fontFamily: "Inter_400Regular" }}>~Level</Text>
                <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: C.text, fontVariant: ["tabular-nums"] }}>{fvg.level.toFixed(2)}</Text>
              </View>
            </View>
          )}
          <Text style={{ fontSize: 11, color: C.textTertiary, fontFamily: "Inter_400Regular" }}>
            Last scan: {formatRelativeTime(fvg.detected_at)}
          </Text>
        </View>
      )}
    </View>
  );
}

function ConfidenceScoreMobileCard({ confidence }: { confidence: MobileConfidenceData | null }) {

  const score = confidence?.score ?? null;

  const scoreColor =
    score === null ? C.textSecondary
    : score >= 75 ? "#00C896"
    : score >= 50 ? "#F59E0B"
    : "#EF4444";

  const gradeLabel =
    score === null ? ""
    : score >= 75 ? "High Probability"
    : score >= 50 ? "Moderate Setup"
    : "Wait for Alignment";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="shield-checkmark-outline" size={14} color={C.accent} />
        <Text style={styles.cardLabel}>ICT Confidence Score</Text>
      </View>
      {!confidence ? (
        <Text style={{ fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular", paddingHorizontal: 14, paddingBottom: 12 }}>Computing…</Text>
      ) : (
        <View style={{ paddingHorizontal: 14, paddingBottom: 12, gap: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <Text style={{ fontSize: 32, fontFamily: "Inter_700Bold", color: scoreColor }}>{score}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: C.textSecondary, fontFamily: "Inter_400Regular" }}>/100 · {gradeLabel}</Text>
              <View style={{ height: 8, backgroundColor: C.backgroundTertiary, borderRadius: 4, overflow: "hidden", marginTop: 6 }}>
                <View style={{ height: 8, backgroundColor: scoreColor, borderRadius: 4, width: `${score ?? 0}%` }} />
              </View>
            </View>
          </View>
          <View style={{ gap: 6 }}>
            {confidence.factors.map((f, i) => (
              <View key={i} style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 10,
                paddingVertical: 7,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: f.met ? "#00C89630" : C.cardBorder,
                backgroundColor: f.met ? "#00C89610" : C.backgroundTertiary,
              }}>
                <Text style={{ fontSize: 12, color: f.met ? "#00C896" : C.textSecondary }}>{f.met ? "✓" : "○"}</Text>
                <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: f.met ? "#00C896" : C.textSecondary, flex: 1 }} numberOfLines={2}>{f.label}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
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
        <Ionicons name="pencil-outline" size={14} color="#818CF8" />
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

function QuickJournalWidget() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [recentNotes, setRecentNotes] = useState<Array<{ id: string; text: string; timestamp: string }>>([]);

  const loadNotes = useCallback(async () => {
    const raw = await AsyncStorage.getItem(QUICK_JOURNAL_KEY);
    if (raw) {
      try {
        const notes = JSON.parse(raw);
        setRecentNotes(notes.slice(0, 2));
      } catch {}
    }
  }, []);

  useEffect(() => {
    loadNotes();
  }, []);

  async function handleLog() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const note = {
      id: `qn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: trimmed,
      timestamp: new Date().toISOString(),
    };
    const raw = await AsyncStorage.getItem(QUICK_JOURNAL_KEY);
    const notes = raw ? JSON.parse(raw) : [];
    notes.unshift(note);
    await AsyncStorage.setItem(QUICK_JOURNAL_KEY, JSON.stringify(notes.slice(0, 100)));
    setText("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    loadNotes();
  }

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="pencil-outline" size={14} color="#E53E3E" />
        <Text style={styles.cardLabel}>Quick Note</Text>
        <TouchableOpacity onPress={() => router.navigate({ pathname: "/(tabs)/journal" })} activeOpacity={0.7} style={{ marginLeft: "auto" }}>
          <Text style={styles.editLink}>Open Journal ↗</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.journalInputRow}>
        <TextInput
          style={styles.journalInput}
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleLog}
          placeholder="Quick note for today..."
          placeholderTextColor={C.textTertiary}
          returnKeyType="done"
          maxLength={500}
        />
        {saved ? (
          <Text style={styles.journalSaved}>Saved ✓</Text>
        ) : (
          <TouchableOpacity
            style={[styles.journalLogBtn, !text.trim() && { opacity: 0.4 }]}
            onPress={handleLog}
            disabled={!text.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.journalLogBtnText}>Log</Text>
          </TouchableOpacity>
        )}
      </View>
      {recentNotes.map((note) => (
        <View key={note.id} style={styles.journalNote}>
          <Text style={styles.journalNoteDot}>·</Text>
          <Text style={styles.journalNoteText} numberOfLines={1}>{note.text}</Text>
        </View>
      ))}
    </View>
  );
}

function PreTradeChecklistWidget() {
  const router = useRouter();
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
  const doneCount = PRE_TRADE_ITEMS.filter((item) => checked[item.id]).length;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="shield-checkmark-outline" size={14} color="#F59E0B" />
        <Text style={styles.cardLabel}>Rules Before I Trade</Text>
        <View style={[styles.checklistBadge, allDone && styles.checklistBadgeDone]}>
          <Text style={[styles.checklistBadgeText, allDone && styles.checklistBadgeTextDone]}>
            {doneCount}/{PRE_TRADE_ITEMS.length}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.navigate({ pathname: "/(tabs)" })} activeOpacity={0.7} style={{ marginLeft: 4 }}>
          <Text style={styles.editLink}>Planner ↗</Text>
        </TouchableOpacity>
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
      <View style={[styles.checklistStatusBar, allDone && styles.checklistStatusBarDone]}>
        <Text style={[styles.checklistStatusText, allDone && styles.checklistStatusTextDone]}>
          {allDone ? "✓ Ready to Trade" : "Not Ready"}
        </Text>
      </View>
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

  const [accountSizeInput, setAccountSizeInput] = useState(
    startingBalance > 0 ? String(Math.round(startingBalance)) : ""
  );
  const [riskPctInput, setRiskPctInput] = useState("1");
  const [slPointsInput, setSlPointsInput] = useState("10");
  const acctSize = parseFloat(accountSizeInput) || 0;
  const riskPct = parseFloat(riskPctInput) || 1;
  const slPtsNum = parseFloat(slPointsInput) || 0;
  const dollarRisk = acctSize > 0 ? (acctSize * riskPct) / 100 : null;
  const contractCount = dollarRisk !== null && slPtsNum > 0 ? dollarRisk / slPtsNum : null;

  return (
    <View style={[styles.card, styles.riskCard]}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="shield-checkmark-outline" size={14} color="#EF4444" />
        <Text style={styles.cardLabel}>Risk Shield</Text>
        <TouchableOpacity onPress={() => router.navigate("/tracker")} activeOpacity={0.7} style={{ marginLeft: "auto" }}>
          <Text style={styles.editLink}>Full Shield ↗</Text>
        </TouchableOpacity>
      </View>
      {hasData && (
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
      {/* Compact position sizer */}
      <View style={styles.posSizer}>
        <Text style={styles.posSizerTitle}>Quick Position Sizer</Text>
        <View style={styles.posSizerRow}>
          <View style={styles.posSizerField}>
            <Text style={styles.posSizerLabel}>Account ($)</Text>
            <TextInput
              style={styles.posSizerInput}
              value={accountSizeInput}
              onChangeText={setAccountSizeInput}
              placeholder={startingBalance > 0 ? String(Math.round(startingBalance)) : "50000"}
              placeholderTextColor={C.textTertiary}
              keyboardType="numeric"
            />
          </View>
          <View style={[styles.posSizerField, { width: 70 }]}>
            <Text style={styles.posSizerLabel}>Risk %</Text>
            <TextInput
              style={styles.posSizerInput}
              value={riskPctInput}
              onChangeText={setRiskPctInput}
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={C.textTertiary}
            />
          </View>
          <View style={[styles.posSizerField, { width: 70 }]}>
            <Text style={styles.posSizerLabel}>SL (pts)</Text>
            <TextInput
              style={styles.posSizerInput}
              value={slPointsInput}
              onChangeText={setSlPointsInput}
              keyboardType="numeric"
              placeholder="10"
              placeholderTextColor={C.textTertiary}
            />
          </View>
        </View>
        <View style={styles.posSizerResultRow}>
          <View style={[styles.posSizerResult, { flex: 1 }, dollarRisk !== null && { borderColor: C.accent + "30", backgroundColor: C.accent + "10" }]}>
            <Text style={styles.posSizerResultLabel}>$ Risk</Text>
            <Text style={[styles.posSizerResultValue, dollarRisk !== null && { color: C.accent }]}>
              {dollarRisk !== null ? `$${dollarRisk.toFixed(0)}` : "—"}
            </Text>
          </View>
          <View style={[styles.posSizerResult, { flex: 1 }, contractCount !== null && { borderColor: C.accent + "30", backgroundColor: C.accent + "10" }]}>
            <Text style={styles.posSizerResultLabel}>Contracts</Text>
            <Text style={[styles.posSizerResultValue, contractCount !== null && { color: C.accent }]}>
              {contractCount !== null ? (contractCount < 0.1 ? contractCount.toFixed(2) : contractCount.toFixed(1)) : "—"}
            </Text>
          </View>
        </View>
      </View>
    </View>
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

const ICT_ACADEMY_PROGRESS_KEY = "ict-academy-progress";
const ACADEMY_PENDING_LESSON_KEY = "ict-academy-pending-lesson";

function SwipeLessonCard({
  lesson,
  onDismiss,
  onWatch,
  stackIndex,
}: {
  lesson: { id: string; title: string; chapterTitle: string; chapterColor: string; takeaway: string };
  onDismiss: () => void;
  onWatch: () => void;
  stackIndex: number;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(stackIndex * 4)).current;
  const scale = useRef(new Animated.Value(1 - stackIndex * 0.04)).current;
  const opacity = useRef(new Animated.Value(1 - stackIndex * 0.15)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 10,
      onPanResponderMove: (_, gesture) => {
        translateX.setValue(gesture.dx);
      },
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) > 80) {
          Animated.timing(translateX, {
            toValue: gesture.dx > 0 ? 400 : -400,
            duration: 200,
            useNativeDriver: true,
          }).start(onDismiss);
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.swipeLessonCard,
        {
          transform: [{ translateX }, { translateY }, { scale }],
          opacity,
          zIndex: 10 - stackIndex,
          borderColor: lesson.chapterColor + "40",
        },
      ]}
      {...(stackIndex === 0 ? panResponder.panHandlers : {})}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
        <View style={[styles.lessonCardDot, { backgroundColor: lesson.chapterColor, marginTop: 0 }]} />
        <Text style={styles.lessonCardChapter} numberOfLines={1}>{lesson.chapterTitle}</Text>
      </View>
      <Text style={styles.swipeLessonTitle} numberOfLines={2}>{lesson.title}</Text>
      <Text style={styles.swipeLessonTeaser} numberOfLines={2}>{lesson.takeaway}</Text>
      {stackIndex === 0 && (
        <View style={styles.swipeLessonActions}>
          <TouchableOpacity
            style={styles.swipeLessonSkip}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={13} color={C.textSecondary} />
            <Text style={styles.swipeLessonSkipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.swipeLessonWatch, { backgroundColor: lesson.chapterColor }]}
            onPress={onWatch}
            activeOpacity={0.85}
          >
            <Ionicons name="play-circle" size={13} color="#0A0A0F" />
            <Text style={styles.swipeLessonWatchText}>Watch Now</Text>
          </TouchableOpacity>
        </View>
      )}
    </Animated.View>
  );
}

function LessonCarousel() {
  const router = useRouter();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [totalLessons, setTotalLessons] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let total = 0;
      for (const ch of COURSE_CHAPTERS) total += ch.lessons.length;
      setTotalLessons(total);
      AsyncStorage.getItem(ICT_ACADEMY_PROGRESS_KEY).then((raw) => {
        try { setCompleted(new Set(raw ? JSON.parse(raw) : [])); } catch { setCompleted(new Set()); }
      });
    }, [])
  );

  const allLessons = COURSE_CHAPTERS.flatMap((ch) =>
    ch.lessons.map((l) => ({ ...l, chapterTitle: ch.title, chapterColor: ch.color, chapterId: ch.id }))
  );

  const lessonCards = allLessons
    .filter((l) => !completed.has(l.id) && !dismissed.has(l.id))
    .slice(0, 3);

  function dismissCard(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  if (lessonCards.length === 0) return null;

  const pct = totalLessons > 0 ? Math.round((completed.size / totalLessons) * 100) : 0;
  const firstUnwatched = allLessons.find((l) => !completed.has(l.id)) ?? lessonCards[0];
  const nextLesson = firstUnwatched;
  const lessonIndex = allLessons.findIndex((l) => l.id === nextLesson.id);
  const estMins = 8 + (lessonIndex % 7) * 2;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="book-outline" size={14} color={C.accent} />
        <Text style={styles.cardLabel}>Up Next — ICT Lessons</Text>
        <TouchableOpacity onPress={() => router.navigate({ pathname: "/(tabs)/academy" })} activeOpacity={0.7} style={{ marginLeft: "auto" }}>
          <Text style={styles.editLink}>View all ↗</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.lcProgressRow}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 }}>
          <Text style={styles.lcProgressText}>{completed.size} / {totalLessons} lessons</Text>
          <View style={styles.lcProgressDot} />
          <Text style={[styles.lcProgressText, { color: C.accent }]}>{pct}%</Text>
        </View>
        <View style={styles.lcProgressBar}>
          <View style={[styles.lcProgressFill, { width: `${pct}%` }]} />
        </View>
      </View>

      <View style={styles.lcNextCard}>
        <View style={[styles.lcNextThumb, { backgroundColor: nextLesson.chapterColor + "25" }]}>
          <Ionicons name="play-circle" size={30} color={nextLesson.chapterColor} />
          <View style={styles.lcNextDurationBadge}>
            <Ionicons name="time-outline" size={9} color="#fff" />
            <Text style={styles.lcNextDurationText}>{estMins} min</Text>
          </View>
        </View>
        <View style={styles.lcNextBody}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 }}>
            <View style={[styles.lcNextDot, { backgroundColor: nextLesson.chapterColor }]} />
            <Text style={styles.lcNextUpNextLabel}>UP NEXT</Text>
          </View>
          <Text style={styles.lcNextChapter} numberOfLines={1}>{nextLesson.chapterTitle}</Text>
          <Text style={styles.lcNextTitle} numberOfLines={2}>{nextLesson.title}</Text>
          <TouchableOpacity
            style={styles.lcWatchBtn}
            onPress={async () => {
              await AsyncStorage.setItem(ACADEMY_PENDING_LESSON_KEY, JSON.stringify({ lessonId: nextLesson.id }));
              router.navigate({ pathname: "/(tabs)/academy" });
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="play-circle" size={13} color="#0A0A0F" />
            <Text style={styles.lcWatchBtnText}>Watch Now</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.swipeLessonStack}>
        {[...lessonCards].reverse().map((lesson, reversedIdx) => {
          const stackIndex = lessonCards.length - 1 - reversedIdx;
          return (
            <SwipeLessonCard
              key={lesson.id}
              lesson={lesson}
              stackIndex={stackIndex}
              onDismiss={() => dismissCard(lesson.id)}
              onWatch={() => {
                router.navigate({ pathname: "/(tabs)/academy" });
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

function RoutinePillContent() {
  const { routineItems, isRoutineComplete, showRoutineWidget, toggleItem } = usePlanner();
  const doneCount = ROUTINE_DISPLAY.filter((item) => routineItems[item.key]).length;
  const totalCount = ROUTINE_DISPLAY.length;

  return (
    <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 10 }}>
        <View style={styles.routineRing}>
          <Text style={styles.routineRingText}>{doneCount}/{totalCount}</Text>
          <Text style={styles.routineRingLabel}>done</Text>
        </View>
        {isRoutineComplete && (
          <View style={[styles.doneBadge, { marginLeft: 8 }]}>
            <Text style={styles.doneBadgeText}>All done ✓</Text>
          </View>
        )}
      </View>
      <View style={{ gap: 10 }}>
        {ROUTINE_DISPLAY.map((item) => {
          const done = routineItems[item.key];
          return (
            <TouchableOpacity key={item.key} style={styles.routineItem} onPress={() => toggleItem(item.key)} activeOpacity={0.7}>
              <View style={[styles.routineCheckbox, done && styles.routineCheckboxDone]}>
                {done && <Ionicons name="checkmark" size={10} color="#0A0A0F" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.routineItemLabel, done && styles.routineItemLabelDone]}>{item.label}</Text>
                <Text style={styles.routineWhyText}>{item.why}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function TodayLearnPill() {
  const router = useRouter();
  const [nextLesson, setNextLesson] = useState<{ id: string; title: string; chapterTitle: string; chapterColor: string; estMins: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(ICT_ACADEMY_PROGRESS_KEY).then((raw) => {
        let completed: Set<string>;
        try { completed = new Set(raw ? JSON.parse(raw) : []); } catch { completed = new Set(); }
        let idx = 0;
        for (const chapter of COURSE_CHAPTERS) {
          for (const lesson of chapter.lessons) {
            if (!completed.has(lesson.id)) {
              setNextLesson({ id: lesson.id, title: lesson.title, chapterTitle: chapter.title, chapterColor: chapter.color, estMins: 8 + (idx % 7) * 2 });
              return;
            }
            idx++;
          }
        }
        setNextLesson(null);
      });
    }, [])
  );

  return (
    <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
      <Text style={styles.todayLearnHint}>
        Complete your next lesson to build your trading edge day by day.
      </Text>
      {nextLesson && (
        <View style={[styles.learnPillCard, { borderColor: nextLesson.chapterColor + "40" }]}>
          <View style={[styles.learnPillThumb, { backgroundColor: nextLesson.chapterColor + "20" }]}>
            <Ionicons name="play-circle" size={28} color={nextLesson.chapterColor} />
            <View style={styles.learnPillDurationBadge}>
              <Ionicons name="time-outline" size={9} color="#fff" />
              <Text style={styles.learnPillDurationText}>{nextLesson.estMins} min</Text>
            </View>
          </View>
          <View style={styles.learnPillBody}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <View style={[styles.learnPillDot, { backgroundColor: nextLesson.chapterColor }]} />
              <Text style={styles.learnPillUpNext}>UP NEXT</Text>
            </View>
            <Text style={styles.learnPillChapter} numberOfLines={1}>{nextLesson.chapterTitle}</Text>
            <Text style={styles.learnPillTitle} numberOfLines={2}>{nextLesson.title}</Text>
          </View>
        </View>
      )}
      <TouchableOpacity
        style={styles.todayLearnBtn}
        onPress={() => {
          router.navigate({ pathname: "/(tabs)/academy" });
        }}
        activeOpacity={0.85}
      >
        <Ionicons name="school-outline" size={14} color="#0A0A0F" />
        <Text style={styles.todayLearnBtnText}>{nextLesson ? "Watch Now" : "Open Academy"}</Text>
      </TouchableOpacity>
    </View>
  );
}

type TodayPill = "routine" | "sessions" | "learn";

function TodayRoutineWidget() {
  const [pill, setPill] = useState<TodayPill>("routine");
  const router = useRouter();
  const { showRoutineWidget } = usePlanner();
  if (!showRoutineWidget) return null;

  const PILLS: { key: TodayPill; label: string }[] = [
    { key: "routine", label: "Routine" },
    { key: "sessions", label: "Sessions" },
    { key: "learn", label: "Learn" },
  ];

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="today-outline" size={14} color="#F59E0B" />
        <Text style={styles.cardLabel}>Today's Routine</Text>
      </View>
      <View style={styles.todayPillBar}>
        {PILLS.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.todayPill, pill === p.key && styles.todayPillActive]}
            onPress={() => setPill(p.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.todayPillText, pill === p.key && styles.todayPillTextActive]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {pill === "routine" && (
        <RoutinePillContent />
      )}
      {pill === "sessions" && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
          {SESSIONS.map((session) => (
            <View key={session.name} style={styles.todaySessionRow}>
              <View style={[styles.todaySessionDot, { backgroundColor: session.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.todaySessionName}>{session.name}</Text>
                <Text style={styles.todaySessionTime}>{session.subtitle}</Text>
              </View>
              <Ionicons name={session.icon} size={16} color={session.color} />
            </View>
          ))}
        </View>
      )}
      {pill === "learn" && (
        <TodayLearnPill />
      )}
    </View>
  );
}

function NextWatchCard() {
  const router = useRouter();
  const [nextLesson, setNextLesson] = useState<{ id: string; title: string; chapterTitle: string; chapterColor: string; estMins: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(ICT_ACADEMY_PROGRESS_KEY).then((raw) => {
        let completed: Set<string>;
        try {
          completed = new Set(raw ? JSON.parse(raw) : []);
        } catch {
          completed = new Set();
        }
        let lessonIndex = 0;
        for (const chapter of COURSE_CHAPTERS) {
          for (const lesson of chapter.lessons) {
            if (!completed.has(lesson.id)) {
              const estMins = 8 + (lessonIndex % 7) * 2;
              setNextLesson({ id: lesson.id, title: lesson.title, chapterTitle: chapter.title, chapterColor: chapter.color, estMins });
              return;
            }
            lessonIndex++;
          }
        }
        setNextLesson(null);
      });
    }, [])
  );

  if (!nextLesson) return null;

  return (
    <View style={styles.nextWatchCard}>
      <View style={[styles.nextWatchThumb, { backgroundColor: nextLesson.chapterColor + "30" }]}>
        <Ionicons name="play-circle" size={32} color={nextLesson.chapterColor} />
        <View style={styles.nextWatchDurationBadge}>
          <Ionicons name="time-outline" size={9} color="#fff" />
          <Text style={styles.nextWatchDurationText}>{nextLesson.estMins} min</Text>
        </View>
      </View>
      <View style={styles.nextWatchBody}>
        <View style={styles.nextWatchHeader}>
          <View style={[styles.nextWatchDot, { backgroundColor: nextLesson.chapterColor }]} />
          <Text style={styles.nextWatchLabel}>UP NEXT</Text>
        </View>
        <Text style={styles.nextWatchChapter} numberOfLines={1}>{nextLesson.chapterTitle}</Text>
        <Text style={styles.nextWatchTitle} numberOfLines={2}>{nextLesson.title}</Text>
        <TouchableOpacity
          style={styles.nextWatchBtn}
          onPress={() => {
            router.navigate({ pathname: "/(tabs)/academy" });
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="play-circle" size={16} color="#0A0A0F" />
          <Text style={styles.nextWatchBtnText}>Watch Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function LearningProgressCard() {
  const router = useRouter();
  const [progress, setProgress] = useState<{ completed: number; total: number; nextTitle: string; nextChapter: string } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let total = 0;
      for (const ch of COURSE_CHAPTERS) total += ch.lessons.length;

      AsyncStorage.getItem(ICT_ACADEMY_PROGRESS_KEY).then((raw) => {
        let completed: Set<string>;
        try {
          completed = new Set(raw ? JSON.parse(raw) : []);
        } catch {
          completed = new Set();
        }
        let nextTitle = "";
        let nextChapter = "";
        for (const chapter of COURSE_CHAPTERS) {
          for (const lesson of chapter.lessons) {
            if (!completed.has(lesson.id)) {
              nextTitle = lesson.title;
              nextChapter = chapter.title;
              break;
            }
          }
          if (nextTitle) break;
        }
        setProgress({ completed: completed.size, total, nextTitle, nextChapter });
      });
    }, [])
  );

  if (!progress) return null;

  const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="school-outline" size={14} color={C.accent} />
        <Text style={styles.cardLabel}>Learning Progress</Text>
        <TouchableOpacity onPress={() => router.navigate({ pathname: "/(tabs)/academy" })} activeOpacity={0.7} style={{ marginLeft: "auto" }}>
          <Text style={styles.editLink}>Academy ↗</Text>
        </TouchableOpacity>
      </View>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 10 }}>
        <View style={styles.lpStatRow}>
          <View style={styles.lpStat}>
            <Text style={[styles.lpStatValue, { color: C.accent }]}>{pct}%</Text>
            <Text style={styles.lpStatLabel}>Complete</Text>
          </View>
          <View style={styles.lpStat}>
            <Text style={[styles.lpStatValue, { color: C.text }]}>{progress.completed}/{progress.total}</Text>
            <Text style={styles.lpStatLabel}>Lessons</Text>
          </View>
        </View>
        <View style={styles.lpProgressBar}>
          <View style={[styles.lpProgressFill, { flexBasis: `${pct}%` }]} />
        </View>
        {progress.nextTitle ? (
          <View style={styles.lpNextRow}>
            <Ionicons name="play-circle-outline" size={13} color={C.accent} />
            <Text style={styles.lpNextText} numberOfLines={1}>Next: {progress.nextTitle}</Text>
          </View>
        ) : (
          <Text style={styles.lpCompleteText}>All lessons complete!</Text>
        )}
        <View style={styles.lpUnlockBanner}>
          <Ionicons name="lock-open-outline" size={12} color={C.accent} />
          <Text style={styles.lpUnlockText}>Complete all lessons to unlock Full Mode</Text>
        </View>
        <TouchableOpacity style={styles.lpUpgradeBtn} onPress={() => router.navigate({ pathname: "/(tabs)/academy" })} activeOpacity={0.85}>
          <Text style={styles.lpUpgradeBtnText}>Continue Learning</Text>
          <Ionicons name="arrow-forward" size={13} color="#0A0A0F" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function RiskShieldLockCard() {
  const { setAppMode } = useAuth();
  const { data: account } = useGetPropAccount();
  const hasAccount = account && account.startingBalance > 0;

  if (hasAccount) {
    const bal = account.startingBalance ?? 0;
    const drawdown = account.maxDailyLoss ?? 0;
    const drawdownPct = bal > 0 ? Math.round((drawdown / bal) * 100) : 0;
    return (
      <View style={[styles.card, { borderColor: "#00C89620" }]}>
        <View style={styles.cardHeaderRow}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#00C896" />
          <Text style={styles.cardLabel}>Risk Shield</Text>
          <TouchableOpacity onPress={() => setAppMode("full")} activeOpacity={0.7} style={{ marginLeft: "auto" }}>
            <Text style={styles.editLink}>Full Mode ↗</Text>
          </TouchableOpacity>
        </View>
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={styles.lpStat}>
              <Text style={[styles.lpStatValue, { color: "#00C896", fontSize: 16 }]}>${bal.toLocaleString()}</Text>
              <Text style={styles.lpStatLabel}>Balance</Text>
            </View>
            <View style={styles.lpStat}>
              <Text style={[styles.lpStatValue, { color: "#EF4444", fontSize: 16 }]}>{drawdownPct}%</Text>
              <Text style={styles.lpStatLabel}>Max Daily DD</Text>
            </View>
          </View>
          <View style={[styles.lpUnlockBanner, { borderColor: "#00C89620", backgroundColor: "#00C89610" }]}>
            <Ionicons name="shield-checkmark" size={12} color="#00C896" />
            <Text style={[styles.lpUnlockText, { color: "#00C896" }]}>Risk Shield active — switch to Full Mode to manage</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.card, { borderColor: "#EF444420" }]}>
      <View style={styles.riskLockInner}>
        <View style={styles.riskLockIconRow}>
          <View style={styles.riskLockIcon}>
            <Ionicons name="shield-outline" size={28} color="#EF4444" />
            <View style={styles.riskLockBadge}>
              <Ionicons name="lock-closed" size={10} color={C.background} />
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.riskLockTitle}>Risk Shield</Text>
            <Text style={styles.riskLockSubtitle}>Activate your first prop firm account to unlock Risk Shield</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.riskLockBtn} onPress={() => setAppMode("full")} activeOpacity={0.8}>
          <Text style={styles.riskLockBtnText}>Switch to Full Mode to set up</Text>
          <Ionicons name="chevron-forward" size={14} color={C.accent} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface CommunityPost {
  id: number;
  content: string;
  authorName: string;
  createdAt: string;
  likesCount: number;
}

function LearningCommunityWidget() {
  const router = useRouter();
  const [posts, setPosts] = useState<CommunityPost[]>([]);

  useFocusEffect(
    useCallback(() => {
      apiGet<CommunityPost[] | { posts: CommunityPost[] }>("community/posts?limit=3")
        .then((data) => {
          if (Array.isArray(data)) setPosts(data.slice(0, 3));
          else if (data && Array.isArray((data as { posts: CommunityPost[] }).posts)) {
            setPosts((data as { posts: CommunityPost[] }).posts.slice(0, 3));
          }
        })
        .catch(() => {});
    }, [])
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <Ionicons name="people-outline" size={14} color="#818CF8" />
        <Text style={styles.cardLabel}>Community</Text>
        <TouchableOpacity onPress={() => router.navigate({ pathname: "/(tabs)/community" })} activeOpacity={0.7} style={{ marginLeft: "auto" }}>
          <Text style={styles.editLink}>See all ↗</Text>
        </TouchableOpacity>
      </View>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
        {posts.length === 0 ? (
          <Text style={{ fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular" }}>
            No posts yet. Be the first to share!
          </Text>
        ) : (
          posts.map((post) => {
            const text = post.content ?? "";
            const excerpt = text.length > 80 ? text.slice(0, 80) + "…" : text;
            const diff = Date.now() - new Date(post.createdAt).getTime();
            const mins = Math.floor(diff / 60000);
            const timeStr = mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`;
            return (
              <TouchableOpacity
                key={post.id}
                style={styles.communityPostItem}
                onPress={() => router.navigate({ pathname: "/(tabs)/community" })}
                activeOpacity={0.7}
              >
                <View style={styles.communityPostAvatar}>
                  <Text style={styles.communityPostAvatarText}>{post.authorName?.charAt(0)?.toUpperCase() || "?"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                    <Text style={styles.communityPostAuthor} numberOfLines={1}>{post.authorName}</Text>
                    {post.createdAt ? <Text style={styles.communityPostTime}>{timeStr}</Text> : null}
                  </View>
                  <Text style={styles.communityPostContent}>{excerpt}</Text>
                </View>
                <View style={styles.communityPostLikes}>
                  <Ionicons name="heart" size={11} color="#EF4444" />
                  <Text style={styles.communityPostLikesText}>{post.likesCount ?? 0}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>
    </View>
  );
}

function CustomizeModal({
  visible,
  onClose,
  prefs,
  onToggle,
}: {
  visible: boolean;
  onClose: () => void;
  prefs: WidgetPrefs;
  onToggle: (key: keyof WidgetPrefs) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose} />
      <View style={[styles.modalSheet, { maxHeight: "80%" }]}>
        <View style={styles.modalHandle} />
        <View style={styles.customizeHeader}>
          <View>
            <Text style={styles.modalTitle}>Customize Dashboard</Text>
            <Text style={styles.modalSubtitle}>Toggle widgets on or off</Text>
          </View>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close" size={22} color={C.textSecondary} />
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {WIDGET_CONFIG.map((widget, i) => (
            <View
              key={widget.key}
              style={[
                styles.customizeRow,
                i < WIDGET_CONFIG.length - 1 && { borderBottomWidth: 1, borderBottomColor: C.cardBorder + "60" },
              ]}
            >
              <View style={styles.customizeIconBox}>
                <Ionicons name={widget.icon} size={18} color={C.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.customizeLabel}>{widget.label}</Text>
                <Text style={styles.customizeDesc}>{widget.desc}</Text>
              </View>
              <Switch
                value={prefs[widget.key]}
                onValueChange={() => onToggle(widget.key)}
                trackColor={{ false: C.cardBorder, true: C.accent + "60" }}
                thumbColor={prefs[widget.key] ? C.accent : C.textTertiary}
                ios_backgroundColor={C.cardBorder}
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function DashboardScreen() {
  const scrollCollapseProps = useScrollCollapseProps();
  const { user } = useAuth();
  const router = useRouter();
  const firstName = user?.name?.split(" ")?.[0] || "Trader";
  const { xp, streak } = useDailyGamification();
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;
  const { data: apiTrades } = useListTrades();
  const { data: propAccount } = useGetPropAccount();
  const briefingTrades = (apiTrades || []) as Array<{
    outcome?: string | null;
    pnl?: string | number | null;
    createdAt?: string | null;
    isDraft?: boolean | null;
  }>;
  const startingBalance = propAccount?.startingBalance ?? 0;
  const currentBalance = propAccount?.currentBalance ?? startingBalance;
  const briefingDrawdownPct = startingBalance > 0 ? ((startingBalance - currentBalance) / startingBalance) * 100 : 0;

  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [prefs, setPrefs] = useState<WidgetPrefs>(DEFAULT_WIDGET_PREFS);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showCustomize, setShowCustomize] = useState(false);
  const [showPnLCalendar, setShowPnLCalendar] = useState(false);
  const { fetchSignals } = useMobileLiveSignals();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        qc.invalidateQueries({ queryKey: [`/api/trades`] }),
        fetchSignals(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [qc, fetchSignals]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const raw = await AsyncStorage.getItem(WIDGET_PREFS_KEY);
        let localPrefs = DEFAULT_WIDGET_PREFS;
        if (raw) {
          try { localPrefs = { ...DEFAULT_WIDGET_PREFS, ...JSON.parse(raw) }; } catch {}
        }
        setPrefs(localPrefs);

        try {
          const res = await apiGet<{ widgetPrefs?: Record<string, boolean> | null }>("user-settings");
          if (res.widgetPrefs && typeof res.widgetPrefs === "object") {
            const merged = { ...DEFAULT_WIDGET_PREFS, ...res.widgetPrefs } as WidgetPrefs;
            setPrefs(merged);
            AsyncStorage.setItem(WIDGET_PREFS_KEY, JSON.stringify(merged));
          }
        } catch {}
      })();
    }, [])
  );

  async function toggleWidget(key: keyof WidgetPrefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    await AsyncStorage.setItem(WIDGET_PREFS_KEY, JSON.stringify(next));
    try {
      const { apiPatch } = await import("@/lib/api");
      apiPatch("user-settings", { section: "widgetPrefs", data: { prefs: next } }).catch(() => {});
    } catch {}
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <AchievementsModal
        visible={showAchievements}
        onClose={() => setShowAchievements(false)}
        xp={xp}
        streak={streak}
      />
      <CustomizeModal
        visible={showCustomize}
        onClose={() => setShowCustomize(false)}
        prefs={prefs}
        onToggle={toggleWidget}
      />
      <PnLCalendarBottomSheet
        visible={showPnLCalendar}
        onClose={() => setShowPnLCalendar(false)}
      />


      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.accent} />
        }
        {...scrollCollapseProps}
      >
        {/* Stats strip — always visible, sits above all other content */}
        <StatsStripWidget onCalendarPress={() => setShowPnLCalendar(true)} />

        {/* AI Morning Briefing — shows once per day, auto-dismisses after 15s */}
        <MorningBriefingWidget
          firstName={firstName}
          trades={briefingTrades}
          drawdownPct={briefingDrawdownPct}
          userId={user?.id}
        />

            {/* Full Mode Dashboard */}
            <AIGreetingCard />

            {/* Cumulative P&L Chart */}
            <MobileCumulativePnLChart />

            {/* Last Trade Grade */}
            <MobileLastTradeGradeCard />

            {/* Live Market Prices Strip */}
            {prefs.liveprices && (
              <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                <LivePriceStripWidget />
              </View>
            )}

            {/* Kill Zone Countdown */}
            {prefs.killzonetimer && (
              <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                <KillZoneCountdownWidget />
              </View>
            )}

            {/* Open Trade Card */}
            {prefs.opentrade && (
              <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                <OpenTradeCardWidget />
              </View>
            )}

            {/* Daily Risk Gauge */}
            {prefs.riskgauge && (
              <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
                <DailyRiskGaugeWidget />
              </View>
            )}


            <NextWatchCard />

            {/* Quick Journal */}
            {prefs.quickJournal && <QuickJournalWidget />}

            {/* Notes */}
            {prefs.notes && <NotesWidget />}

        <View style={{ height: Platform.OS === "ios" ? 100 : 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: { flex: 1 },
  content: { padding: 16 },

  statsStrip: {
    marginHorizontal: -16,
    marginTop: -16,
    marginBottom: 12,
    borderRadius: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    backgroundColor: C.backgroundSecondary,
    borderColor: C.cardBorder,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },


  widgetHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  widgetHeaderLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    flex: 1,
  },
  editLink: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: C.accent,
  },

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
  avatarLabel: { fontSize: 11, color: C.textSecondary, fontFamily: "Inter_500Medium" },

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
    fontSize: 13,
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

  biasChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  biasChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "transparent",
  },
  biasChipEmoji: {
    fontSize: 14,
    lineHeight: 18,
  },
  biasChipText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
  },
  keyLevelsRow: {
    gap: 4,
  },
  keyLevelChip: {
    backgroundColor: "#818CF815",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#818CF830",
    alignSelf: "flex-start",
  },
  keyLevelText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: "#818CF8",
  },
  biasSummary: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 4,
  },
  biasBadge: {
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 4,
  },
  biasBadgeText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  planDetailText: {
    fontSize: 11,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 0,
  },
  statDivider: {
    width: 1,
    backgroundColor: C.cardBorder,
    marginVertical: 2,
  },
  statPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  statLabel: {
    fontSize: 11,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },

  routineContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 14,
  },
  routineRing: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    borderColor: C.accent + "40",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.backgroundTertiary,
    flexShrink: 0,
  },
  routineRingText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: C.accent,
  },
  routineRingLabel: {
    fontSize: 11,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  routineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 3,
  },
  routineCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: C.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  routineCheckboxDone: {
    backgroundColor: C.accent,
    borderColor: C.accent,
  },
  routineItemLabel: {
    fontSize: 12,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  routineItemLabelDone: {
    color: C.textTertiary,
    textDecorationLine: "line-through",
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 10,
  },
  ruleRowBorder: {
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
  },
  ruleNum: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#F59E0B20",
    textAlign: "center",
    lineHeight: 18,
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#F59E0B",
    overflow: "hidden",
  },
  ruleText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: C.text,
    lineHeight: 19,
  },
  doneBadge: {
    backgroundColor: C.accent + "20",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  doneBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: C.accent,
  },

  journalInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingBottom: 8,
  },
  journalInput: {
    flex: 1,
    backgroundColor: C.backgroundTertiary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: C.text,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  journalSaved: {
    fontSize: 11,
    color: "#00C896",
    fontFamily: "Inter_600SemiBold",
    flexShrink: 0,
  },
  journalLogBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexShrink: 0,
  },
  journalLogBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#0A0A0F",
  },
  journalNote: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 6,
  },
  journalNoteDot: {
    fontSize: 12,
    color: C.textSecondary,
  },
  journalNoteText: {
    flex: 1,
    fontSize: 11,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
  },

  checklistBadge: {
    backgroundColor: C.backgroundTertiary,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  checklistBadgeDone: {
    backgroundColor: "#00C89620",
    borderColor: "#00C89640",
  },
  checklistBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: C.textSecondary,
  },
  checklistBadgeTextDone: {
    color: "#00C896",
  },
  checklistStatusBar: {
    marginHorizontal: 14,
    marginBottom: 14,
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: C.backgroundTertiary,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  checklistStatusBarDone: {
    backgroundColor: "#00C89615",
    borderColor: "#00C89630",
  },
  checklistStatusText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: C.textSecondary,
  },
  checklistStatusTextDone: {
    color: "#00C896",
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
    fontSize: 11,
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
    fontSize: 11,
    color: C.textSecondary,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
  riskStatLimit: {
    fontSize: 11,
    color: C.textTertiary,
    fontFamily: "Inter_400Regular",
  },
  riskDivider: {
    width: 1,
    backgroundColor: C.cardBorder,
    marginHorizontal: 8,
  },

  posSizer: {
    marginHorizontal: 14,
    marginBottom: 14,
    backgroundColor: C.backgroundTertiary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 12,
  },
  posSizerTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  posSizerRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  posSizerField: {
    flex: 1,
  },
  posSizerLabel: {
    fontSize: 11,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
    marginBottom: 4,
  },
  posSizerInput: {
    backgroundColor: C.backgroundSecondary,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 7,
    fontSize: 12,
    color: C.text,
    fontFamily: "Inter_400Regular",
  },
  posSizerResultRow: {
    flexDirection: "row",
    gap: 8,
  },
  posSizerResult: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.backgroundSecondary,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  posSizerResultLabel: {
    fontSize: 11,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  posSizerResultValue: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: C.textSecondary,
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

  customizeHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  customizeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
  },
  customizeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.accent + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  customizeLabel: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  customizeDesc: {
    fontSize: 11,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
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

  lcProgressRow: {
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  lcProgressText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: C.textSecondary,
  },
  lcProgressDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: C.textSecondary,
  },
  lcProgressBar: {
    height: 4,
    backgroundColor: C.backgroundTertiary,
    borderRadius: 2,
    overflow: "hidden",
  },
  lcProgressFill: {
    height: 4,
    backgroundColor: C.accent,
    borderRadius: 2,
  },
  lcNextCard: {
    flexDirection: "row",
    marginHorizontal: 14,
    marginBottom: 14,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
  },
  lcNextThumb: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  lcNextDurationBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 5,
  },
  lcNextDurationText: { fontSize: 10, color: "#fff", fontFamily: "Inter_600SemiBold" },
  lcNextBody: { flex: 1, padding: 10, justifyContent: "center" },
  lcNextDot: { width: 6, height: 6, borderRadius: 3 },
  lcNextUpNextLabel: { fontSize: 10, fontFamily: "Inter_700Bold", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 1 },
  lcNextChapter: { fontSize: 11, color: C.textSecondary, fontFamily: "Inter_400Regular", marginBottom: 1 },
  lcNextTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text, lineHeight: 18, marginBottom: 8 },
  lcWatchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    backgroundColor: C.accent,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: "flex-start",
  },
  lcWatchBtnText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#0A0A0F" },

  nextWatchCard: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.accent + "30",
    marginBottom: 14,
    overflow: "hidden",
  },
  nextWatchThumb: {
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  nextWatchDurationBadge: {
    position: "absolute",
    bottom: 8,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  nextWatchDurationText: { fontSize: 11, color: "#fff", fontFamily: "Inter_600SemiBold" },
  nextWatchBody: { padding: 14 },
  nextWatchHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  nextWatchDot: { width: 8, height: 8, borderRadius: 4 },
  nextWatchLabel: { fontSize: 11, fontFamily: "Inter_700Bold", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 1.2 },
  nextWatchChapter: { fontSize: 11, color: C.textSecondary, fontFamily: "Inter_500Medium", marginBottom: 2 },
  nextWatchTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 12, lineHeight: 22 },
  nextWatchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 10,
  },
  nextWatchBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#0A0A0F" },

  lpStatRow: { flexDirection: "row", gap: 0 },
  lpStat: { flex: 1, alignItems: "center" },
  lpStatValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text },
  lpStatLabel: { fontSize: 11, color: C.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 },
  lpProgressBar: {
    height: 6,
    backgroundColor: C.backgroundTertiary,
    borderRadius: 3,
    overflow: "hidden",
  },
  lpProgressFill: {
    height: 6,
    backgroundColor: C.accent,
    borderRadius: 3,
  },
  lpNextRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  lpNextText: { flex: 1, fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular" },
  lpCompleteText: { fontSize: 12, color: "#00C896", fontFamily: "Inter_600SemiBold" },
  lpUnlockBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.accent + "10",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: C.accent + "20",
  },
  lpUnlockText: { fontSize: 11, color: C.accent, fontFamily: "Inter_500Medium", flex: 1 },
  lpUpgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 10,
    marginTop: 4,
  },
  lpUpgradeBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#0A0A0F" },

  riskLockInner: { padding: 14 },
  riskLockIconRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 12 },
  riskLockIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: "#EF444415", alignItems: "center", justifyContent: "center", position: "relative", flexShrink: 0 },
  riskLockBadge: { position: "absolute", bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: "#EF4444", alignItems: "center", justifyContent: "center" },
  riskLockTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 2 },
  riskLockSubtitle: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 17 },
  riskLockBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.backgroundTertiary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.accent + "25",
  },
  riskLockBtnText: { fontSize: 12, color: C.accent, fontFamily: "Inter_600SemiBold" },

  communityPostItem: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  communityPostAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#818CF820", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  communityPostAvatarText: { fontSize: 12, fontFamily: "Inter_700Bold", color: "#818CF8" },
  communityPostAuthor: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.text, flex: 1 },
  communityPostContent: { fontSize: 11, color: C.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 16 },
  communityPostTime: { fontSize: 11, color: C.textTertiary, fontFamily: "Inter_400Regular", flexShrink: 0 },
  communityPostLikes: { flexDirection: "row", alignItems: "center", gap: 3, flexShrink: 0 },
  communityPostLikesText: { fontSize: 11, color: C.textSecondary, fontFamily: "Inter_500Medium" },

  routineWhyText: { fontSize: 11, color: C.textTertiary, fontFamily: "Inter_400Regular", lineHeight: 14, marginTop: 1 },

  lessonCard: {
    width: 148,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
    gap: 4,
    flexShrink: 0,
  },
  lessonCardDone: { borderColor: "#00C89630", backgroundColor: "#00C89608" },
  lessonCardDismiss: { position: "absolute", top: 6, right: 6, padding: 2 },
  lessonCardDot: { width: 8, height: 8, borderRadius: 4, marginBottom: 2, marginTop: 12 },
  lessonCardChapter: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  lessonCardTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.text, lineHeight: 16, flex: 1 },
  lessonCardDoneBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  lessonCardDoneText: { fontSize: 11, color: "#00C896", fontFamily: "Inter_600SemiBold" },
  lessonCardPlayRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  lessonCardPlayText: { fontSize: 11, color: C.accent, fontFamily: "Inter_600SemiBold" },

  swipeLessonStack: {
    height: 170,
    marginHorizontal: 14,
    marginBottom: 14,
    position: "relative",
  },
  swipeLessonCard: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  swipeLessonTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: C.text, lineHeight: 20 },
  swipeLessonTeaser: { fontSize: 11, color: C.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 16, marginTop: 2 },
  swipeLessonActions: { flexDirection: "row", gap: 8, marginTop: 10 },
  swipeLessonSkip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: C.backgroundTertiary,
  },
  swipeLessonSkipText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.textSecondary },
  swipeLessonWatch: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 7,
    borderRadius: 8,
  },
  swipeLessonWatchText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#0A0A0F" },

  todayPillBar: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  todayPill: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: C.backgroundTertiary,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  todayPillActive: { backgroundColor: C.accent, borderColor: C.accent },
  todayPillText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.textSecondary },
  todayPillTextActive: { color: "#0A0A0F" },

  todaySessionRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  todaySessionDot: { width: 8, height: 8, borderRadius: 4 },
  todaySessionName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text },
  todaySessionTime: { fontSize: 11, color: C.textSecondary, fontFamily: "Inter_400Regular" },

  learnPillCard: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
    backgroundColor: C.backgroundSecondary,
  },
  learnPillThumb: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingVertical: 12,
  },
  learnPillDurationBadge: {
    position: "absolute",
    bottom: 4,
    right: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  learnPillDurationText: { fontSize: 11, color: "#fff", fontFamily: "Inter_600SemiBold" },
  learnPillBody: { flex: 1, padding: 10, justifyContent: "center" },
  learnPillDot: { width: 6, height: 6, borderRadius: 3 },
  learnPillUpNext: { fontSize: 11, fontFamily: "Inter_700Bold", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 1 },
  learnPillChapter: { fontSize: 11, color: C.textSecondary, fontFamily: "Inter_500Medium" },
  learnPillTitle: { fontSize: 12, fontFamily: "Inter_700Bold", color: C.text, lineHeight: 16 },

  todayLearnHint: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 18 },
  todayLearnBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 10,
  },
  todayLearnBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#0A0A0F" },

  checklistPillBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  checklistPillText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: C.textSecondary,
    flex: 1,
  },
});

const mobileChartStyles = StyleSheet.create({
  card: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    marginHorizontal: 0,
    marginBottom: 12,
    overflow: "hidden",
  },
  badge: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: "auto",
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  emptyBox: {
    height: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
  },
  gradeBox: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeText: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
});

