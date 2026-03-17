import React, { useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useListTrades } from "@workspace/api-client-react";
import type { Trade } from "@workspace/api-client-react";
import Colors from "@/constants/colors";

const C = Colors.dark;

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface StatCard {
  label: string;
  value: string;
  color?: string;
  icon: IoniconsName;
}

export default function AnalyticsScreen() {
  const { data: rawTrades, isLoading } = useListTrades();

  const trades = useMemo(() => {
    if (!rawTrades) return [];
    return (rawTrades as Trade[]).filter((t) => !t.isDraft);
  }, [rawTrades]);

  const stats = useMemo(() => {
    if (trades.length === 0) return null;

    const wins = trades.filter((t) => t.outcome === "win").length;
    const losses = trades.filter((t) => t.outcome === "loss").length;
    const breakeven = trades.filter((t) => t.outcome === "breakeven").length;
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    const avgWinRisk =
      wins > 0
        ? trades
            .filter((t) => t.outcome === "win")
            .reduce((s, t) => s + t.riskPct, 0) / wins
        : 0;
    const avgLossRisk =
      losses > 0
        ? trades
            .filter((t) => t.outcome === "loss")
            .reduce((s, t) => s + t.riskPct, 0) / losses
        : 0;

    const profitFactor =
      losses > 0 && avgLossRisk > 0
        ? (wins * avgWinRisk) / (losses * avgLossRisk)
        : wins > 0
        ? Infinity
        : 0;

    const avgRisk =
      totalTrades > 0
        ? trades.reduce((s, t) => s + t.riskPct, 0) / totalTrades
        : 0;

    const sorted = [...trades].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    let cumPnl = 0;
    sorted.forEach((t) => {
      if (t.outcome === "win") cumPnl += t.riskPct;
      else if (t.outcome === "loss") cumPnl -= t.riskPct;
    });

    const disciplinedCount = trades.filter(
      (t) => t.behaviorTag === "Disciplined"
    ).length;
    const disciplineRate =
      totalTrades > 0 ? (disciplinedCount / totalTrades) * 100 : 0;

    const riskAdherence =
      (trades.filter((t) => t.riskPct <= 1).length / totalTrades) * 100;

    const timeRuleTotal = trades.filter((t) => t.followedTimeRule !== null).length;
    const timeRuleRate =
      timeRuleTotal > 0
        ? (trades.filter((t) => t.followedTimeRule === true).length /
            timeRuleTotal) *
          100
        : 0;

    const disciplineScore =
      disciplineRate * 0.3 +
      winRate * 0.25 +
      riskAdherence * 0.25 +
      timeRuleRate * 0.2;

    return {
      wins,
      losses,
      breakeven,
      totalTrades,
      winRate,
      profitFactor,
      avgRisk,
      cumPnl,
      disciplineScore,
    };
  }, [trades]);

  async function handleShare() {
    if (!stats) return;
    const sign = stats.cumPnl >= 0 ? "+" : "";
    const text =
      `📊 My ICT Trading Performance\n` +
      `✅ Win Rate: ${Math.round(stats.winRate)}%\n` +
      `💰 Cumulative P&L: ${sign}${stats.cumPnl.toFixed(2)}%\n` +
      `⚡ Profit Factor: ${stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}×\n` +
      `📈 Total Trades: ${stats.totalTrades}\n` +
      `🧠 Discipline: ${Math.round(stats.disciplineScore)}%\n\n` +
      `Trained with ICT AI Trading Mentor 🤖\nNot financial advice.`;
    try {
      await Share.share({ message: text, title: "My ICT Trading Stats" });
    } catch {}
  }

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!stats || trades.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.header}>
          <Text style={s.title}>Analytics</Text>
        </View>
        <View style={s.center}>
          <Ionicons name="bar-chart-outline" size={48} color={C.cardBorder} />
          <Text style={s.emptyText}>No trades yet</Text>
          <Text style={s.emptySubtext}>
            Log trades in the Journal to see your analytics
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const pnlSign = stats.cumPnl >= 0 ? "+" : "";
  const pnlColor = stats.cumPnl >= 0 ? "#00C896" : "#EF4444";
  const pfStr =
    stats.profitFactor === Infinity
      ? "∞"
      : stats.profitFactor.toFixed(2) + "×";

  const statCards: StatCard[] = [
    {
      label: "Win Rate",
      value: `${stats.winRate.toFixed(1)}%`,
      color: stats.winRate >= 50 ? "#00C896" : "#EF4444",
      icon: "trophy-outline",
    },
    {
      label: "Total Trades",
      value: stats.totalTrades.toString(),
      icon: "layers-outline",
    },
    {
      label: "Profit Factor",
      value: pfStr,
      color: stats.profitFactor >= 1 ? "#00C896" : "#EF4444",
      icon: "trending-up-outline",
    },
    {
      label: "Avg Risk/Trade",
      value: `${stats.avgRisk.toFixed(2)}%`,
      color: stats.avgRisk <= 1 ? "#00C896" : "#F59E0B",
      icon: "warning-outline",
    },
    {
      label: "Wins",
      value: stats.wins.toString(),
      color: "#00C896",
      icon: "checkmark-circle-outline",
    },
    {
      label: "Losses",
      value: stats.losses.toString(),
      color: "#EF4444",
      icon: "close-circle-outline",
    },
    {
      label: "Breakeven",
      value: stats.breakeven.toString(),
      color: C.textSecondary,
      icon: "remove-circle-outline",
    },
    {
      label: "Discipline Score",
      value: `${Math.round(stats.disciplineScore)}/100`,
      color:
        stats.disciplineScore >= 70
          ? "#00C896"
          : stats.disciplineScore >= 50
          ? "#F59E0B"
          : "#EF4444",
      icon: "shield-checkmark-outline",
    },
  ];

  const discColor =
    stats.disciplineScore >= 70
      ? "#00C896"
      : stats.disciplineScore >= 50
      ? "#F59E0B"
      : "#EF4444";
  const discLabel =
    stats.disciplineScore >= 80
      ? "Excellent — keep it up!"
      : stats.disciplineScore >= 60
      ? "Good — room to improve"
      : stats.disciplineScore >= 40
      ? "Needs work"
      : "Focus on your rules";

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>Analytics</Text>
        <TouchableOpacity style={s.shareBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={15} color={C.accent} />
          <Text style={s.shareBtnText}>Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.heroCard}>
          <Text style={s.heroLabel}>Cumulative P&L</Text>
          <Text style={[s.heroValue, { color: pnlColor }]}>
            {pnlSign}{stats.cumPnl.toFixed(2)}%
          </Text>
          <Text style={s.heroSub}>{stats.totalTrades} completed trades</Text>

          {stats.totalTrades > 0 && (
            <>
              <View style={s.wlbRow}>
                {stats.wins > 0 && (
                  <View
                    style={[
                      s.wlbBar,
                      { flex: stats.wins, backgroundColor: "#00C896" },
                    ]}
                  />
                )}
                {stats.losses > 0 && (
                  <View
                    style={[
                      s.wlbBar,
                      { flex: stats.losses, backgroundColor: "#EF4444" },
                    ]}
                  />
                )}
                {stats.breakeven > 0 && (
                  <View
                    style={[
                      s.wlbBar,
                      { flex: stats.breakeven, backgroundColor: "#6B7280" },
                    ]}
                  />
                )}
              </View>
              <View style={s.wlbLabels}>
                <Text style={[s.wlbLabel, { color: "#00C896" }]}>
                  {stats.wins}W
                </Text>
                <Text style={[s.wlbLabel, { color: "#EF4444" }]}>
                  {stats.losses}L
                </Text>
                {stats.breakeven > 0 && (
                  <Text style={[s.wlbLabel, { color: C.textSecondary }]}>
                    {stats.breakeven}BE
                  </Text>
                )}
              </View>
            </>
          )}
        </View>

        <View style={s.grid}>
          {statCards.map((card) => (
            <View key={card.label} style={s.statCard}>
              <Ionicons
                name={card.icon}
                size={18}
                color={card.color || C.accent}
              />
              <Text style={[s.statValue, { color: card.color || C.text }]}>
                {card.value}
              </Text>
              <Text style={s.statLabel}>{card.label}</Text>
            </View>
          ))}
        </View>

        <View style={s.discCard}>
          <View style={s.discHeader}>
            <Ionicons name="shield-checkmark" size={18} color={discColor} />
            <Text style={s.discTitle}>Overall Discipline Score</Text>
            <Text style={[s.discScore, { color: discColor }]}>
              {Math.round(stats.disciplineScore)}/100
            </Text>
          </View>
          <View style={s.discTrack}>
            <View
              style={[
                s.discFill,
                {
                  width: `${Math.min(stats.disciplineScore, 100)}%` as any,
                  backgroundColor: discColor,
                },
              ]}
            />
          </View>
          <Text style={s.discSub}>{discLabel}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  title: { fontSize: 22, fontWeight: "800", color: C.text },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.accent + "40",
    backgroundColor: C.accent + "12",
  },
  shareBtnText: { fontSize: 13, fontWeight: "600", color: C.accent },
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 100, gap: 12 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
    marginTop: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  heroCard: {
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 16,
    padding: 18,
    gap: 6,
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  heroValue: { fontSize: 40, fontWeight: "800" },
  heroSub: { fontSize: 12, color: C.textSecondary },
  wlbRow: {
    flexDirection: "row",
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
    gap: 1,
    marginTop: 6,
  },
  wlbBar: { height: 6 },
  wlbLabels: { flexDirection: "row", gap: 12, marginTop: 4 },
  wlbLabel: { fontSize: 11, fontWeight: "700" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  statCard: {
    flex: 1,
    minWidth: "44%",
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 12,
    padding: 14,
    gap: 3,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: C.text },
  statLabel: { fontSize: 11, color: C.textSecondary, fontWeight: "500" },
  discCard: {
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  discHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  discTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
  },
  discScore: { fontSize: 14, fontWeight: "800" },
  discTrack: {
    height: 6,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 3,
    overflow: "hidden",
  },
  discFill: { height: 6, borderRadius: 3 },
  discSub: { fontSize: 12, color: C.textSecondary },
});
