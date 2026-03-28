import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TextInput,
  ScrollView,
  DimensionValue,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useChromeCollapse } from "@/contexts/ChromeCollapseContext";
import { usePropAccount } from "@/contexts/PropAccountContext";

const C = Colors.dark;

const NQ_POINT_VALUE = 20;
const MNQ_POINT_VALUE = 2;

function getGaugeColor(pct: number): string {
  if (pct >= 1) return "#EF4444";
  if (pct >= 0.75) return "#F59E0B";
  return C.accent;
}

export default function RiskFloatingWidget() {
  const [expanded, setExpanded] = useState(false);
  const [pointsAtRisk, setPointsAtRisk] = useState("");
  const [customBalance, setCustomBalance] = useState("");

  const expandAnim = useRef(new Animated.Value(0)).current;
  const { footerAnim } = useChromeCollapse();

  const footerTranslateY = footerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 160],
  });

  const { balance, startingBalance, dailyLoss, maxDailyLoss } = usePropAccount();

  const dailyLossPct =
    startingBalance > 0 ? (dailyLoss / startingBalance) * 100 : 0;
  const gaugePct = maxDailyLoss > 0 ? dailyLossPct / maxDailyLoss : 0;
  const gaugeColor = getGaugeColor(gaugePct);
  const fillPct: DimensionValue = `${Math.round(Math.min(gaugePct, 1) * 100)}%`;

  const parsedCustomBalance = parseFloat(customBalance);
  const calcBalance =
    customBalance && !isNaN(parsedCustomBalance) && parsedCustomBalance > 0
      ? parsedCustomBalance
      : balance;
  const riskAmount = calcBalance * 0.005;
  const pts = parseFloat(pointsAtRisk) || 0;
  const nqContracts = pts > 0 ? riskAmount / (pts * NQ_POINT_VALUE) : 0;
  const mnqContracts = pts > 0 ? riskAmount / (pts * MNQ_POINT_VALUE) : 0;

  function toggleExpanded() {
    const toValue = expanded ? 0 : 1;
    setExpanded(!expanded);
    Animated.spring(expandAnim, {
      toValue,
      useNativeDriver: false,
      tension: 80,
      friction: 12,
    }).start();
  }

  const panelHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 220],
  });

  const panelOpacity = expandAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.4, 1],
  });

  return (
    <Animated.View
      style={[s.container, { transform: [{ translateY: footerTranslateY }] }]}
    >
      <Animated.View
        style={[s.expandedPanel, { height: panelHeight, opacity: panelOpacity }]}
        pointerEvents={expanded ? "box-none" : "none"}
      >
        <ScrollView
          scrollEnabled={false}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1 }}
        >
          <Text style={s.panelTitle}>Position Size Calculator</Text>
          <Text style={s.panelSubtitle}>Risks 0.5% of balance per trade</Text>

          <View style={s.calcRow}>
            <Text style={s.calcLabel}>Balance ($)</Text>
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                value={customBalance}
                onChangeText={setCustomBalance}
                placeholder={balance.toFixed(0)}
                placeholderTextColor={C.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={s.calcRow}>
            <Text style={s.calcLabel}>Points at Risk</Text>
            <View style={s.inputWrap}>
              <TextInput
                style={s.input}
                value={pointsAtRisk}
                onChangeText={setPointsAtRisk}
                placeholder="e.g. 10"
                placeholderTextColor={C.textSecondary}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {pts > 0 && (
            <View style={s.resultRow}>
              <View style={s.resultChip}>
                <Text style={s.resultLabel}>NQ</Text>
                <Text style={s.resultValue}>{nqContracts.toFixed(2)}</Text>
              </View>
              <View style={s.resultChip}>
                <Text style={s.resultLabel}>MNQ</Text>
                <Text style={s.resultValue}>{mnqContracts.toFixed(2)}</Text>
              </View>
              <View style={s.resultChip}>
                <Text style={s.resultLabel}>Risk $</Text>
                <Text style={s.resultValue}>${riskAmount.toFixed(0)}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </Animated.View>

      <TouchableOpacity
        style={s.pill}
        onPress={toggleExpanded}
        activeOpacity={0.88}
        accessibilityLabel={expanded ? "Collapse risk widget" : "Expand risk widget"}
        accessibilityRole="button"
      >
        <View style={s.gaugeSection}>
          <View style={s.gaugeLabelRow}>
            <Ionicons name="shield-half-outline" size={12} color={gaugeColor} />
            <Text style={[s.gaugeLabel, { color: gaugeColor }]}>Daily DD</Text>
            <Text style={[s.gaugeValue, { color: gaugeColor }]}>
              {dailyLossPct.toFixed(2)}%
            </Text>
            <Text style={s.gaugeLimit}>/ {maxDailyLoss}%</Text>
          </View>
          <View style={s.gaugeTrack}>
            <View
              style={[s.gaugeFill, { width: fillPct, backgroundColor: gaugeColor }]}
            />
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.calcSection}>
          <Ionicons name="calculator-outline" size={14} color={C.textSecondary} />
          <Text style={s.calcSectionLabel}>Pos Calc</Text>
          <Ionicons
            name={expanded ? "chevron-down" : "chevron-up"}
            size={12}
            color={C.textSecondary}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 84,
    left: 16,
    right: 100,
    zIndex: 98,
  },
  expandedPanel: {
    backgroundColor: "rgba(21,21,31,0.97)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    marginBottom: 6,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4,
  },
  panelTitle: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: C.text,
    marginBottom: 2,
  },
  panelSubtitle: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
    marginBottom: 10,
  },
  calcRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  calcLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: C.textSecondary,
    flex: 1,
  },
  inputWrap: {
    flex: 1,
    backgroundColor: C.inputBackground,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  input: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: C.text,
    padding: 0,
  },
  resultRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    marginBottom: 8,
  },
  resultChip: {
    flex: 1,
    backgroundColor: "rgba(0,200,150,0.08)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(0,200,150,0.2)",
    paddingVertical: 6,
    alignItems: "center",
  },
  resultLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
    marginBottom: 2,
  },
  resultValue: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: C.accent,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(21,21,31,0.96)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    gap: 10,
  },
  gaugeSection: {
    flex: 1,
  },
  gaugeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  gaugeLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  gaugeValue: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  gaugeLimit: {
    fontSize: 9,
    fontFamily: "Inter_400Regular",
    color: C.textSecondary,
  },
  gaugeTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: C.cardBorder,
    overflow: "hidden",
  },
  gaugeFill: {
    height: "100%",
    borderRadius: 2,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: C.cardBorder,
  },
  calcSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  calcSectionLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
  },
});
