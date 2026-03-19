import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePlanner } from "@/contexts/PlannerContext";
import Colors from "@/constants/colors";
import OnboardingTour, { useOnboardingTour } from "@/components/OnboardingTour";
import FullModeGate from "@/components/FullModeGate";

const C = Colors.dark;

const PLAN_KEY = "daily_trade_plan_v1";

type Bias = "bull" | "neutral" | "bear" | null;

interface KeyLevel {
  id: string;
  price: string;
  type: "support" | "resistance";
}

interface TradePlan {
  bias: Bias;
  keyLevels: KeyLevel[];
  targetSession: string | null;
  entryCriteria: Record<string, boolean>;
  notes: string;
}

const DEFAULT_PLAN: TradePlan = {
  bias: null,
  keyLevels: [],
  targetSession: null,
  entryCriteria: {},
  notes: "",
};

const ENTRY_CRITERIA = [
  { key: "htf_bias", label: "HTF Bias Confirmed", desc: "Higher timeframe confirms direction" },
  { key: "liquidity_swept", label: "Liquidity Swept", desc: "Stop-hunt / equal highs/lows taken" },
  { key: "fvg_present", label: "FVG Present", desc: "Fair Value Gap visible on entry TF" },
  { key: "order_block", label: "Order Block Identified", desc: "Valid OB at POI" },
  { key: "premium_discount", label: "Premium / Discount Zone", desc: "Entering in discount (long) or premium (short)" },
  { key: "killzone", label: "In Killzone", desc: "London Open, NY Open, or Silver Bullet" },
];

const SESSIONS = [
  { key: "london", name: "London Open", time: "2–5 AM EST", color: "#818CF8", icon: "globe-outline" as const },
  { key: "silver-bullet", name: "Silver Bullet", time: "10–11 AM EST", color: "#F59E0B", icon: "flash-outline" as const },
  { key: "ny-open", name: "NY Open", time: "9:30–10 AM EST", color: "#00C896", icon: "trending-up-outline" as const },
];

function getESTNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + -5 * 3600000);
}

export default function PlannerScreenGated() {
  return (
    <FullModeGate>
      <PlannerScreen />
    </FullModeGate>
  );
}

