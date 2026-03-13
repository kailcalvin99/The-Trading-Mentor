import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";

const C = Colors.dark;

interface KillZone {
  name: string;
  label: string;
  description: string;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

const KILL_ZONES: KillZone[] = [
  {
    name: "London Open",
    label: "LON",
    description: "Best time for FVGs and liquidity sweeps in European session",
    startHour: 2,
    startMin: 0,
    endHour: 5,
    endMin: 0,
    icon: "partly-sunny-outline",
    color: "#5E9BFF",
  },
  {
    name: "NY Silver Bullet",
    label: "SB",
    description: "The ICT Silver Bullet window — high probability setups with FVG entries",
    startHour: 10,
    startMin: 0,
    endHour: 11,
    endMin: 0,
    icon: "flash-outline",
    color: C.accent,
  },
  {
    name: "NY Open",
    label: "NY",
    description: "New York session open — high volatility and liquidity events",
    startHour: 7,
    startMin: 0,
    endHour: 10,
    endMin: 0,
    icon: "sunny-outline",
    color: "#FFB340",
  },
];

const ICT_TIPS = [
  "💡 Time AND Price must align. A great setup at the wrong hour is not a trade.",
  "💡 Always ask: Did price sweep liquidity BEFORE my entry?",
  "💡 The Silver Bullet (10–11 AM NY) gives you the cleanest FVG entries.",
  "💡 Protect your account first. A 2% daily limit keeps you in the game.",
  "💡 Look for a Market Structure Shift (MSS) after a liquidity sweep.",
  "💡 OTE zone is 61.8%–78.6% — wait for price to pull back there.",
  "💡 Don't chase price. If you missed the entry, wait for the next setup.",
  "💡 Less is more in ICT. One clean trade beats five messy ones.",
];

function getESTTime() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const estOffset = -5 * 60 * 60 * 1000;
  return new Date(utc + estOffset);
}

function isInZone(zone: KillZone, estTime: Date): boolean {
  const h = estTime.getHours();
  const m = estTime.getMinutes();
  const current = h * 60 + m;
  const start = zone.startHour * 60 + zone.startMin;
  const end = zone.endHour * 60 + zone.endMin;
  return current >= start && current < end;
}

function minutesUntilZone(zone: KillZone, estTime: Date): number {
  const h = estTime.getHours();
  const m = estTime.getMinutes();
  const current = h * 60 + m;
  const start = zone.startHour * 60 + zone.startMin;
  if (current < start) return start - current;
  const nextDayStart = start + 24 * 60;
  return nextDayStart - current;
}

function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatTime(h: number, m: number): string {
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;
}

