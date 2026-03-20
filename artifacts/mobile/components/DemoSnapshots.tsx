import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import Svg, { Polyline, Circle, Line, Rect, Text as SvgText, G } from "react-native-svg";

const C = Colors.dark;

function StatCard({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={demoStyles.statCard}>
      <Text style={[demoStyles.statValue, color ? { color } : {}]}>{value}</Text>
      <Text style={demoStyles.statLabel}>{label}</Text>
    </View>
  );
}

export function AnalyticsDemoSnapshot() {
  const pnlPoints = [0, 1.2, 0.8, 2.1, 1.6, 3.4, 2.9, 4.7, 4.2, 6.1, 5.8, 7.3, 6.9, 8.5];
  const maxPnl = Math.max(...pnlPoints);
  const minPnl = Math.min(...pnlPoints);
  const range = maxPnl - minPnl || 1;
  const chartW = 300;
  const chartH = 80;
  const pad = 8;
  const xStep = (chartW - pad * 2) / (pnlPoints.length - 1);
  const toX = (i: number) => pad + i * xStep;
  const toY = (v: number) => pad + chartH - ((v - minPnl) / range) * chartH;
  const polyline = pnlPoints.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" ");

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={demoStyles.container} scrollEnabled={false}>
      <View style={demoStyles.header}>
        <Text style={demoStyles.title}>Analytics</Text>
      </View>

      <View style={demoStyles.heroCard}>
        <Text style={demoStyles.heroLabel}>Cumulative P&L</Text>
        <Text style={[demoStyles.heroValue, { color: "#00C896" }]}>+8.50%</Text>
        <Text style={demoStyles.heroSub}>47 completed trades</Text>
        <Svg width={chartW} height={chartH + pad * 2} style={{ marginTop: 8 }}>
          <Polyline
            points={polyline}
            fill="none"
            stroke="#00C896"
            strokeWidth={2.5}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          <Circle
            cx={toX(pnlPoints.length - 1)}
            cy={toY(pnlPoints[pnlPoints.length - 1])}
            r={4}
            fill="#00C896"
          />
        </Svg>
      </View>

      <View style={demoStyles.grid}>
        <StatCard label="Win Rate" value="68.3%" color="#00C896" />
        <StatCard label="Profit Factor" value="2.14×" color="#00C896" />
        <StatCard label="Avg Risk" value="0.72%" />
        <StatCard label="Discipline" value="74/100" color="#F59E0B" />
      </View>

      <View style={demoStyles.insightsCard}>
        <Text style={demoStyles.sectionTitle}>AI Insights</Text>
        {[
          { color: "#00C896", text: "Silver Bullet: 74% win rate (10–11 AM)" },
          { color: "#818CF8", text: "NQ1! is your best pair — 71% win rate" },
          { color: "#EF4444", text: "FOMO trades cost you 3.2% P&L" },
        ].map((ins, i) => (
          <View key={i} style={[demoStyles.insightRow, { borderLeftColor: ins.color }]}>
            <Text style={demoStyles.insightText}>{ins.text}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function CommunityDemoSnapshot() {
  const demoPostCategories = [
    { label: "#Strategy-Talk", color: "#818CF8" },
    { label: "#Trade-Reviews", color: "#00C896" },
    { label: "#Daily-Wins", color: "#F59E0B" },
    { label: "#General", color: "#94A3B8" },
  ];

  const demoPosts = [
    { author: "TradingElite_Mike", time: "2h", title: "Best Silver Bullet setup I've seen in months!", likes: 14, replies: 5, category: "#Daily-Wins" },
    { author: "ICT_NQ_Hunter", time: "4h", title: "How do you all identify displacement vs noise?", likes: 7, replies: 12, category: "#Questions" },
    { author: "OrderBlockQueen", time: "Yesterday", title: "NY Open recap — caught a beautiful FVG fill at 9:35", likes: 23, replies: 8, category: "#Trade-Reviews" },
    { author: "FVGMaster_Jay", time: "Yesterday", title: "The importance of waiting for MSS before entry", likes: 31, replies: 19, category: "#Strategy-Talk" },
  ];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={demoStyles.container} scrollEnabled={false}>
      <View style={demoStyles.header}>
        <Text style={demoStyles.title}>Community</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 4 }}>
          {demoPostCategories.map((cat) => (
            <View key={cat.label} style={[demoStyles.catChip, { borderColor: cat.color + "60", backgroundColor: cat.color + "15" }]}>
              <Text style={[demoStyles.catChipText, { color: cat.color }]}>{cat.label}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {demoPosts.map((post, i) => (
        <View key={i} style={demoStyles.postCard}>
          <View style={demoStyles.postHeader}>
            <View style={demoStyles.authorCircle}>
              <Text style={demoStyles.authorInitial}>{post.author[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={demoStyles.authorName}>{post.author}</Text>
              <Text style={demoStyles.postTime}>{post.time} · {post.category}</Text>
            </View>
          </View>
          <Text style={demoStyles.postTitle} numberOfLines={2}>{post.title}</Text>
          <View style={demoStyles.postMeta}>
            <View style={demoStyles.metaItem}>
              <Ionicons name="heart-outline" size={13} color={C.textSecondary} />
              <Text style={demoStyles.metaText}>{post.likes}</Text>
            </View>
            <View style={demoStyles.metaItem}>
              <Ionicons name="chatbubble-outline" size={12} color={C.textSecondary} />
              <Text style={demoStyles.metaText}>{post.replies}</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

export function VideosDemoSnapshot() {
  const demoVideos = [
    { title: "ICT Institutional Order Flow — The Full Breakdown", duration: "47:22", level: "Intermediate", watched: true },
    { title: "Smart Money Concepts: FVG Entry Model", duration: "31:08", level: "Beginner", watched: true },
    { title: "Silver Bullet Strategy — 10 AM Kill Zone", duration: "24:55", level: "Intermediate", watched: false },
    { title: "Reading Order Blocks Like a Pro", duration: "38:14", level: "Advanced", watched: false },
    { title: "NY Open Setups: Liquidity Sweeps & MSS", duration: "29:40", level: "Intermediate", watched: false },
  ];

  const levelColor = (l: string) =>
    l === "Beginner" ? "#00C896" : l === "Advanced" ? "#EF4444" : "#F59E0B";

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={demoStyles.container} scrollEnabled={false}>
      <View style={demoStyles.header}>
        <Text style={demoStyles.title}>Video Library</Text>
        <Text style={demoStyles.progressBadge}>2 / 5 watched</Text>
      </View>

      {demoVideos.map((v, i) => (
        <View key={i} style={demoStyles.videoCard}>
          <View style={demoStyles.thumbPlaceholder}>
            <View style={demoStyles.playBtn}>
              <Ionicons name="play" size={16} color="#1a1a1a" />
            </View>
            {v.watched && (
              <View style={demoStyles.watchedBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#00C896" />
              </View>
            )}
            <View style={demoStyles.durationBadge}>
              <Text style={demoStyles.durationText}>{v.duration}</Text>
            </View>
          </View>
          <View style={{ flex: 1, padding: 10 }}>
            <View style={[demoStyles.levelBadge, { backgroundColor: levelColor(v.level) + "20" }]}>
              <Text style={[demoStyles.levelText, { color: levelColor(v.level) }]}>{v.level}</Text>
            </View>
            <Text style={demoStyles.videoTitle} numberOfLines={2}>{v.title}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

export function PropTrackerDemoSnapshot() {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={demoStyles.container} scrollEnabled={false}>
      <View style={demoStyles.header}>
        <Text style={demoStyles.title}>Prop Tracker</Text>
      </View>

      <View style={demoStyles.heroCard}>
        <Text style={demoStyles.heroLabel}>Account Balance</Text>
        <Text style={[demoStyles.heroValue, { color: "#00C896" }]}>$103,280</Text>
        <Text style={demoStyles.heroSub}>Phase 1 — Target: $108,000</Text>
        <View style={demoStyles.progressTrack}>
          <View style={[demoStyles.progressFill, { flex: 41, backgroundColor: "#00C896" }]} />
          <View style={{ flex: 59 }} />
        </View>
        <Text style={[demoStyles.heroSub, { marginTop: 4 }]}>$3,280 / $8,000 profit target (41%)</Text>
      </View>

      <View style={demoStyles.grid}>
        <StatCard label="Max Drawdown" value="$4,720 left" color="#F59E0B" />
        <StatCard label="Daily Limit" value="$1,890 left" color="#F59E0B" />
        <StatCard label="Days Traded" value="12 / 30" />
        <StatCard label="Best Day" value="+$920" color="#00C896" />
      </View>

      <View style={demoStyles.insightsCard}>
        <Text style={demoStyles.sectionTitle}>Recent Trades</Text>
        {[
          { pair: "NQ1!", side: "BUY", pnl: "+$640", time: "10:22 AM" },
          { pair: "MNQ1!", side: "SELL", pnl: "-$180", time: "9:54 AM" },
          { pair: "NQ1!", side: "BUY", pnl: "+$920", time: "Yesterday" },
        ].map((t, i) => (
          <View key={i} style={demoStyles.tradeRow}>
            <Text style={demoStyles.tradePair}>{t.pair}</Text>
            <Text style={[demoStyles.tradeSide, { color: t.side === "BUY" ? "#00C896" : "#EF4444" }]}>{t.side}</Text>
            <Text style={demoStyles.tradeTime}>{t.time}</Text>
            <Text style={[demoStyles.tradePnl, { color: t.pnl.startsWith("+") ? "#00C896" : "#EF4444" }]}>{t.pnl}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

export function WebhooksDemoSnapshot() {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={demoStyles.container} scrollEnabled={false}>
      <View style={demoStyles.header}>
        <Text style={demoStyles.title}>TradingView Webhooks</Text>
      </View>

      <View style={demoStyles.heroCard}>
        <Text style={demoStyles.heroLabel}>Your Webhook URL</Text>
        <View style={demoStyles.urlBox}>
          <Text style={demoStyles.urlText} numberOfLines={1}>https://ictmentor.com/api/webhook/tradingview/••••••••</Text>
        </View>
      </View>

      <View style={demoStyles.insightsCard}>
        <Text style={demoStyles.sectionTitle}>Recent Events</Text>
        {[
          { ticker: "NQ1!", side: "BUY", session: "NY Open", time: "10:02 AM" },
          { ticker: "MNQ1!", side: "SELL", session: "Silver Bullet", time: "10:38 AM" },
          { ticker: "NQ1!", side: "BUY", session: "London", time: "Yesterday" },
        ].map((ev, i) => (
          <View key={i} style={demoStyles.eventRow}>
            <Text style={demoStyles.tradePair}>{ev.ticker}</Text>
            <Text style={[demoStyles.tradeSide, { color: ev.side === "BUY" ? "#00C896" : "#EF4444" }]}>{ev.side}</Text>
            <Text style={demoStyles.tradeTime}>{ev.session}</Text>
            <Text style={[demoStyles.tradePnl, { color: "#00C896" }]}>✓ Draft</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const demoStyles = StyleSheet.create({
  container: { padding: 16, paddingBottom: 32 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: C.text },
  progressBadge: { fontSize: 12, color: C.accent, fontFamily: "Inter_600SemiBold" },
  heroCard: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 16,
    marginBottom: 12,
  },
  heroLabel: { fontSize: 12, color: C.textSecondary, marginBottom: 4 },
  heroValue: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.text },
  heroSub: { fontSize: 11, color: C.textSecondary, marginTop: 2 },
  progressTrack: { flexDirection: "row", height: 8, borderRadius: 4, backgroundColor: C.cardBorder, marginTop: 10, overflow: "hidden" },
  progressFill: { borderRadius: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  statCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: C.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 12,
    alignItems: "center",
  },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 2 },
  statLabel: { fontSize: 10, color: C.textSecondary, textAlign: "center" },
  insightsCard: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 10 },
  insightRow: {
    borderLeftWidth: 3,
    borderLeftColor: C.accent,
    paddingLeft: 10,
    paddingVertical: 4,
    marginBottom: 8,
  },
  insightText: { fontSize: 12, color: C.textSecondary, lineHeight: 18 },
  tradeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    gap: 8,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    gap: 8,
  },
  tradePair: { flex: 1, fontSize: 13, fontFamily: "Inter_700Bold", color: C.text },
  tradeSide: { fontSize: 11, fontFamily: "Inter_600SemiBold", minWidth: 36 },
  tradeTime: { flex: 1, fontSize: 11, color: C.textSecondary, textAlign: "center" },
  tradePnl: { fontSize: 13, fontFamily: "Inter_700Bold", minWidth: 60, textAlign: "right" },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  catChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  postCard: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 14,
    marginBottom: 10,
  },
  postHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  authorCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.accent + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  authorInitial: { fontSize: 14, fontFamily: "Inter_700Bold", color: C.accent },
  authorName: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text },
  postTime: { fontSize: 11, color: C.textSecondary },
  postTitle: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text, lineHeight: 20, marginBottom: 8 },
  postMeta: { flexDirection: "row", gap: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, color: C.textSecondary },
  videoCard: {
    flexDirection: "row",
    backgroundColor: C.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: "hidden",
    marginBottom: 10,
  },
  thumbPlaceholder: {
    width: 110,
    height: 72,
    backgroundColor: "#1A1A2A",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    justifyContent: "center",
  },
  watchedBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: C.background,
    borderRadius: 8,
    padding: 1,
  },
  durationBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  durationText: { fontSize: 10, color: "#fff", fontFamily: "Inter_600SemiBold" },
  levelBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 5,
  },
  levelText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  videoTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text, lineHeight: 18 },
  urlBox: {
    backgroundColor: C.background,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 10,
    marginTop: 8,
  },
  urlText: { fontSize: 11, color: C.textSecondary, fontFamily: "Inter_400Regular" },
});
