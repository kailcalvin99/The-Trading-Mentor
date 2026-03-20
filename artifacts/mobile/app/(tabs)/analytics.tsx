import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Share,
  ActivityIndicator,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Svg, { Polyline, Line, Circle, Rect, Text as SvgText, G } from "react-native-svg";
import { useListTrades } from "@workspace/api-client-react";
import type { Trade } from "@workspace/api-client-react";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import FullModeGate from "@/components/FullModeGate";
import FrostedGate from "@/components/FrostedGate";
import { AnalyticsDemoSnapshot } from "@/components/DemoSnapshots";
import { useScrollCollapseProps } from "@/contexts/ScrollDirectionContext";
import { apiGet } from "@/lib/api";

const SCREEN_W = Dimensions.get("window").width;

const C = Colors.dark;

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface StatCard {
  label: string;
  value: string;
  color?: string;
  icon: IoniconsName;
}

function PnlLineChart({ trades, width, height }: { trades: Trade[]; width: number; height: number }) {
  const sorted = useMemo(() => [...trades].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()), [trades]);
  const points = useMemo(() => {
    let cum = 0;
    const pts: number[] = [0];
    sorted.forEach((t) => {
      if (t.outcome === "win") cum += t.riskPct;
      else if (t.outcome === "loss") cum -= t.riskPct;
      pts.push(cum);
    });
    return pts;
  }, [sorted]);

  if (points.length < 2) return null;

  const pad = { top: 14, bottom: 28, left: 36, right: 12 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  const minPnl = Math.min(...points);
  const maxPnl = Math.max(...points);
  const range = maxPnl - minPnl || 1;

  const xStep = chartW / (points.length - 1);
  const toX = (i: number) => pad.left + i * xStep;
  const toY = (v: number) => pad.top + chartH - ((v - minPnl) / range) * chartH;

  const polyPoints = points.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");
  const isPositive = points[points.length - 1] >= 0;
  const lineColor = isPositive ? "#00C896" : "#EF4444";

  const yTicks = [minPnl, 0, maxPnl].filter((v, i, arr) => arr.indexOf(v) === i);

  return (
    <Svg width={width} height={height}>
      {yTicks.map((v) => (
        <G key={v}>
          <Line
            x1={pad.left} y1={toY(v).toFixed(1)}
            x2={width - pad.right} y2={toY(v).toFixed(1)}
            stroke={v === 0 ? C.textSecondary + "60" : C.cardBorder}
            strokeWidth={v === 0 ? 1.5 : 0.8}
            strokeDasharray={v === 0 ? "4 4" : undefined}
          />
          <SvgText
            x={pad.left - 4} y={toY(v) + 4}
            fontSize={9} fill={C.textSecondary} textAnchor="end"
          >
            {v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)}
          </SvgText>
        </G>
      ))}
      <Polyline points={polyPoints} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={toX(points.length - 1)} cy={toY(points[points.length - 1])} r={4} fill={lineColor} />
      {points.map((v, i) => (
        <Circle key={i} cx={toX(i)} cy={toY(v)} r={2} fill={lineColor} opacity={0.5} />
      ))}
    </Svg>
  );
}

