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
import { useGetPropAccount, useAddDailyLoss, useResetDailyLoss } from "@workspace/api-client-react";
import Colors from "@/constants/colors";

const C = Colors.dark;

const NQ_POINT_VALUE = 20;
const MNQ_POINT_VALUE = 2;

const STOP_TRADING_RULES = [
  "Max 2% daily loss reached — you are DONE for today",
  "Close ALL open positions immediately",
  "No revenge trading — log what happened",
  "Walk away and reset mentally",
  "Come back tomorrow with fresh eyes",
];

function GaugeMeter({ value, max, label, color }: { value: number; max: number; label: string; color: string }) {
  const pct = Math.min(value / max, 1);
  return (
    <View style={gaugeStyles.container}>
      <View style={gaugeStyles.header}>
        <Text style={gaugeStyles.label}>{label}</Text>
        <Text style={[gaugeStyles.value, { color }]}>{value.toFixed(2)}%</Text>
      </View>
      <View style={gaugeStyles.track}>
        <View style={[gaugeStyles.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={gaugeStyles.max}>Limit: {max}%</Text>
    </View>
  );
}

export default function RiskShieldScreen() {
  const [pointsAtRisk, setPointsAtRisk] = useState("");
  const [customBalance, setCustomBalance] = useState("");
  const [lossInput, setLossInput] = useState("");
  const [showMonkMode, setShowMonkMode] = useState(false);

  const { data: account, refetch } = useGetPropAccount();
  const { mutateAsync: addLoss } = useAddDailyLoss();
  const { mutateAsync: resetLoss } = useResetDailyLoss();

  const balance = account?.balance ?? 50000;
  const startingBalance = account?.startingBalance ?? 50000;
  const dailyLoss = account?.dailyLoss ?? 0;
  const maxDailyLoss = account?.maxDailyLoss ?? 2;
  const maxTotalLoss = account?.maxTotalLoss ?? 10;

  const dailyLossPct = (dailyLoss / startingBalance) * 100;
  const totalLossPct = ((startingBalance - balance) / startingBalance) * 100;
  const isStopTrading = dailyLossPct >= maxDailyLoss;
  const isDanger = dailyLossPct >= maxDailyLoss * 0.75;

  const calcBalance = customBalance ? parseFloat(customBalance) : balance;
  const riskAmount = calcBalance * 0.005;
  const pts = parseFloat(pointsAtRisk) || 0;
  const nqContracts = pts > 0 ? riskAmount / (pts * NQ_POINT_VALUE) : 0;
  const mnqContracts = pts > 0 ? riskAmount / (pts * MNQ_POINT_VALUE) : 0;

  const handleAddLoss = useCallback(async () => {
    const amount = parseFloat(lossInput);
    if (isNaN(amount) || amount <= 0) return Alert.alert("Enter a valid loss amount");
    try {
      await addLoss({ amount });
      setLossInput("");
      refetch();
    } catch {
      Alert.alert("Error", "Could not log loss");
    }
  }, [lossInput, addLoss, refetch]);

  const handleReset = useCallback(async () => {
    Alert.alert("Reset Daily Loss?", "This will reset today's loss counter to zero.", [
      { text: "Cancel", style: "cancel" },
      { text: "Reset", onPress: async () => { await resetLoss(); refetch(); } },
    ]);
  }, [resetLoss, refetch]);

  return (
    <SafeAreaView style={[styles.safe, isStopTrading && styles.safeRed]} edges={["top"]}>
      {/* STOP TRADING BANNER */}
      {isStopTrading && (
        <View style={styles.stopBanner}>
          <Ionicons name="warning" size={22} color="#FF1111" />
          <Text style={styles.stopBannerText}>STOP TRADING — DAILY LIMIT HIT</Text>
          <Ionicons name="warning" size={22} color="#FF1111" />
        </View>
      )}

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, isStopTrading && { color: "#FF4444" }]}>Risk Shield</Text>
          <TouchableOpacity style={[styles.monkBtn, showMonkMode && { backgroundColor: C.accent }]} onPress={() => setShowMonkMode(true)}>
            <Ionicons name="eye-off-outline" size={16} color={showMonkMode ? "#0A0A0F" : C.accent} />
            <Text style={[styles.monkBtnText, showMonkMode && { color: "#0A0A0F" }]}>Focus Mode</Text>
          </TouchableOpacity>
        </View>

        {/* STOP TRADING CARD */}
        {isStopTrading && (
          <View style={styles.stopCard}>
            <Text style={styles.stopCardTitle}>🛑 STOP TRADING</Text>
            <Text style={styles.stopCardSub}>Daily drawdown limit reached. Respect the rules.</Text>
            {STOP_TRADING_RULES.map((rule, i) => (
              <View key={i} style={styles.stopRule}>
                <Text style={styles.stopRuleNum}>{i + 1}.</Text>
                <Text style={styles.stopRuleText}>{rule}</Text>
              </View>
            ))}
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>Reset Daily Loss Counter</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Account Balance Card */}
        <View style={[styles.card, isStopTrading && styles.cardRed]}>
          <Text style={styles.cardLabel}>Account Balance</Text>
          <Text style={[styles.balanceText, { color: isStopTrading ? "#FF4444" : C.accent }]}>
            ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </Text>
          <Text style={styles.cardSub}>Starting: ${startingBalance.toLocaleString()}</Text>
        </View>

        {/* Gauge Meters */}
        <View style={[styles.card, isStopTrading && styles.cardRed]}>
          <GaugeMeter
            value={dailyLossPct}
            max={maxDailyLoss}
            label="Daily Drawdown"
            color={isStopTrading ? "#FF4444" : isDanger ? "#F59E0B" : C.accent}
          />
          <View style={styles.divider} />
          <GaugeMeter
            value={totalLossPct}
            max={maxTotalLoss}
            label="Total Drawdown"
            color={totalLossPct >= maxTotalLoss * 0.75 ? "#F59E0B" : C.accent}
          />
        </View>

        {/* Log Loss */}
        {!isStopTrading && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Log a Loss</Text>
            <View style={styles.inputRow}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.input}
                value={lossInput}
                onChangeText={setLossInput}
                placeholder="Amount lost on this trade"
                placeholderTextColor={C.textSecondary}
                keyboardType="decimal-pad"
              />
              <TouchableOpacity style={styles.logBtn} onPress={handleAddLoss}>
                <Text style={styles.logBtnText}>Log</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Position Size Calculator */}
        <Text style={styles.sectionTitle2}>Position Size Calculator</Text>
        <View style={styles.card}>
          <Text style={styles.calcSubtitle}>Risk exactly 0.5% on your next trade</Text>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Account Balance</Text>
            <View style={styles.calcInputWrap}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={styles.calcInput}
                value={customBalance}
                onChangeText={setCustomBalance}
                placeholder={balance.toFixed(0)}
                placeholderTextColor={C.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.calcRow}>
            <Text style={styles.calcLabel}>Points at Risk (SL distance)</Text>
            <View style={styles.calcInputWrap}>
              <TextInput
                style={styles.calcInput}
                value={pointsAtRisk}
                onChangeText={setPointsAtRisk}
                placeholder="e.g. 10"
                placeholderTextColor={C.textSecondary}
                keyboardType="decimal-pad"
              />
              <Text style={styles.calcUnit}>pts</Text>
            </View>
          </View>

          <View style={styles.riskAmountRow}>
            <Ionicons name="warning-outline" size={14} color={C.accent} />
            <Text style={styles.riskAmountText}>
              Max Risk: ${riskAmount.toFixed(2)} (0.5% of ${calcBalance.toLocaleString()})
            </Text>
          </View>

          {pts > 0 ? (
            <View style={styles.resultsBox}>
              <View style={styles.resultItem}>
                <View>
                  <Text style={styles.resultInstrument}>NQ Full Contract</Text>
                  <Text style={styles.resultDetail}>${NQ_POINT_VALUE}/point</Text>
                </View>
                <View style={styles.resultValueWrap}>
                  <Text style={styles.resultValue}>{nqContracts.toFixed(2)}</Text>
                  <Text style={styles.resultUnit}>contracts</Text>
                </View>
              </View>
              <View style={styles.resultDivider} />
              <View style={styles.resultItem}>
                <View>
                  <Text style={styles.resultInstrument}>MNQ Micro Contract</Text>
                  <Text style={styles.resultDetail}>${MNQ_POINT_VALUE}/point</Text>
                </View>
                <View style={styles.resultValueWrap}>
                  <Text style={[styles.resultValue, { color: "#F59E0B" }]}>{Math.round(mnqContracts)}</Text>
                  <Text style={styles.resultUnit}>contracts</Text>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.calcPlaceholder}>
              <Text style={styles.calcPlaceholderText}>Enter points at risk to calculate position size</Text>
            </View>
          )}
        </View>

        {!isStopTrading && (
          <TouchableOpacity style={styles.resetSmallBtn} onPress={handleReset}>
            <Ionicons name="refresh-outline" size={14} color={C.textSecondary} />
            <Text style={styles.resetSmallText}>Reset Daily Loss</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Monk Mode Modal */}
      <Modal visible={showMonkMode} animationType="fade" statusBarTranslucent>
        <View style={monkStyles.overlay}>
          <View style={monkStyles.header}>
            <Text style={monkStyles.title}>⚡ FOCUS MODE</Text>
            <Text style={monkStyles.subtitle}>P&L hidden — stay disciplined</Text>
          </View>

          <View style={monkStyles.rulesCard}>
            <Text style={monkStyles.rulesTitle}>EXIT RULES</Text>
            {[
              "Honor your stop loss — no exceptions",
              "Don't move your stop to breakeven too early",
              "Let price reach your target — no early exits",
              "Exit immediately if market structure breaks against you",
              "One trade at a time — no adding to losers",
            ].map((rule, i) => (
              <View key={i} style={monkStyles.ruleRow}>
                <View style={monkStyles.ruleBullet} />
                <Text style={monkStyles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>

          <View style={monkStyles.mindsetCard}>
            <Text style={monkStyles.mindsetTitle}>MINDSET ANCHOR</Text>
            <Text style={monkStyles.mindsetText}>"I trade the process, not the P&L. My job is to execute the setup correctly. The outcome takes care of itself."</Text>
          </View>

          <TouchableOpacity style={monkStyles.exitBtn} onPress={() => setShowMonkMode(false)}>
            <Ionicons name="eye-outline" size={18} color="#0A0A0F" />
            <Text style={monkStyles.exitBtnText}>Exit Focus Mode</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  safeRed: { backgroundColor: "#0F0505" },
  stopBanner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, backgroundColor: "rgba(255,17,17,0.15)", padding: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,17,17,0.3)" },
  stopBannerText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FF4444", letterSpacing: 1 },
  scroll: { flex: 1 },
  content: { padding: 16 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.text },
  monkBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: C.accent },
  monkBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.accent },
  stopCard: { backgroundColor: "rgba(255,17,17,0.1)", borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1.5, borderColor: "rgba(255,17,17,0.4)" },
  stopCardTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#FF4444", marginBottom: 6 },
  stopCardSub: { fontSize: 14, color: "#FF9999", marginBottom: 14 },
  stopRule: { flexDirection: "row", gap: 8, marginBottom: 8 },
  stopRuleNum: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FF4444", width: 20 },
  stopRuleText: { flex: 1, fontSize: 13, color: "#FF9999", lineHeight: 20 },
  resetBtn: { marginTop: 14, backgroundColor: "rgba(255,17,17,0.2)", borderRadius: 10, padding: 12, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,17,17,0.4)" },
  resetBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#FF4444" },
  card: { backgroundColor: C.backgroundSecondary, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 14 },
  cardRed: { borderColor: "rgba(255,17,17,0.4)", backgroundColor: "rgba(255,17,17,0.06)" },
  cardLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  balanceText: { fontSize: 32, fontFamily: "Inter_700Bold", marginBottom: 4 },
  cardSub: { fontSize: 12, color: C.textSecondary },
  divider: { height: 1, backgroundColor: C.cardBorder, marginVertical: 14 },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text, marginBottom: 12 },
  sectionTitle2: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dollarSign: { fontSize: 16, color: C.textSecondary },
  input: { flex: 1, backgroundColor: C.background, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: C.text, borderWidth: 1, borderColor: C.cardBorder },
  logBtn: { backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 18, paddingVertical: 10 },
  logBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
  calcSubtitle: { fontSize: 13, color: C.textSecondary, marginBottom: 14 },
  calcRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  calcLabel: { flex: 1, fontSize: 13, color: C.text, marginRight: 12 },
  calcInputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: C.background, borderRadius: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: C.cardBorder, minWidth: 110 },
  calcInput: { fontSize: 14, color: C.text, paddingVertical: 8, flex: 1 },
  calcUnit: { fontSize: 12, color: C.textSecondary },
  riskAmountRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.accent + "15", borderRadius: 8, padding: 10, marginBottom: 14 },
  riskAmountText: { fontSize: 13, color: C.accent, fontFamily: "Inter_500Medium" },
  resultsBox: { backgroundColor: C.background, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, overflow: "hidden" },
  resultItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14 },
  resultInstrument: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text, marginBottom: 2 },
  resultDetail: { fontSize: 12, color: C.textSecondary },
  resultValueWrap: { alignItems: "flex-end" },
  resultValue: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.accent },
  resultUnit: { fontSize: 12, color: C.textSecondary },
  resultDivider: { height: 1, backgroundColor: C.cardBorder },
  calcPlaceholder: { backgroundColor: C.background, borderRadius: 12, padding: 20, alignItems: "center", borderWidth: 1, borderColor: C.cardBorder },
  calcPlaceholderText: { fontSize: 13, color: C.textSecondary, textAlign: "center" },
  resetSmallBtn: { flexDirection: "row", alignItems: "center", gap: 6, justifyContent: "center", padding: 12 },
  resetSmallText: { fontSize: 13, color: C.textSecondary },
});

