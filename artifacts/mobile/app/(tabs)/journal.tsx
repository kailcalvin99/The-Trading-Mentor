import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Platform,
  Alert,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

const C = Colors.dark;

interface Trade {
  id: number;
  pair: string;
  entryTime: string;
  riskPct: number;
  liquiditySweep: boolean;
  outcome?: string;
  notes?: string;
  createdAt: string;
}

const PAIRS = ["EUR/USD", "GBP/USD", "NAS100", "US30", "US500", "XAU/USD", "BTC/USD", "GBP/JPY"];
const OUTCOMES = ["Win", "Loss", "Break Even", "Missed"];

function TradeCard({ trade, onDelete }: { trade: Trade; onDelete: () => void }) {
  const isWin = trade.outcome === "Win";
  const isLoss = trade.outcome === "Loss";

  return (
    <View style={styles.tradeCard}>
      <View style={styles.tradeHeader}>
        <View style={styles.tradePairBg}>
          <Text style={styles.tradePair}>{trade.pair}</Text>
        </View>
        <View style={styles.tradeHeaderRight}>
          <View
            style={[
              styles.outcomeBadge,
              isWin
                ? styles.outcomeBadgeWin
                : isLoss
                ? styles.outcomeBadgeLoss
                : styles.outcomeBadgeNeutral,
            ]}
          >
            <Text
              style={[
                styles.outcomeBadgeText,
                isWin
                  ? { color: C.accent }
                  : isLoss
                  ? { color: C.accentAlert }
                  : { color: C.textSecondary },
              ]}
            >
              {trade.outcome || "Pending"}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.5 }]}
            onPress={onDelete}
          >
            <Ionicons name="trash-outline" size={16} color={C.textTertiary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.tradeDetails}>
        <View style={styles.tradeDetail}>
          <Ionicons name="time-outline" size={13} color={C.textTertiary} />
          <Text style={styles.tradeDetailText}>{trade.entryTime}</Text>
        </View>
        <View style={styles.tradeDetail}>
          <Ionicons name="trending-down-outline" size={13} color={C.textTertiary} />
          <Text style={styles.tradeDetailText}>Risk: {trade.riskPct}%</Text>
        </View>
        <View style={styles.tradeDetail}>
          <Ionicons
            name={trade.liquiditySweep ? "checkmark-circle" : "close-circle"}
            size={13}
            color={trade.liquiditySweep ? C.accent : C.accentAlert}
          />
          <Text
            style={[
              styles.tradeDetailText,
              { color: trade.liquiditySweep ? C.accent : C.accentAlert },
            ]}
          >
            {trade.liquiditySweep ? "Liq. Swept" : "No Sweep"}
          </Text>
        </View>
      </View>

      {trade.notes ? (
        <Text style={styles.tradeNotes} numberOfLines={2}>
          {trade.notes}
        </Text>
      ) : null}
    </View>
  );
}

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const [pair, setPair] = useState("EUR/USD");
  const [entryTime, setEntryTime] = useState("");
  const [riskPct, setRiskPct] = useState("1");
  const [liquiditySweep, setLiquiditySweep] = useState(false);
  const [outcome, setOutcome] = useState("Win");
  const [notes, setNotes] = useState("");

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: trades = [], isLoading } = useQuery<Trade[]>({
    queryKey: ["trades"],
    queryFn: () => apiGet("trades"),
  });

  const createMutation = useMutation({
    mutationFn: (data: Omit<Trade, "id" | "createdAt">) =>
      apiPost<Trade>("trades", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trades"] });
      setShowForm(false);
      resetForm();
    },
    onError: () => Alert.alert("Error", "Could not save trade."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`trades/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["trades"] }),
  });

  function resetForm() {
    setPair("EUR/USD");
    setEntryTime("");
    setRiskPct("1");
    setLiquiditySweep(false);
    setOutcome("Win");
    setNotes("");
  }

  function handleSubmit() {
    if (!entryTime.trim()) {
      Alert.alert("Error", "Enter the entry time.");
      return;
    }
    const risk = parseFloat(riskPct);
    if (!risk || risk <= 0 || risk > 5) {
      Alert.alert("Error", "Risk must be between 0.1% and 5%.");
      return;
    }
    createMutation.mutate({
      pair,
      entryTime: entryTime.trim(),
      riskPct: risk,
      liquiditySweep,
      outcome,
      notes: notes.trim() || undefined,
    });
  }

  const wins = trades.filter((t) => t.outcome === "Win").length;
  const losses = trades.filter((t) => t.outcome === "Loss").length;
  const sweepPct =
    trades.length > 0
      ? Math.round((trades.filter((t) => t.liquiditySweep).length / trades.length) * 100)
      : 0;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 34 + 100 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headingRow}>
          <View>
            <Text style={styles.heading}>Trade Journal</Text>
            <Text style={styles.subheading}>{trades.length} trades logged</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.85 }]}
            onPress={() => setShowForm(!showForm)}
          >
            <Ionicons name={showForm ? "close" : "add"} size={22} color="#000" />
          </Pressable>
        </View>

        {/* Stats Row */}
        {trades.length > 0 && (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: C.accent }]}>{wins}</Text>
              <Text style={styles.statLabel}>Wins</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: C.accentAlert }]}>{losses}</Text>
              <Text style={styles.statLabel}>Losses</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: C.accentWarn }]}>{sweepPct}%</Text>
              <Text style={styles.statLabel}>Swept Liq.</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : 0}%
              </Text>
              <Text style={styles.statLabel}>Win Rate</Text>
            </View>
          </View>
        )}

        {/* Form */}
        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Log New Trade</Text>

            <Text style={styles.fieldLabel}>Currency Pair</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {PAIRS.map((p) => (
                  <Pressable
                    key={p}
                    style={({ pressed }) => [
                      styles.chip,
                      pair === p && styles.chipActive,
                      pressed && { opacity: 0.75 },
                    ]}
                    onPress={() => setPair(p)}
                  >
                    <Text style={[styles.chipText, pair === p && styles.chipTextActive]}>{p}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.fieldLabel}>Entry Time (e.g. 10:15 AM EST)</Text>
            <TextInput
              style={styles.textInput}
              value={entryTime}
              onChangeText={setEntryTime}
              placeholder="10:15 AM EST"
              placeholderTextColor={C.textTertiary}
            />

            <Text style={styles.fieldLabel}>Risk % (max 2% for prop firm safety)</Text>
            <TextInput
              style={styles.textInput}
              value={riskPct}
              onChangeText={setRiskPct}
              placeholder="1"
              placeholderTextColor={C.textTertiary}
              keyboardType="numeric"
            />

            <Text style={styles.fieldLabel}>Outcome</Text>
            <View style={styles.chipRow}>
              {OUTCOMES.map((o) => (
                <Pressable
                  key={o}
                  style={({ pressed }) => [
                    styles.chip,
                    outcome === o && styles.chipActive,
                    pressed && { opacity: 0.75 },
                  ]}
                  onPress={() => setOutcome(o)}
                >
                  <Text style={[styles.chipText, outcome === o && styles.chipTextActive]}>{o}</Text>
                </Pressable>
              ))}
            </View>

            {/* Critical Checkbox */}
            <Pressable
              style={[
                styles.sweepToggle,
                liquiditySweep && styles.sweepToggleOn,
              ]}
              onPress={() => setLiquiditySweep(!liquiditySweep)}
            >
              <View
                style={[
                  styles.sweepCheckbox,
                  liquiditySweep && styles.sweepCheckboxOn,
                ]}
              >
                {liquiditySweep && <Ionicons name="checkmark" size={16} color="#000" />}
              </View>
              <View style={styles.sweepInfo}>
                <Text style={styles.sweepLabel}>Did price sweep liquidity first?</Text>
                <Text style={styles.sweepSub}>
                  {liquiditySweep
                    ? "✓ Good — price grabbed stops before your entry"
                    : "No sweep — high risk entry, re-check your setup"}
                </Text>
              </View>
            </Pressable>

            {!liquiditySweep && (
              <View style={styles.noSweepWarn}>
                <Ionicons name="warning-outline" size={14} color={C.accentWarn} />
                <Text style={styles.noSweepWarnText}>
                  ICT requires a liquidity sweep BEFORE entry. Without it, your setup is incomplete.
                </Text>
              </View>
            )}

            <Text style={styles.fieldLabel}>Notes (optional)</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="What did you see? What was your entry model?"
              placeholderTextColor={C.textTertiary}
              multiline
              numberOfLines={3}
            />

            <View style={styles.formActions}>
              <Pressable
                style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
                onPress={() => setShowForm(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.submitBtn, pressed && { opacity: 0.85 }]}
                onPress={handleSubmit}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="#000" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Log Trade</Text>
                )}
              </Pressable>
            </View>
          </View>
        )}

        {/* Trades List */}
        {isLoading ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 40 }} />
        ) : trades.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={36} color={C.textTertiary} />
            <Text style={styles.emptyTitle}>No trades yet</Text>
            <Text style={styles.emptyText}>
              Tap the + button to log your first trade. Every trade you record makes you a better trader.
            </Text>
          </View>
        ) : (
          trades.map((trade) => (
            <TradeCard
              key={trade.id}
              trade={trade}
              onDelete={() =>
                Alert.alert("Delete Trade", "Remove this trade from your journal?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => deleteMutation.mutate(trade.id),
                  },
                ])
              }
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  scroll: { paddingHorizontal: 20 },
  headingRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  heading: { fontSize: 28, fontWeight: "700", color: C.text, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subheading: { fontSize: 13, color: C.textSecondary, fontFamily: "Inter_400Regular" },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  statsRow: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  statItem: { flex: 1, padding: 14, alignItems: "center" },
  statDivider: { width: 1, backgroundColor: C.cardBorder, marginVertical: 8 },
  statValue: { fontSize: 20, fontWeight: "700", color: C.text, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, color: C.textTertiary, fontFamily: "Inter_400Regular", marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  formCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  formTitle: { fontSize: 18, fontWeight: "700", color: C.text, fontFamily: "Inter_700Bold", marginBottom: 18 },
  fieldLabel: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_500Medium", marginBottom: 8, marginTop: 4 },
  textInput: {
    backgroundColor: C.inputBackground,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: C.text,
    fontFamily: "Inter_400Regular",
    borderWidth: 1,
    borderColor: C.cardBorder,
    marginBottom: 14,
  },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.backgroundTertiary,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { fontSize: 13, color: C.textSecondary, fontFamily: "Inter_500Medium" },
  chipTextActive: { color: "#000" },
  sweepToggle: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: C.backgroundTertiary,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  sweepToggleOn: { backgroundColor: C.accent + "15", borderColor: C.accent + "60" },
  sweepCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: C.textTertiary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  sweepCheckboxOn: { backgroundColor: C.accent, borderColor: C.accent },
  sweepInfo: { flex: 1 },
  sweepLabel: { fontSize: 14, fontWeight: "600", color: C.text, fontFamily: "Inter_600SemiBold", marginBottom: 3 },
  sweepSub: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 17 },
  noSweepWarn: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: C.accentWarn + "15",
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: C.accentWarn + "40",
  },
  noSweepWarnText: { flex: 1, fontSize: 12, color: C.accentWarn, fontFamily: "Inter_400Regular", lineHeight: 17 },
  formActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: C.backgroundTertiary,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  cancelBtnText: { fontSize: 15, color: C.textSecondary, fontFamily: "Inter_500Medium" },
  submitBtn: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: C.accent,
  },
  submitBtnText: { fontSize: 15, fontWeight: "700", color: "#000", fontFamily: "Inter_700Bold" },
  tradeCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  tradeHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  tradePairBg: {
    backgroundColor: C.backgroundTertiary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tradePair: { fontSize: 14, fontWeight: "700", color: C.text, fontFamily: "Inter_700Bold" },
  tradeHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  outcomeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  outcomeBadgeWin: { backgroundColor: C.accent + "20" },
  outcomeBadgeLoss: { backgroundColor: C.accentAlert + "20" },
  outcomeBadgeNeutral: { backgroundColor: C.backgroundTertiary },
  outcomeBadgeText: { fontSize: 12, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  deleteBtn: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  tradeDetails: { flexDirection: "row", gap: 14, flexWrap: "wrap" },
  tradeDetail: { flexDirection: "row", alignItems: "center", gap: 4 },
  tradeDetailText: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular" },
  tradeNotes: {
    fontSize: 12,
    color: C.textTertiary,
    fontFamily: "Inter_400Regular",
    marginTop: 10,
    lineHeight: 17,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    paddingTop: 10,
  },
  emptyState: { alignItems: "center", paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: C.text, fontFamily: "Inter_600SemiBold" },
  emptyText: {
    fontSize: 14,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
});
