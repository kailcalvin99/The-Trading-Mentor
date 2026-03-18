import React, { useState, useEffect, useCallback } from "react";
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
import { File as FSFile, Paths as FSPaths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { usePlanner } from "@/contexts/PlannerContext";
import Colors from "@/constants/colors";
import OnboardingTour, { useOnboardingTour } from "@/components/OnboardingTour";
import FullModeGate from "@/components/FullModeGate";

const C = Colors.dark;

const PLAN_KEY = "daily_trade_plan_v1";
const ROUTINE_TIMES_KEY = "routine_times_v1";

const DEFAULT_ROUTINE_TIMES: Record<string, string> = {
  water: "7:00 AM",
  breathing: "7:15 AM",
  news: "7:30 AM",
  bias: "8:00 AM",
};

type Bias = "bull" | "neutral" | "bear" | null;

interface KeyLevel {
  id: string;
  price: string;
  type: "support" | "resistance";
}

interface TradePlan {
  bias: Bias;
  keyLevels: KeyLevel[];
  targetSession: string | null;
  entryCriteria: Record<string, boolean>;
  notes: string;
}

const DEFAULT_PLAN: TradePlan = {
  bias: null,
  keyLevels: [],
  targetSession: null,
  entryCriteria: {},
  notes: "",
};

const ENTRY_CRITERIA = [
  { key: "htf_bias", label: "HTF Bias Confirmed", desc: "Higher timeframe confirms direction" },
  { key: "liquidity_swept", label: "Liquidity Swept", desc: "Stop-hunt / equal highs/lows taken" },
  { key: "fvg_present", label: "FVG Present", desc: "Fair Value Gap visible on entry TF" },
  { key: "order_block", label: "Order Block Identified", desc: "Valid OB at POI" },
  { key: "premium_discount", label: "Premium / Discount Zone", desc: "Entering in discount (long) or premium (short)" },
  { key: "killzone", label: "In Killzone", desc: "London Open, NY Open, or Silver Bullet" },
];

const SESSIONS = [
  { key: "london", name: "London Open", time: "2–5 AM EST", color: "#818CF8", icon: "globe-outline" as const },
  { key: "silver-bullet", name: "Silver Bullet", time: "10–11 AM EST", color: "#F59E0B", icon: "flash-outline" as const },
  { key: "ny-open", name: "NY Open", time: "9:30–10 AM EST", color: "#00C896", icon: "trending-up-outline" as const },
];

interface SessionFull {
  name: string;
  subtitle: string;
  startH: number;
  startM: number;
  endH: number;
  endM: number;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

const SESSION_SCHEDULE: SessionFull[] = [
  { name: "NY Open", subtitle: "9:30 AM EST — Main session opens", startH: 9, startM: 30, endH: 10, endM: 0, color: "#00C896", icon: "trending-up" },
  { name: "Silver Bullet", subtitle: "10:00–11:00 AM EST — Prime ICT window", startH: 10, startM: 0, endH: 11, endM: 0, color: "#F59E0B", icon: "flash" },
  { name: "London Open", subtitle: "2:00–5:00 AM EST — European session", startH: 2, startM: 0, endH: 5, endM: 0, color: "#818CF8", icon: "globe" },
];

const ROUTINE_ITEMS = [
  { key: "water" as const, label: "Water & Physical Reset", icon: "water-outline" as const, desc: "Hydrate, stretch, step outside 2 min" },
  { key: "breathing" as const, label: "5-Min Box Breathing", icon: "body-outline" as const, desc: "Inhale 4s → Hold 4s → Exhale 4s → Hold 4s" },
  { key: "news" as const, label: "Check for Big News Events", icon: "newspaper-outline" as const, desc: "Are there any big news events today?" },
  { key: "bias" as const, label: "Check the Big Picture Chart", icon: "trending-up-outline" as const, desc: "HTF — Is the market going up or down today?" },
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

function parseTimeToMinutes(timeStr: string): number {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  return h * 60 + m;
}

export default function PlannerScreenGated() {
  return (
    <FullModeGate>
      <PlannerScreen />
    </FullModeGate>
  );
}

function PlannerScreen() {
  const {
    routineItems, isRoutineComplete, hasRedNews, toggleItem, toggleRedNews,
    customItems, addCustomItem, removeCustomItem, toggleCustomItem, snoozeCustomItem,
  } = usePlanner();

  const [plan, setPlan] = useState<TradePlan>({ ...DEFAULT_PLAN });
  const [routineTimes, setRoutineTimes] = useState<Record<string, string>>({ ...DEFAULT_ROUTINE_TIMES });
  const [editingTimeKey, setEditingTimeKey] = useState<string | null>(null);
  const [editingTimeVal, setEditingTimeVal] = useState("");
  const [newLevelInput, setNewLevelInput] = useState("");
  const [newLevelType, setNewLevelType] = useState<"support" | "resistance">("support");
  const [newItemText, setNewItemText] = useState("");
  const [, setTick] = useState(0);
  const { shouldShow: showTour, completeTour } = useOnboardingTour();

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(PLAN_KEY),
      AsyncStorage.getItem(ROUTINE_TIMES_KEY),
    ]).then(([planVal, timesVal]) => {
      if (planVal) {
        try { setPlan(JSON.parse(planVal)); } catch {}
      }
      if (timesVal) {
        try { setRoutineTimes({ ...DEFAULT_ROUTINE_TIMES, ...JSON.parse(timesVal) }); } catch {}
      }
    });
  }, []);

  const savePlan = useCallback((updated: TradePlan) => {
    setPlan(updated);
    AsyncStorage.setItem(PLAN_KEY, JSON.stringify(updated));
  }, []);

  const saveTime = useCallback((key: string, value: string) => {
    const valid = /^\d{1,2}:\d{2}\s*(AM|PM)$/i.test(value.trim());
    if (!valid) {
      Alert.alert("Invalid Time", "Use format like 7:30 AM or 10:00 PM");
      return;
    }
    setRoutineTimes((prev) => {
      const updated = { ...prev, [key]: value.trim() };
      AsyncStorage.setItem(ROUTINE_TIMES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const est = getESTNow();
  const timeStr = est.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const dateStr = est.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const completedCount = Object.values(routineItems).filter(Boolean).length;
  const todayDate = new Date().toISOString().split("T")[0];
  const criteriaCompleteCount = ENTRY_CRITERIA.filter((c) => plan.entryCriteria[c.key]).length;
  const allCriteriaGreen = criteriaCompleteCount === ENTRY_CRITERIA.length;

  function handleAddLevel() {
    const trimmed = newLevelInput.trim();
    if (!trimmed) return;
    const level: KeyLevel = { id: Date.now().toString(), price: trimmed, type: newLevelType };
    savePlan({ ...plan, keyLevels: [...plan.keyLevels, level] });
    setNewLevelInput("");
  }

  function removeLevel(id: string) {
    savePlan({ ...plan, keyLevels: plan.keyLevels.filter((l) => l.id !== id) });
  }

  function toggleCriterion(key: string) {
    savePlan({ ...plan, entryCriteria: { ...plan.entryCriteria, [key]: !plan.entryCriteria[key] } });
  }

  async function exportToCalendar() {
    const today = new Date();
    const todayStr = today.toISOString().replace(/[-:]/g, "").split(".")[0].slice(0, 8);

    const events: string[] = [];

    ROUTINE_ITEMS.forEach((item) => {
      const timeStr2 = routineTimes[item.key] || DEFAULT_ROUTINE_TIMES[item.key];
      const mins = parseTimeToMinutes(timeStr2);
      const h = Math.floor(mins / 60).toString().padStart(2, "0");
      const m = (mins % 60).toString().padStart(2, "0");
      const hEnd = Math.floor((mins + 15) / 60).toString().padStart(2, "0");
      const mEnd = ((mins + 15) % 60).toString().padStart(2, "0");
      events.push([
        "BEGIN:VEVENT",
        `DTSTART:${todayStr}T${h}${m}00`,
        `DTEND:${todayStr}T${hEnd}${mEnd}00`,
        `SUMMARY:${item.label}`,
        `DESCRIPTION:${item.desc}`,
        "END:VEVENT",
      ].join("\r\n"));
    });

    SESSION_SCHEDULE.forEach((session) => {
      const h = session.startH.toString().padStart(2, "0");
      const m = session.startM.toString().padStart(2, "0");
      const hEnd = session.endH.toString().padStart(2, "0");
      const mEnd = session.endM.toString().padStart(2, "0");
      events.push([
        "BEGIN:VEVENT",
        `DTSTART:${todayStr}T${String(parseInt(h) + 5).padStart(2, "0")}${m}00Z`,
        `DTEND:${todayStr}T${String(parseInt(hEnd) + 5).padStart(2, "0")}${mEnd}00Z`,
        `SUMMARY:📊 ${session.name}`,
        `DESCRIPTION:${session.subtitle}`,
        "END:VEVENT",
      ].join("\r\n"));
    });

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//ICT Trading Mentor//EN",
      "CALSCALE:GREGORIAN",
      ...events,
      "END:VCALENDAR",
    ].join("\r\n");

    try {
      const file = new FSFile(FSPaths.cache, "ict-routine.ics");
      file.write(ics);
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(file.uri, {
          mimeType: "text/calendar",
          dialogTitle: "Add to Calendar",
          UTI: "com.apple.ical.ics",
        });
      } else {
        Alert.alert("Sharing Not Available", "Calendar export is not supported on this device.");
      }
    } catch {
      Alert.alert("Export Failed", "Could not write the calendar file.");
    }
  }

  const sortedSchedule = [
    ...ROUTINE_ITEMS.map((item) => ({
      id: item.key,
      label: item.label,
      timeStr: routineTimes[item.key] || DEFAULT_ROUTINE_TIMES[item.key],
      mins: parseTimeToMinutes(routineTimes[item.key] || DEFAULT_ROUTINE_TIMES[item.key]),
      checked: routineItems[item.key],
      type: "routine" as const,
      color: C.accent,
      icon: item.icon,
      desc: item.desc,
    })),
    ...SESSION_SCHEDULE.map((s) => ({
      id: s.name,
      label: s.name,
      timeStr: s.subtitle.split(" — ")[0],
      mins: s.startH * 60 + s.startM,
      checked: false,
      type: "session" as const,
      color: s.color,
      icon: s.icon,
      desc: s.subtitle,
    })),
  ].sort((a, b) => a.mins - b.mins);

  const biasConfig = {
    bull: { label: "BULLISH", icon: "trending-up" as const, color: "#00C896", bg: "#00C89618" },
    neutral: { label: "NEUTRAL", icon: "remove" as const, color: "#F59E0B", bg: "#F59E0B18" },
    bear: { label: "BEARISH", icon: "trending-down" as const, color: "#EF4444", bg: "#EF444418" },
  };

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
          <View style={{ alignItems: "flex-end", gap: 6 }}>
            <View style={styles.clockBadge}>
              <Text style={styles.clockText}>{timeStr}</Text>
              <Text style={styles.clockSub}>EST</Text>
            </View>
            <TouchableOpacity style={styles.exportBtn} onPress={exportToCalendar}>
              <Ionicons name="calendar-outline" size={13} color={C.accent} />
              <Text style={styles.exportBtnText}>Export</Text>
            </TouchableOpacity>
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
              <View style={[styles.progressFill, { width: `${(completedCount / 4) * 100}%` }]} />
            </View>
          )}
        </View>

        {/* ─── TRADE PLAN SECTION ─── */}
        <Text style={styles.sectionTitle}>Trade Plan</Text>

        {/* Market Bias */}
        <View style={styles.planCard}>
          <Text style={styles.planCardLabel}>MARKET BIAS</Text>
          <View style={styles.biasRow}>
            {(["bull", "neutral", "bear"] as const).map((b) => {
              const cfg = biasConfig[b];
              const active = plan.bias === b;
              return (
                <TouchableOpacity
                  key={b}
                  style={[styles.biasBtn, active && { backgroundColor: cfg.bg, borderColor: cfg.color }]}
                  onPress={() => savePlan({ ...plan, bias: active ? null : b })}
                >
                  <Ionicons name={cfg.icon} size={20} color={active ? cfg.color : C.textSecondary} />
                  <Text style={[styles.biasBtnLabel, { color: active ? cfg.color : C.textSecondary }]}>{cfg.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Key Levels */}
        <View style={styles.planCard}>
          <Text style={styles.planCardLabel}>KEY LEVELS</Text>

          {plan.keyLevels.length === 0 ? (
            <Text style={styles.planCardEmpty}>Add key support / resistance levels to watch</Text>
          ) : (
            <View style={styles.priceLadder}>
              {[...plan.keyLevels]
                .sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
                .map((level) => (
                  <View key={level.id} style={styles.ladderRow}>
                    <View style={[styles.ladderDot, { backgroundColor: level.type === "resistance" ? "#EF4444" : "#00C896" }]} />
                    <View style={[styles.ladderLine, { borderColor: level.type === "resistance" ? "#EF444444" : "#00C89644" }]} />
                    <Text style={[styles.ladderPrice, { color: level.type === "resistance" ? "#EF4444" : "#00C896" }]}>{level.price}</Text>
                    <Text style={[styles.ladderType, { color: level.type === "resistance" ? "#EF444488" : "#00C89688" }]}>
                      {level.type === "resistance" ? "R" : "S"}
                    </Text>
                    <TouchableOpacity onPress={() => removeLevel(level.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={16} color={C.textTertiary} />
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
          )}

          <View style={styles.levelInputRow}>
            <TextInput
              style={styles.levelInput}
              placeholder="Enter price level (e.g. 21050)"
              placeholderTextColor={C.textTertiary}
              value={newLevelInput}
              onChangeText={setNewLevelInput}
              keyboardType="numeric"
              onSubmitEditing={handleAddLevel}
              returnKeyType="done"
            />
            <TouchableOpacity
              style={[styles.levelTypeToggle, { backgroundColor: newLevelType === "resistance" ? "#EF444415" : "#00C89615", borderColor: newLevelType === "resistance" ? "#EF444444" : "#00C89644" }]}
              onPress={() => setNewLevelType((t) => t === "support" ? "resistance" : "support")}
            >
              <Text style={{ fontSize: 10, color: newLevelType === "resistance" ? "#EF4444" : "#00C896", fontFamily: "Inter_700Bold" }}>
                {newLevelType === "resistance" ? "RES" : "SUP"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.levelAddBtn, !newLevelInput.trim() && { opacity: 0.4 }]}
              onPress={handleAddLevel}
              disabled={!newLevelInput.trim()}
            >
              <Ionicons name="add" size={18} color="#0A0A0F" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Session Target */}
        <View style={styles.planCard}>
          <Text style={styles.planCardLabel}>TARGET SESSION</Text>
          <View style={{ flexDirection: "row", gap: 8 }}>
            {SESSIONS.map((session) => {
              const active = plan.targetSession === session.key;
              return (
                <TouchableOpacity
                  key={session.key}
                  style={[styles.sessionBtn, active && { borderColor: session.color, backgroundColor: session.color + "18" }]}
                  onPress={() => savePlan({ ...plan, targetSession: active ? null : session.key })}
                >
                  <Ionicons name={session.icon} size={16} color={active ? session.color : C.textSecondary} />
                  <Text style={[styles.sessionBtnName, { color: active ? session.color : C.textSecondary }]}>{session.name}</Text>
                  <Text style={[styles.sessionBtnTime, { color: active ? session.color + "aa" : C.textTertiary }]}>{session.time}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Entry Criteria */}
        <View style={styles.planCard}>
          <View style={styles.planCardHeader}>
            <Text style={styles.planCardLabel}>ENTRY CRITERIA</Text>
            <View style={[styles.criteriaBadge, { backgroundColor: allCriteriaGreen ? C.accent + "20" : "#33333380" }]}>
              <Text style={[styles.criteriaBadgeText, { color: allCriteriaGreen ? C.accent : C.textSecondary }]}>
                {criteriaCompleteCount}/{ENTRY_CRITERIA.length}
              </Text>
            </View>
          </View>
          {ENTRY_CRITERIA.map((criterion, idx) => {
            const checked = !!plan.entryCriteria[criterion.key];
            return (
              <TouchableOpacity
                key={criterion.key}
                style={[styles.criterionRow, idx > 0 && { borderTopWidth: 1, borderTopColor: C.cardBorder }]}
                onPress={() => toggleCriterion(criterion.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.criterionCheck, checked && { backgroundColor: C.accent, borderColor: C.accent }]}>
                  {checked && <Ionicons name="checkmark" size={12} color="#0A0A0F" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.criterionLabel, { color: checked ? C.text : C.textSecondary }]}>{criterion.label}</Text>
                  <Text style={styles.criterionDesc}>{criterion.desc}</Text>
                </View>
                <View style={[styles.passFailDot, { backgroundColor: checked ? "#00C89630" : "#EF444430", borderColor: checked ? "#00C896" : "#EF4444" }]}>
                  <Text style={{ fontSize: 9, fontFamily: "Inter_700Bold", color: checked ? "#00C896" : "#EF4444" }}>
                    {checked ? "✓" : "✗"}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {plan.bias && plan.targetSession && (
            <View style={[styles.planReadiness, { borderColor: allCriteriaGreen ? C.accent : "#F59E0B", backgroundColor: allCriteriaGreen ? C.accent + "10" : "#F59E0B10" }]}>
              <Ionicons name={allCriteriaGreen ? "checkmark-circle" : "alert-circle"} size={16} color={allCriteriaGreen ? C.accent : "#F59E0B"} />
              <Text style={[styles.planReadinessText, { color: allCriteriaGreen ? C.accent : "#F59E0B" }]}>
                {allCriteriaGreen ? "Plan is ready — all criteria met" : `${ENTRY_CRITERIA.length - criteriaCompleteCount} criteria still needed`}
              </Text>
            </View>
          )}
        </View>

        {/* ─── TODAY'S SCHEDULE (combined) ─── */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2, marginBottom: 10 }}>
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          <TouchableOpacity onPress={exportToCalendar} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="share-outline" size={13} color={C.textSecondary} />
            <Text style={{ fontSize: 11, color: C.textSecondary, fontFamily: "Inter_500Medium" }}>Export</Text>
          </TouchableOpacity>
        </View>

        {/* Red news toggle */}
        <View style={styles.card}>
          {sortedSchedule.map((item, idx) => {
            if (item.type === "routine") {
              const routineItem = ROUTINE_ITEMS.find((r) => r.key === item.id)!;
              return (
                <View key={item.id}>
                  {idx > 0 && <View style={styles.divider} />}
                  <View style={styles.scheduleRow}>
                    <View style={styles.scheduleTimeCol}>
                      {editingTimeKey === item.id ? (
                        <TextInput
                          style={styles.timeEditInput}
                          value={editingTimeVal}
                          onChangeText={setEditingTimeVal}
                          onBlur={() => {
                            if (editingTimeVal.trim()) saveTime(item.id, editingTimeVal.trim());
                            setEditingTimeKey(null);
                          }}
                          autoFocus
                          returnKeyType="done"
                          onSubmitEditing={() => {
                            if (editingTimeVal.trim()) saveTime(item.id, editingTimeVal.trim());
                            setEditingTimeKey(null);
                          }}
                        />
                      ) : (
                        <TouchableOpacity onPress={() => { setEditingTimeKey(item.id); setEditingTimeVal(item.timeStr); }}>
                          <Text style={styles.scheduleTime}>{item.timeStr}</Text>
                        </TouchableOpacity>
                      )}
                      <View style={[styles.timelineDot, { backgroundColor: item.checked ? C.accent : C.cardBorder }]} />
                      {idx < sortedSchedule.length - 1 && <View style={styles.timelineLine} />}
                    </View>
                    <TouchableOpacity
                      style={styles.scheduleContent}
                      onPress={() => {
                        toggleItem(routineItem.key);
                        if (routineItem.key === "news" && !routineItems.news) {
                          setTimeout(() => {
                            Alert.alert(
                              "Red Folder News?",
                              "Are there any high-impact Red folder events today?",
                              [
                                { text: "No Red News", style: "cancel" },
                                { text: "Yes — Red Active", style: "destructive", onPress: () => { if (!hasRedNews) toggleRedNews(); } },
                              ]
                            );
                          }, 300);
                        }
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                        <View style={[styles.scheduleCheckbox, item.checked && { backgroundColor: C.accent, borderColor: C.accent }]}>
                          {item.checked && <Ionicons name="checkmark" size={11} color="#0A0A0F" />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.scheduleLabel, item.checked && styles.scheduleLabelDone]}>{item.label}</Text>
                          <Text style={styles.scheduleDesc}>{item.desc}</Text>
                        </View>
                        <Ionicons name={routineItem.icon} size={16} color={item.checked ? C.accent : C.textSecondary} />
                      </View>
                    </TouchableOpacity>
                  </View>

                  {routineItem.key === "news" && routineItems.news && (
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
              );
            }

            const session = SESSION_SCHEDULE.find((s) => s.name === item.id)!;
            if (!session) return null;
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
              <View key={item.id}>
                {idx > 0 && <View style={styles.divider} />}
                <View style={styles.scheduleRow}>
                  <View style={styles.scheduleTimeCol}>
                    <Text style={styles.scheduleTime}>{item.timeStr.replace(/ EST.*/, "")}</Text>
                    <View style={[styles.timelineDot, { backgroundColor: item.color }]} />
                    {idx < sortedSchedule.length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <View style={[styles.sessionBlock, { borderColor: item.color + "44", backgroundColor: item.color + "0A" }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name={session.icon} size={14} color={item.color} />
                      <Text style={[styles.sessionBlockName, { color: item.color }]}>{item.label}</Text>
                      {isLive && (
                        <View style={[styles.liveTag, { backgroundColor: item.color }]}>
                          <Text style={styles.liveTagText}>LIVE</Text>
                        </View>
                      )}
                      {isEnded && <Text style={styles.endedTag}>ENDED</Text>}
                    </View>
                    <Text style={styles.sessionBlockSub}>{session.subtitle}</Text>
                    {!isLive && !isEnded && (
                      <Text style={[styles.sessionCountdown, { color: item.color }]}>{formatCountdown(msUntil)}</Text>
                    )}
                  </View>
                </View>
              </View>
            );
          })}
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
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
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
  clockBadge: { backgroundColor: C.backgroundSecondary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center", borderWidth: 1, borderColor: C.cardBorder },
  clockText: { fontSize: 13, fontFamily: "Inter_700Bold", color: C.accent },
  clockSub: { fontSize: 9, color: C.textSecondary, marginTop: 1 },
  exportBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, backgroundColor: C.accent + "15", borderRadius: 8, borderWidth: 1, borderColor: C.accent + "33" },
  exportBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.accent },
  redAlert: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "rgba(255,68,68,0.1)", borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "rgba(255,68,68,0.35)" },
  redAlertTitle: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#FF4444", marginBottom: 3 },
  redAlertText: { fontSize: 13, color: "#FF9999", lineHeight: 18 },
  statusCard: { borderRadius: 14, padding: 14, marginBottom: 22, backgroundColor: C.backgroundSecondary, borderWidth: 1.5 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusText: { fontSize: 14, fontFamily: "Inter_600SemiBold", flex: 1 },
  progressBar: { height: 4, backgroundColor: C.cardBorder, borderRadius: 2, marginTop: 10, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: "#F59E0B", borderRadius: 2 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 10, marginTop: 2 },
  card: { backgroundColor: C.backgroundSecondary, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 22, overflow: "hidden" },
  divider: { height: 1, backgroundColor: C.cardBorder },

  planCard: { backgroundColor: C.backgroundSecondary, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder, padding: 16, marginBottom: 12 },
  planCardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  planCardLabel: { fontSize: 10, fontFamily: "Inter_700Bold", color: C.textSecondary, letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 12 },
  planCardEmpty: { fontSize: 12, color: C.textTertiary, fontFamily: "Inter_400Regular", marginBottom: 12 },

  biasRow: { flexDirection: "row", gap: 8 },
  biasBtn: { flex: 1, alignItems: "center", paddingVertical: 12, borderRadius: 12, backgroundColor: C.backgroundTertiary, borderWidth: 1.5, borderColor: C.cardBorder, gap: 4 },
  biasBtnLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },

  priceLadder: { marginBottom: 12 },
  ladderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  ladderDot: { width: 8, height: 8, borderRadius: 4 },
  ladderLine: { flex: 1, height: 1, borderTopWidth: 1, borderStyle: "dashed" },
  ladderPrice: { fontSize: 14, fontFamily: "Inter_700Bold", minWidth: 70, textAlign: "right" },
  ladderType: { fontSize: 10, fontFamily: "Inter_700Bold", width: 14 },
  levelInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  levelInput: { flex: 1, backgroundColor: C.backgroundTertiary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: C.text, fontFamily: "Inter_500Medium", borderWidth: 1, borderColor: C.cardBorder },
  levelTypeToggle: { paddingHorizontal: 8, paddingVertical: 8, backgroundColor: C.backgroundTertiary, borderRadius: 8, borderWidth: 1, borderColor: C.cardBorder },
  levelAddBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },

  sessionBtn: { flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: C.cardBorder, backgroundColor: C.backgroundTertiary, padding: 10, alignItems: "center", gap: 3 },
  sessionBtnName: { fontSize: 10, fontFamily: "Inter_700Bold", textAlign: "center" },
  sessionBtnTime: { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },

  criteriaBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  criteriaBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  criterionRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  criterionCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" },
  criterionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 1 },
  criterionDesc: { fontSize: 11, color: C.textTertiary },
  passFailDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  planReadiness: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, padding: 10, borderRadius: 10, borderWidth: 1 },
  planReadinessText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },

  scheduleRow: { flexDirection: "row", alignItems: "flex-start", paddingLeft: 14, paddingRight: 14, paddingVertical: 10 },
  scheduleTimeCol: { width: 70, alignItems: "flex-end", paddingRight: 14, position: "relative" },
  scheduleTime: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.textSecondary, textAlign: "right", marginBottom: 4 },
  timeEditInput: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.accent, textAlign: "right", borderBottomWidth: 1, borderBottomColor: C.accent, paddingVertical: 0, minWidth: 60 },
  timelineDot: { width: 8, height: 8, borderRadius: 4, alignSelf: "flex-end", marginBottom: 0 },
  timelineLine: { position: "absolute", bottom: -20, right: 17, width: 2, height: 20, backgroundColor: C.cardBorder },
  scheduleContent: { flex: 1, paddingLeft: 12 },
  scheduleCheckbox: { width: 20, height: 20, borderRadius: 5, borderWidth: 2, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" },
  scheduleLabel: { fontSize: 14, fontFamily: "Inter_500Medium", color: C.text },
  scheduleLabelDone: { color: C.textSecondary, textDecorationLine: "line-through" },
  scheduleDesc: { fontSize: 11, color: C.textSecondary, marginTop: 1 },

  sessionBlock: { flex: 1, paddingLeft: 12, borderLeftWidth: 2, paddingVertical: 6, borderRadius: 4 },
  sessionBlockName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  sessionBlockSub: { fontSize: 11, color: C.textSecondary, marginTop: 1 },
  sessionCountdown: { fontSize: 12, fontFamily: "Inter_700Bold", marginTop: 4 },
  liveTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  liveTagText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
  endedTag: { fontSize: 11, color: C.textSecondary, fontFamily: "Inter_500Medium" },

  redNewsToggle: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingBottom: 12, paddingLeft: 96 },
  redNewsLabel: { flex: 1, fontSize: 13, color: "#FF9999" },
  routineLabel: { fontSize: 15, fontFamily: "Inter_500Medium", color: C.text },
  routineLabelDone: { color: C.textSecondary, textDecorationLine: "line-through" },
  ruleRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 14, paddingVertical: 10 },
  ruleRowBorder: { borderTopWidth: 1, borderTopColor: C.cardBorder },
  ruleNum: { width: 22, fontSize: 13, fontFamily: "Inter_700Bold", color: C.accent },
  ruleText: { flex: 1, fontSize: 13, color: C.text, lineHeight: 20 },
  emptyRoutine: { flexDirection: "row", alignItems: "center", justifyContent: "center", padding: 18, gap: 8 },
  emptyRoutineText: { fontSize: 13, color: C.textTertiary },
  customRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, paddingLeft: 14, paddingRight: 6 },
  customRowLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center", marginRight: 12 },
  customCheckboxChecked: { backgroundColor: C.textSecondary, borderColor: C.textSecondary },
  customActions: { flexDirection: "row", alignItems: "center", gap: 2 },
  actionBtn: { padding: 8 },
  addItemRow: { flexDirection: "row", alignItems: "center", padding: 10, paddingLeft: 14, gap: 8 },
  addItemInput: { flex: 1, fontSize: 14, color: C.text, fontFamily: "Inter_500Medium", paddingVertical: 6 },
  addBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  addBtnDisabled: { backgroundColor: C.cardBorder },
});
