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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useListTrades, useCreateTrade, useDeleteTrade } from "@workspace/api-client-react";
import type { Trade } from "@workspace/api-client-react";
import { usePlanner } from "@/contexts/PlannerContext";
import { fireMobileAITrigger } from "@/lib/aiTrigger";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

const C = Colors.dark;

type BehaviorTag = "FOMO" | "Chased" | "Disciplined" | "Greedy" | "Revenge" | "Angry" | "Overtrading";
type OutcomeType = "win" | "loss" | "breakeven" | "";
type EntryMode = "conservative" | "aggressive";

const CONSERVATIVE_CRITERIA = [
  { key: "bias", label: "Bias Check", desc: "Is the 1-Hour chart clearly going up (Bullish) or down (Bearish)?" },
  { key: "sweep", label: "The Sweep", desc: "Did price take out a 15-min high or low?" },
  { key: "shift", label: "The Shift (MSS)", desc: "Is there a 5-min MSS (Market Structure Shift) with a fast move?" },
  { key: "gap", label: "The Gap (FVG)", desc: "Can you see a FVG (Fair Value Gap) on the chart?" },
  { key: "fib", label: "The Fib — OTE (Optimal Trade Entry)", desc: "Is your entry in Discount (for buys) or Premium (for sells)?" },
  { key: "trigger", label: "The Trigger", desc: "Did you place your Limit Order at the start of the FVG?" },
];

const AGGRESSIVE_CRITERIA = [
  { key: "time", label: "Time Check", desc: "Is it between 10:00 AM and 11:00 AM EST?" },
  { key: "poi", label: "POI Identified", desc: "Is price heading toward a clear high or low?" },
  { key: "fvg1m", label: "1m FVG Entry", desc: "Is this the first 1-min FVG (Fair Value Gap) after a liquidity grab?" },
  { key: "risk", label: "Risk ≤ 1%", desc: "Are you risking 1% or less on this trade?" },
];

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

const SETUP_TYPES = ["FVG", "Order Block", "Liquidity Sweep", "Turtle Soup", "BOS/CHoCH"] as const;

const EXAMPLE_JOURNAL_ENTRIES = [
  {
    id: "ex-1",
    pair: "NQ1!",
    outcome: "win" as const,
    entryTime: "10:12 AM",
    riskPct: "0.5",
    tag: "Disciplined",
    note: "Waited for the Silver Bullet window. FVG formed cleanly after liquidity sweep. Entered at OTE, hit TP at +2R. Felt calm, no FOMO.",
  },
  {
    id: "ex-2",
    pair: "MNQ1!",
    outcome: "loss" as const,
    entryTime: "9:47 AM",
    riskPct: "1.0",
    tag: "FOMO",
    note: "Jumped in before the displacement confirmed. No liquidity sweep, no MSS. Stopped out at -1R. Lesson: wait for the full setup checklist.",
  },
];

interface TradeFormData {
  pair: string;
  entryTime: string;
  riskPct: string;
  liquiditySweep: boolean;
  outcome: OutcomeType;
  notes: string;
  behaviorTag: BehaviorTag | "";
  followedTimeRule: boolean | null;
  hasFvgConfirmation: boolean | null;
  stressLevel: number;
  setupTypes: string[];
}

const DEFAULT_FORM: TradeFormData = {
  pair: "NQ1!",
  entryTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
  riskPct: "0.5",
  liquiditySweep: false,
  outcome: "",
  notes: "",
  behaviorTag: "",
  followedTimeRule: null,
  hasFvgConfirmation: null,
  stressLevel: 5,
  setupTypes: [],
};

