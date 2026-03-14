import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import { useListTrades, useCreateTrade, useDeleteTrade } from "@workspace/api-client-react";
import { usePlanner } from "@/contexts/PlannerContext";
import Colors from "@/constants/colors";

const C = Colors.dark;

type BehaviorTag = "FOMO" | "Chased" | "Disciplined" | "Greedy";
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
  { tag: "Greedy", label: "I held too long", color: "#EF4444", icon: "flame-outline" },
];

const EXIT_RULES = [
  "Keep your stop loss where you set it — no exceptions",
  "Don't move your stop to breakeven too early",
  "Wait for price to reach your target — don't exit early",
  "Get out if the market turns against you (MSS — Market Structure Shift)",
];

const NQ_PAIRS = ["NQ1!", "MNQ1!", "ES1!", "MES1!", "RTY1!", "YM1!"];

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

export default function JournalScreen() {
  const { isRoutineComplete } = usePlanner();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showMonk, setShowMonk] = useState(false);
  const [form, setForm] = useState<TradeFormData>({ ...DEFAULT_FORM });
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [entryMode, setEntryMode] = useState<EntryMode>("conservative");
  const [entryCriteria, setEntryCriteria] = useState<Record<string, boolean>>({});

  const { data: tradesData } = useListTrades();
  const trades = tradesData ?? [];
  const { mutateAsync: createTradeMut } = useCreateTrade();
  const { mutateAsync: deleteTradeMut } = useDeleteTrade();

  const draftTrades = (trades as any[]).filter((t: any) => t.isDraft);
  const completedTrades = (trades as any[]).filter((t: any) => !t.isDraft);

  const wins = completedTrades.filter((t: any) => t.outcome === "win").length;
  const losses = completedTrades.filter((t: any) => t.outcome === "loss").length;
  const total = wins + losses;
  const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

  const fomoCount = completedTrades.filter((t: any) => t.behaviorTag === "FOMO").length;
  const disciplinedCount = completedTrades.filter((t: any) => t.behaviorTag === "Disciplined").length;

  function setField<K extends keyof TradeFormData>(key: K, val: TradeFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  const activeCriteria = entryMode === "conservative" ? CONSERVATIVE_CRITERIA : AGGRESSIVE_CRITERIA;
  const criteriaChecked = activeCriteria.filter((c) => entryCriteria[c.key]).length;
  const allCriteriaMet = criteriaChecked === activeCriteria.length;

  function toggleCriterion(key: string) {
    setEntryCriteria((prev) => ({ ...prev, [key]: !prev[key] }));
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
    setEditingDraftId(null);
    setEntryMode("conservative");
    setEntryCriteria({});
    setForm({
      ...DEFAULT_FORM,
      entryTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
    });
    setShowForm(true);
  }

  function openDraftForm(draft: any) {
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
      outcome: draft.outcome || "",
      notes: cleanNotes,
      behaviorTag: draft.behaviorTag || "",
      followedTimeRule: draft.followedTimeRule ?? null,
      hasFvgConfirmation: draft.hasFvgConfirmation ?? null,
      stressLevel: draft.stressLevel || 5,
    });
    setShowForm(true);
  }

  const handleSubmit = useCallback(async () => {
    if (!form.pair || !form.riskPct) return Alert.alert("Fill in pair and risk %");
    if (!allCriteriaMet) return Alert.alert("Entry Criteria Required", "Check off all entry criteria before saving.");
    try {
      if (editingDraftId) {
        await deleteTradeMut(editingDraftId);
      }
      const modeTag = entryMode === "conservative" ? "[Conservative]" : "[Silver Bullet]";
      const notesWithMode = form.notes ? `${modeTag} ${form.notes}` : modeTag;
      await createTradeMut({
        pair: form.pair,
        entryTime: form.entryTime,
        riskPct: form.riskPct,
        liquiditySweep: form.liquiditySweep,
        outcome: form.outcome || undefined,
        notes: notesWithMode,
        behaviorTag: form.behaviorTag || undefined,
        followedTimeRule: form.followedTimeRule ?? undefined,
        hasFvgConfirmation: form.hasFvgConfirmation ?? undefined,
        stressLevel: form.stressLevel,
        isDraft: false,
      } as any);
      qc.invalidateQueries({ queryKey: [`/api/trades`] });
      setShowForm(false);
      setEditingDraftId(null);
    } catch {
      Alert.alert("Error", "Could not save trade");
    }
  }, [form, editingDraftId, entryMode, allCriteriaMet, createTradeMut, deleteTradeMut, qc]);

  const handleDelete = useCallback(async (id: number) => {
    Alert.alert("Delete Trade?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteTradeMut(id);
          qc.invalidateQueries({ queryKey: [`/api/trades`] });
        },
      },
    ]);
  }, [deleteTradeMut, qc]);

  const tagInfo = (tag: string) => BEHAVIOR_TAGS.find((b) => b.tag === tag);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Smart Journal</Text>
          <TouchableOpacity style={styles.monkBtn} onPress={() => setShowMonk(true)}>
            <Ionicons name="eye-off-outline" size={16} color={C.accent} />
            <Text style={styles.monkBtnText}>Monk</Text>
          </TouchableOpacity>
        </View>

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
            <Text style={[styles.statValue, { color: C.accent }]}>{winRate}%</Text>
            <Text style={styles.statLabel}>Win Rate</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: "#F59E0B" }]}>{fomoCount}</Text>
            <Text style={styles.statLabel}>FOMO</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: "#00C896" }]}>{disciplinedCount}</Text>
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
            {draftTrades.map((draft: any) => (
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
            {[...completedTrades].reverse().map((trade: any) => {
              const tag = tagInfo(trade.behaviorTag);
              const isWin = trade.outcome === "win";
              const isLoss = trade.outcome === "loss";
              return (
                <View key={trade.id} style={styles.tradeCard}>
                  <View style={styles.tradeHeader}>
                    <Text style={styles.tradePair}>{trade.pair}</Text>
                    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                      {tag && (
                        <View style={[styles.tagBadge, { backgroundColor: tag.color + "20", borderColor: tag.color }]}>
                          <Text style={[styles.tagText, { color: tag.color }]}>{tag.tag}</Text>
                        </View>
                      )}
                      {trade.outcome && (
                        <View style={[styles.outcomeBadge, { backgroundColor: isWin ? "#00C89620" : isLoss ? "#EF444420" : "#444", borderColor: isWin ? "#00C896" : isLoss ? "#EF4444" : "#666" }]}>
                          <Text style={[styles.outcomeText, { color: isWin ? "#00C896" : isLoss ? "#EF4444" : C.textSecondary }]}>
                            {trade.outcome.toUpperCase()}
                          </Text>
                        </View>
                      )}
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
                    <Text style={styles.tradeNotes} numberOfLines={2}>{trade.notes.replace(/^\[(Conservative|Silver Bullet)\]\s*/, "").trim()}</Text>
                  ) : null}
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(trade.id)}>
                    <Ionicons name="trash-outline" size={14} color={C.textSecondary} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}

        <View style={{ height: 100 }} />
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
                <View style={[ecStyles.progressFill, { width: `${(criteriaChecked / activeCriteria.length) * 100}%` as any, backgroundColor: allCriteriaMet ? C.accent : "#F59E0B" }]} />
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
                  <Ionicons name={icon as any} size={14} color={form.behaviorTag === tag ? color : C.textSecondary} />
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

            <TouchableOpacity style={[formStyles.submitBtn, !allCriteriaMet && { backgroundColor: C.cardBorder, opacity: 0.6 }]} onPress={handleSubmit} disabled={!allCriteriaMet}>
              <Text style={[formStyles.submitBtnText, !allCriteriaMet && { color: C.textSecondary }]}>
                {!allCriteriaMet ? `${criteriaChecked}/${activeCriteria.length} Criteria Met` : editingDraftId ? "Complete Trade Entry" : "Save Trade"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Monk Mode Modal */}
      <Modal visible={showMonk} animationType="fade" statusBarTranslucent>
        <View style={monkStyles.overlay}>
          <Text style={monkStyles.title}>⚡ MONK MODE</Text>
          <Text style={monkStyles.sub}>Stay focused. Follow your plan.</Text>
          <View style={monkStyles.rulesCard}>
            {EXIT_RULES.map((r, i) => (
              <View key={i} style={monkStyles.ruleRow}>
                <View style={monkStyles.bullet} />
                <Text style={monkStyles.ruleText}>{r}</Text>
              </View>
            ))}
          </View>
          <TouchableOpacity style={monkStyles.closeBtn} onPress={() => setShowMonk(false)}>
            <Text style={monkStyles.closeBtnText}>Exit Monk Mode</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: { flex: 1 },
  content: { padding: 16 },
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

const monkStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#050505", justifyContent: "center", padding: 24 },
  title: { fontSize: 30, fontFamily: "Inter_700Bold", color: C.text, textAlign: "center", marginBottom: 6 },
  sub: { fontSize: 14, color: C.textSecondary, textAlign: "center", marginBottom: 32 },
  rulesCard: { backgroundColor: "#0F1A14", borderRadius: 18, padding: 20, borderWidth: 1, borderColor: C.accent + "44", marginBottom: 24 },
  ruleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 14 },
  bullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent, marginTop: 8 },
  ruleText: { flex: 1, fontSize: 16, color: C.text, lineHeight: 26 },
  closeBtn: { backgroundColor: C.accent, borderRadius: 16, padding: 18, alignItems: "center" },
  closeBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
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
  progressFill: { height: "100%" as any, borderRadius: 2 },
  criterionRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingVertical: 8 },
  criterionCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center", marginTop: 1 },
  criterionChecked: { backgroundColor: C.accent, borderColor: C.accent },
  criterionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text, marginBottom: 1 },
  criterionDesc: { fontSize: 12, color: C.textSecondary, lineHeight: 18 },
  gateWarning: { fontSize: 11, color: "#F59E0B", textAlign: "center", marginTop: 8, fontFamily: "Inter_500Medium" },
});
