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
  useWindowDimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useGetPropAccount,
  useCreatePropAccount,
  useAddDailyLoss,
  useResetDailyLoss,
} from "@workspace/api-client-react";
import Colors from "@/constants/colors";

const C = Colors.dark;

const NQ_POINT_VALUE = 20;
const MNQ_POINT_VALUE = 2;
const WIDE_BREAKPOINT = 768;

const STOP_TRADING_RULES = [
  "You hit your max daily loss — you are DONE for today",
  "Close ALL open trades right now",
  "No revenge trading — write down what happened in your journal",
  "Step away from the screen and clear your head",
  "Come back tomorrow with a fresh start",
];

const EXIT_RULES = [
  "Keep your stop loss where you set it — no exceptions",
  "Don't move your stop to breakeven too early",
  "Wait for price to reach your target — don't exit early",
  "Get out right away if the market turns against you (MSS — Market Structure Shift)",
  "Only have one trade open at a time — don't add to a losing trade",
];

function GaugeMeter({
  value,
  max,
  label,
  color,
}: {
  value: number;
  max: number;
  label: string;
  color: string;
}) {
  const pct = Math.min(value / max, 1);
  return (
    <View style={gaugeStyles.container}>
      <View style={gaugeStyles.header}>
        <Text style={gaugeStyles.label}>{label}</Text>
        <Text style={[gaugeStyles.value, { color }]}>
          {value.toFixed(2)}%
        </Text>
      </View>
      <View style={gaugeStyles.track}>
        <View
          style={[
            gaugeStyles.fill,
            { width: `${pct * 100}%`, backgroundColor: color },
          ]}
        />
      </View>
      <Text style={gaugeStyles.max}>Limit: {max}%</Text>
    </View>
  );
}

function getGaugeColor(pct: number) {
  if (pct >= 1) return "#EF4444";
  if (pct >= 0.75) return "#F59E0B";
  return C.accent;
}