export default function KillZoneScreen() {
  const insets = useSafeAreaInsets();
  const [estTime, setEstTime] = useState(getESTTime());
  const [tipIndex, setTipIndex] = useState(0);
  const tipTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setEstTime(getESTTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    tipTimer.current = setInterval(() => {
      setTipIndex((i) => (i + 1) % ICT_TIPS.length);
    }, 8000);
    return () => {
      if (tipTimer.current) clearInterval(tipTimer.current);
    };
  }, []);

  const activeZone = KILL_ZONES.find((z) => isInZone(z, estTime));
  const h = estTime.getHours();
  const m = estTime.getMinutes();
  const s = estTime.getSeconds();

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const bottomPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: bottomPad + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.heading}>Kill Zone Timer</Text>
        <Text style={styles.subheading}>New York EST · Resets daily</Text>

        {/* Clock */}
        <View style={styles.clockCard}>
          <Text style={styles.clockTime}>
            {h > 12 ? h - 12 : h === 0 ? 12 : h}:{m.toString().padStart(2, "0")}
            <Text style={styles.clockSec}>:{s.toString().padStart(2, "0")}</Text>
          </Text>
          <Text style={styles.clockAmPm}>{h >= 12 ? "PM" : "AM"} EST</Text>

          {activeZone ? (
            <View style={[styles.activeBadge, { backgroundColor: activeZone.color + "22" }]}>
              <View style={[styles.activeDot, { backgroundColor: activeZone.color }]} />
              <Text style={[styles.activeText, { color: activeZone.color }]}>
                {activeZone.name} is OPEN
              </Text>
            </View>
          ) : (
            <View style={styles.inactiveBadge}>
              <View style={styles.inactiveDot} />
              <Text style={styles.inactiveText}>Outside Kill Zone — Wait</Text>
            </View>
          )}
        </View>

        {/* Kill Zones */}
        <Text style={styles.sectionTitle}>Trading Sessions</Text>
        {KILL_ZONES.map((zone) => {
          const active = isInZone(zone, estTime);
          const minsUntil = active ? 0 : minutesUntilZone(zone, estTime);

          return (
            <View
              key={zone.name}
              style={[
                styles.zoneCard,
                active && { borderColor: zone.color, borderWidth: 1.5 },
              ]}
            >
              <View style={styles.zoneHeader}>
                <View style={[styles.zoneIconBg, { backgroundColor: zone.color + "22" }]}>
                  <Ionicons name={zone.icon} size={18} color={zone.color} />
                </View>
                <View style={styles.zoneInfo}>
                  <Text style={styles.zoneName}>{zone.name}</Text>
                  <Text style={styles.zoneTime}>
                    {formatTime(zone.startHour, zone.startMin)} – {formatTime(zone.endHour, zone.endMin)} EST
                  </Text>
                </View>
                <View style={styles.zoneStatus}>
                  {active ? (
                    <View style={[styles.statusBadge, { backgroundColor: zone.color + "22" }]}>
                      <Text style={[styles.statusText, { color: zone.color }]}>LIVE</Text>
                    </View>
                  ) : (
                    <View style={styles.statusBadgeGray}>
                      <Text style={styles.statusTextGray}>in {formatMinutes(minsUntil)}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Text style={styles.zoneDesc}>{zone.description}</Text>
            </View>
          );
        })}

        {/* Warning */}
        <View style={styles.warningCard}>
          <Ionicons name="warning-outline" size={18} color={C.accentWarn} />
          <Text style={styles.warningText}>
            Trading outside these windows is risky. ICT teaches that{" "}
            <Text style={{ color: C.accentWarn }}>Time is as important as Price.</Text>
          </Text>
        </View>

        {/* Tips */}
        <View style={styles.tipCard}>
          <Ionicons name="bulb-outline" size={16} color={C.accent} />
          <Text style={styles.tipText}>{ICT_TIPS[tipIndex]}</Text>
        </View>

        {/* Glossary */}
        <Text style={styles.sectionTitle}>Quick Glossary</Text>
        {[
          { term: "FVG", def: "Fair Value Gap — a price hole the market usually fills later" },
          { term: "MSS", def: "Market Structure Shift — price breaks pattern and reverses" },
          { term: "OTE", def: "Optimal Trade Entry — the 61.8–78.6% pullback sweet spot" },
          { term: "Liquidity Sweep", def: "Price grabs stop-losses above/below a level, then reverses" },
        ].map(({ term, def }) => (
          <View key={term} style={styles.glossaryItem}>
            <Text style={styles.glossaryTerm}>{term}</Text>
            <Text style={styles.glossaryDef}>{def}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  heading: {
    fontSize: 28,
    fontWeight: "700",
    color: C.text,
    fontFamily: "Inter_700Bold",
    marginBottom: 4,
  },
  subheading: {
    fontSize: 13,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
    marginBottom: 24,
  },
  clockCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    marginBottom: 28,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  clockTime: {
    fontSize: 64,
    fontWeight: "700",
    color: C.text,
    fontFamily: "Inter_700Bold",
    letterSpacing: -2,
  },
  clockSec: {
    fontSize: 40,
    color: C.textTertiary,
  },
  clockAmPm: {
    fontSize: 15,
    color: C.textSecondary,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
    marginBottom: 16,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 30,
    gap: 7,
  },
  activeDot: { width: 8, height: 8, borderRadius: 4 },
  activeText: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  inactiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 30,
    backgroundColor: C.backgroundTertiary,
    gap: 7,
  },
  inactiveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.textTertiary },
  inactiveText: { fontSize: 14, color: C.textSecondary, fontFamily: "Inter_500Medium" },
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
  zoneCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  zoneHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  zoneIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  zoneInfo: { flex: 1 },
  zoneName: {
    fontSize: 15,
    fontWeight: "600",
    color: C.text,
    fontFamily: "Inter_600SemiBold",
  },
  zoneTime: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular", marginTop: 1 },
  zoneStatus: { alignItems: "flex-end" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: "700", fontFamily: "Inter_700Bold" },
  statusBadgeGray: {
    backgroundColor: C.backgroundTertiary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusTextGray: { fontSize: 11, color: C.textSecondary, fontFamily: "Inter_400Regular" },
  zoneDesc: { fontSize: 13, color: C.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 18 },
  warningCard: {
    flexDirection: "row",
    backgroundColor: C.accentWarn + "15",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.accentWarn + "40",
    alignItems: "flex-start",
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  tipCard: {
    flexDirection: "row",
    backgroundColor: C.accent + "12",
    borderRadius: 14,
    padding: 14,
    gap: 10,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.accent + "30",
    alignItems: "flex-start",
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  glossaryItem: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  glossaryTerm: {
    fontSize: 14,
    fontWeight: "700",
    color: C.accent,
    fontFamily: "Inter_700Bold",
    marginBottom: 3,
  },
  glossaryDef: { fontSize: 13, color: C.textSecondary, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