function YesNoToggle({ value, onChange, label }: { value: boolean | null; onChange: (v: boolean) => void; label: string }) {
  return (
    <View style={ynStyles.row}>
      <Text style={ynStyles.label}>{label}</Text>
      <View style={ynStyles.btns}>
        <TouchableOpacity
          style={[ynStyles.btn, value === true && ynStyles.yesActive]}
          onPress={() => onChange(true)}
        >
          <Text style={[ynStyles.btnText, value === true && { color: "#0A0A0F" }]}>Yes</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[ynStyles.btn, value === false && ynStyles.noActive]}
          onPress={() => onChange(false)}
        >
          <Text style={[ynStyles.btnText, value === false && { color: "#0A0A0F" }]}>No</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function calculateSetupScore(
  criteriaChecked: number,
  totalCriteria: number,
  hasFvgConfirmation: boolean,
  liquiditySweep: boolean,
  followedTimeRule: boolean,
  stressLevel: number,
  riskPct: number
): number {
  let score = 0;
  score += Math.round((criteriaChecked / totalCriteria) * 40);
  if (hasFvgConfirmation) score += 15;
  if (liquiditySweep) score += 15;
  if (followedTimeRule) score += 10;
  if (stressLevel <= 5) score += 10;
  if (riskPct <= 1) score += 10;
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
  const { user, subscription, appMode } = useAuth();
  const router = useRouter();
  const tierLevel = user?.role === "admin" ? 2 : (subscription?.tierLevel ?? 0);
  const { isRoutineComplete } = usePlanner();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [isMonkMode, setIsMonkMode] = useState(false);
  const [form, setForm] = useState<TradeFormData>({ ...DEFAULT_FORM });
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [entryMode, setEntryMode] = useState<EntryMode>("conservative");
  const [entryCriteria, setEntryCriteria] = useState<Record<string, boolean>>({});
  const [expandedTradeId, setExpandedTradeId] = useState<number | null>(null);
  const [coachLoading, setCoachLoading] = useState<Record<number, boolean>>({});
  const [coachFeedback, setCoachFeedback] = useState<Record<number, string>>({});
  const [showSitOutWarning, setShowSitOutWarning] = useState(false);
  const [showTiltCooldown, setShowTiltCooldown] = useState(false);
  const [tiltCooldownEnd, setTiltCooldownEnd] = useState(0);

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

  const { data: tradesData } = useListTrades();
  const trades = tradesData ?? [];
  const { mutateAsync: createTradeMut } = useCreateTrade();
  const { mutateAsync: deleteTradeMut } = useDeleteTrade();

  const draftTrades = trades.filter((t) => t.isDraft);
  const completedTrades = trades.filter((t) => !t.isDraft);

  const wins = completedTrades.filter((t) => t.outcome === "win").length;
  const losses = completedTrades.filter((t) => t.outcome === "loss").length;
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const fomoCount = completedTrades.filter((t) => t.behaviorTag === "FOMO").length;
  const disciplinedCount = completedTrades.filter((t) => t.behaviorTag === "Disciplined").length;

  const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : "http://localhost:8080/api";

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
      }
    } catch {}
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

  const activeCriteria = entryMode === "conservative" ? CONSERVATIVE_CRITERIA : AGGRESSIVE_CRITERIA;
  const criteriaChecked = activeCriteria.filter((c) => entryCriteria[c.key]).length;
  const allCriteriaMet = criteriaChecked === activeCriteria.length;

  const liveSetupScore = useMemo(() => {
    const parsedRisk = parseFloat(form.riskPct) || 0;
    const hasFvg = entryMode === "conservative" ? !!entryCriteria["gap"] : !!entryCriteria["fvg1m"];
    const followedTime = entryMode === "aggressive" ? !!entryCriteria["time"] : true;
    return calculateSetupScore(
      criteriaChecked,
      activeCriteria.length,
      hasFvg,
      form.liquiditySweep,
      followedTime,
      form.stressLevel,
      parsedRisk
    );
  }, [criteriaChecked, activeCriteria.length, entryCriteria, form.liquiditySweep, form.stressLevel, form.riskPct, entryMode]);

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

  function toggleCriterion(key: string) {
    setEntryCriteria((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function proceedToNewForm() {
    setEditingDraftId(null);
    setEntryMode("conservative");
    setEntryCriteria({});
    setForm({
      ...DEFAULT_FORM,
      entryTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
    });
    setShowForm(true);
    fireMobileAITrigger({ message: "Ready to log a trade? I can coach you on this setup!" });
  }

  function openNewForm() {
    if (!isRoutineComplete) {
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

  function openDraftForm(draft: Trade) {
    setEditingDraftId(draft.id);
    const draftNotes = draft.notes || "";
    const inferredMode: EntryMode = draftNotes.startsWith("[Silver Bullet]") ? "aggressive" : "conservative";
    setEntryMode(inferredMode);
    setEntryCriteria({});
    const cleanNotes = draftNotes.replace(/^\[(Conservative|Silver Bullet)\]\s*/, "");
    setForm({
      pair: draft.pair || "NQ1!",
      entryTime: draft.entryTime || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
      riskPct: draft.riskPct?.toString() || "0.5",
      liquiditySweep: draft.liquiditySweep || false,
      outcome: (draft.outcome || "") as OutcomeType,
      notes: cleanNotes,
      behaviorTag: (draft.behaviorTag || "") as BehaviorTag | "",
      followedTimeRule: draft.followedTimeRule ?? null,
      hasFvgConfirmation: draft.hasFvgConfirmation ?? null,
      stressLevel: draft.stressLevel || 5,
      setupTypes: [],
    });
    setShowForm(true);
    fireMobileAITrigger({ message: "Ready to log a trade? I can coach you on this setup!" });
  }

  const handleSubmit = useCallback(async () => {
    if (!form.pair || !form.riskPct) return Alert.alert("Fill in pair and risk %");
    if (!allCriteriaMet) return Alert.alert("Entry Criteria Required", "Check off all entry criteria before saving.");
    try {
      if (editingDraftId) {
        await deleteTradeMut({ id: editingDraftId });
      }
      const modeTag = entryMode === "conservative" ? "[Conservative]" : "[Silver Bullet]";
      const notesWithMode = form.notes ? `${modeTag} ${form.notes}` : modeTag;
      const safeSetupScore = Number.isInteger(liveSetupScore) && !isNaN(liveSetupScore) ? liveSetupScore : 0;
      const result = await createTradeMut({
        data: {
          pair: form.pair,
          entryTime: form.entryTime,
          riskPct: parseFloat(form.riskPct) || 0,
          liquiditySweep: form.liquiditySweep,
          outcome: form.outcome || undefined,
          notes: notesWithMode,
          behaviorTag: form.behaviorTag || undefined,
          followedTimeRule: form.followedTimeRule ?? undefined,
          hasFvgConfirmation: form.hasFvgConfirmation ?? undefined,
          stressLevel: form.stressLevel,
          isDraft: false,
          setupScore: safeSetupScore,
          setupType: form.setupTypes.length > 0 ? form.setupTypes.join(", ") : undefined,
        },
      });
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
      qc.invalidateQueries({ queryKey: [`/api/trades`] });
      setShowForm(false);
      setEditingDraftId(null);
      fireMobileAITrigger({ message: "Trade saved! Want a post-trade coaching review?" });
      if (result && result.id) {
        setExpandedTradeId(result.id);
        fetchCoachFeedback(result.id);
      }
    } catch (err: unknown) {
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
  }, [form, editingDraftId, entryMode, allCriteriaMet, createTradeMut, deleteTradeMut, qc, appMode]);

  const handleDelete = useCallback(async (id: number) => {
    Alert.alert("Delete Trade?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteTradeMut({ id });
          qc.invalidateQueries({ queryKey: [`/api/trades`] });
        },
      },
    ]);
  }, [deleteTradeMut, qc]);

  const tagInfo = (tag: string) => BEHAVIOR_TAGS.find((b) => b.tag === tag);

  if (tierLevel < 2) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.headerRow}>
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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

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

        {/* Routine Lockout Banner */}
        {!isRoutineComplete && (
          <View style={styles.lockBanner}>
            <Ionicons name="lock-closed" size={16} color="#F59E0B" />
            <Text style={styles.lockText}>Complete your Morning Routine to unlock trade logging</Text>
          </View>
        )}

        {/* Stats Row */}
        <View style={styles.statsRow}>
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
        </View>

        {/* Draft Trades from TradingView */}
        {draftTrades.length > 0 && (
          <View style={styles.draftSection}>
            <View style={styles.draftHeader}>
              <Ionicons name="radio" size={14} color="#F59E0B" />
              <Text style={styles.draftTitle}>{draftTrades.length} Draft{draftTrades.length > 1 ? "s" : ""} from TradingView</Text>
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

        {/* Learning Mode Example Entries */}
        {appMode === "lite" && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Ionicons name="school-outline" size={13} color={C.accent} />
              <Text style={[styles.sectionTitle, { marginBottom: 0, fontSize: 12, color: C.accent }]}>Example Journal Entries</Text>
            </View>
            {EXAMPLE_JOURNAL_ENTRIES.map((entry) => (
              <View key={entry.id} style={[styles.tradeCard, { borderColor: C.accent + "25", borderStyle: "dashed" }]}>
                <View style={styles.tradeHeader}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={styles.tradePair}>{entry.pair}</Text>
                    <View style={{ backgroundColor: C.accent + "20", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: C.accent + "40" }}>
                      <Text style={{ fontSize: 9, color: C.accent, fontFamily: "Inter_700Bold" }}>EXAMPLE</Text>
                    </View>
                  </View>
                  <View style={[styles.outcomeBadge, { backgroundColor: entry.outcome === "win" ? "#00C89620" : "#EF444420", borderColor: entry.outcome === "win" ? "#00C896" : "#EF4444" }]}>
                    <Text style={[styles.outcomeText, { color: entry.outcome === "win" ? "#00C896" : "#EF4444" }]}>
                      {entry.outcome.toUpperCase()}
                    </Text>
                  </View>
                </View>
                <View style={styles.tradeDetails}>
                  <Text style={styles.tradeDetail}>⏰ {entry.entryTime}</Text>
                  <Text style={styles.tradeDetail}>📊 {entry.riskPct}% risk</Text>
                  <Text style={styles.tradeDetail}>🏷 {entry.tag}</Text>
                </View>
                <Text style={{ fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 17, marginTop: 6 }}>
                  {entry.note}
                </Text>
              </View>
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
            {[...completedTrades].reverse().map((trade) => {
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
                      {appMode === "full" && trade.setupScore != null && (
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
                      {appMode === "full" && (feedback || loading) && (
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
                      {appMode === "lite" && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.cardBorder }}>
                          <Ionicons name="lock-closed" size={14} color={C.textSecondary} />
                          <Text style={{ fontSize: 12, color: C.textSecondary }}>Setup Score & AI Coach available in Full Mode</Text>
                        </View>
                      )}
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

            {/* Entry Mode Toggle */}
            <Text style={formStyles.fieldLabel}>Entry Mode</Text>
            <View style={ecStyles.modeRow}>
              <TouchableOpacity
                style={[ecStyles.modeBtn, entryMode === "conservative" && ecStyles.modeBtnActive]}
                onPress={() => { setEntryMode("conservative"); setEntryCriteria({}); }}
                activeOpacity={0.8}
              >
                <Ionicons name="shield-checkmark-outline" size={14} color={entryMode === "conservative" ? "#0A0A0F" : C.textSecondary} />
                <Text style={[ecStyles.modeBtnText, entryMode === "conservative" && ecStyles.modeBtnTextActive]}>Conservative</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ecStyles.modeBtn, entryMode === "aggressive" && ecStyles.modeBtnActiveAgg]}
                onPress={() => { setEntryMode("aggressive"); setEntryCriteria({}); }}
                activeOpacity={0.8}
              >
                <Ionicons name="flash-outline" size={14} color={entryMode === "aggressive" ? "#0A0A0F" : C.textSecondary} />
                <Text style={[ecStyles.modeBtnText, entryMode === "aggressive" && ecStyles.modeBtnTextActive]}>Silver Bullet</Text>
              </TouchableOpacity>
            </View>

            {/* Entry Criteria Checklist */}
            <View style={ecStyles.criteriaCard}>
              <View style={ecStyles.criteriaHeader}>
                <Ionicons name="list-outline" size={14} color={allCriteriaMet ? C.accent : "#F59E0B"} />
                <Text style={[ecStyles.criteriaTitle, { color: allCriteriaMet ? C.accent : "#F59E0B" }]}>
                  Entry Criteria
                </Text>
                <View style={[ecStyles.progressBadge, allCriteriaMet && { backgroundColor: C.accent + "25", borderColor: C.accent }]}>
                  <Text style={[ecStyles.progressText, allCriteriaMet && { color: C.accent }]}>
                    {criteriaChecked}/{activeCriteria.length}
                  </Text>
                </View>
              </View>
              <View style={ecStyles.progressBar}>
                <View style={[ecStyles.progressFill, { width: `${(criteriaChecked / activeCriteria.length) * 100}%` as unknown as number, backgroundColor: allCriteriaMet ? C.accent : "#F59E0B" }]} />
              </View>
              {activeCriteria.map((c) => (
                <TouchableOpacity key={c.key} style={ecStyles.criterionRow} onPress={() => toggleCriterion(c.key)} activeOpacity={0.7}>
                  <View style={[ecStyles.criterionCheck, entryCriteria[c.key] && ecStyles.criterionChecked]}>
                    {entryCriteria[c.key] && <Ionicons name="checkmark" size={13} color="#0A0A0F" />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[ecStyles.criterionLabel, entryCriteria[c.key] && { color: C.accent }]}>{c.label}</Text>
                    <Text style={ecStyles.criterionDesc}>{c.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {!allCriteriaMet && (
                <Text style={ecStyles.gateWarning}>All criteria must be checked to save this trade</Text>
              )}
            </View>

            {/* Entry Time & Risk */}
            <View style={formStyles.row}>
              <View style={{ flex: 1 }}>
                <Text style={formStyles.fieldLabel}>Entry Time</Text>
                <TextInput style={formStyles.input} value={form.entryTime} onChangeText={(v) => setField("entryTime", v)} placeholder="10:15 AM" placeholderTextColor={C.textSecondary} />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={formStyles.fieldLabel}>Risk %</Text>
                <TextInput style={formStyles.input} value={form.riskPct} onChangeText={(v) => setField("riskPct", v)} placeholder="0.5" placeholderTextColor={C.textSecondary} keyboardType="decimal-pad" />
              </View>
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

            {/* Liquidity Sweep */}
            <TouchableOpacity style={formStyles.toggleRow} onPress={() => setField("liquiditySweep", !form.liquiditySweep)}>
              <View style={[formStyles.checkbox, form.liquiditySweep && formStyles.checkboxChecked]}>
                {form.liquiditySweep && <Ionicons name="checkmark" size={13} color="#0A0A0F" />}
              </View>
              <View>
                <Text style={formStyles.toggleLabel}>Liquidity Sweep Confirmed</Text>
                <Text style={formStyles.toggleSub}>Price swept a swing high/low before entry</Text>
              </View>
            </TouchableOpacity>

            {/* Guided Questions */}
            <View style={formStyles.guidedSection}>
              <Text style={formStyles.guidedTitle}>Guided Questions</Text>
              <YesNoToggle
                value={form.followedTimeRule}
                onChange={(v) => setField("followedTimeRule", v)}
                label="Did you follow the 10 AM–11 AM Silver Bullet rule?"
              />
              <View style={formStyles.ynDivider} />
              <YesNoToggle
                value={form.hasFvgConfirmation}
                onChange={(v) => setField("hasFvgConfirmation", v)}
                label="Is there a 15-minute FVG confirmation?"
              />
              <View style={formStyles.ynDivider} />
              <StressSlider value={form.stressLevel} onChange={(v) => setField("stressLevel", v)} />
            </View>

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

            {/* Setup Types */}
            <Text style={formStyles.fieldLabel}>Setup Type (Confluence)</Text>
            <View style={formStyles.tagRow}>
              {SETUP_TYPES.map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    formStyles.tagBtn,
                    form.setupTypes.includes(st) && { backgroundColor: C.accent + "25", borderColor: C.accent },
                  ]}
                  onPress={() => {
                    const current = form.setupTypes;
                    setField(
                      "setupTypes",
                      current.includes(st) ? current.filter((s) => s !== st) : [...current, st]
                    );
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[formStyles.tagBtnText, form.setupTypes.includes(st) && { color: C.accent }]}>
                    {st}
                  </Text>
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

            {appMode === "full" ? (
            <View style={[scoreStyles.badge, { borderColor: getScoreColor(liveSetupScore) + "50", backgroundColor: getScoreColor(liveSetupScore) + "15" }]}>
              <View style={scoreStyles.badgeRow}>
                <Ionicons name="speedometer-outline" size={16} color={getScoreColor(liveSetupScore)} />
                <Text style={scoreStyles.badgeLabel}>Setup Score</Text>
              </View>
              <Text style={[scoreStyles.badgeValue, { color: getScoreColor(liveSetupScore) }]}>{liveSetupScore}/100</Text>
            </View>
            ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.cardBorder }}>
              <Ionicons name="lock-closed" size={14} color={C.textSecondary} />
              <Text style={{ fontSize: 12, color: C.textSecondary }}>Setup Score available in Full Mode</Text>
            </View>
            )}

            <TouchableOpacity style={[formStyles.submitBtn, !allCriteriaMet && { backgroundColor: C.cardBorder, opacity: 0.6 }]} onPress={handleSubmit} disabled={!allCriteriaMet}>
              <Text style={[formStyles.submitBtnText, !allCriteriaMet && { color: C.textSecondary }]}>
                {!allCriteriaMet ? `${criteriaChecked}/${activeCriteria.length} Criteria Met` : editingDraftId ? "Complete Trade Entry" : "Save Trade"}
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
  content: { padding: 16 },
  lockedCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  lockedTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text, marginTop: 8 },
  lockedSubtitle: { fontSize: 13, color: C.textSecondary, textAlign: "center", lineHeight: 20, paddingHorizontal: 16 },
  lockedBtn: { marginTop: 12, backgroundColor: C.accent, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  lockedBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
  disclaimer: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 16, marginHorizontal: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.cardBorder },
  disclaimerText: { flex: 1, fontSize: 10, color: C.textSecondary, lineHeight: 15, opacity: 0.7 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.text },
  monkBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.accent },
  monkBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.accent },
  lockBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(245,158,11,0.1)", borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.3)" },
  lockText: { flex: 1, fontSize: 13, color: "#F59E0B" },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: C.backgroundSecondary, borderRadius: 12, padding: 12, alignItems: "center", borderWidth: 1, borderColor: C.cardBorder },
  statValue: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text },
  statLabel: { fontSize: 10, color: C.textSecondary, marginTop: 2, textAlign: "center" },
  draftSection: { backgroundColor: "rgba(245,158,11,0.08)", borderRadius: 14, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "rgba(245,158,11,0.3)" },
  draftHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  draftTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#F59E0B" },
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


const ecStyles = StyleSheet.create({
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  modeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: 12, backgroundColor: C.backgroundSecondary, borderWidth: 1, borderColor: C.cardBorder },
  modeBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  modeBtnActiveAgg: { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
  modeBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.textSecondary },
  modeBtnTextActive: { color: "#0A0A0F", fontFamily: "Inter_700Bold" },
  criteriaCard: { backgroundColor: C.backgroundSecondary, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.accent + "33", marginBottom: 16 },
  criteriaHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  criteriaTitle: { flex: 1, fontSize: 11, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1 },
  progressBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: "rgba(245,158,11,0.15)", borderWidth: 1, borderColor: "#F59E0B" },
  progressText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#F59E0B" },
  progressBar: { height: 3, backgroundColor: C.cardBorder, borderRadius: 2, marginBottom: 12, overflow: "hidden" },
  progressFill: { height: "100%" as unknown as number, borderRadius: 2 },
  criterionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8 },
  criterionCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center", marginTop: 1 },
  criterionChecked: { backgroundColor: C.accent, borderColor: C.accent },
  criterionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text, marginBottom: 1 },
  criterionDesc: { fontSize: 12, color: C.textSecondary, lineHeight: 18 },
  gateWarning: { fontSize: 11, color: "#F59E0B", textAlign: "center", marginTop: 8, fontFamily: "Inter_500Medium" },
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
