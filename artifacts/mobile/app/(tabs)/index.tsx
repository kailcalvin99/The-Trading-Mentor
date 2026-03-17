import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Switch,
  TextInput,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { usePlanner } from "@/contexts/PlannerContext";
import Colors from "@/constants/colors";
import OnboardingTour, { useOnboardingTour } from "@/components/OnboardingTour";

const C = Colors.dark;

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

interface Session {
  name: string;
  subtitle: string;
  startH: number;
  startM: number;
  endH: number;
  endM: number;
  color: string;
  icon: string;
}

const SESSIONS: Session[] = [
  { name: "NY Open", subtitle: "9:30 AM EST — Main session opens", startH: 9, startM: 30, endH: 10, endM: 0, color: "#00C896", icon: "trending-up" },
  { name: "Silver Bullet", subtitle: "10:00–11:00 AM EST — Prime ICT window", startH: 10, startM: 0, endH: 11, endM: 0, color: "#F59E0B", icon: "flash" },
  { name: "London Open", subtitle: "2:00–5:00 AM EST — European session", startH: 2, startM: 0, endH: 5, endM: 0, color: "#818CF8", icon: "globe" },
];

const ROUTINE_ITEMS = [
  { key: "water" as const, label: "Water & Physical Reset", icon: "water-outline" as const, desc: "Hydrate, stretch, step outside 2 min" },
  { key: "breathing" as const, label: "5-Min Box Breathing", icon: "body-outline" as const, desc: "Inhale 4s → Hold 4s → Exhale 4s → Hold 4s" },
  { key: "news" as const, label: "Check for Big News Events", icon: "newspaper-outline" as const, desc: "Are there any big news events today that could move the market?" },
  { key: "bias" as const, label: "Check the Big Picture Chart", icon: "trending-up-outline" as const, desc: "HTF (Higher Timeframe) — Is the market going up or down today?" },
];

