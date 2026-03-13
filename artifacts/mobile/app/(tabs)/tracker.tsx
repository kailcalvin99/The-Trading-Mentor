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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { apiGet, apiPost } from "@/lib/api";

const C = Colors.dark;

interface PropAccount {
  id: number;
  startingBalance: number;
  currentBalance: number;
  dailyLoss: number;
  totalDrawdown: number;
  maxDailyLossPct: number;
  maxTotalDrawdownPct: number;
  updatedAt: string;
}

function formatMoney(val: number): string {
  return val.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 });
}

function GaugeBar({
  label,
  value,
  max,
  color,
  dangerAt,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  dangerAt: number;
}) {
  const pct = Math.min((value / max) * 100, 100);
  const isDanger = pct >= dangerAt;
  const barColor = isDanger ? C.accentAlert : pct > dangerAt * 0.7 ? C.accentWarn : color;

  return (
    <View style={styles.gaugeContainer}>
      <View style={styles.gaugeHeader}>
        <Text style={styles.gaugeLabel}>{label}</Text>
        <Text style={[styles.gaugeValue, { color: barColor }]}>
          {pct.toFixed(1)}% <Text style={styles.gaugeMax}>/ {max}%</Text>
        </Text>
      </View>
      <View style={styles.gaugeTrack}>
        <View
          style={[styles.gaugeFill, { width: `${pct}%` as any, backgroundColor: barColor }]}
        />
      </View>
      {isDanger && (
        <View style={styles.dangerRow}>
          <Ionicons name="warning" size={12} color={C.accentAlert} />
          <Text style={styles.dangerText}>Limit reached — STOP trading today</Text>
        </View>
      )}
    </View>
  );
}