export default function RiskShieldScreen() {
  const { width } = useWindowDimensions();
  const isWide = width >= WIDE_BREAKPOINT;

  const [pointsAtRisk, setPointsAtRisk] = useState("");
  const [customBalance, setCustomBalance] = useState("");
  const [lossInput, setLossInput] = useState("");
  const [showMonkMode, setShowMonkMode] = useState(false);
  const [showAccountSetup, setShowAccountSetup] = useState(false);
  const [setupBalance, setSetupBalance] = useState("");
  const [setupDailyPct, setSetupDailyPct] = useState("");
  const [setupTotalPct, setSetupTotalPct] = useState("");

  const { data: account, refetch } = useGetPropAccount();
  const { mutateAsync: createAccount } = useCreatePropAccount();
  const { mutateAsync: addLoss } = useAddDailyLoss();
  const { mutateAsync: resetLoss } = useResetDailyLoss();

  const hasAccount = !!account;
  const balance = account?.currentBalance ?? 50000;
  const startingBalance = account?.startingBalance ?? 50000;
  const dailyLoss = account?.dailyLoss ?? 0;
  const maxDailyLoss = account?.maxDailyLossPct ?? 2;
  const maxTotalLoss = account?.maxTotalDrawdownPct ?? 10;

  const dailyLossPct = startingBalance > 0 ? (dailyLoss / startingBalance) * 100 : 0;
  const totalLossPct =
    startingBalance > 0
      ? ((startingBalance - balance) / startingBalance) * 100
      : 0;
  const isStopTrading = dailyLossPct >= maxDailyLoss;

  const dailyGaugeColor = getGaugeColor(dailyLossPct / maxDailyLoss);
  const totalGaugeColor = getGaugeColor(totalLossPct / maxTotalLoss);

  const parsedCustomBalance = parseFloat(customBalance);
  const calcBalance =
    customBalance && !isNaN(parsedCustomBalance) && parsedCustomBalance > 0
      ? parsedCustomBalance
      : balance;
  const riskAmount = calcBalance * 0.005;
  const pts = parseFloat(pointsAtRisk) || 0;
  const nqContracts = pts > 0 ? riskAmount / (pts * NQ_POINT_VALUE) : 0;
  const mnqContracts = pts > 0 ? riskAmount / (pts * MNQ_POINT_VALUE) : 0;

  const handleAddLoss = useCallback(async () => {
    const amount = parseFloat(lossInput);
    if (isNaN(amount) || amount <= 0)
      return Alert.alert("Enter a valid loss amount");
    try {
      await addLoss({ data: { amount } });
      setLossInput("");
      refetch();
    } catch {
      Alert.alert("Error", "Could not log loss");
    }
  }, [lossInput, addLoss, refetch]);

  const handleReset = useCallback(async () => {
    Alert.alert(
      "Reset Daily Loss?",
      "This will set today's loss back to zero. Your total losses will stay the same.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          onPress: async () => {
            await resetLoss();
            refetch();
          },
        },
      ],
    );
  }, [resetLoss, refetch]);

  const openAccountSetup = useCallback(() => {
    setSetupBalance(startingBalance.toString());
    setSetupDailyPct(maxDailyLoss.toString());
    setSetupTotalPct(maxTotalLoss.toString());
    setShowAccountSetup(true);
  }, [startingBalance, maxDailyLoss, maxTotalLoss]);

  const handleSaveAccount = useCallback(async () => {
    const sb = parseFloat(setupBalance);
    if (isNaN(sb) || sb <= 0)
      return Alert.alert("Enter a valid starting balance");
    const mdl = parseFloat(setupDailyPct);
    const mtd = parseFloat(setupTotalPct);
    try {
      await createAccount({
        data: {
          startingBalance: sb,
          maxDailyLossPct: isNaN(mdl) || mdl <= 0 ? 2 : mdl,
          maxTotalDrawdownPct: isNaN(mtd) || mtd <= 0 ? 10 : mtd,
        },
      });
      refetch();
      setShowAccountSetup(false);
    } catch {
      Alert.alert("Error", "Could not save account");
    }
  }, [setupBalance, setupDailyPct, setupTotalPct, createAccount, refetch]);

  const leftColumn = (
    <View style={isWide ? { flex: 1 } : undefined}>
      <View style={[styles.card, isStopTrading && styles.cardRed]}>
        <Text style={styles.cardLabel}>Account Balance</Text>
        <Text
          style={[
            styles.balanceText,
            { color: isStopTrading ? "#FF4444" : C.accent },
          ]}
        >
          ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </Text>
        <Text style={styles.cardSub}>
          Starting: ${startingBalance.toLocaleString()}
        </Text>
      </View>

      <View style={[styles.card, isStopTrading && styles.cardRed]}>
        <GaugeMeter
          value={dailyLossPct}
          max={maxDailyLoss}
          label="Daily Drawdown (Lost Today)"
          color={dailyGaugeColor}
        />
        <View style={styles.divider} />
        <GaugeMeter
          value={totalLossPct}
          max={maxTotalLoss}
          label="Total Drawdown (Lost Overall)"
          color={totalGaugeColor}
        />
      </View>

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
              onSubmitEditing={handleAddLoss}
            />
            <TouchableOpacity style={styles.logBtn} onPress={handleAddLoss}>
              <Text style={styles.logBtnText}>Log</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!isStopTrading && (
        <TouchableOpacity style={styles.resetSmallBtn} onPress={handleReset}>
          <Ionicons name="refresh-outline" size={14} color={C.textSecondary} />
          <Text style={styles.resetSmallText}>Reset Daily Loss</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const rightColumn = (
    <View style={isWide ? { flex: 1 } : undefined}>
      <Text style={styles.sectionTitle2}>Position Size Calculator</Text>
      <View style={styles.card}>
        <Text style={styles.calcSubtitle}>
          Figure out how many contracts to trade so you only risk 0.5%
        </Text>

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
          <Text style={styles.calcLabel}>Points at Risk (Stop Loss Distance)</Text>
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
            Max Risk: ${riskAmount.toFixed(2)} (0.5% of $
            {calcBalance.toLocaleString()})
          </Text>
        </View>

        {pts > 0 ? (
          <View style={styles.resultsBox}>
            <View style={styles.resultItem}>
              <View>
                <Text style={styles.resultInstrument}>NQ Full Contract</Text>
                <Text style={styles.resultDetail}>
                  ${NQ_POINT_VALUE}/point
                </Text>
              </View>
              <View style={styles.resultValueWrap}>
                <Text style={styles.resultValue}>
                  {nqContracts.toFixed(2)}
                </Text>
                <Text style={styles.resultUnit}>contracts</Text>
              </View>
            </View>
            <View style={styles.resultDivider} />
            <View style={styles.resultItem}>
              <View>
                <Text style={styles.resultInstrument}>
                  MNQ Micro Contract
                </Text>
                <Text style={styles.resultDetail}>
                  ${MNQ_POINT_VALUE}/point
                </Text>
              </View>
              <View style={styles.resultValueWrap}>
                <Text style={[styles.resultValue, { color: "#F59E0B" }]}>
                  {Math.round(mnqContracts)}
                </Text>
                <Text style={styles.resultUnit}>contracts</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.calcPlaceholder}>
            <Text style={styles.calcPlaceholderText}>
              Enter points at risk to calculate position size
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.safe, isStopTrading && styles.safeRed]}
      edges={["top"]}
    >
      {isStopTrading && (
        <View style={styles.stopBanner}>
          <Ionicons name="warning" size={22} color="#FF1111" />
          <Text style={styles.stopBannerText}>
            STOP TRADING — DAILY LIMIT HIT
          </Text>
          <Ionicons name="warning" size={22} color="#FF1111" />
        </View>
      )}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          isWide && styles.contentWide,
        ]}
      >
        <View style={[styles.headerRow, isWide && styles.headerRowWide]}>
          <Text
            style={[styles.title, isStopTrading && { color: "#FF4444" }]}
          >
            Risk Shield
          </Text>
          <View style={styles.headerBtns}>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={openAccountSetup}
            >
              <Ionicons
                name="settings-outline"
                size={16}
                color={C.textSecondary}
              />
              <Text style={styles.settingsBtnText}>Account</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.monkBtn}
              onPress={() => setShowMonkMode(true)}
            >
              <Ionicons
                name="eye-off-outline"
                size={16}
                color={C.accent}
              />
              <Text style={styles.monkBtnText}>Focus Mode</Text>
            </TouchableOpacity>
          </View>
        </View>

        {isStopTrading && (
          <View style={styles.stopCard}>
            <Text style={styles.stopCardTitle}>STOP TRADING</Text>
            <Text style={styles.stopCardSub}>
              You lost the most you're allowed to lose today. Follow the rules below.
            </Text>
            {STOP_TRADING_RULES.map((rule, i) => (
              <View key={i} style={styles.stopRule}>
                <Text style={styles.stopRuleNum}>{i + 1}.</Text>
                <Text style={styles.stopRuleText}>{rule}</Text>
              </View>
            ))}
            <TouchableOpacity
              style={styles.resetBtn}
              onPress={handleReset}
            >
              <Text style={styles.resetBtnText}>
                Reset Daily Loss Counter
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isWide ? (
          <View style={styles.wideRow}>
            {leftColumn}
            {rightColumn}
          </View>
        ) : (
          <>
            {leftColumn}
            {rightColumn}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <Modal
        visible={showAccountSetup}
        animationType="fade"
        transparent
        statusBarTranslucent
      >
        <View style={setupStyles.overlay}>
          <View style={setupStyles.card}>
            <Text style={setupStyles.title}>Prop Firm Account Setup (Your Funded Account)</Text>
            <Text style={setupStyles.subtitle}>
              Set up your starting balance and the most you're allowed to lose.
            </Text>

            <Text style={setupStyles.label}>Starting Balance</Text>
            <View style={setupStyles.inputWrap}>
              <Text style={styles.dollarSign}>$</Text>
              <TextInput
                style={setupStyles.input}
                value={setupBalance}
                onChangeText={setSetupBalance}
                placeholder="50000"
                placeholderTextColor={C.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={setupStyles.row}>
              <View style={{ flex: 1 }}>
                <Text style={setupStyles.label}>Max Daily Loss % (Most you can lose in a day)</Text>
                <View style={setupStyles.inputWrap}>
                  <TextInput
                    style={setupStyles.input}
                    value={setupDailyPct}
                    onChangeText={setSetupDailyPct}
                    placeholder="2"
                    placeholderTextColor={C.textSecondary}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.calcUnit}>%</Text>
                </View>
              </View>
              <View style={{ width: 12 }} />
              <View style={{ flex: 1 }}>
                <Text style={setupStyles.label}>Max Total Drawdown % (Most you can lose overall)</Text>
                <View style={setupStyles.inputWrap}>
                  <TextInput
                    style={setupStyles.input}
                    value={setupTotalPct}
                    onChangeText={setSetupTotalPct}
                    placeholder="10"
                    placeholderTextColor={C.textSecondary}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.calcUnit}>%</Text>
                </View>
              </View>
            </View>

            <View style={setupStyles.btnRow}>
              <TouchableOpacity
                style={setupStyles.cancelBtn}
                onPress={() => setShowAccountSetup(false)}
              >
                <Text style={setupStyles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={setupStyles.saveBtn}
                onPress={handleSaveAccount}
              >
                <Text style={setupStyles.saveBtnText}>Save Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showMonkMode} animationType="fade" statusBarTranslucent>
        <View style={monkStyles.overlay}>
          <View style={monkStyles.header}>
            <Text style={monkStyles.title}>FOCUS MODE</Text>
            <Text style={monkStyles.subtitle}>
              Your profit and loss is hidden — stay focused on the process
            </Text>
          </View>

          <View style={monkStyles.rulesCard}>
            <Text style={monkStyles.rulesTitle}>EXIT RULES</Text>
            {EXIT_RULES.map((rule, i) => (
              <View key={i} style={monkStyles.ruleRow}>
                <View style={monkStyles.ruleBullet} />
                <Text style={monkStyles.ruleText}>{rule}</Text>
              </View>
            ))}
          </View>

          <View style={monkStyles.mindsetCard}>
            <Text style={monkStyles.mindsetTitle}>MINDSET ANCHOR</Text>
            <Text style={monkStyles.mindsetText}>
              "I follow my plan, not my emotions. My job is to take the
              right setup. If I do that, the results will come."
            </Text>
          </View>

          <TouchableOpacity
            style={monkStyles.exitBtn}
            onPress={() => setShowMonkMode(false)}
          >
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
  stopBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "rgba(255,17,17,0.15)",
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,17,17,0.3)",
  },
  stopBannerText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#FF4444",
    letterSpacing: 1,
  },
  scroll: { flex: 1 },
  content: { padding: 16 },
  contentWide: { paddingHorizontal: 32, maxWidth: 1200 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  headerRowWide: { marginBottom: 24 },
  headerBtns: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.text },
  settingsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  settingsBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
  },
  monkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.accent,
  },
  monkBtnText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.accent,
  },
  wideRow: {
    flexDirection: "row",
    gap: 20,
  },
  stopCard: {
    backgroundColor: "rgba(255,17,17,0.1)",
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "rgba(255,17,17,0.4)",
  },
  stopCardTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#FF4444",
    marginBottom: 6,
  },
  stopCardSub: { fontSize: 14, color: "#FF9999", marginBottom: 14 },
  stopRule: { flexDirection: "row", gap: 8, marginBottom: 8 },
  stopRuleNum: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: "#FF4444",
    width: 20,
  },
  stopRuleText: {
    flex: 1,
    fontSize: 13,
    color: "#FF9999",
    lineHeight: 20,
  },
  resetBtn: {
    marginTop: 14,
    backgroundColor: "rgba(255,17,17,0.2)",
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,17,17,0.4)",
  },
  resetBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#FF4444",
  },
  card: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    marginBottom: 14,
  },
  cardRed: {
    borderColor: "rgba(255,17,17,0.4)",
    backgroundColor: "rgba(255,17,17,0.06)",
  },
  cardLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  balanceText: { fontSize: 32, fontFamily: "Inter_700Bold", marginBottom: 4 },
  cardSub: { fontSize: 12, color: C.textSecondary },
  divider: {
    height: 1,
    backgroundColor: C.cardBorder,
    marginVertical: 14,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    marginBottom: 12,
  },
  sectionTitle2: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dollarSign: { fontSize: 16, color: C.textSecondary },
  input: {
    flex: 1,
    backgroundColor: C.background,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: C.text,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  logBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  logBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
  calcSubtitle: { fontSize: 13, color: C.textSecondary, marginBottom: 14 },
  calcRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  calcLabel: { flex: 1, fontSize: 13, color: C.text, marginRight: 12 },
  calcInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.background,
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
    minWidth: 110,
  },
  calcInput: { fontSize: 14, color: C.text, paddingVertical: 8, flex: 1 },
  calcUnit: { fontSize: 12, color: C.textSecondary },
  riskAmountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.accent + "15",
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  riskAmountText: {
    fontSize: 13,
    color: C.accent,
    fontFamily: "Inter_500Medium",
  },
  resultsBox: {
    backgroundColor: C.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: "hidden",
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  resultInstrument: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    marginBottom: 2,
  },
  resultDetail: { fontSize: 12, color: C.textSecondary },
  resultValueWrap: { alignItems: "flex-end" },
  resultValue: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.accent },
  resultUnit: { fontSize: 12, color: C.textSecondary },
  resultDivider: { height: 1, backgroundColor: C.cardBorder },
  calcPlaceholder: {
    backgroundColor: C.background,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  calcPlaceholderText: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: "center",
  },
  resetSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    padding: 12,
  },
  resetSmallText: { fontSize: 13, color: C.textSecondary },
});