function PlannerScreen() {
  const {
    routineItems, isRoutineComplete, hasRedNews, toggleItem, toggleRedNews,
    customItems, addCustomItem, removeCustomItem, toggleCustomItem, snoozeCustomItem,
  } = usePlanner();

  const [plan, setPlan] = useState<TradePlan>({ ...DEFAULT_PLAN });
  const [newLevelInput, setNewLevelInput] = useState("");
  const [newLevelType, setNewLevelType] = useState<"support" | "resistance">("support");
  const [newItemText, setNewItemText] = useState("");
  const [, setTick] = useState(0);
  const { shouldShow: showTour, completeTour } = useOnboardingTour();

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(PLAN_KEY).then((planVal) => {
      if (planVal) {
        try { setPlan(JSON.parse(planVal)); } catch {}
      }
    });
  }, []);

  const savePlan = useCallback((updated: TradePlan) => {
    setPlan(updated);
    AsyncStorage.setItem(PLAN_KEY, JSON.stringify(updated));
  }, []);

  const est = getESTNow();
  const timeStr = est.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const dateStr = est.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const completedCount = Object.values(routineItems).filter(Boolean).length;
  const todayDate = new Date().toISOString().split("T")[0];
  const criteriaCompleteCount = ENTRY_CRITERIA.filter((c) => plan.entryCriteria[c.key]).length;
  const allCriteriaGreen = criteriaCompleteCount === ENTRY_CRITERIA.length;

  function handleAddLevel() {
    const trimmed = newLevelInput.trim();
    if (!trimmed) return;
    const level: KeyLevel = { id: Date.now().toString(), price: trimmed, type: newLevelType };
    savePlan({ ...plan, keyLevels: [...plan.keyLevels, level] });
    setNewLevelInput("");
  }

  function removeLevel(id: string) {
    savePlan({ ...plan, keyLevels: plan.keyLevels.filter((l) => l.id !== id) });
  }

  function toggleCriterion(key: string) {
    savePlan({ ...plan, entryCriteria: { ...plan.entryCriteria, [key]: !plan.entryCriteria[key] } });
  }

  const biasConfig = {
    bull: { label: "BULLISH", icon: "trending-up" as const, color: "#00C896", bg: "#00C89618" },
    neutral: { label: "NEUTRAL", icon: "remove" as const, color: "#F59E0B", bg: "#F59E0B18" },
    bear: { label: "BEARISH", icon: "trending-down" as const, color: "#EF4444", bg: "#EF444418" },
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <OnboardingTour visible={showTour} onComplete={completeTour} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Daily Planner</Text>
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>
          <View style={styles.clockBadge}>
            <Text style={styles.clockText}>{timeStr}</Text>
            <Text style={styles.clockSub}>EST</Text>
          </View>
        </View>

        {/* Red News Warning Banner */}
        {hasRedNews && (
          <View style={styles.redAlert}>
            <Ionicons name="warning" size={22} color="#FF4444" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.redAlertTitle}>🔴 RED FOLDER ACTIVE</Text>
              <Text style={styles.redAlertText}>You are watching only — do NOT trade. Wait until the big price swings calm down.</Text>
            </View>
          </View>
        )}

        {/* Trading Status */}
        <View style={[styles.statusCard, { borderColor: isRoutineComplete && !hasRedNews ? C.accent : "#F59E0B" }]}>
          <View style={styles.statusRow}>
            <Ionicons
              name={isRoutineComplete && !hasRedNews ? "checkmark-circle" : "lock-closed"}
              size={22}
              color={isRoutineComplete && !hasRedNews ? C.accent : "#F59E0B"}
            />
            <Text style={[styles.statusText, { color: isRoutineComplete && !hasRedNews ? C.accent : "#F59E0B" }]}>
              {hasRedNews
                ? "SPECTATOR MODE — Red News Event"
                : isRoutineComplete
                ? "✓ TRADING UNLOCKED"
                : `Complete Routine (${completedCount}/4) to unlock trading`}
            </Text>
          </View>
          {!isRoutineComplete && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(completedCount / 4) * 100}%` }]} />
            </View>
          )}
        </View>

        {/* ─── TRADE PLAN SECTION ─── */}
        <Text style={styles.sectionTitle}>Trade Plan</Text>

        {/* Market Bias */}
        <View style={styles.planCard}>
          <Text style={styles.planCardLabel}>MARKET BIAS</Text>
          <View style={styles.biasRow}>
            {(["bull", "neutral", "bear"] as const).map((b) => {
              const cfg = biasConfig[b];
              const active = plan.bias === b;
              return (
                <TouchableOpacity
                  key={b}
                  style={[styles.biasBtn, active && { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                  onPress={() => savePlan({ ...plan, bias: active ? null : b })}
                >
                  <Ionicons name={cfg.icon} size={20} color={active ? cfg.color : C.textSecondary} />
                  <Text style={[styles.biasBtnLabel, { color: active ? cfg.color : C.textSecondary }]}>{cfg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Key Levels */}
        <View style={styles.planCard}>
          <Text style={styles.planCardLabel}>KEY LEVELS</Text>

          {plan.keyLevels.length === 0 ? (
            <Text style={styles.planCardEmpty}>Add key support / resistance levels to watch</Text>
          ) : (
            <View style={styles.priceLadder}>
              {[...plan.keyLevels]
                .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
                .map((level) => (
                  <View key={level.id} style={styles.ladderRow}>
                    <View style={[styles.ladderDot, { backgroundColor: level.type === "resistance" ? "#EF4444" : "#00C896" }]} />
                    <View style={[styles.ladderLine, { borderColor: level.type === "resistance" ? "#EF444444" : "#00C89644" }]} />
                    <Text style={[styles.ladderPrice, { color: level.type === "resistance" ? "#EF4444" : "#00C896" }]}>{level.price}</Text>
                    <Text style={[styles.ladderType, { color: level.type === "resistance" ? "#EF444488" : "#00C89688" }]}>
                      {level.type === "resistance" ? "R" : "S"}
                    </Text>
                    <TouchableOpacity onPress={() => removeLevel(level.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={16} color={C.textTertiary} />
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
          )}

          <View style={styles.levelInputRow}>
            <TextInput
              style={styles.levelInput}
              placeholder="Enter price level (e.g. 21050)"
              placeholderTextColor={C.textTertiary}
              value={newLevelInput}
              onChangeText={setNewLevelInput}
              keyboardType="numeric"
              onSubmitEditing={handleAddLevel}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.levelTypeToggle, { backgroundColor: newLevelType === "resistance" ? "#EF444415" : "#00C89615", borderColor: newLevelType === "resistance" ? "#EF444444" : "#00C89644" }]}
              onPress={() => setNewLevelType((t) => t === "support" ? "resistance" : "support")}
            >
              <Text style={{ fontSize: 10, color: newLevelType === "resistance" ? "#EF4444" : "#00C896", fontFamily: "Inter_700Bold" }}>
                {newLevelType === "resistance" ? "RES" : "SUP"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.levelAddBtn, !newLevelInput.trim() && { opacity: 0.4 }]}
              onPress={handleAddLevel}
              disabled={!newLevelInput.trim()}
            >
              <Ionicons name="add" size={18} color="#0A0A0F" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Session Target */}
        <View style={styles.planCard}>
          <Text style={styles.planCardLabel}>TARGET SESSION</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {SESSIONS.map((session) => {
              const active = plan.targetSession === session.key;
              return (
                <TouchableOpacity
                  key={session.key}
                  style={[styles.sessionBtn, active && { borderColor: session.color, backgroundColor: session.color + "18" }]}
                  onPress={() => savePlan({ ...plan, targetSession: active ? null : session.key })}
                >
                  <Ionicons name={session.icon} size={16} color={active ? session.color : C.textSecondary} />
                  <Text style={[styles.sessionBtnName, { color: active ? session.color : C.textSecondary }]}>{session.name}</Text>
                  <Text style={[styles.sessionBtnTime, { color: active ? session.color + "aa" : C.textTertiary }]}>{session.time}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Entry Criteria */}
        <View style={styles.planCard}>
          <View style={styles.planCardHeader}>
            <Text style={styles.planCardLabel}>ENTRY CRITERIA</Text>
            <View style={[styles.criteriaBadge, { backgroundColor: allCriteriaGreen ? C.accent + "20" : "#33333380" }]}>
              <Text style={[styles.criteriaBadgeText, { color: allCriteriaGreen ? C.accent : C.textSecondary }]}>
                {criteriaCompleteCount}/{ENTRY_CRITERIA.length}
              </Text>
            </View>
          </View>
          {ENTRY_CRITERIA.map((criterion, idx) => {
            const checked = !!plan.entryCriteria[criterion.key];
            return (
              <TouchableOpacity
                key={criterion.key}
                style={[styles.criterionRow, idx > 0 && { borderTopWidth: 1, borderTopColor: C.cardBorder }]}
                onPress={() => toggleCriterion(criterion.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.criterionCheck, checked && { backgroundColor: C.accent, borderColor: C.accent }]}>
                  {checked && <Ionicons name="checkmark" size={12} color="#0A0A0F" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.criterionLabel, { color: checked ? C.text : C.textSecondary }]}>{criterion.label}</Text>
                  <Text style={styles.criterionDesc}>{criterion.desc}</Text>
                </View>
                <View style={[styles.passFailDot, { backgroundColor: checked ? "#00C89630" : "#EF444430", borderColor: checked ? "#00C896" : "#EF4444" }]}>
                  <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color: checked ? "#00C896" : "#EF4444" }}>
                    {checked ? "✓" : "✗"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {plan.bias && plan.targetSession && (
            <View style={[styles.planReadiness, { borderColor: allCriteriaGreen ? C.accent : "#F59E0B", backgroundColor: allCriteriaGreen ? C.accent + "10" : "#F59E0B10" }]}>
              <Ionicons name={allCriteriaGreen ? "checkmark-circle" : "alert-circle"} size={16} color={allCriteriaGreen ? C.accent : "#F59E0B"} />
              <Text style={[styles.planReadinessText, { color: allCriteriaGreen ? C.accent : "#F59E0B" }]}>
                {allCriteriaGreen ? "Plan is ready — all criteria met" : `${ENTRY_CRITERIA.length - criteriaCompleteCount} criteria still needed`}
              </Text>
            </View>
          )}
        </View>

        {/* My Routine */}
        <Text style={styles.sectionTitle}>My Routine</Text>
        <View style={styles.card}>
          {customItems.filter((item) => item.snoozedDate !== todayDate).length === 0 && !newItemText ? (
            <View style={styles.emptyRoutine}>
              <Ionicons name="add-circle-outline" size={20} color={C.textTertiary} />
              <Text style={styles.emptyRoutineText}>Add personal routine items below</Text>
            </View>
          ) : (
            customItems
              .filter((item) => item.snoozedDate !== todayDate)
              .map((item, idx) => (
                <View key={item.id}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.customRow}>
                    <TouchableOpacity
                      style={styles.customRowLeft}
                      onPress={() => toggleCustomItem(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, item.checked && styles.customCheckboxChecked]}>
                        {item.checked && <Ionicons name="checkmark" size={13} color="#0A0A0F" />}
                      </View>
                      <Text style={[styles.routineLabel, item.checked && styles.routineLabelDone]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.customActions}>
                      <TouchableOpacity
                        onPress={() => snoozeCustomItem(item.id)}
                        style={styles.actionBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="time-outline" size={18} color={C.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          Alert.alert("Delete Item", `Remove "${item.label}" from your routine?`, [
                            { text: "Cancel", style: "cancel" },
                            { text: "Delete", style: "destructive", onPress: () => removeCustomItem(item.id) },
                          ])
                        }
                        style={styles.actionBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
          )}
          <View style={styles.divider} />
          <View style={styles.addItemRow}>
            <TextInput
              style={styles.addItemInput}
              placeholder="Add a routine item..."
              placeholderTextColor={C.textTertiary}
              value={newItemText}
              onChangeText={setNewItemText}
              onSubmitEditing={() => {
                if (newItemText.trim()) {
                  addCustomItem(newItemText);
                  setNewItemText("");
                }
              }}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={() => {
                if (newItemText.trim()) {
                  addCustomItem(newItemText);
                  setNewItemText("");
                }
              }}
              style={[styles.addBtn, !newItemText.trim() && styles.addBtnDisabled]}
              disabled={!newItemText.trim()}
            >
              <Ionicons name="add" size={20} color={newItemText.trim() ? "#0A0A0F" : C.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Rules Before I Trade */}
        <Text style={styles.sectionTitle}>Rules Before I Trade</Text>
        <View style={styles.card}>
          {[
            "Never risk more than 0.5% of my account on one trade",
            "Only trade during the 10–11 AM Silver Bullet window",
            "If there is big Red folder news, I watch — I don't trade",
            "Finish my Morning Routine before I take any trade",
            "Always keep my stop loss where I set it — no moving it",
          ].map((rule, i) => (
            <View key={i} style={[styles.ruleRow, i > 0 && styles.ruleRowBorder]}>
              <Text style={styles.ruleNum}>{i + 1}</Text>
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: Platform.OS === "ios" ? 100 : 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: { flex: 1 },
  content: { padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.text },
  dateText: { fontSize: 13, color: C.textSecondary, marginTop: 2 },
  clockBadge: { backgroundColor: C.backgroundSecondary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center", borderWidth: 1, borderColor: C.cardBorder },
  clockText: { fontSize: 13, fontFamily: "Inter_700Bold", color: C.accent },
  clockSub: { fontSize: 9, color: C.textSecondary, marginTop: 1 },
  redAlert: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "rgba(255,68,68,0.1)", borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "rgba(255,68,68,0.35)" },
  redAlertTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FF4444", marginBottom: 3 },
  redAlertText: { fontSize: 13, color: "#FF9999", lineHeight: 18 },
  statusCard: { borderRadius: 14, padding: 14, marginBottom: 22, backgroundColor: C.backgroundSecondary, borderWidth: 1.5 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusText: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  progressBar: { height: 4, backgroundColor: C.cardBorder, borderRadius: 2, marginTop: 10, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#F59E0B", borderRadius: 2 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10, marginTop: 2 },
  card: { backgroundColor: C.backgroundSecondary, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 22, overflow: "hidden" },
  divider: { height: 1, backgroundColor: C.cardBorder },

  planCard: { backgroundColor: C.backgroundSecondary, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder, padding: 16, marginBottom: 12 },
  planCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  planCardLabel: { fontSize: 10, fontFamily: "Inter_700Bold", color: C.textSecondary, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 12 },
  planCardEmpty: { fontSize: 12, color: C.textTertiary, fontFamily: "Inter_400Regular", marginBottom: 12 },

  biasRow: { flexDirection: "row", gap: 8 },
  biasBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12, backgroundColor: C.backgroundTertiary, borderWidth: 1.5, borderColor: C.cardBorder, gap: 4 },
  biasBtnLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },

  priceLadder: { marginBottom: 12 },
  ladderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  ladderDot: { width: 8, height: 8, borderRadius: 4 },
  ladderLine: { flex: 1, height: 1, borderTopWidth: 1, borderStyle: "dashed" },
  ladderPrice: { fontSize: 14, fontFamily: "Inter_700Bold", minWidth: 70, textAlign: "right" },
  ladderType: { fontSize: 10, fontFamily: "Inter_700Bold", width: 14 },
  levelInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  levelInput: { flex: 1, backgroundColor: C.backgroundTertiary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: C.text, fontFamily: "Inter_500Medium", borderWidth: 1, borderColor: C.cardBorder },
  levelTypeToggle: { paddingHorizontal: 8, paddingVertical: 8, backgroundColor: C.backgroundTertiary, borderRadius: 8, borderWidth: 1, borderColor: C.cardBorder },
  levelAddBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },

  sessionBtn: { flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: C.cardBorder, backgroundColor: C.backgroundTertiary, padding: 10, alignItems: "center", gap: 3 },
  sessionBtnName: { fontSize: 10, fontFamily: "Inter_700Bold", textAlign: "center" },
  sessionBtnTime: { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },

  criteriaBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  criteriaBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  criterionRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  criterionCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" },
  criterionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 1 },
  criterionDesc: { fontSize: 11, color: C.textTertiary },
  passFailDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  planReadiness: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, padding: 10, borderRadius: 10, borderWidth: 1 },
  planReadinessText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },

  routineLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: C.text },
  routineLabelDone: { color: C.textSecondary, textDecorationLine: "line-through" },
  ruleRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 14, paddingVertical: 10 },
  ruleRowBorder: { borderTopWidth: 1, borderTopColor: C.cardBorder },
  ruleNum: { width: 22, fontSize: 13, fontFamily: "Inter_700Bold", color: C.accent },
  ruleText: { flex: 1, fontSize: 13, color: C.text, lineHeight: 20 },
  emptyRoutine: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 18, gap: 8 },
  emptyRoutineText: { fontSize: 13, color: C.textTertiary },
  customRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingLeft: 14, paddingRight: 6 },
  customRowLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center", marginRight: 12 },
  customCheckboxChecked: { backgroundColor: C.textSecondary, borderColor: C.textSecondary },
  customActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  actionBtn: { padding: 8 },
  addItemRow: { flexDirection: "row", alignItems: "center", padding: 10, paddingLeft: 14, gap: 8 },
  addItemInput: { flex: 1, fontSize: 14, color: C.text, fontFamily: "Inter_500Medium", paddingVertical: 6 },
  addBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  addBtnDisabled: { backgroundColor: C.cardBorder },
});
