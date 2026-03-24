import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useListTrades, useCreateTrade, useDeleteTrade } from "@workspace/api-client-react";
import type { Trade } from "@workspace/api-client-react";
import { usePlanner } from "@/contexts/PlannerContext";
import { fireMobileAITrigger } from "@/lib/aiTrigger";
import { isSessionExpiredError } from "@/lib/api";
import { useScrollCollapseProps } from "@/contexts/ScrollDirectionContext";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const C = Colors.dark;

type BehaviorTag = "FOMO" | "Chased" | "Disciplined" | "Greedy" | "Revenge" | "Angry" | "Overtrading";
type OutcomeType = "win" | "loss" | "breakeven" | "";

const BEHAVIOR_TAGS: { tag: BehaviorTag; label: string; color: string; icon: string }[] = [
  { tag: "Disciplined", label: "I followed my plan", color: "#00C896", icon: "shield-checkmark-outline" },
  { tag: "FOMO", label: "I jumped in too fast", color: "#F59E0B", icon: "flash-outline" },
  { tag: "Chased", label: "I entered late", color: "#818CF8", icon: "trending-up-outline" },
  { tag: "Revenge", label: "I traded to get back losses", color: "#FB923C", icon: "alert-circle-outline" },
  { tag: "Greedy", label: "I held too long", color: "#EF4444", icon: "flame-outline" },
  { tag: "Angry", label: "I traded while upset", color: "#F43F5E", icon: "sad-outline" },
  { tag: "Overtrading", label: "I took too many trades", color: "#A78BFA", icon: "repeat-outline" },
];

const NQ_PAIRS = ["NQ1!", "MNQ1!", "ES1!", "MES1!", "RTY1!", "YM1!"];


interface TradeFormData {
  pair: string;
  entryTime: string;
  riskPct: string;
  outcome: OutcomeType;
  notes: string;
  behaviorTag: BehaviorTag | "";
  stressLevel: number;
  sideDirection: "BUY" | "SELL" | "";
  tradingSession: string;
  entryPrice: string;
}

const DEFAULT_FORM: TradeFormData = {
  pair: "NQ1!",
  entryTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
  riskPct: "0.5",
  outcome: "",
  notes: "",
  behaviorTag: "",
  stressLevel: 5,
  sideDirection: "",
  tradingSession: "",
  entryPrice: "",
};

function calculateSetupScore(stressLevel: number, riskPct: number): number {
  let score = 40;
  if (stressLevel <= 5) score += 30;
  else if (stressLevel <= 7) score += 15;
  if (riskPct <= 1) score += 30;
  else if (riskPct <= 2) score += 15;
  return Math.min(100, Math.max(0, score));
}

function getScoreColor(score: number): string {
  if (score >= 70) return "#22C55E";
  if (score >= 50) return "#F59E0B";
  return "#EF4444";
}

function StressSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const levels = Array.from({ length: 10 }, (_, i) => i + 1);
  return (
    <View style={sliderStyles.container}>
      <Text style={sliderStyles.label}>Stress Level: <Text style={{ color: value <= 3 ? "#00C896" : value <= 6 ? "#F59E0B" : "#EF4444", fontFamily: "Inter_700Bold" }}>{value}/10</Text></Text>
      <View style={sliderStyles.dots}>
        {levels.map((l) => (
          <TouchableOpacity
            key={l}
            style={[
              sliderStyles.dot,
              l <= value && {
                backgroundColor: l <= 3 ? "#00C896" : l <= 6 ? "#F59E0B" : "#EF4444",
              },
            ]}
            onPress={() => onChange(l)}
          />
        ))}
      </View>
      <View style={sliderStyles.labels}>
        <Text style={sliderStyles.labelText}>Calm</Text>
        <Text style={sliderStyles.labelText}>Stressed</Text>
      </View>
    </View>
  );
}

const TILT_COOLDOWN_KEY = "ict-tilt-cooldown-end";
const NEGATIVE_TAGS = ["FOMO", "Chased", "Revenge", "Greedy", "Angry", "Overtrading"];

