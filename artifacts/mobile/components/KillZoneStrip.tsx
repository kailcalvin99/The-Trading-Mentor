import React, { useState, useEffect, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Colors from "@/constants/colors";
import { useListTrades } from "@workspace/api-client-react";

const C = Colors.dark;

interface Session {
  name: string;
  subtitle: string;
  startH: number;
  startM: number;
  endH: number;
  endM: number;
  color: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
}

const SESSIONS: Session[] = [
  { name: "London", subtitle: "2:00–5:00 AM EST", startH: 2, startM: 0, endH: 5, endM: 0, color: "#F59E0B", icon: "globe" },
  { name: "NY Open", subtitle: "9:30–10:00 AM EST", startH: 9, startM: 30, endH: 10, endM: 0, color: "#00C896", icon: "trending-up" },
  { name: "Silver Bullet", subtitle: "10:00–11:00 AM EST", startH: 10, startM: 0, endH: 11, endM: 0, color: "#EF4444", icon: "flash" },
  { name: "London Close", subtitle: "11 AM–12 PM EST", startH: 11, startM: 0, endH: 12, endM: 0, color: "#818CF8", icon: "time" },
];

function getESTNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + -5 * 3600000);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "LIVE NOW";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function formatESTTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export default function KillZoneStrip() {
  const router = useRouter();
  const [, setTick] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const scrollIndexRef = useRef(0);
  const { data: apiTrades } = useListTrades();

  const trades = (apiTrades || []).filter(Boolean) as Array<{
    outcome?: string | null;
    pnl?: string | number | null;
    createdAt?: string | null;
    isDraft?: boolean | null;
  }>;

  const today = new Date().toDateString();
  const todayTrades = trades.filter((t) => {
    if (t.isDraft) return false;
    if (!t.createdAt) return false;
    return new Date(t.createdAt).toDateString() === today;
  });
  const todayCompleted = todayTrades.filter((t) => t.outcome === "win" || t.outcome === "loss");
  const todayWins = todayCompleted.filter((t) => t.outcome === "win").length;
  const winRate = todayCompleted.length > 0 ? Math.round((todayWins / todayCompleted.length) * 100) : null;
  const todayPnL = todayTrades.reduce((sum, t) => {
    const v = parseFloat(String(t.pnl ?? "0"));
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  const CARD_WIDTH = 111;
  const totalCards = SESSIONS.length + 3;

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const autoScrollId = setInterval(() => {
      const next = (scrollIndexRef.current + 1) % totalCards;
      scrollIndexRef.current = next;
      scrollRef.current?.scrollTo({ x: next * CARD_WIDTH, animated: true });
    }, 2500);
    return () => clearInterval(autoScrollId);
  }, [totalCards]);

  const estNowForClock = getESTNow();

  return (
    <View style={styles.wrapper}>
      {/* Fixed EST Clock — always visible */}
      <View style={[styles.kzCard, styles.estClockCard]}>
        <View style={styles.kzCardRow1}>
          <Ionicons name="time-outline" size={10} color={C.accent} />
          <Text style={styles.kzStatLabel}>EST</Text>
        </View>
        <Text style={styles.estTimeText} numberOfLines={1}>
          {formatESTTime(estNowForClock)}
        </Text>
      </View>

      {/* Vertical divider */}
      <View style={styles.divider} />

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.strip}
        contentContainerStyle={styles.stripContent}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          scrollIndexRef.current = 0;
        }}
      >
        {/* Session Cards */}
        {SESSIONS.map((session) => {
          const estNow = getESTNow();
          const nowMins = estNow.getHours() * 60 + estNow.getMinutes();
          const startMins = session.startH * 60 + session.startM;
          const endMins = session.endH * 60 + session.endM;
          const isLive = nowMins >= startMins && nowMins < endMins;
          const isEnded = nowMins >= endMins;

          const target = new Date(estNow);
          target.setHours(session.startH, session.startM, 0, 0);
          if (!isLive && estNow >= target) target.setDate(target.getDate() + 1);
          const msUntil = isLive ? 0 : target.getTime() - estNow.getTime();
          const isNear = msUntil > 0 && msUntil <= 30 * 60 * 1000;

          return (
            <View
              key={session.name}
              style={[
                styles.kzCard,
                isLive && { borderColor: session.color, borderWidth: 1.5, shadowColor: session.color, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3 },
              ]}
            >
              <View style={styles.kzCardRow1}>
                <View style={[styles.kzDot, { backgroundColor: isLive ? session.color : isNear ? "#F59E0B" : C.cardBorder }]} />
                <Text style={[styles.kzName, isLive && { color: session.color }]} numberOfLines={1}>{session.name}</Text>
                {isLive ? (
                  <View style={[styles.kzBadge, { backgroundColor: session.color + "30" }]}>
                    <Text style={[styles.kzBadgeText, { color: session.color }]}>LIVE</Text>
                  </View>
                ) : isEnded ? (
                  <Text style={styles.kzEnded}>Done</Text>
                ) : (
                  <Text style={[styles.kzCountdown, isNear && { color: "#F59E0B" }]}>{formatCountdown(msUntil)}</Text>
                )}
              </View>
              <Text style={styles.kzSub} numberOfLines={1}>{session.subtitle}</Text>
            </View>
          );
        })}

        {/* Stats pills */}
        <View style={[styles.kzCard, styles.kzStatCard]}>
          <View style={styles.kzCardRow1}>
            <Ionicons name="stats-chart" size={10} color={C.accent} />
            <Text style={styles.kzStatLabel}>P&L</Text>
          </View>
          <Text style={[styles.kzStatValue, {
            color: todayTrades.length > 0
              ? todayPnL > 0 ? "#00C896" : todayPnL < 0 ? "#EF4444" : C.textSecondary
              : C.textSecondary,
          }]}>
            {todayTrades.length > 0 ? `${todayPnL >= 0 ? "+" : ""}${todayPnL.toFixed(1)}R` : "—"}
          </Text>
        </View>

        <View style={[styles.kzCard, styles.kzStatCard]}>
          <View style={styles.kzCardRow1}>
            <Ionicons name="trophy" size={10} color="#F59E0B" />
            <Text style={styles.kzStatLabel}>Win Rate</Text>
          </View>
          <Text style={[styles.kzStatValue, {
            color: winRate !== null ? (winRate >= 50 ? "#00C896" : "#F59E0B") : C.textSecondary,
          }]}>
            {winRate !== null ? `${winRate}%` : "—"}
          </Text>
        </View>

        <View style={[styles.kzCard, styles.kzStatCard]}>
          <View style={styles.kzCardRow1}>
            <Ionicons name="swap-horizontal" size={10} color="#818CF8" />
            <Text style={styles.kzStatLabel}>Trades</Text>
          </View>
          <Text style={[styles.kzStatValue, { color: C.text }]}>
            {todayCompleted.length > 0 ? String(todayCompleted.length) : "—"}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    flexDirection: "row",
    alignItems: "center",
  },
  divider: {
    width: 1,
    height: 32,
    backgroundColor: C.cardBorder,
    marginHorizontal: 6,
  },
  strip: { flex: 1, height: 44 },
  stripContent: { gap: 6, paddingRight: 6, alignItems: "center" },
  kzCard: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 105,
    justifyContent: "center",
    gap: 1,
  },
  estClockCard: {
    borderColor: C.accent + "40",
    backgroundColor: C.accent + "08",
    minWidth: 118,
    flexShrink: 0,
  },
  kzCardRow1: { flexDirection: "row", alignItems: "center", gap: 4 },
  kzSub: { fontSize: 8, color: C.textSecondary, fontFamily: "Inter_400Regular", marginLeft: 10 },
  kzDot: { width: 6, height: 6, borderRadius: 3 },
  kzName: { fontSize: 11, fontFamily: "Inter_700Bold", color: C.text },
  kzBadge: { borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1, marginLeft: "auto" },
  kzBadgeText: { fontSize: 8, fontFamily: "Inter_700Bold" },
  kzEnded: { fontSize: 9, color: C.textSecondary, marginLeft: "auto" },
  kzCountdown: { fontSize: 9, fontFamily: "Inter_700Bold", color: C.text, marginLeft: "auto" },
  kzStatCard: { minWidth: 105, gap: 2 },
  kzStatLabel: { fontSize: 8, color: C.textSecondary, fontFamily: "Inter_500Medium", marginLeft: 3 },
  kzStatValue: { fontSize: 13, fontFamily: "Inter_700Bold", marginLeft: 2 },
  estTimeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: C.accent, marginLeft: 2 },
});