export default function TrackerScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [balanceInput, setBalanceInput] = useState("");
  const [dailyLossInput, setDailyLossInput] = useState("");
  const [lossInput, setLossInput] = useState("");
  const [showSetup, setShowSetup] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: account, isLoading } = useQuery<PropAccount>({
    queryKey: ["prop-account"],
    queryFn: () => apiGet("prop/account"),
    retry: false,
  });

  const createMutation = useMutation({
    mutationFn: (data: { startingBalance: number; maxDailyLossPct: number; maxTotalDrawdownPct: number }) =>
      apiPost<PropAccount>("prop/account", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prop-account"] });
      setShowSetup(false);
      setBalanceInput("");
      setDailyLossInput("");
    },
    onError: () => Alert.alert("Error", "Could not save account."),
  });

  const addLossMutation = useMutation({
    mutationFn: (amount: number) => apiPost<PropAccount>("prop/account/daily-loss", { amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["prop-account"] });
      setLossInput("");
    },
    onError: () => Alert.alert("Error", "Could not update loss."),
  });

  const resetDailyMutation = useMutation({
    mutationFn: () => apiPost<PropAccount>("prop/account/reset-daily", {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["prop-account"] }),
  });

  function handleSetup() {
    const bal = parseFloat(balanceInput);
    const dl = parseFloat(dailyLossInput) || 2;
    if (!bal || bal <= 0) {
      Alert.alert("Error", "Enter a valid starting balance.");
      return;
    }
    createMutation.mutate({
      startingBalance: bal,
      maxDailyLossPct: dl,
      maxTotalDrawdownPct: 5,
    });
  }

  function handleAddLoss() {
    const amt = parseFloat(lossInput);
    if (!amt || amt <= 0) {
      Alert.alert("Error", "Enter a valid loss amount.");
      return;
    }
    addLossMutation.mutate(amt);
  }

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: topPad }]}>
        <ActivityIndicator color={C.accent} size="large" />
      </View>
    );
  }

  if (!account || showSetup) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: Platform.OS === "web" ? 34 + 100 : 100 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.heading}>Prop Firm Tracker</Text>
          <Text style={styles.subheading}>Set up your account to start tracking</Text>

          <View style={styles.setupCard}>
            <Ionicons name="wallet-outline" size={32} color={C.accent} style={{ marginBottom: 16 }} />
            <Text style={styles.setupTitle}>Account Setup</Text>
            <Text style={styles.setupDesc}>
              Enter your prop firm starting balance. The app will track your daily loss (2%) and total drawdown (5%) limits.
            </Text>

            <Text style={styles.inputLabel}>Starting Balance ($)</Text>
            <TextInput
              style={styles.textInput}
              value={balanceInput}
              onChangeText={setBalanceInput}
              placeholder="e.g. 50000"
              placeholderTextColor={C.textTertiary}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Max Daily Loss % (default: 2%)</Text>
            <TextInput
              style={styles.textInput}
              value={dailyLossInput}
              onChangeText={setDailyLossInput}
              placeholder="2"
              placeholderTextColor={C.textTertiary}
              keyboardType="numeric"
            />

            <View style={styles.ruleBox}>
              <Ionicons name="shield-checkmark-outline" size={16} color={C.accent} />
              <Text style={styles.ruleText}>
                Total Drawdown is fixed at 5% — standard for most prop firms.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
              onPress={handleSetup}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.primaryBtnText}>Save Account</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </View>
    );
  }

  const dailyLossPct = (account.dailyLoss / account.startingBalance) * 100;
  const totalDrawdownPct = (account.totalDrawdown / account.startingBalance) * 100;
  const dailyLimitAmount = (account.startingBalance * account.maxDailyLossPct) / 100;
  const totalLimitAmount = (account.startingBalance * account.maxTotalDrawdownPct) / 100;
  const dailyOk = dailyLossPct < account.maxDailyLossPct;
  const totalOk = totalDrawdownPct < account.maxTotalDrawdownPct;
  const canTrade = dailyOk && totalOk;

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
            <Text style={styles.heading}>Prop Tracker</Text>
            <Text style={styles.subheading}>Account Protection Mode</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
            onPress={() => setShowSetup(true)}
          >
            <Ionicons name="settings-outline" size={20} color={C.textSecondary} />
          </Pressable>
        </View>

        {/* Status Card */}
        <View style={[styles.statusCard, canTrade ? styles.statusOk : styles.statusDanger]}>
          <Ionicons
            name={canTrade ? "checkmark-circle" : "warning"}
            size={28}
            color={canTrade ? C.accent : C.accentAlert}
          />
          <View style={styles.statusText}>
            <Text style={[styles.statusTitle, { color: canTrade ? C.accent : C.accentAlert }]}>
              {canTrade ? "Safe to Trade" : "STOP — Limit Reached"}
            </Text>
            <Text style={styles.statusSub}>
              {canTrade
                ? "You are within all prop firm rules"
                : "You have exceeded a loss limit. Protect your account!"}
            </Text>
          </View>
        </View>

        {/* Balance Cards */}
        <View style={styles.balanceRow}>
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Starting</Text>
            <Text style={styles.balanceAmount}>{formatMoney(account.startingBalance)}</Text>
          </View>
          <View style={[styles.balanceCard, styles.balanceCardAccent]}>
            <Text style={[styles.balanceLabel, { color: C.accent }]}>Current</Text>
            <Text style={[styles.balanceAmount, { color: C.accent }]}>
              {formatMoney(account.currentBalance)}
            </Text>
          </View>
        </View>

        {/* Gauges */}
        <View style={styles.gaugesCard}>
          <GaugeBar
            label="Daily Loss"
            value={account.dailyLoss}
            max={account.maxDailyLossPct}
            color={C.accent}
            dangerAt={90}
          />
          <View style={styles.gaugeSep} />
          <GaugeBar
            label="Total Drawdown"
            value={account.totalDrawdown}
            max={account.maxTotalDrawdownPct}
            color="#5E9BFF"
            dangerAt={90}
          />
        </View>

        {/* Info Row */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Daily Limit</Text>
            <Text style={styles.infoValue}>{formatMoney(dailyLimitAmount)}</Text>
            <Text style={styles.infoSub}>({account.maxDailyLossPct}%)</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Today's Loss</Text>
            <Text style={[styles.infoValue, { color: account.dailyLoss > 0 ? C.accentAlert : C.text }]}>
              {formatMoney(account.dailyLoss)}
            </Text>
            <Text style={styles.infoSub}>{dailyLossPct.toFixed(2)}% used</Text>
          </View>
          <View style={styles.infoDivider} />
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Max Drawdown</Text>
            <Text style={styles.infoValue}>{formatMoney(totalLimitAmount)}</Text>
            <Text style={styles.infoSub}>(5%)</Text>
          </View>
        </View>

        {/* Log Loss */}
        <Text style={styles.sectionTitle}>Log a Loss</Text>
        <View style={styles.logCard}>
          <View style={styles.logRow}>
            <TextInput
              style={[styles.textInput, { flex: 1 }]}
              value={lossInput}
              onChangeText={setLossInput}
              placeholder="Loss amount ($)"
              placeholderTextColor={C.textTertiary}
              keyboardType="numeric"
            />
            <Pressable
              style={({ pressed }) => [styles.logBtn, pressed && { opacity: 0.85 }]}
              onPress={handleAddLoss}
            >
              {addLossMutation.isPending ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <Text style={styles.logBtnText}>Add</Text>
              )}
            </Pressable>
          </View>
          <Pressable
            style={({ pressed }) => [styles.resetBtn, pressed && { opacity: 0.7 }]}
            onPress={() =>
              Alert.alert("Reset Daily Loss", "Start a new trading day?", [
                { text: "Cancel", style: "cancel" },
                { text: "Reset", onPress: () => resetDailyMutation.mutate() },
              ])
            }
          >
            <Ionicons name="refresh-outline" size={16} color={C.textSecondary} />
            <Text style={styles.resetBtnText}>Reset Daily Loss (New Day)</Text>
          </Pressable>
        </View>

        {/* Rules */}
        <Text style={styles.sectionTitle}>Prop Firm Rules</Text>
        {[
          { icon: "shield-outline", text: `Max Daily Loss: ${account.maxDailyLossPct}% (${formatMoney(dailyLimitAmount)})` },
          { icon: "trending-down-outline", text: `Max Total Drawdown: 5% (${formatMoney(totalLimitAmount)})` },
          { icon: "close-circle-outline", text: "Stop trading immediately when either limit is hit" },
          { icon: "alarm-outline", text: "Reset daily loss counter every trading morning" },
        ].map(({ icon, text }, i) => (
          <View key={i} style={styles.ruleItem}>
            <Ionicons name={icon as any} size={16} color={C.accent} />
            <Text style={styles.ruleItemText}>{text}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  center: { alignItems: "center", justifyContent: "center" },
  scroll: { paddingHorizontal: 20 },
  headingRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: C.text,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  subheading: { fontSize: 13, color: C.textSecondary, fontFamily: "Inter_400Regular" },
  iconBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    gap: 14,
    borderWidth: 1,
  },
  statusOk: { backgroundColor: C.accent + "12", borderColor: C.accent + "40" },
  statusDanger: { backgroundColor: C.accentAlert + "15", borderColor: C.accentAlert + "40" },
  statusText: { flex: 1 },
  statusTitle: { fontSize: 16, fontWeight: "700", fontFamily: "Inter_700Bold", marginBottom: 2 },
  statusSub: { fontSize: 13, color: C.textSecondary, fontFamily: "Inter_400Regular" },
  balanceRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  balanceCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  balanceCardAccent: { borderColor: C.accent + "50" },
  balanceLabel: { fontSize: 11, color: C.textSecondary, fontFamily: "Inter_500Medium", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  balanceAmount: { fontSize: 20, fontWeight: "700", color: C.text, fontFamily: "Inter_700Bold" },
  gaugesCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  gaugeContainer: { marginBottom: 4 },
  gaugeHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  gaugeLabel: { fontSize: 13, color: C.textSecondary, fontFamily: "Inter_500Medium" },
  gaugeValue: { fontSize: 14, fontWeight: "700", fontFamily: "Inter_700Bold" },
  gaugeMax: { fontSize: 11, color: C.textTertiary },
  gaugeTrack: { height: 8, backgroundColor: C.backgroundTertiary, borderRadius: 4, overflow: "hidden" },
  gaugeFill: { height: "100%", borderRadius: 4 },
  gaugeSep: { height: 1, backgroundColor: C.cardBorder, marginVertical: 16 },
  dangerRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  dangerText: { fontSize: 11, color: C.accentAlert, fontFamily: "Inter_500Medium" },
  infoRow: { flexDirection: "row", backgroundColor: C.card, borderRadius: 14, marginBottom: 24, borderWidth: 1, borderColor: C.cardBorder },
  infoItem: { flex: 1, padding: 14, alignItems: "center" },
  infoDivider: { width: 1, backgroundColor: C.cardBorder, marginVertical: 10 },
  infoLabel: { fontSize: 10, color: C.textTertiary, fontFamily: "Inter_500Medium", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 },
  infoValue: { fontSize: 15, fontWeight: "700", color: C.text, fontFamily: "Inter_700Bold" },
  infoSub: { fontSize: 10, color: C.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textSecondary,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
    marginTop: 4,
  },
  logCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.cardBorder,
    gap: 12,
  },
  logRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  logBtn: {
    backgroundColor: C.accentAlert,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
  },
  logBtnText: { fontSize: 14, fontWeight: "700", color: "#fff", fontFamily: "Inter_700Bold" },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  resetBtnText: { fontSize: 13, color: C.textSecondary, fontFamily: "Inter_400Regular" },
  ruleItem: {
    flexDirection: "row",
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.cardBorder,
    gap: 10,
    alignItems: "flex-start",
  },
  ruleItemText: { flex: 1, fontSize: 13, color: C.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 18 },
  setupCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 24,
    marginTop: 24,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: "center",
  },
  setupTitle: { fontSize: 22, fontWeight: "700", color: C.text, fontFamily: "Inter_700Bold", marginBottom: 10 },
  setupDesc: { fontSize: 14, color: C.textSecondary, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginBottom: 24 },
  inputLabel: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_500Medium", alignSelf: "flex-start", width: "100%", marginBottom: 6, marginTop: 8 },
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
    width: "100%",
  },
  ruleBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: C.accent + "12",
    borderRadius: 10,
    padding: 12,
    gap: 8,
    marginTop: 16,
    marginBottom: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: C.accent + "30",
  },
  ruleText: { flex: 1, fontSize: 13, color: C.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 18 },
  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: "100%",
    alignItems: "center",
  },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: "#000", fontFamily: "Inter_700Bold" },
});