const gaugeStyles = StyleSheet.create({
  container: { marginBottom: 4 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label: { fontSize: 13, color: C.textSecondary },
  value: { fontSize: 14, fontFamily: "Inter_700Bold" },
  track: { height: 8, backgroundColor: C.background, borderRadius: 4, overflow: "hidden", marginBottom: 4 },
  fill: { height: "100%" as any, borderRadius: 4 },
  max: { fontSize: 11, color: C.textSecondary, textAlign: "right" },
});

const monkStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "#050505", padding: 24, justifyContent: "center" },
  header: { alignItems: "center", marginBottom: 32 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 6 },
  subtitle: { fontSize: 14, color: C.textSecondary },
  rulesCard: { backgroundColor: "#0F1A14", borderRadius: 18, padding: 20, borderWidth: 1, borderColor: C.accent + "44", marginBottom: 16 },
  rulesTitle: { fontSize: 11, fontFamily: "Inter_700Bold", color: C.accent, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 16 },
  ruleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 12 },
  ruleBullet: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.accent, marginTop: 7 },
  ruleText: { flex: 1, fontSize: 15, color: C.text, lineHeight: 24 },
  mindsetCard: { backgroundColor: "#111", borderRadius: 14, padding: 18, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 32 },
  mindsetTitle: { fontSize: 10, fontFamily: "Inter_700Bold", color: C.textSecondary, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 },
  mindsetText: { fontSize: 14, color: C.textSecondary, lineHeight: 23, fontStyle: "italic" },
  exitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.accent, borderRadius: 16, padding: 18 },
  exitBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
});