const gaugeStyles = StyleSheet.create({
  container: { marginBottom: 4 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: { fontSize: 13, color: C.textSecondary },
  value: { fontSize: 14, fontFamily: "Inter_700Bold" },
  track: {
    height: 8,
    backgroundColor: C.background,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 4,
  },
  fill: { height: "100%", borderRadius: 4 },
  max: { fontSize: 11, color: C.textSecondary, textAlign: "right" },
});

const setupStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  card: {
    backgroundColor: "#0A0A0F",
    borderRadius: 18,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: C.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: C.textSecondary,
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    marginBottom: 6,
    marginTop: 4,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.background,
    borderRadius: 10,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    paddingVertical: 10,
  },
  row: { flexDirection: "row" },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  cancelBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
  },
  saveBtn: {
    flex: 1,
    backgroundColor: C.accent,
    borderRadius: 10,
    padding: 12,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: "#0A0A0F",
  },
});

const monkStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "#050505",
    padding: 24,
    justifyContent: "center",
  },
  header: { alignItems: "center", marginBottom: 32 },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: C.text,
    marginBottom: 6,
  },
  subtitle: { fontSize: 14, color: C.textSecondary },
  rulesCard: {
    backgroundColor: "#0F1A14",
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: C.accent + "44",
    marginBottom: 16,
  },
  rulesTitle: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: C.accent,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 16,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  ruleBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.accent,
    marginTop: 7,
  },
  ruleText: { flex: 1, fontSize: 15, color: C.text, lineHeight: 24 },
  mindsetCard: {
    backgroundColor: "#111",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: C.cardBorder,
    marginBottom: 32,
  },
  mindsetTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: C.textSecondary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  mindsetText: {
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 23,
    fontStyle: "italic",
  },
  exitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 16,
    padding: 18,
  },
  exitBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#0A0A0F",
  },
});