function WinLossBarChart({ wins, losses, breakeven, width, height }: { wins: number; losses: number; breakeven: number; width: number; height: number }) {
  const data = [
    { label: "W", value: wins, color: "#00C896" },
    { label: "L", value: losses, color: "#EF4444" },
    { label: "BE", value: breakeven, color: "#6B7280" },
  ].filter((d) => d.value > 0);

  if (data.length === 0) return null;

  const pad = { top: 14, bottom: 28, left: 28, right: 12 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;
  const maxVal = Math.max(...data.map((d) => d.value));
  const barW = Math.min(48, (chartW / data.length) * 0.55);
  const gap = chartW / data.length;

  return (
    <Svg width={width} height={height}>
      {[0, Math.ceil(maxVal / 2), maxVal].map((tick) => {
        const y = pad.top + chartH - (tick / maxVal) * chartH;
        return (
          <G key={tick}>
            <Line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke={C.cardBorder} strokeWidth={0.8} />
            <SvgText x={pad.left - 4} y={y + 4} fontSize={9} fill={C.textSecondary} textAnchor="end">{tick}</SvgText>
          </G>
        );
      })}
      {data.map((d, i) => {
        const barH = (d.value / maxVal) * chartH;
        const x = pad.left + i * gap + (gap - barW) / 2;
        const y = pad.top + chartH - barH;
        return (
          <G key={d.label}>
            <Rect x={x} y={y} width={barW} height={barH} rx={4} fill={d.color} opacity={0.9} />
            <SvgText x={x + barW / 2} y={pad.top + chartH + 16} fontSize={10} fill={d.color} textAnchor="middle" fontWeight="700">{d.label}</SvgText>
            <SvgText x={x + barW / 2} y={y - 4} fontSize={10} fill={d.color} textAnchor="middle" fontWeight="700">{d.value}</SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

export default function AnalyticsScreenGated() {
  return (
    <FullModeGate demoContent={<AnalyticsDemoSnapshot />}>
      <AnalyticsScreen />
    </FullModeGate>
  );
}

function AnalyticsScreen() {
  const scrollCollapseProps = useScrollCollapseProps();
  const { user, subscription } = useAuth();
  const router = useRouter();
  const [expandedChart, setExpandedChart] = useState<"pnl" | "wlb" | null>(null);
  const tierLevel = user?.role === "admin" ? 2 : (subscription?.tierLevel ?? 0);
  const { data: rawTrades, isLoading } = useListTrades();

  const trades = useMemo(() => {
    if (!rawTrades) return [];
    return (rawTrades as Trade[]).filter(Boolean).filter((t) => !t.isDraft);
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

  if (tierLevel < 2) {
    return (
      <SafeAreaView style={s.safe} edges={["bottom"]}>
        <FrostedGate mode="premium">
          <AnalyticsDemoSnapshot />
        </FrostedGate>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={["bottom"]}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!stats || trades.length === 0) {
    return (
      <SafeAreaView style={s.safe} edges={["bottom"]}>
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
    <SafeAreaView style={s.safe} edges={["bottom"]}>
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
        {...scrollCollapseProps}
      >
        <View style={s.heroCard}>
          <View style={s.chartCardHeader}>
            <View>
              <Text style={s.heroLabel}>Cumulative P&L</Text>
              <Text style={[s.heroValue, { color: pnlColor }]}>
                {pnlSign}{stats.cumPnl.toFixed(2)}%
              </Text>
              <Text style={s.heroSub}>{stats.totalTrades} completed trades</Text>
            </View>
            <TouchableOpacity style={s.expandBtn} onPress={() => setExpandedChart("pnl")}>
              <Ionicons name="expand-outline" size={16} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
          {trades.length >= 2 && (
            <View style={{ marginTop: 8 }}>
              <PnlLineChart trades={trades} width={SCREEN_W - 60} height={140} />
            </View>
          )}
        </View>

        <View style={s.chartCard}>
          <View style={s.chartCardHeader}>
            <Text style={s.chartCardTitle}>Win / Loss / Breakeven</Text>
            <TouchableOpacity style={s.expandBtn} onPress={() => setExpandedChart("wlb")}>
              <Ionicons name="expand-outline" size={16} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
          <WinLossBarChart wins={stats.wins} losses={stats.losses} breakeven={stats.breakeven} width={SCREEN_W - 60} height={130} />
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
                  flex: Math.min(stats.disciplineScore, 100),
                  backgroundColor: discColor,
                },
              ]}
            />
            <View style={{ flex: 100 - Math.min(stats.disciplineScore, 100) }} />
          </View>
          <Text style={s.discSub}>{discLabel}</Text>
        </View>

        <IctBreakdownMobileSection />
      </ScrollView>

      {expandedChart !== null && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setExpandedChart(null)}>
          <View style={s.modalOverlay}>
            <View style={s.modalCard}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>
                  {expandedChart === "pnl" ? "Cumulative P&L" : "Win / Loss / Breakeven"}
                </Text>
                <TouchableOpacity onPress={() => setExpandedChart(null)}>
                  <Ionicons name="close" size={22} color={C.text} />
                </TouchableOpacity>
              </View>
              {expandedChart === "pnl" && (
                <PnlLineChart trades={trades} width={SCREEN_W - 48} height={260} />
              )}
              {expandedChart === "wlb" && (
                <WinLossBarChart wins={stats.wins} losses={stats.losses} breakeven={stats.breakeven} width={SCREEN_W - 48} height={240} />
              )}
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

interface MobileSessionPerf {
  session: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
  avgR: number;
}

interface MobileFvgHitRate {
  total: number;
  tp: number;
  sl: number;
  hitRate: number;
}

interface MobileNewsDayImpact {
  newsDay: { total: number; wins: number; winRate: number };
  cleanDay: { total: number; wins: number; winRate: number };
}

interface MobileIctBreakdownData {
  sessionPerformance: MobileSessionPerf[];
  fvgHitRate: MobileFvgHitRate;
  newsDayImpact: MobileNewsDayImpact;
}

function IctBreakdownMobileSection() {
  const [collapsed, setCollapsed] = useState(false);
  const [data, setData] = useState<MobileIctBreakdownData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiGet<MobileIctBreakdownData>("analytics/ict-breakdown")
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => { setError("Unable to load ICT analytics"); setLoading(false); });
  }, []);

  const newsBarData = data ? [
    { label: "News Days", winRate: data.newsDayImpact.newsDay.winRate, total: data.newsDayImpact.newsDay.total, color: "#EF4444" },
    { label: "Clean Days", winRate: data.newsDayImpact.cleanDay.winRate, total: data.newsDayImpact.cleanDay.total, color: "#00C896" },
  ] : [];

  const newsBarMaxRate = newsBarData.length > 0 ? Math.max(...newsBarData.map((d) => d.winRate), 1) : 100;

  return (
    <View style={[s.discCard, { gap: 0 }]}>
      <TouchableOpacity
        style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: collapsed ? 0 : 12, borderBottomWidth: collapsed ? 0 : 1, borderBottomColor: C.cardBorder }}
        onPress={() => setCollapsed((c) => !c)}
        activeOpacity={0.7}
      >
        <Ionicons name="shield-checkmark-outline" size={16} color={C.accent} />
        <Text style={{ fontSize: 14, fontFamily: "Inter_700Bold", color: C.text, flex: 1 }}>ICT Breakdown</Text>
        <Ionicons name={collapsed ? "chevron-down" : "chevron-up"} size={16} color={C.textSecondary} />
      </TouchableOpacity>

      {!collapsed && (
        <View style={{ gap: 16, paddingTop: 12 }}>
          {loading && <Text style={{ fontSize: 12, color: C.textSecondary, textAlign: "center" }}>Loading…</Text>}
          {error && <Text style={{ fontSize: 12, color: "#EF4444", textAlign: "center" }}>{error}</Text>}

          {data && (
            <>
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <Ionicons name="time-outline" size={14} color={C.accent} />
                  <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: C.text }}>Session Performance</Text>
                </View>
                {data.sessionPerformance.length === 0 ? (
                  <Text style={{ fontSize: 12, color: C.textSecondary }}>No session data yet.</Text>
                ) : (
                  <View style={{ gap: 8 }}>
                    {data.sessionPerformance.map((row) => (
                      <View key={row.session} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ width: 80, fontSize: 12, fontFamily: "Inter_600SemiBold", color: C.text }}>{row.session}</Text>
                        <Text style={{ width: 50, fontSize: 12, fontFamily: "Inter_700Bold", color: row.winRate >= 50 ? "#00C896" : "#EF4444", textAlign: "center" }}>{row.winRate}%</Text>
                        <Text style={{ fontSize: 11, color: row.avgR >= 0 ? "#00C896" : "#EF4444", fontFamily: "Inter_600SemiBold" }}>{row.avgR >= 0 ? "+" : ""}{row.avgR}R</Text>
                        <Text style={{ fontSize: 11, color: C.textTertiary, fontFamily: "Inter_400Regular", marginLeft: "auto" }}>{row.total} trades</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: C.cardBorder, paddingTop: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <Ionicons name="flash-outline" size={14} color={C.accent} />
                  <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: C.text }}>FVG Hit Rate</Text>
                </View>
                {data.fvgHitRate.total === 0 ? (
                  <Text style={{ fontSize: 12, color: C.textSecondary }}>No FVG-tagged trades yet.</Text>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
                    <Text style={{ fontSize: 32, fontFamily: "Inter_700Bold", color: C.accent }}>{data.fvgHitRate.hitRate}%</Text>
                    <View style={{ flex: 1, gap: 6 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ width: 60, fontSize: 11, color: "#00C896", fontFamily: "Inter_600SemiBold" }}>TP: {data.fvgHitRate.tp}</Text>
                        <View style={{ flex: 1, height: 6, backgroundColor: C.backgroundTertiary, borderRadius: 3, overflow: "hidden" }}>
                          <View style={{ height: 6, backgroundColor: "#00C896", width: `${data.fvgHitRate.total > 0 ? (data.fvgHitRate.tp / data.fvgHitRate.total) * 100 : 0}%` }} />
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={{ width: 60, fontSize: 11, color: "#EF4444", fontFamily: "Inter_600SemiBold" }}>SL: {data.fvgHitRate.sl}</Text>
                        <View style={{ flex: 1, height: 6, backgroundColor: C.backgroundTertiary, borderRadius: 3, overflow: "hidden" }}>
                          <View style={{ height: 6, backgroundColor: "#EF4444", width: `${data.fvgHitRate.total > 0 ? (data.fvgHitRate.sl / data.fvgHitRate.total) * 100 : 0}%` }} />
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              <View style={{ borderTopWidth: 1, borderTopColor: C.cardBorder, paddingTop: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <Ionicons name="calendar-outline" size={14} color={C.accent} />
                  <Text style={{ fontSize: 13, fontFamily: "Inter_700Bold", color: C.text }}>News Day Impact</Text>
                </View>
                {newsBarData.every((d) => d.total === 0) ? (
                  <Text style={{ fontSize: 12, color: C.textSecondary }}>No trade data yet.</Text>
                ) : (
                  <Svg width={SCREEN_W - 80} height={100}>
                    {newsBarData.map((d, i) => {
                      const barH = newsBarMaxRate > 0 ? (d.winRate / newsBarMaxRate) * 60 : 0;
                      const barW = 60;
                      const gap = (SCREEN_W - 80 - newsBarData.length * barW) / (newsBarData.length + 1);
                      const x = gap + i * (barW + gap);
                      const y = 70 - barH;
                      return (
                        <G key={d.label}>
                          <Rect x={x} y={y} width={barW} height={barH} rx={4} fill={d.color} opacity={0.85} />
                          <SvgText x={x + barW / 2} y={y - 4} fontSize={11} fill={d.color} textAnchor="middle" fontWeight="700">{d.winRate}%</SvgText>
                          <SvgText x={x + barW / 2} y={88} fontSize={10} fill={C.textSecondary} textAnchor="middle">{d.label}</SvgText>
                          <SvgText x={x + barW / 2} y={100} fontSize={9} fill={C.textTertiary} textAnchor="middle">{d.total} trades</SvgText>
                        </G>
                      );
                    })}
                  </Svg>
                )}
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
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
  upgradeBtn: {
    marginTop: 16,
    backgroundColor: C.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  upgradeBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0A0A0F",
  },
  heroCard: {
    backgroundColor: C.card,
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
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 12,
    padding: 14,
    gap: 3,
  },
  statValue: { fontSize: 22, fontWeight: "800", color: C.text },
  statLabel: { fontSize: 11, color: C.textSecondary, fontWeight: "500" },
  discCard: {
    backgroundColor: C.card,
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
    flexDirection: "row",
    height: 6,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 3,
    overflow: "hidden",
  },
  discFill: { height: 6 },
  discSub: { fontSize: 12, color: C.textSecondary },
  chartCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 16,
    padding: 16,
    gap: 4,
  },
  chartCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  chartCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.7,
  },
  expandBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: C.backgroundSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: C.text,
  },
});