export default function JournalScreen() {
  const scrollCollapseProps = useScrollCollapseProps();
  const { user, appMode, tierLevel } = useAuth();
  const router = useRouter();
  const { new: newParam } = useLocalSearchParams<{ new?: string }>(); 
  const { isRoutineComplete, routineCompletedToday, routineItems, plannerLoaded } = usePlanner();
  const qc = useQueryClient();
  const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "http://localhost:8080/api";

  const [showForm, setShowForm] = useState(false);
  const [isMonkMode, setIsMonkMode] = useState(false);
  const [form, setForm] = useState<TradeFormData>({ ...DEFAULT_FORM });
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [userDefaultPair, setUserDefaultPair] = useState<string>("");
  const [userDefaultRisk, setUserDefaultRisk] = useState<string>("0.5");
  const [prevDraftCount, setPrevDraftCount] = useState<number>(-1);
  const [expandedTradeId, setExpandedTradeId] = useState<number | null>(null);
  const [coachLoading, setCoachLoading] = useState<Record<number, boolean>>({});
  const [coachFeedback, setCoachFeedback] = useState<Record<number, string>>({});
  type TradeReflection = { criteria: string; setup: string; notes: string };
  const [reflections, setReflections] = useState<Record<number, TradeReflection>>({});
  const [reflectionEditing, setReflectionEditing] = useState<number | null>(null);
  const [reflectionDraft, setReflectionDraft] = useState<TradeReflection>({ criteria: "", setup: "", notes: "" });
  const [showSitOutWarning, setShowSitOutWarning] = useState(false);
  const [showTiltCooldown, setShowTiltCooldown] = useState(false);
  const [tiltCooldownEnd, setTiltCooldownEnd] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await qc.invalidateQueries({ queryKey: [`/api/trades`] });
    } finally {
      setRefreshing(false);
    }
  }, [qc]);

  useEffect(() => {
    AsyncStorage.getItem(TILT_COOLDOWN_KEY).then((stored) => {
      if (stored) {
        const end = parseInt(stored, 10);
        if (end > Date.now()) {
          setTiltCooldownEnd(end);
          setShowTiltCooldown(true);
        } else {
          AsyncStorage.removeItem(TILT_COOLDOWN_KEY);
        }
      }
    });
  }, []);

  useEffect(() => {
    AsyncStorage.getItem("trade_reflections_v1").then((raw) => {
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          const migrated: Record<number, { criteria: string; setup: string; notes: string }> = {};
          for (const key of Object.keys(parsed)) {
            const val = parsed[key];
            if (typeof val === "string") {
              migrated[Number(key)] = { criteria: "", setup: "", notes: val };
            } else {
              migrated[Number(key)] = val;
            }
          }
          setReflections(migrated);
        } catch { /* */ }
      }
    });
  }, []);

  function saveReflection(tradeId: number, draft: { criteria: string; setup: string; notes: string }) {
    const next = { ...reflections, [tradeId]: draft };
    setReflections(next);
    AsyncStorage.setItem("trade_reflections_v1", JSON.stringify(next));
    setReflectionEditing(null);
    setReflectionDraft({ criteria: "", setup: "", notes: "" });
  }

  useEffect(() => {
    if (user) {
      fetch(`${API_BASE}/user/settings`, { credentials: "include" })
        .then((r) => r.json())
        .then((data) => {
          if (data.tradingDefaults?.defaultPairs) {
            const firstPair = data.tradingDefaults.defaultPairs.split(",")?.[0]?.trim();
            if (firstPair) setUserDefaultPair(firstPair);
          }
          if (data.tradingDefaults?.defaultRiskPct) {
            setUserDefaultRisk(data.tradingDefaults.defaultRiskPct);
          }
        })
        .catch(() => {});
    }
  }, [user]);

  useEffect(() => {
    AsyncStorage.getItem("planner_journal_draft").then((raw) => {
      if (!raw) return;
      try {
        const draft = JSON.parse(raw);
        AsyncStorage.removeItem("planner_journal_draft");
        setForm((prev) => ({
          ...prev,
          pair: draft.pair || prev.pair,
          notes: [draft.notes || "", draft.voiceNoteUri ? `[Voice note: ${draft.voiceNoteUri}]` : ""].filter(Boolean).join("\n"),
        }));
        setShowForm(true);
        Alert.alert("Plan Loaded", "Your pre-trade plan has been loaded into the journal form.");
      } catch {}
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (newParam === "1") {
        router.setParams({ new: "" } as never);
        openNewForm();
      }
    }, [newParam])
  );

  const { data: tradesData } = useListTrades();
  const trades = (tradesData ?? []).filter(Boolean);
  const { mutateAsync: createTradeMut } = useCreateTrade();
  const { mutateAsync: deleteTradeMut } = useDeleteTrade();

  const draftTrades = trades.filter((t) => t.isDraft);
  const completedTrades = trades.filter((t) => !t.isDraft);

  useEffect(() => {
    const currentCount = draftTrades.length;
    if (prevDraftCount >= 0 && currentCount > prevDraftCount) {
      const newCount = currentCount - prevDraftCount;
      Alert.alert(
        `${newCount} New Draft Trade${newCount > 1 ? "s" : ""} from TradingView`,
        "Open the journal to review and complete your trade entries."
      );
    }
    if (prevDraftCount !== currentCount) {
      setPrevDraftCount(currentCount);
    }
  }, [draftTrades.length]);

  const wins = completedTrades.filter((t) => t.outcome === "win").length;
  const losses = completedTrades.filter((t) => t.outcome === "loss").length;
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const fomoCount = completedTrades.filter((t) => t.behaviorTag === "FOMO").length;
  const disciplinedCount = completedTrades.filter((t) => t.behaviorTag === "Disciplined").length;

  async function fetchCoachFeedback(tradeId: number) {
    if (coachFeedback[tradeId] || coachLoading[tradeId]) return;
    setCoachLoading((prev) => ({ ...prev, [tradeId]: true }));
    try {
      const res = await fetch(`${API_BASE}/trades/${tradeId}/coach`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.feedback) {
          setCoachFeedback((prev) => ({ ...prev, [tradeId]: data.feedback }));
        }
      } else if (res.status === 403) {
        Alert.alert(
          "Premium Feature",
          "AI coaching is a Premium feature. Upgrade your plan to unlock personalized trade analysis."
        );
      } else {
        Alert.alert("Error", "Failed to fetch AI coaching feedback. Please try again.");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      if (errMsg.toLowerCase().includes("upgrade")) {
        Alert.alert(
          "Premium Feature",
          "AI coaching is a Premium feature. Upgrade your plan to unlock personalized trade analysis."
        );
      } else {
        Alert.alert("Error", "Failed to fetch AI coaching feedback. Please try again.");
      }
    }
    setCoachLoading((prev) => ({ ...prev, [tradeId]: false }));
  }

  useEffect(() => {
    if (expandedTradeId) {
      const trade = completedTrades.find((t) => t.id === expandedTradeId);
      if (trade) {
        const existing = trade.coachFeedback;
        if (existing) {
          setCoachFeedback((prev) => ({ ...prev, [expandedTradeId]: existing }));
        } else {
          fetchCoachFeedback(expandedTradeId);
        }
      }
    }
  }, [expandedTradeId]);

  function setField<K extends keyof TradeFormData>(key: K, val: TradeFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  const liveSetupScore = useMemo(() => {
    const parsedRisk = parseFloat(form.riskPct) || 0;
    return calculateSetupScore(form.stressLevel, parsedRisk);
  }, [form.stressLevel, form.riskPct]);

  const shouldSitOut = useMemo(() => {
    const sorted = [...completedTrades].sort(
      (a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime()
    );
    if (sorted.length === 0) return false;
    const last = sorted[0];
    if ((last.stressLevel ?? 0) >= 7) return true;
    if (sorted.length >= 2 && last.outcome === "loss" && sorted[1].outcome === "loss") return true;
    return false;
  }, [completedTrades]);

  function proceedToNewForm() {
    setEditingDraftId(null);
    setForm({
      ...DEFAULT_FORM,
      entryTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
      pair: userDefaultPair || DEFAULT_FORM.pair,
      riskPct: userDefaultRisk || DEFAULT_FORM.riskPct,
      sideDirection: "",
      tradingSession: "",
      entryPrice: "",
    });
    setShowForm(true);
    fireMobileAITrigger({ message: "Ready to log a trade? I can coach you on this setup!" });
  }

  function openNewForm() {
    if (!routineCompletedToday) {
      Alert.alert(
        "Morning Routine Required",
        "Complete your morning routine checklist on the Planner tab before logging a trade.",
        [{ text: "Got it" }]
      );
      return;
    }
    if (shouldSitOut) {
      setShowSitOutWarning(true);
      return;
    }
    proceedToNewForm();
  }

  function openDraftForm(draft: Trade & { sideDirection?: string | null; tradingSession?: string | null; entryPrice?: string | null }) {
    setEditingDraftId(draft.id);
    const draftNotes = draft.notes || "";
    const cleanNotes = draftNotes.replace(/^\[(Conservative|Silver Bullet)\]\s*/, "");
    setForm({
      pair: draft.pair || "NQ1!",
      entryTime: draft.entryTime || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
      riskPct: draft.riskPct?.toString() || "0.5",
      outcome: (draft.outcome || "") as OutcomeType,
      notes: cleanNotes,
      behaviorTag: (draft.behaviorTag || "") as BehaviorTag | "",
      stressLevel: draft.stressLevel || 5,
      sideDirection: (draft.sideDirection as "BUY" | "SELL" | "") || "",
      tradingSession: draft.tradingSession || "",
      entryPrice: draft.entryPrice || "",
    });
    setShowForm(true);
    fireMobileAITrigger({ message: "Ready to log a trade? I can coach you on this setup!" });
  }

  const handleSubmit = useCallback(async () => {
    if (!form.pair || !form.riskPct) return Alert.alert("Fill in pair and risk %");
    try {
      const notesWithMode = form.notes || "";
      const safeSetupScore = Number.isInteger(liveSetupScore) && !isNaN(liveSetupScore) ? liveSetupScore : 0;
      const result = await createTradeMut({
        data: {
          pair: form.pair,
          entryTime: form.entryTime,
          riskPct: parseFloat(form.riskPct) || 0,
          outcome: form.outcome || undefined,
          notes: notesWithMode,
          behaviorTag: form.behaviorTag || undefined,
          stressLevel: form.stressLevel,
          isDraft: false,
          setupScore: safeSetupScore,
          sideDirection: form.sideDirection || undefined,
          entryPrice: form.entryPrice || undefined,
          tradingSession: form.tradingSession || undefined,
        },
      });
      if (editingDraftId) {
        deleteTradeMut({ id: editingDraftId }).catch((e: unknown) => {
          console.warn("[handleSubmit] Draft delete failed (trade already saved):", e);
        });
      }
      if (appMode === "full") {
        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        const recentNegativeCount = completedTrades.filter(
          (t) =>
            NEGATIVE_TAGS.includes(t.behaviorTag ?? "") &&
            t.createdAt != null &&
            new Date(t.createdAt).getTime() > twoHoursAgo
        ).length;
        const currentIsNegative = NEGATIVE_TAGS.includes(form.behaviorTag) ? 1 : 0;
        if (recentNegativeCount + currentIsNegative >= 2) {
          const endTime = Date.now() + 5 * 60 * 1000;
          AsyncStorage.setItem(TILT_COOLDOWN_KEY, String(endTime));
          setTiltCooldownEnd(endTime);
          setShowTiltCooldown(true);
          fetch(`${API_BASE}/user/settings/cooldown-event`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ eventType: "tilt_cooldown", triggerTags: form.behaviorTag, durationSeconds: 300 }),
          }).catch(() => {});
        }
      }
      qc.setQueryData([`/api/trades`], (old: unknown) => {
        if (!Array.isArray(old)) return [result];
        return [result, ...old];
      });
      await qc.invalidateQueries({ queryKey: [`/api/trades`] });
      setShowForm(false);
      setEditingDraftId(null);
      fireMobileAITrigger({ message: "Trade saved! Want a post-trade coaching review?" });
      if (result && result.id) {
        setExpandedTradeId(result.id);
        fetchCoachFeedback(result.id);
      }
    } catch (err: unknown) {
      if (isSessionExpiredError(err)) return;
      console.error("[handleSubmit] Could not save trade:", err);
      let message = "Could not save trade";
      if (err && typeof err === "object") {
        const apiErr = err as { data?: { error?: string }; message?: string };
        if (apiErr.data && typeof apiErr.data === "object" && typeof apiErr.data.error === "string") {
          message = apiErr.data.error;
        } else if (typeof apiErr.message === "string" && apiErr.message) {
          message = apiErr.message;
        }
      }
      Alert.alert("Error", message);
    }
  }, [form, editingDraftId, createTradeMut, deleteTradeMut, qc, appMode, liveSetupScore]);

  const handleDelete = useCallback(async (id: number) => {
    Alert.alert("Delete Trade?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteTradeMut({ id });
          await qc.invalidateQueries({ queryKey: [`/api/trades`] });
        },
      },
    ]);
  }, [deleteTradeMut, qc]);

  const tagInfo = (tag: string) => BEHAVIOR_TAGS.find((b) => b.tag === tag);

  if (tierLevel < 2) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={[styles.headerRow, { paddingTop: 20 }]}>
          <Text style={styles.title}>Smart Journal</Text>
        </View>
        <View style={styles.lockedCenter}>
          <Ionicons name="lock-closed-outline" size={48} color={C.accent} />
          <Text style={styles.lockedTitle}>Premium Feature</Text>
          <Text style={styles.lockedSubtitle}>
            Upgrade to Premium to unlock the Smart Journal and log, analyze, and review your trades with AI coaching.
          </Text>
          <TouchableOpacity style={styles.lockedBtn} onPress={() => router.navigate("/subscription" as never)}>
            <Text style={styles.lockedBtnText}>View Plans</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!plannerLoaded) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={[styles.headerRow, { paddingTop: 20 }]}>
          <Text style={styles.title}>Smart Journal</Text>
        </View>
        <View style={styles.lockedCenter}>
          <Ionicons name="time-outline" size={36} color="#6B7280" />
          <Text style={[styles.lockedSubtitle, { marginTop: 12 }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!routineCompletedToday) {
    const CORE_KEYS = ["water", "breathing", "news", "bias"] as const;
    const CORE_LABELS: Record<string, string> = {
      water: "Drink Water",
      breathing: "Breathing Exercise",
      news: "Check for News",
      bias: "Big Picture Chart",
    };
    const doneCount = CORE_KEYS.filter((k) => routineItems[k]).length;
    const totalCount = CORE_KEYS.length;
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={[styles.headerRow, { paddingTop: 20 }]}>
          <Text style={styles.title}>Smart Journal</Text>
        </View>
        <View style={styles.lockedCenter}>
          <View style={styles.routineLockIconWrap}>
            <Ionicons name="lock-closed" size={36} color="#F59E0B" />
          </View>
          <Text style={styles.lockedTitle}>Complete Your Routine First</Text>
          <Text style={styles.lockedSubtitle}>
            The Smart Journal is locked until you finish your morning routine. Build the discipline habit — routine first, then trade, then log.
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Text style={{ color: "#F59E0B", fontWeight: "700", fontSize: 16 }}>
              {doneCount} of {totalCount} done
            </Text>
          </View>
          <View style={{ width: "100%", maxWidth: 280, marginBottom: 16, gap: 6 }}>
            {CORE_KEYS.map((k) => (
              <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons
                  name={routineItems[k] ? "checkmark-circle" : "ellipse-outline"}
                  size={18}
                  color={routineItems[k] ? "#00C896" : "#6B7280"}
                />
                <Text style={{ color: routineItems[k] ? "#00C896" : "#9CA3AF", fontSize: 14 }}>
                  {CORE_LABELS[k]}
                </Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={styles.lockedBtn} onPress={() => router.navigate("/(tabs)/index" as never)}>
            <Text style={styles.lockedBtnText}>Go to Morning Routine</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={C.accent} />
        }
        {...scrollCollapseProps}
      >

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Smart Journal</Text>
          <TouchableOpacity style={[styles.monkBtn, isMonkMode && { backgroundColor: C.accent + "20", borderColor: C.accent }]} onPress={() => setIsMonkMode((prev) => !prev)}>
            <Ionicons name={isMonkMode ? "eye-outline" : "eye-off-outline"} size={16} color={C.accent} />
            <Text style={styles.monkBtnText}>{isMonkMode ? "Exit Monk" : "Monk Mode"}</Text>
          </TouchableOpacity>
        </View>

        {/* Monk Mode Banner */}
        {isMonkMode && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, padding: 10, backgroundColor: C.accent + "18", borderRadius: 10, marginBottom: 12, borderWidth: 1, borderColor: C.accent + "44" }}>
            <Ionicons name="eye-off" size={14} color={C.accent} />
            <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.accent, flex: 1 }}>MONK MODE — Outcomes hidden. Focus on process, not results.</Text>
          </View>
        )}

        {/* Stats Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsRow} contentContainerStyle={styles.statsRowContent}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{total}</Text>
            <Text style={styles.statLabel}>Trades</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: C.accent }]}>{isMonkMode ? "—" : `${winRate}%`}</Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: "#F59E0B" }]}>{isMonkMode ? "—" : fomoCount}</Text>
            <Text style={styles.statLabel}>FOMO</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: "#00C896" }]}>{isMonkMode ? "—" : disciplinedCount}</Text>
            <Text style={styles.statLabel}>Disciplined</Text>
          </View>
        </ScrollView>

        {/* Draft Trades from TradingView */}
        {draftTrades.length > 0 && (
          <View style={styles.draftSection}>
            <View style={styles.draftHeader}>
              <Ionicons name="radio" size={14} color="#F59E0B" />
              <Text style={styles.draftTitle}>{draftTrades.length} Draft{draftTrades.length > 1 ? "s" : ""} from TradingView</Text>
              <TouchableOpacity
                onPress={() => router.navigate("/webhooks" as never)}
                style={styles.draftSetupLink}
                activeOpacity={0.7}
              >
                <Ionicons name="settings-outline" size={12} color="#F59E0B" />
                <Text style={styles.draftSetupLinkText}>Setup</Text>
              </TouchableOpacity>
            </View>
            {draftTrades.map((draft) => (
              <TouchableOpacity key={draft.id} style={styles.draftCard} onPress={() => openDraftForm(draft)} activeOpacity={0.8}>
                <View style={styles.draftInfo}>
                  <Text style={styles.draftPair}>{draft.pair}</Text>
                  <View style={[styles.sideBadge, { backgroundColor: draft.sideDirection === "BUY" ? "#00C89620" : "#EF444420", borderColor: draft.sideDirection === "BUY" ? "#00C896" : "#EF4444" }]}>
                    <Text style={[styles.sideBadgeText, { color: draft.sideDirection === "BUY" ? "#00C896" : "#EF4444" }]}>
                      {draft.sideDirection || "—"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.draftSub}>{draft.notes || "Tap to complete this trade entry"}</Text>
                <View style={styles.draftAction}>
                  <Text style={styles.draftActionText}>Complete Entry →</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}


        {/* Add Trade Button */}
        <TouchableOpacity
          style={[styles.addBtn, !isRoutineComplete && styles.addBtnLocked]}
          onPress={openNewForm}
          activeOpacity={0.8}
        >
          <Ionicons name={isRoutineComplete ? "add-circle" : "lock-closed"} size={18} color={isRoutineComplete ? "#0A0A0F" : "#F59E0B"} />
          <Text style={[styles.addBtnText, !isRoutineComplete && { color: "#F59E0B" }]}>
            {isRoutineComplete ? "Log New Trade" : "Routine Required"}
          </Text>
        </TouchableOpacity>

        {/* Trade List */}
        {completedTrades.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={40} color={C.cardBorder} />
            <Text style={styles.emptyText}>No trades yet</Text>
            <Text style={styles.emptySubtext}>Complete your morning routine and log your first trade</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Trade Log</Text>
            {completedTrades.map((trade) => {
              const tag = trade.behaviorTag ? tagInfo(trade.behaviorTag) : undefined;
              const isWin = trade.outcome === "win";
              const isLoss = trade.outcome === "loss";
              const expanded = expandedTradeId === trade.id;
              const feedback = coachFeedback[trade.id] || trade.coachFeedback;
              const loading = coachLoading[trade.id];
              return (
                <TouchableOpacity
                  key={trade.id}
                  style={styles.tradeCard}
                  activeOpacity={0.8}
                  onPress={() => setExpandedTradeId(expanded ? null : trade.id)}
                >
                  <View style={styles.tradeHeader}>
                    <Text style={styles.tradePair}>{trade.pair}</Text>
                    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                      {trade.setupScore != null && (
                        <View style={[styles.tagBadge, { backgroundColor: getScoreColor(trade.setupScore) + "20", borderColor: getScoreColor(trade.setupScore) }]}>
                          <Text style={[styles.tagText, { color: getScoreColor(trade.setupScore) }]}>{trade.setupScore}</Text>
                        </View>
                      )}
                      {tag && (
                        <View style={[styles.tagBadge, { backgroundColor: tag.color + "20", borderColor: tag.color }]}>
                          <Text style={[styles.tagText, { color: tag.color }]}>{tag.tag}</Text>
                        </View>
                      )}
                      {trade.outcome && !isMonkMode && (
                        <View style={[styles.outcomeBadge, { backgroundColor: isWin ? "#00C89620" : isLoss ? "#EF444420" : "#444", borderColor: isWin ? "#00C896" : isLoss ? "#EF4444" : "#666" }]}>
                          <Text style={[styles.outcomeText, { color: isWin ? "#00C896" : isLoss ? "#EF4444" : C.textSecondary }]}>
                            {trade.outcome.toUpperCase()}
                          </Text>
                        </View>
                      )}
                      <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color={C.textSecondary} />
                    </View>
                  </View>
                  <View style={styles.tradeDetails}>
                    <Text style={styles.tradeDetail}>⏰ {trade.entryTime}</Text>
                    <Text style={styles.tradeDetail}>📊 {trade.riskPct}% risk</Text>
                    {trade.liquiditySweep && <Text style={styles.tradeDetail}>💧 Sweep</Text>}
                    {trade.stressLevel && <Text style={styles.tradeDetail}>🧠 Stress: {trade.stressLevel}/10</Text>}
                    {trade.notes?.startsWith("[Silver Bullet]") && <Text style={[styles.tradeDetail, { color: "#F59E0B" }]}>⚡ Silver Bullet</Text>}
                    {trade.notes?.startsWith("[Conservative]") && <Text style={[styles.tradeDetail, { color: C.accent }]}>🛡 Conservative</Text>}
                  </View>
                  {(trade.followedTimeRule !== null || trade.hasFvgConfirmation !== null) && (
                    <View style={styles.tradeChecks}>
                      {trade.followedTimeRule !== null && (
                        <View style={[styles.checkBadge, { backgroundColor: trade.followedTimeRule ? "#00C89615" : "#EF444415" }]}>
                          <Ionicons name={trade.followedTimeRule ? "checkmark" : "close"} size={11} color={trade.followedTimeRule ? "#00C896" : "#EF4444"} />
                          <Text style={[styles.checkText, { color: trade.followedTimeRule ? "#00C896" : "#EF4444" }]}>10-11 Rule</Text>
                        </View>
                      )}
                      {trade.hasFvgConfirmation !== null && (
                        <View style={[styles.checkBadge, { backgroundColor: trade.hasFvgConfirmation ? "#00C89615" : "#EF444415" }]}>
                          <Ionicons name={trade.hasFvgConfirmation ? "checkmark" : "close"} size={11} color={trade.hasFvgConfirmation ? "#00C896" : "#EF4444"} />
                          <Text style={[styles.checkText, { color: trade.hasFvgConfirmation ? "#00C896" : "#EF4444" }]}>FVG Confirmed</Text>
                        </View>
                      )}
                    </View>
                  )}
                  {trade.notes && trade.notes.replace(/^\[(Conservative|Silver Bullet)\]\s*/, "").trim() ? (
                    <Text style={styles.tradeNotes} numberOfLines={expanded ? undefined : 2}>{trade.notes.replace(/^\[(Conservative|Silver Bullet)\]\s*/, "").trim()}</Text>
                  ) : null}

                  {expanded && (
                    <View style={coachStyles.expandedSection}>
                      {(feedback || loading) && (
                        <View style={coachStyles.feedbackCard}>
                          <View style={coachStyles.feedbackHeader}>
                            <Ionicons name="sparkles" size={14} color={C.accent} />
                            <Text style={coachStyles.feedbackTitle}>Coach Says</Text>
                          </View>
                          {loading ? (
                            <Text style={coachStyles.loadingText}>Analyzing your trade...</Text>
                          ) : (
                            <Text style={coachStyles.feedbackText}>{feedback}</Text>
                          )}
                        </View>
                      )}

                      {/* Reflection section */}
                      <View style={reflStyles.card}>
                        <View style={reflStyles.header}>
                          <Ionicons name="journal-outline" size={13} color="#818CF8" />
                          <Text style={reflStyles.title}>Reflection</Text>
                        </View>
                        {reflectionEditing === trade.id ? (
                          <View style={{ gap: 10 }}>
                            <View>
                              <Text style={reflStyles.fieldLabel}>Entry Criteria Review</Text>
                              <TextInput
                                style={reflStyles.input}
                                value={reflectionDraft.criteria}
                                onChangeText={(v) => setReflectionDraft((d) => ({ ...d, criteria: v }))}
                                placeholder="Were your entry criteria met? Any misses?"
                                placeholderTextColor={C.textTertiary}
                                multiline
                                numberOfLines={2}
                              />
                            </View>
                            <View>
                              <Text style={reflStyles.fieldLabel}>Setup Type / Confluence</Text>
                              <TextInput
                                style={reflStyles.input}
                                value={reflectionDraft.setup}
                                onChangeText={(v) => setReflectionDraft((d) => ({ ...d, setup: v }))}
                                placeholder="e.g. Silver Bullet, FVG + MSS, Kill Zone sweep..."
                                placeholderTextColor={C.textTertiary}
                                multiline
                                numberOfLines={2}
                              />
                            </View>
                            <View>
                              <Text style={reflStyles.fieldLabel}>Lessons / Notes</Text>
                              <TextInput
                                style={reflStyles.input}
                                value={reflectionDraft.notes}
                                onChangeText={(v) => setReflectionDraft((d) => ({ ...d, notes: v }))}
                                placeholder="What would you do differently next time?"
                                placeholderTextColor={C.textTertiary}
                                multiline
                                numberOfLines={2}
                                autoFocus
                              />
                            </View>
                            <View style={reflStyles.btnRow}>
                              <TouchableOpacity style={reflStyles.saveBtn} onPress={() => saveReflection(trade.id, reflectionDraft)}>
                                <Text style={reflStyles.saveBtnText}>Save</Text>
                              </TouchableOpacity>
                              <TouchableOpacity onPress={() => { setReflectionEditing(null); setReflectionDraft({ criteria: "", setup: "", notes: "" }); }}>
                                <Text style={reflStyles.cancelText}>Cancel</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => {
                              setReflectionEditing(trade.id);
                              setReflectionDraft(reflections[trade.id] || { criteria: "", setup: "", notes: "" });
                            }}
                            activeOpacity={0.7}
                          >
                            {reflections[trade.id] && (reflections[trade.id].criteria || reflections[trade.id].setup || reflections[trade.id].notes) ? (
                              <View style={{ gap: 6 }}>
                                {reflections[trade.id].criteria ? (
                                  <View>
                                    <Text style={reflStyles.fieldLabel}>Entry Criteria</Text>
                                    <Text style={reflStyles.reflectionText}>{reflections[trade.id].criteria}</Text>
                                  </View>
                                ) : null}
                                {reflections[trade.id].setup ? (
                                  <View>
                                    <Text style={reflStyles.fieldLabel}>Setup / Confluence</Text>
                                    <Text style={reflStyles.reflectionText}>{reflections[trade.id].setup}</Text>
                                  </View>
                                ) : null}
                                {reflections[trade.id].notes ? (
                                  <View>
                                    <Text style={reflStyles.fieldLabel}>Lessons</Text>
                                    <Text style={reflStyles.reflectionText}>{reflections[trade.id].notes}</Text>
                                  </View>
                                ) : null}
                              </View>
                            ) : (
                              <Text style={reflStyles.placeholder}>Tap to add reflection...</Text>
                            )}
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={coachStyles.actionRow}>
                        <Text style={coachStyles.dateText}>
                          {trade.createdAt ? new Date(trade.createdAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }) : ""}
                        </Text>
                        <TouchableOpacity onPress={() => handleDelete(trade.id)}>
                          <Ionicons name="trash-outline" size={16} color={C.textSecondary} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  {!expanded && (
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(trade.id)}>
                      <Ionicons name="trash-outline" size={14} color={C.textSecondary} />
                    </TouchableOpacity>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <View style={styles.disclaimer}>
          <Ionicons name="warning-outline" size={12} color={C.textSecondary} />
          <Text style={styles.disclaimerText}>
            For educational purposes only. Not financial advice. Trading futures involves significant risk of loss and is not suitable for all investors.
          </Text>
        </View>

        <View style={{ height: Platform.OS === "ios" ? 100 : 20 }} />
      </ScrollView>

      {/* Trade Form Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={formStyles.container}>
          <View style={formStyles.handle} />
          <View style={formStyles.header}>
            <Text style={formStyles.title}>{editingDraftId ? "Complete Draft Trade" : "Log Trade"}</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={24} color={C.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={formStyles.scroll}>
            {/* Pair */}
            <Text style={formStyles.fieldLabel}>Instrument</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {NQ_PAIRS.map((p) => (
                  <TouchableOpacity key={p} style={[formStyles.pairBtn, form.pair === p && formStyles.pairBtnActive]} onPress={() => setField("pair", p)}>
                    <Text style={[formStyles.pairBtnText, form.pair === p && formStyles.pairBtnTextActive]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Side */}
            <Text style={formStyles.fieldLabel}>Side</Text>
            <View style={[formStyles.row, { marginBottom: 16 }]}>
              {(["BUY", "SELL"] as const).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[
                    formStyles.outcomeBtn,
                    form.sideDirection === s && {
                      backgroundColor: s === "BUY" ? "#00C89625" : "#EF444425",
                      borderColor: s === "BUY" ? "#00C896" : "#EF4444",
                    },
                  ]}
                  onPress={() => setField("sideDirection", form.sideDirection === s ? "" : s)}
                >
                  <Text style={[
                    formStyles.outcomeBtnText,
                    form.sideDirection === s && { color: s === "BUY" ? "#00C896" : "#EF4444", fontFamily: "Inter_700Bold" },
                  ]}>
                    {s === "BUY" ? "Long (Buy)" : "Short (Sell)"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Session auto-detected */}
            {form.tradingSession ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#00C89615", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#00C89640", marginBottom: 16 }}>
                <Ionicons name="flash" size={13} color={C.accent} />
                <Text style={{ fontSize: 12, color: C.accent, fontFamily: "Inter_600SemiBold" }}>Session detected: {form.tradingSession}</Text>
              </View>
            ) : null}

            {/* Entry Price & Risk */}
            <View style={formStyles.row}>
              <View style={{ flex: 1 }}>
                <Text style={formStyles.fieldLabel}>Entry Price</Text>
                <TextInput style={formStyles.input} value={form.entryPrice} onChangeText={(v) => setField("entryPrice", v)} placeholder="21450.25" placeholderTextColor={C.textSecondary} keyboardType="decimal-pad" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={formStyles.fieldLabel}>Risk %</Text>
                <TextInput style={formStyles.input} value={form.riskPct} onChangeText={(v) => setField("riskPct", v)} placeholder="0.5" placeholderTextColor={C.textSecondary} keyboardType="decimal-pad" />
              </View>
            </View>

            {/* Entry Time */}
            <View>
              <Text style={formStyles.fieldLabel}>Entry Time</Text>
              <TextInput style={formStyles.input} value={form.entryTime} onChangeText={(v) => setField("entryTime", v)} placeholder="10:15 AM" placeholderTextColor={C.textSecondary} />
            </View>

            {/* Outcome */}
            <Text style={formStyles.fieldLabel}>Outcome</Text>
            <View style={formStyles.outcomeRow}>
              {(["win", "loss", "breakeven"] as OutcomeType[]).map((o) => (
                <TouchableOpacity key={o} style={[formStyles.outcomeBtn, form.outcome === o && { backgroundColor: o === "win" ? "#00C89625" : o === "loss" ? "#EF444425" : "#55555525", borderColor: o === "win" ? "#00C896" : o === "loss" ? "#EF4444" : "#888" }]} onPress={() => setField("outcome", o)}>
                  <Text style={[formStyles.outcomeBtnText, form.outcome === o && { color: "#0A0A0F", fontFamily: "Inter_700Bold" }]}>
                    {o.charAt(0).toUpperCase() + o.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Stress Level */}
            <StressSlider value={form.stressLevel} onChange={(v) => setField("stressLevel", v)} />

            {/* Behavioral Tag */}
            <Text style={formStyles.fieldLabel}>Behavioral Tag</Text>
            <View style={formStyles.tagRow}>
              {BEHAVIOR_TAGS.map(({ tag, label, color, icon }) => (
                <TouchableOpacity
                  key={tag}
                  style={[formStyles.tagBtn, form.behaviorTag === tag && { backgroundColor: color + "25", borderColor: color }]}
                  onPress={() => setField("behaviorTag", form.behaviorTag === tag ? "" : tag)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={icon as React.ComponentProps<typeof Ionicons>["name"]} size={14} color={form.behaviorTag === tag ? color : C.textSecondary} />
                  <Text style={[formStyles.tagBtnText, form.behaviorTag === tag && { color }]}>{tag} — {label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Notes */}
            <Text style={formStyles.fieldLabel}>Notes</Text>
            <TextInput
              style={[formStyles.input, formStyles.textArea]}
              value={form.notes}
              onChangeText={(v) => setField("notes", v)}
              placeholder="What was your reasoning? What did you learn?"
              placeholderTextColor={C.textSecondary}
              multiline
              numberOfLines={4}
            />

            <View style={[scoreStyles.badge, { borderColor: getScoreColor(liveSetupScore) + "50", backgroundColor: getScoreColor(liveSetupScore) + "15" }]}>
              <View style={scoreStyles.badgeRow}>
                <Ionicons name="speedometer-outline" size={16} color={getScoreColor(liveSetupScore)} />
                <Text style={scoreStyles.badgeLabel}>Setup Score</Text>
              </View>
              <Text style={[scoreStyles.badgeValue, { color: getScoreColor(liveSetupScore) }]}>{liveSetupScore}/100</Text>
            </View>

            <TouchableOpacity style={formStyles.submitBtn} onPress={handleSubmit}>
              <Text style={formStyles.submitBtnText}>
                {editingDraftId ? "Complete Trade Entry" : "Save Trade"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Sit-Out Warning Modal */}
      <Modal visible={showSitOutWarning} animationType="fade" transparent statusBarTranslucent>
        <View style={sitOutStyles.overlay}>
          <View style={sitOutStyles.card}>
            <View style={sitOutStyles.iconRow}>
              <View style={sitOutStyles.iconCircle}>
                <Ionicons name="hand-left-outline" size={24} color="#F59E0B" />
              </View>
              <Text style={sitOutStyles.title}>Consider Sitting Out</Text>
            </View>
            <Text style={sitOutStyles.body}>
              {(() => {
                const sorted = [...completedTrades].sort(
                  (a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime()
                );
                if (sorted.length >= 2 && sorted[0].outcome === "loss" && sorted[1].outcome === "loss") {
                  return "You've had 2 consecutive losses. Trading while on a losing streak often leads to revenge trades that make things worse.";
                }
                return "Your last trade had a high stress level. Trading under emotional pressure reduces decision quality and increases risk of impulsive entries.";
              })()}
            </Text>
            <Text style={sitOutStyles.sub}>Stepping away protects your account and lets you come back with a clear head.</Text>
            <View style={sitOutStyles.btnRow}>
              <TouchableOpacity style={sitOutStyles.sitOutBtn} onPress={() => setShowSitOutWarning(false)}>
                <Text style={sitOutStyles.sitOutBtnText}>I'll Sit Out</Text>
              </TouchableOpacity>
              <TouchableOpacity style={sitOutStyles.continueBtn} onPress={() => { setShowSitOutWarning(false); proceedToNewForm(); }}>
                <Text style={sitOutStyles.continueBtnText}>Continue Anyway</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showTiltCooldown && (
        <TiltCooldownOverlay
          endTime={tiltCooldownEnd}
          onDismiss={() => {
            setShowTiltCooldown(false);
            AsyncStorage.removeItem(TILT_COOLDOWN_KEY);
          }}
        />
      )}
    </SafeAreaView>
  );
}

function TiltCooldownOverlay({ endTime, onDismiss }: { endTime: number; onDismiss: () => void }) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));

  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const canDismiss = remaining <= 0;

  return (
    <Modal visible animationType="fade" transparent={false}>
      <View style={tiltStyles.container}>
        <View style={tiltStyles.iconCircle}>
          <Ionicons name="alert-circle" size={48} color="#FB923C" />
        </View>
        <Text style={tiltStyles.title}>Tilt Detected</Text>
        <Text style={tiltStyles.body}>
          You've logged 2+ emotional trades in the last 2 hours. Take a 5-minute break to reset.
        </Text>
        <View style={tiltStyles.timerBox}>
          <Text style={tiltStyles.timerLabel}>COOLDOWN TIMER</Text>
          <Text style={tiltStyles.timer}>
            {minutes}:{seconds.toString().padStart(2, "0")}
          </Text>
        </View>
        <View style={tiltStyles.tips}>
          <Text style={tiltStyles.tipsTitle}>RESET SUGGESTIONS</Text>
          {["Step away from the screen", "Take 10 deep breaths", "Splash cold water on your face", "Review your trading plan"].map((tip, i) => (
            <View key={i} style={tiltStyles.tipRow}>
              <Ionicons name="shield-checkmark" size={14} color={C.accent} />
              <Text style={tiltStyles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity
          onPress={canDismiss ? onDismiss : undefined}
          disabled={!canDismiss}
          style={[tiltStyles.btn, !canDismiss && { opacity: 0.4 }]}
        >
          <Text style={tiltStyles.btnText}>
            {canDismiss ? "I'm Ready — Back to Trading" : "Cooling down..."}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const tiltStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background, justifyContent: "center", alignItems: "center", padding: 24 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(251,146,60,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 24, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 8 },
  body: { fontSize: 14, color: C.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 24, maxWidth: 300 },
  timerBox: { backgroundColor: C.backgroundSecondary, borderRadius: 16, padding: 20, alignItems: "center", marginBottom: 20, borderWidth: 1, borderColor: C.cardBorder },
  timerLabel: { fontSize: 11, color: C.textSecondary, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 8 },
  timer: { fontSize: 48, fontFamily: "Inter_700Bold", color: "#FB923C" },
  tips: { backgroundColor: C.backgroundSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 24, width: "100%" },
  tipsTitle: { fontSize: 11, color: C.textSecondary, fontFamily: "Inter_600SemiBold", letterSpacing: 1, marginBottom: 10 },
  tipRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  tipText: { fontSize: 14, color: C.text },
  btn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32, alignItems: "center", width: "100%" },
  btnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 20 },
  lockedCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  routineLockIconWrap: { width: 72, height: 72, borderRadius: 36, backgroundColor: "rgba(245,158,11,0.12)", borderWidth: 1, borderColor: "rgba(245,158,11,0.25)", alignItems: "center", justifyContent: "center" },
  lockedTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text, marginTop: 8 },
  lockedSubtitle: { fontSize: 13, color: C.textSecondary, textAlign: "center", lineHeight: 20, paddingHorizontal: 16 },
  lockedBtn: { marginTop: 12, backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  lockedBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
  disclaimer: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 16, marginHorizontal: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.cardBorder },
  disclaimerText: { flex: 1, fontSize: 11, color: C.textSecondary, lineHeight: 15, opacity: 0.7 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.text },
  monkBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.accent },
  monkBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.accent },
  lockBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(245,158,11,0.1)", borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.3)" },
  lockText: { flex: 1, fontSize: 13, color: "#F59E0B" },
  statsRow: { marginBottom: 16 },
  statsRowContent: { flexDirection: "row", gap: 8 },
  statCard: { minWidth: 80, backgroundColor: C.backgroundSecondary, borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: C.cardBorder },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text },
  statLabel: { fontSize: 11, color: C.textSecondary, marginTop: 2, textAlign: "center" },
  draftSection: { backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.3)" },
  draftHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  draftTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#F59E0B", flex: 1 },
  draftSetupLink: { flexDirection: "row", alignItems: "center", gap: 3 },
  draftSetupLinkText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: "#F59E0B" },
  draftCard: { backgroundColor: "rgba(245,158,11,0.05)", borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: "rgba(245,158,11,0.2)" },
  draftInfo: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  draftPair: { fontSize: 15, fontFamily: "Inter_700Bold", color: C.text },
  sideBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  sideBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  draftSub: { fontSize: 12, color: C.textSecondary, marginBottom: 6 },
  draftAction: {},
  draftActionText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#F59E0B" },
  addBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.accent, borderRadius: 14, padding: 16, marginBottom: 20 },
  addBtnLocked: { backgroundColor: "rgba(245,158,11,0.1)", borderWidth: 1, borderColor: "rgba(245,158,11,0.4)" },
  addBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
  emptyState: { alignItems: "center", padding: 40 },
  emptyText: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: C.textSecondary, marginTop: 12 },
  emptySubtext: { fontSize: 13, color: C.textSecondary, textAlign: "center", marginTop: 6, lineHeight: 20 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  tradeCard: { backgroundColor: C.backgroundSecondary, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.cardBorder },
  tradeHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  tradePair: { fontSize: 17, fontFamily: "Inter_700Bold", color: C.text },
  tagBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  tagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  outcomeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  outcomeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  tradeDetails: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 6 },
  tradeDetail: { fontSize: 12, color: C.textSecondary },
  tradeChecks: { flexDirection: "row", gap: 6, marginBottom: 6 },
  checkBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  checkText: { fontSize: 11 },
  tradeNotes: { fontSize: 12, color: C.textSecondary, fontStyle: "italic", marginTop: 4 },
  deleteBtn: { position: "absolute", top: 14, right: 14 },
});

const formStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  handle: { width: 40, height: 4, backgroundColor: C.cardBorder, borderRadius: 2, alignSelf: "center", marginTop: 12, marginBottom: 8 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  title: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text },
  scroll: { padding: 16, paddingBottom: 40 },
  fieldLabel: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  row: { flexDirection: "row", gap: 0, marginBottom: 16 },
  input: { backgroundColor: C.backgroundSecondary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.cardBorder },
  textArea: { height: 100, textAlignVertical: "top" },
  pairBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: C.backgroundSecondary, borderWidth: 1, borderColor: C.cardBorder },
  pairBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  pairBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.textSecondary },
  pairBtnTextActive: { color: "#0A0A0F" },
  outcomeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  outcomeBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: C.backgroundSecondary, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center" },
  outcomeBtnText: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.textSecondary },
  toggleRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 16, padding: 14, backgroundColor: C.backgroundSecondary, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center", marginTop: 2 },
  checkboxChecked: { backgroundColor: C.accent, borderColor: C.accent },
  toggleLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.text },
  toggleSub: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  guidedSection: { backgroundColor: C.backgroundSecondary, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.accent + "33", marginBottom: 16 },
  guidedTitle: { fontSize: 11, fontFamily: "Inter_700Bold", color: C.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 },
  ynDivider: { height: 1, backgroundColor: C.cardBorder, marginVertical: 12 },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  tagBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: C.backgroundSecondary, borderWidth: 1, borderColor: C.cardBorder },
  tagBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.textSecondary },
  submitBtn: { backgroundColor: C.accent, borderRadius: 14, padding: 18, alignItems: "center", marginTop: 8 },
  submitBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
});

const ynStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { flex: 1, fontSize: 13, color: C.text, lineHeight: 20, marginRight: 12 },
  btns: { flexDirection: "row", gap: 6 },
  btn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: C.background, borderWidth: 1, borderColor: C.cardBorder },
  yesActive: { backgroundColor: C.accent, borderColor: C.accent },
  noActive: { backgroundColor: "#EF4444", borderColor: "#EF4444" },
  btnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.textSecondary },
});