export default function PlannerScreen() {
  const {
    routineItems, isRoutineComplete, hasRedNews, toggleItem, toggleRedNews,
    customItems, addCustomItem, removeCustomItem, toggleCustomItem, snoozeCustomItem,
  } = usePlanner();
  const [newItemText, setNewItemText] = useState("");
  const [, setTick] = useState(0);
  const { shouldShow: showTour, completeTour } = useOnboardingTour();

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const est = getESTNow();
  const timeStr = est.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const dateStr = est.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const completedCount = Object.values(routineItems).filter(Boolean).length;
  const todayDate = new Date().toISOString().split("T")[0];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <OnboardingTour visible={showTour} onComplete={completeTour} />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Daily Planner</Text>
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>
          <View style={styles.clockBadge}>
            <Text style={styles.clockText}>{timeStr}</Text>
            <Text style={styles.clockSub}>EST</Text>
          </View>
        </View>

        {/* Red News Warning Banner */}
        {hasRedNews && (
          <View style={styles.redAlert}>
            <Ionicons name="warning" size={22} color="#FF4444" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.redAlertTitle}>🔴 RED FOLDER ACTIVE</Text>
              <Text style={styles.redAlertText}>You are watching only — do NOT trade. Wait until the big price swings calm down.</Text>
            </View>
          </View>
        )}

        {/* Trading Status */}
        <View style={[styles.statusCard, { borderColor: isRoutineComplete && !hasRedNews ? C.accent : "#F59E0B" }]}>
          <View style={styles.statusRow}>
            <Ionicons
              name={isRoutineComplete && !hasRedNews ? "checkmark-circle" : "lock-closed"}
              size={22}
              color={isRoutineComplete && !hasRedNews ? C.accent : "#F59E0B"}
            />
            <Text style={[styles.statusText, { color: isRoutineComplete && !hasRedNews ? C.accent : "#F59E0B" }]}>
              {hasRedNews
                ? "SPECTATOR MODE — Red News Event"
                : isRoutineComplete
                ? "✓ TRADING UNLOCKED"
                : `Complete Routine (${completedCount}/4) to unlock trading`}
            </Text>
          </View>
          {!isRoutineComplete && (
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(completedCount / 4) * 100}%` as any }]} />
            </View>
          )}
        </View>

        {/* Morning Routine Checklist */}
        <Text style={styles.sectionTitle}>Morning Routine</Text>
        <View style={styles.card}>
          {ROUTINE_ITEMS.map((item, idx) => (
            <View key={item.key}>
              {idx > 0 && <View style={styles.divider} />}
              <TouchableOpacity
                style={styles.routineRow}
                onPress={() => {
                  toggleItem(item.key);
                  if (item.key === "news" && !routineItems.news) {
                    setTimeout(() => {
                      Alert.alert(
                        "Red Folder News?",
                        "Are there any high-impact Red folder events today?",
                        [
                          { text: "No Red News", style: "cancel" },
                          {
                            text: "Yes — Red Active",
                            style: "destructive",
                            onPress: () => { if (!hasRedNews) toggleRedNews(); },
                          },
                        ]
                      );
                    }, 300);
                  }
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, routineItems[item.key] && styles.checkboxChecked]}>
                  {routineItems[item.key] && <Ionicons name="checkmark" size={13} color="#0A0A0F" />}
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.routineLabel, routineItems[item.key] && styles.routineLabelDone]}>
                    {item.label}
                  </Text>
                  <Text style={styles.routineDesc}>{item.desc}</Text>
                </View>
                <Ionicons name={item.icon} size={18} color={routineItems[item.key] ? C.accent : C.textSecondary} />
              </TouchableOpacity>

              {/* Red news toggle appears after checking ForexFactory item */}
              {item.key === "news" && routineItems.news && (
                <View style={styles.redNewsToggle}>
                  <Ionicons name="alert-circle-outline" size={16} color="#FF9999" />
                  <Text style={styles.redNewsLabel}>Red folder news today?</Text>
                  <Switch
                    value={hasRedNews}
                    onValueChange={toggleRedNews}
                    trackColor={{ false: C.cardBorder, true: "rgba(255,68,68,0.5)" }}
                    thumbColor={hasRedNews ? "#FF4444" : C.textSecondary}
                    style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                  />
                </View>
              )}
            </View>
          ))}
        </View>

        {/* My Routine */}
        <Text style={styles.sectionTitle}>My Routine</Text>
        <View style={styles.card}>
          {customItems.filter((item) => item.snoozedDate !== todayDate).length === 0 && !newItemText ? (
            <View style={styles.emptyRoutine}>
              <Ionicons name="add-circle-outline" size={20} color={C.textTertiary} />
              <Text style={styles.emptyRoutineText}>Add personal routine items below</Text>
            </View>
          ) : (
            customItems
              .filter((item) => item.snoozedDate !== todayDate)
              .map((item, idx) => (
                <View key={item.id}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.customRow}>
                    <TouchableOpacity
                      style={styles.customRowLeft}
                      onPress={() => toggleCustomItem(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, item.checked && styles.customCheckboxChecked]}>
                        {item.checked && <Ionicons name="checkmark" size={13} color="#0A0A0F" />}
                      </View>
                      <Text style={[styles.routineLabel, item.checked && styles.routineLabelDone]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.customActions}>
                      <TouchableOpacity
                        onPress={() => snoozeCustomItem(item.id)}
                        style={styles.actionBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="time-outline" size={18} color={C.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          Alert.alert("Delete Item", `Remove "${item.label}" from your routine?`, [
                            { text: "Cancel", style: "cancel" },
                            { text: "Delete", style: "destructive", onPress: () => removeCustomItem(item.id) },
                          ])
                        }
                        style={styles.actionBtn}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Ionicons name="trash-outline" size={18} color={C.accentAlert} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
          )}
          <View style={styles.divider} />
          <View style={styles.addItemRow}>
            <TextInput
              style={styles.addItemInput}
              placeholder="Add a routine item..."
              placeholderTextColor={C.textTertiary}
              value={newItemText}
              onChangeText={setNewItemText}
              onSubmitEditing={() => {
                if (newItemText.trim()) {
                  addCustomItem(newItemText);
                  setNewItemText("");
                }
              }}
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={() => {
                if (newItemText.trim()) {
                  addCustomItem(newItemText);
                  setNewItemText("");
                }
              }}
              style={[styles.addBtn, !newItemText.trim() && styles.addBtnDisabled]}
              disabled={!newItemText.trim()}
            >
              <Ionicons name="add" size={20} color={newItemText.trim() ? "#0A0A0F" : C.textTertiary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Trading Windows */}
        <Text style={styles.sectionTitle}>Trading Windows</Text>
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

          return (
            <View key={session.name} style={[styles.sessionCard, isLive && { borderColor: session.color, borderWidth: 1.5 }]}>
              <View style={styles.sessionRow}>
                <View style={[styles.sessionDot, { backgroundColor: isLive ? session.color : isEnded ? "#333" : C.cardBorder }]} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.sessionName, { color: isLive ? session.color : C.text }]}>{session.name}</Text>
                  <Text style={styles.sessionSub}>{session.subtitle}</Text>
                </View>
                {isLive ? (
                  <View style={[styles.liveBadge, { backgroundColor: session.color }]}>
                    <Text style={styles.liveBadgeText}>LIVE</Text>
                  </View>
                ) : isEnded ? (
                  <Text style={styles.endedText}>ENDED</Text>
                ) : (
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.countdownText}>{formatCountdown(msUntil)}</Text>
                    <Text style={styles.countdownLabel}>until open</Text>
                  </View>
                )}
              </View>
              {isLive && session.name === "Silver Bullet" && (
                <View style={[styles.liveNote, { borderColor: session.color }]}>
                  <Ionicons name="flash" size={13} color={session.color} />
                  <Text style={[styles.liveNoteText, { color: session.color }]}>Prime window — look for FVG (Fair Value Gap) entries after a liquidity sweep!</Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Rules Before I Trade */}
        <Text style={styles.sectionTitle}>Rules Before I Trade</Text>
        <View style={styles.card}>
          {[
            "Never risk more than 0.5% of my account on one trade",
            "Only trade during the 10–11 AM Silver Bullet window",
            "If there is big Red folder news, I watch — I don't trade",
            "Finish my Morning Routine before I take any trade",
            "Always keep my stop loss where I set it — no moving it",
          ].map((rule, i) => (
            <View key={i} style={[styles.ruleRow, i > 0 && styles.ruleRowBorder]}>
              <Text style={styles.ruleNum}>{i + 1}</Text>
              <Text style={styles.ruleText}>{rule}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: Platform.OS === "ios" ? 100 : 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: { flex: 1 },
  content: { padding: 16 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.text },
  dateText: { fontSize: 13, color: C.textSecondary, marginTop: 2 },
  clockBadge: { backgroundColor: C.backgroundSecondary, borderRadius: 12, padding: 10, alignItems: "center", borderWidth: 1, borderColor: C.cardBorder },
  clockText: { fontSize: 14, fontFamily: "Inter_700Bold", color: C.accent },
  clockSub: { fontSize: 10, color: C.textSecondary, marginTop: 1 },
  redAlert: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "rgba(255,68,68,0.1)", borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "rgba(255,68,68,0.35)" },
  redAlertTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FF4444", marginBottom: 3 },
  redAlertText: { fontSize: 13, color: "#FF9999", lineHeight: 18 },
  statusCard: { borderRadius: 14, padding: 14, marginBottom: 22, backgroundColor: C.backgroundSecondary, borderWidth: 1.5 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusText: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  progressBar: { height: 4, backgroundColor: C.cardBorder, borderRadius: 2, marginTop: 10, overflow: "hidden" },
  progressFill: { height: "100%" as any, backgroundColor: "#F59E0B", borderRadius: 2 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10, marginTop: 2 },
  card: { backgroundColor: C.backgroundSecondary, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 22, overflow: "hidden" },
  divider: { height: 1, backgroundColor: C.cardBorder },
  routineRow: { flexDirection: "row", alignItems: "center", padding: 14 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" },
  checkboxChecked: { backgroundColor: C.accent, borderColor: C.accent },
  routineLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: C.text, marginBottom: 2 },
  routineLabelDone: { color: C.textSecondary, textDecorationLine: "line-through" },
  routineDesc: { fontSize: 12, color: C.textSecondary },
  redNewsToggle: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingBottom: 12 },
  redNewsLabel: { flex: 1, fontSize: 13, color: "#FF9999" },
  sessionCard: { backgroundColor: C.backgroundSecondary, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.cardBorder },
  sessionRow: { flexDirection: "row", alignItems: "center" },
  sessionDot: { width: 10, height: 10, borderRadius: 5 },
  sessionName: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  sessionSub: { fontSize: 12, color: C.textSecondary },
  liveBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  liveBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
  endedText: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_500Medium" },
  countdownText: { fontSize: 15, fontFamily: "Inter_700Bold", color: C.text, textAlign: "right" },
  countdownLabel: { fontSize: 11, color: C.textSecondary },
  liveNote: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1 },
  liveNoteText: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  ruleRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 14, paddingVertical: 10 },
  ruleRowBorder: { borderTopWidth: 1, borderTopColor: C.cardBorder },
  ruleNum: { width: 22, fontSize: 13, fontFamily: "Inter_700Bold", color: C.accent },
  ruleText: { flex: 1, fontSize: 13, color: C.text, lineHeight: 20 },
  emptyRoutine: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 18, gap: 8 },
  emptyRoutineText: { fontSize: 13, color: C.textTertiary },
  customRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingLeft: 14, paddingRight: 6 },
  customRowLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  customCheckboxChecked: { backgroundColor: C.textSecondary, borderColor: C.textSecondary },
  customActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  actionBtn: { padding: 8 },
  addItemRow: { flexDirection: "row", alignItems: "center", padding: 10, paddingLeft: 14, gap: 8 },
  addItemInput: { flex: 1, fontSize: 14, color: C.text, fontFamily: "Inter_500Medium", paddingVertical: 6 },
  addBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  addBtnDisabled: { backgroundColor: C.cardBorder },
});