const sliderStyles = StyleSheet.create({
  container: {},
  label: { fontSize: 13, color: C.text, marginBottom: 10 },
  dots: { flexDirection: "row", gap: 6 },
  dot: { flex: 1, height: 8, borderRadius: 4, backgroundColor: C.cardBorder },
  labels: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  labelText: { fontSize: 11, color: C.textSecondary },
});

const coachStyles = StyleSheet.create({
  expandedSection: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.cardBorder },
  feedbackCard: { backgroundColor: C.accent + "10", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.accent + "30", marginBottom: 8 },
  feedbackHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  feedbackTitle: { fontSize: 12, fontFamily: "Inter_700Bold", color: C.accent },
  feedbackText: { fontSize: 12, color: C.textSecondary, lineHeight: 18 },
  loadingText: { fontSize: 12, color: C.textSecondary, fontStyle: "italic" },
  actionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  dateText: { fontSize: 11, color: C.textSecondary },
});


const scoreStyles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, padding: 14, borderWidth: 1, marginBottom: 12 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  badgeLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text },
  badgeValue: { fontSize: 20, fontFamily: "Inter_700Bold" },
});

const sitOutStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center", padding: 24 },
  card: { backgroundColor: C.backgroundSecondary, borderRadius: 18, padding: 24, width: "100%", maxWidth: 400, borderWidth: 1, borderColor: "rgba(245,158,11,0.3)" },
  iconRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(245,158,11,0.1)", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text },
  body: { fontSize: 14, color: C.textSecondary, lineHeight: 22, marginBottom: 8 },
  sub: { fontSize: 13, color: C.textSecondary, lineHeight: 20, marginBottom: 20 },
  btnRow: { flexDirection: "row", gap: 12 },
  sitOutBtn: { flex: 1, backgroundColor: C.accent, borderRadius: 14, padding: 14, alignItems: "center" },
  sitOutBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
  continueBtn: { flex: 1, borderRadius: 14, padding: 14, alignItems: "center", borderWidth: 1, borderColor: C.cardBorder },
  continueBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.textSecondary },
});

const reflStyles = StyleSheet.create({
  card: { backgroundColor: "#818CF810", borderRadius: 10, padding: 12, borderWidth: 1, borderColor: "#818CF830", marginBottom: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 },
  title: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#818CF8", textTransform: "uppercase", letterSpacing: 0.8 },
  input: { backgroundColor: C.backgroundTertiary, borderRadius: 8, padding: 10, fontSize: 13, color: C.text, fontFamily: "Inter_400Regular", borderWidth: 1, borderColor: C.cardBorder, minHeight: 70, textAlignVertical: "top" },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  saveBtn: { backgroundColor: "#818CF8", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  saveBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#fff" },
  cancelText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.textSecondary },
  reflectionText: { fontSize: 13, color: C.text, fontFamily: "Inter_400Regular", lineHeight: 19 },
  placeholder: { fontSize: 13, color: C.textTertiary, fontFamily: "Inter_400Regular", fontStyle: "italic" },
  fieldLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 4 },
});
