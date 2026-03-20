import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  TextInput,
  Platform,
  Modal,
} from "react-native";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import { usePlanner } from "@/contexts/PlannerContext";
import Colors from "@/constants/colors";
import OnboardingTour, { useOnboardingTour } from "@/components/OnboardingTour";
import FullModeGate from "@/components/FullModeGate";
import ProbabilityMeter from "@/components/ProbabilityMeter";
import { useGetPropAccount, useListTrades } from "@workspace/api-client-react";

const C = Colors.dark;

const PLAN_KEY = "daily_trade_plan_v2";

const BIAS_TO_API: Record<string, string> = { bull: "bullish", bear: "bearish", neutral: "neutral" };
const BIAS_FROM_API: Record<string, string> = { bullish: "bull", bearish: "bear", neutral: "neutral" };
const SESSION_TO_API: Record<string, string> = { "ny-open": "new-york", london: "london", "silver-bullet": "silver-bullet" };
const SESSION_FROM_API: Record<string, string> = { "new-york": "ny-open", london: "london", "silver-bullet": "silver-bullet" };

function toApiBias(b: string | null): string | null {
  return b ? BIAS_TO_API[b] || b : null;
}
function fromApiBias(b: string | null): string | null {
  return b ? BIAS_FROM_API[b] || b : null;
}
function toApiSession(s: string | null): string | null {
  return s ? SESSION_TO_API[s] || s : null;
}
function fromApiSession(s: string | null): string | null {
  return s ? SESSION_FROM_API[s] || s : null;
}

type Bias = "bull" | "neutral" | "bear" | null;
type Strategy = "conservative" | "aggressive" | null;

interface KeyLevel {
  id: string;
  price: string;
  type: "support" | "resistance";
  label?: string;
}

interface TradePlan {
  bias: Bias;
  keyLevels: KeyLevel[];
  targetSession: string | null;
  entryCriteria: Record<string, boolean>;
  notes: string;
  strategy: Strategy;
  stopLossTicks: string;
  selectedAsset: string;
  voiceNoteUri: string;
  pairsToWatch: string;
}

const DEFAULT_PLAN: TradePlan = {
  bias: null,
  keyLevels: [],
  targetSession: null,
  entryCriteria: {},
  notes: "",
  strategy: null,
  stopLossTicks: "",
  selectedAsset: "NQ",
  voiceNoteUri: "",
  pairsToWatch: "",
};

const ENTRY_CRITERIA = [
  { key: "htf_bias", label: "HTF Bias Confirmed", desc: "Higher timeframe confirms direction" },
  { key: "liquidity_swept", label: "Liquidity Swept", desc: "Stop-hunt / equal highs/lows taken" },
  { key: "fvg_present", label: "FVG Present", desc: "Fair Value Gap visible on entry TF" },
  { key: "order_block", label: "Order Block Identified", desc: "Valid OB at POI" },
  { key: "premium_discount", label: "Premium / Discount Zone", desc: "Entering in discount (long) or premium (short)" },
  { key: "killzone", label: "In Killzone", desc: "London Open, NY Open, or Silver Bullet" },
  { key: "no_red_news", label: "No Red News", desc: "No high-impact news events" },
  { key: "manipulation_phase", label: "Manipulation Phase", desc: "Manipulation / run on liquidity confirmed" },
];

const SESSIONS = [
  { key: "london", name: "London Open", time: "2–5 AM EST", color: "#818CF8", icon: "globe-outline" as const },
  { key: "silver-bullet", name: "Silver Bullet", time: "10–11 AM EST", color: "#F59E0B", icon: "flash-outline" as const },
  { key: "ny-open", name: "NY Open", time: "9:30–10 AM EST", color: "#00C896", icon: "trending-up-outline" as const },
];

const TICK_DATA: Record<string, { tick: number; miniValue: number; microValue: number }> = {
  NQ:  { tick: 0.25, miniValue: 5.00,  microValue: 0.50 },
  ES:  { tick: 0.25, miniValue: 12.50, microValue: 1.25 },
  GC:  { tick: 0.10, miniValue: 10.00, microValue: 1.00 },
  CL:  { tick: 0.01, miniValue: 10.00, microValue: 1.00 },
  MNQ: { tick: 0.25, miniValue: 0.50,  microValue: 0.50 },
  MES: { tick: 0.25, miniValue: 1.25,  microValue: 1.25 },
  MGC: { tick: 0.10, miniValue: 1.00,  microValue: 1.00 },
  MCL: { tick: 0.01, miniValue: 1.00,  microValue: 1.00 },
};

const PRESET_LEVELS = [
  { label: "PDH", type: "resistance" as const },
  { label: "PDL", type: "support" as const },
  { label: "Midnight Open", type: "support" as const },
  { label: "NWOG", type: "support" as const },
  { label: "ODL", type: "support" as const },
  { label: "ODH", type: "resistance" as const },
];

const ASSET_LIST = ["NQ", "ES", "GC", "CL", "MNQ", "MES", "MGC", "MCL"];

const NQ_POINT_VALUE = 20;
const MNQ_POINT_VALUE = 2;

const PRE_TRADE_CHECKLIST_ITEMS = [
  { id: "htf_bias", label: "HTF Bias confirmed on Daily", icon: "trending-up" as const },
  { id: "kill_zone", label: "In a Kill Zone right now", icon: "time" as const },
  { id: "sweep_idm", label: "Liquidity sweep or IDM confirmed", icon: "water" as const },
  { id: "displacement_fvg", label: "Displacement with FVG or MSS", icon: "flash" as const },
];

const RISK_CHECKLIST_STORAGE_KEY = "ict-checklist-state-mc";
const RISK_CHECKLIST_TTL_HOURS = 4;

function getESTNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + -5 * 3600000);
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
  const [newLevelInput, setNewLevelInput] = useState("");
  const [newLevelType, setNewLevelType] = useState<"support" | "resistance">("support");
  const [newItemText, setNewItemText] = useState("");
  const [, setTick] = useState(0);
  const [haltDismissed, setHaltDismissed] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const { shouldShow: showTour, completeTour } = useOnboardingTour();
  const { data: propAccount } = useGetPropAccount();
  const { data: apiTrades } = useListTrades();

  const [showRiskGauges, setShowRiskGauges] = useState(false);
  const [showPositionCalc, setShowPositionCalc] = useState(false);
  const [showPreTradeChecklist, setShowPreTradeChecklist] = useState(false);
  const [positionCalcPoints, setPositionCalcPoints] = useState("");
  const [positionCalcBalance, setPositionCalcBalance] = useState("");
  const [riskChecklistChecked, setRiskChecklistChecked] = useState<Record<string, boolean>>({});
  const trades = (apiTrades || []).filter(Boolean) as { isDraft?: boolean | null; outcome?: string | null; entryTime?: string | null; createdAt?: string; pnl?: number }[];
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    (async () => {
      let localPlan: TradePlan = { ...DEFAULT_PLAN };
      const planVal = await AsyncStorage.getItem(PLAN_KEY);
      if (planVal) {
        try { localPlan = { ...DEFAULT_PLAN, ...JSON.parse(planVal) }; } catch {}
      } else {
        const oldVal = await AsyncStorage.getItem("daily_trade_plan_v1");
        if (oldVal) {
          try { localPlan = { ...DEFAULT_PLAN, ...JSON.parse(oldVal) }; } catch {}
        }
      }
      setPlan(localPlan);

      try {
        const { apiGet } = await import("@/lib/api");
        const dateStr = new Date().toISOString().split("T")[0];
        const res = await apiGet<{ data: any }>(`planner/${dateStr}`);
        if (res.data && Object.keys(res.data).length > 0) {
          const tp = res.data.tradePlan || res.data;
          const apiPlan: TradePlan = {
            ...DEFAULT_PLAN,
            bias: (fromApiBias(tp.bias) ?? localPlan.bias) as Bias,
            keyLevels: tp.keyLevels ?? localPlan.keyLevels,
            targetSession: fromApiSession(tp.targetSession ?? tp.sessionFocus) ?? localPlan.targetSession,
            entryCriteria: tp.entryCriteria ?? localPlan.entryCriteria,
            notes: tp.notes ?? res.data.notes ?? localPlan.notes,
            strategy: tp.strategy ?? localPlan.strategy,
            stopLossTicks: tp.stopLossTicks ?? localPlan.stopLossTicks,
            selectedAsset: tp.selectedAsset ?? localPlan.selectedAsset,
            voiceNoteUri: localPlan.voiceNoteUri,
            pairsToWatch: tp.pairsToWatch ?? localPlan.pairsToWatch,
          };
          setPlan(apiPlan);
          AsyncStorage.setItem(PLAN_KEY, JSON.stringify(apiPlan));
        } else if (localPlan.bias || localPlan.keyLevels.length > 0) {
          const { apiPut } = await import("@/lib/api");
          const apiTradePlan = { ...localPlan, bias: toApiBias(localPlan.bias), sessionFocus: toApiSession(localPlan.targetSession) };
          apiPut(`planner/${dateStr}`, { data: { tradePlan: apiTradePlan, notes: localPlan.notes } }).catch(() => {});
        }
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const checkRiskTTL = () => {
      AsyncStorage.getItem(RISK_CHECKLIST_STORAGE_KEY).then((raw) => {
        if (!raw) return;
        try {
          const data = JSON.parse(raw);
          const ageMs = Date.now() - (data.timestamp || 0);
          if (ageMs > RISK_CHECKLIST_TTL_HOURS * 60 * 60 * 1000) {
            AsyncStorage.removeItem(RISK_CHECKLIST_STORAGE_KEY);
            setRiskChecklistChecked({});
            return;
          }
          setRiskChecklistChecked(data.checked || {});
        } catch {}
      });
    };
    checkRiskTTL();
    const interval = setInterval(checkRiskTTL, 60_000);
    return () => clearInterval(interval);
  }, []);

  function toggleRiskChecklist(id: string) {
    const next = { ...riskChecklistChecked, [id]: !riskChecklistChecked[id] };
    setRiskChecklistChecked(next);
    AsyncStorage.setItem(RISK_CHECKLIST_STORAGE_KEY, JSON.stringify({ checked: next, timestamp: Date.now() }));
  }

  function resetRiskChecklist() {
    setRiskChecklistChecked({});
    AsyncStorage.removeItem(RISK_CHECKLIST_STORAGE_KEY);
  }

  const savePlan = useCallback((updated: TradePlan) => {
    setPlan(updated);
    AsyncStorage.setItem(PLAN_KEY, JSON.stringify(updated));
    const dateStr = new Date().toISOString().split("T")[0];
    import("@/lib/api").then(async ({ apiGet, apiPut }) => {
      let serverData: Record<string, unknown> = {};
      try {
        const res = await apiGet<{ data: Record<string, unknown> }>(`planner/${dateStr}`);
        if (res.data && Object.keys(res.data).length > 0) serverData = res.data;
      } catch {}
      const apiTradePlan = {
        ...(serverData.tradePlan as object || {}),
        bias: toApiBias(updated.bias),
        keyLevels: updated.keyLevels,
        sessionFocus: toApiSession(updated.targetSession),
        entryCriteria: updated.entryCriteria,
        notes: updated.notes,
        strategy: updated.strategy,
        stopLossTicks: updated.stopLossTicks,
        selectedAsset: updated.selectedAsset,
        pairsToWatch: updated.pairsToWatch,
      };
      serverData.tradePlan = apiTradePlan;
      if (updated.notes) serverData.notes = updated.notes;
      apiPut(`planner/${dateStr}`, { data: serverData }).catch(() => {});
    });
  }, []);

  const est = getESTNow();
  const timeStr = est.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const dateStr = est.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const completedCount = Object.values(routineItems).filter(Boolean).length;
  const todayDate = new Date().toISOString().split("T")[0];
  const criteriaCompleteCount = ENTRY_CRITERIA.filter((c) => plan.entryCriteria[c.key]).length;
  const allCriteriaGreen = criteriaCompleteCount === ENTRY_CRITERIA.length;

  const biasSelected = plan.bias === "bull" || plan.bias === "bear";

  const probScore = (() => {
    let score = 0;
    if (biasSelected) score++;
    if (plan.targetSession) score++;
    if (plan.keyLevels.length >= 1) score++;
    if (plan.entryCriteria["htf_bias"]) score++;
    if (plan.entryCriteria["fvg_present"] || plan.entryCriteria["order_block"]) score++;
    if (plan.entryCriteria["manipulation_phase"]) score++;
    if (plan.entryCriteria["no_red_news"]) score++;
    if (plan.strategy) score++;
    const sl = parseFloat(plan.stopLossTicks);
    if (!isNaN(sl) && sl > 0) score++;
    if (plan.selectedAsset) score++;
    return score * 10;
  })();

  function handleAddLevel() {
    const trimmed = newLevelInput.trim();
    if (!trimmed) return;
    const level: KeyLevel = { id: Date.now().toString(36) + Math.random().toString(36).slice(2), price: trimmed, type: newLevelType };
    savePlan({ ...plan, keyLevels: [...plan.keyLevels, level] });
    setNewLevelInput("");
  }

  function addPresetLevel(preset: typeof PRESET_LEVELS[0]) {
    const existing = plan.keyLevels.findIndex((l) => l.label === preset.label);
    if (existing !== -1) {
      savePlan({ ...plan, keyLevels: plan.keyLevels.filter((_, i) => i !== existing) });
    } else {
      const level: KeyLevel = { id: Date.now().toString(36) + Math.random().toString(36).slice(2), price: "", type: preset.type, label: preset.label };
      savePlan({ ...plan, keyLevels: [...plan.keyLevels, level] });
    }
  }

  function removeLevel(id: string) {
    savePlan({ ...plan, keyLevels: plan.keyLevels.filter((l) => l.id !== id) });
  }

  function updateLevelPrice(id: string, price: string) {
    savePlan({ ...plan, keyLevels: plan.keyLevels.map((l) => l.id === id ? { ...l, price } : l) });
  }

  function toggleCriterion(key: string) {
    savePlan({ ...plan, entryCriteria: { ...plan.entryCriteria, [key]: !plan.entryCriteria[key] } });
  }

  async function startRecording() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Microphone permission is required for voice notes.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
    } catch {
      Alert.alert("Error", "Could not start recording.");
    }
  }

  async function stopRecording() {
    if (!recordingRef.current) return;
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI() || "";
      recordingRef.current = null;
      setIsRecording(false);
      if (uri) {
        savePlan({ ...plan, voiceNoteUri: uri });
      }
    } catch {
      setIsRecording(false);
    }
  }

  const biasConfig = {
    bull: { label: "BULLISH", icon: "trending-up" as const, color: "#00C896", bg: "#00C89618" },
    neutral: { label: "NEUTRAL", icon: "remove" as const, color: "#F59E0B", bg: "#F59E0B18" },
    bear: { label: "BEARISH", icon: "trending-down" as const, color: "#EF4444", bg: "#EF444418" },
  };

  const propMaxDailyLoss = propAccount?.maxDailyLossPct ? parseFloat(String(propAccount.maxDailyLossPct)) : 2;
  const propStartingBalance = propAccount?.startingBalance ? parseFloat(String(propAccount.startingBalance)) : 0;
  const todayStr = new Date().toISOString().split("T")[0];
  const todayClosedPnL = trades
    .filter((t) => {
      if (t.isDraft || (t.outcome !== "win" && t.outcome !== "loss")) return false;
      const tradeDate = t.createdAt ? new Date(t.createdAt).toISOString().split("T")[0] : "";
      return tradeDate === todayStr;
    })
    .reduce((sum, t) => sum + (t.pnl ?? 0), 0);
  const propDailyLossPct = propStartingBalance > 0 ? (Math.abs(Math.min(todayClosedPnL, 0)) / propStartingBalance) * 100 : 0;
  const isDailyHalted = propDailyLossPct >= propMaxDailyLoss;
  const showHaltBanner = isDailyHalted && !haltDismissed;

  const selectedAsset = plan.selectedAsset || "NQ";
  const tickInfo = TICK_DATA[selectedAsset];
  const accountBalance = propStartingBalance || 50000;
  const riskPct = plan.strategy === "conservative" ? 0.5 : plan.strategy === "aggressive" ? 1.0 : 0.5;
  const stopTicks = parseFloat(plan.stopLossTicks) || 0;
  const contracts = stopTicks > 0 && tickInfo ? Math.floor((accountBalance * riskPct / 100) / (stopTicks * tickInfo.miniValue) * 10) / 10 : 0;

  const riskGaugeMaxDailyLoss = propAccount?.maxDailyLossPct ? parseFloat(String(propAccount.maxDailyLossPct)) : 2;
  const riskGaugeMaxTotalLoss = propAccount?.maxTotalDrawdownPct ? parseFloat(String(propAccount.maxTotalDrawdownPct)) : 10;
  const riskGaugeBalance = propAccount?.currentBalance ? parseFloat(String(propAccount.currentBalance)) : 50000;
  const riskGaugeStartingBalance = propAccount?.startingBalance ? parseFloat(String(propAccount.startingBalance)) : 50000;
  const riskGaugeDailyLoss = propAccount?.dailyLoss ? parseFloat(String(propAccount.dailyLoss)) : 0;
  const riskDailyLossPct = riskGaugeStartingBalance > 0 ? (riskGaugeDailyLoss / riskGaugeStartingBalance) * 100 : 0;
  const riskTotalLossPct = riskGaugeStartingBalance > 0 ? ((riskGaugeStartingBalance - riskGaugeBalance) / riskGaugeStartingBalance) * 100 : 0;

  const posCalcBalance = positionCalcBalance && !isNaN(parseFloat(positionCalcBalance)) && parseFloat(positionCalcBalance) > 0
    ? parseFloat(positionCalcBalance) : riskGaugeBalance;
  const posCalcRiskAmount = posCalcBalance * 0.005;
  const posCalcPoints = parseFloat(positionCalcPoints) || 0;
  const posCalcNQ = posCalcPoints > 0 ? posCalcRiskAmount / (posCalcPoints * NQ_POINT_VALUE) : 0;
  const posCalcMNQ = posCalcPoints > 0 ? posCalcRiskAmount / (posCalcPoints * MNQ_POINT_VALUE) : 0;

  const allRiskChecklistDone = PRE_TRADE_CHECKLIST_ITEMS.every((item) => riskChecklistChecked[item.id]);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <OnboardingTour visible={showTour} onComplete={completeTour} />
      <KeyboardAwareScrollViewCompat style={styles.scroll} contentContainerStyle={styles.content}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Mission Control</Text>
            <Text style={styles.dateText}>{dateStr}</Text>
          </View>
          <View style={styles.clockBadge}>
            <Text style={styles.clockText}>{timeStr}</Text>
            <Text style={styles.clockSub}>EST</Text>
          </View>
        </View>

        {/* Risk Tool Buttons */}
        <View style={styles.riskToolRow}>
          <TouchableOpacity style={styles.riskToolBtn} onPress={() => setShowRiskGauges(true)}>
            <Ionicons name="speedometer-outline" size={16} color={C.accent} />
            <Text style={styles.riskToolBtnText}>Risk Gauges</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.riskToolBtn} onPress={() => setShowPositionCalc(true)}>
            <Ionicons name="calculator-outline" size={16} color={C.accent} />
            <Text style={styles.riskToolBtnText}>Position Calc</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.riskToolBtn, allRiskChecklistDone && styles.riskToolBtnDone]} onPress={() => setShowPreTradeChecklist(true)}>
            <Ionicons name="checkmark-circle-outline" size={16} color={allRiskChecklistDone ? "#00C896" : C.accent} />
            <Text style={[styles.riskToolBtnText, allRiskChecklistDone && { color: "#00C896" }]}>Pre-Trade</Text>
          </TouchableOpacity>
        </View>

        {/* Risk Gauges Modal */}
        <Modal visible={showRiskGauges} animationType="slide" transparent onRequestClose={() => setShowRiskGauges(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Risk Gauges</Text>
                <TouchableOpacity onPress={() => setShowRiskGauges(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color={C.textTertiary} />
                </TouchableOpacity>
              </View>
              <View style={{ marginTop: 8 }}>
                <View style={styles.gaugeContainer}>
                  <View style={styles.gaugeHeader}>
                    <Text style={styles.gaugeLabel}>Daily Drawdown</Text>
                    <Text style={[styles.gaugeValue, { color: riskDailyLossPct / riskGaugeMaxDailyLoss >= 1 ? "#EF4444" : riskDailyLossPct / riskGaugeMaxDailyLoss >= 0.75 ? "#F59E0B" : C.accent }]}>
                      {riskDailyLossPct.toFixed(2)}%
                    </Text>
                  </View>
                  <View style={styles.gaugeTrack}>
                    <View style={[styles.gaugeFill, { width: `${Math.min(riskDailyLossPct / riskGaugeMaxDailyLoss, 1) * 100}%` as any, backgroundColor: riskDailyLossPct / riskGaugeMaxDailyLoss >= 1 ? "#EF4444" : riskDailyLossPct / riskGaugeMaxDailyLoss >= 0.75 ? "#F59E0B" : C.accent }]} />
                  </View>
                  <Text style={styles.gaugeMax}>Limit: {riskGaugeMaxDailyLoss}%</Text>
                </View>
                <View style={[styles.gaugeContainer, { marginTop: 16 }]}>
                  <View style={styles.gaugeHeader}>
                    <Text style={styles.gaugeLabel}>Total Drawdown</Text>
                    <Text style={[styles.gaugeValue, { color: riskTotalLossPct / riskGaugeMaxTotalLoss >= 1 ? "#EF4444" : riskTotalLossPct / riskGaugeMaxTotalLoss >= 0.75 ? "#F59E0B" : C.accent }]}>
                      {riskTotalLossPct.toFixed(2)}%
                    </Text>
                  </View>
                  <View style={styles.gaugeTrack}>
                    <View style={[styles.gaugeFill, { width: `${Math.min(riskTotalLossPct / riskGaugeMaxTotalLoss, 1) * 100}%` as any, backgroundColor: riskTotalLossPct / riskGaugeMaxTotalLoss >= 1 ? "#EF4444" : riskTotalLossPct / riskGaugeMaxTotalLoss >= 0.75 ? "#F59E0B" : C.accent }]} />
                  </View>
                  <Text style={styles.gaugeMax}>Limit: {riskGaugeMaxTotalLoss}%</Text>
                </View>
                {!propAccount && (
                  <Text style={{ color: C.textTertiary, fontSize: 12, textAlign: "center", marginTop: 16 }}>Set up your prop account in Risk Shield to see live gauges.</Text>
                )}
              </View>
            </View>
          </View>
        </Modal>

        {/* Position Calculator Modal */}
        <Modal visible={showPositionCalc} animationType="slide" transparent onRequestClose={() => setShowPositionCalc(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Position Calculator</Text>
                <TouchableOpacity onPress={() => setShowPositionCalc(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color={C.textTertiary} />
                </TouchableOpacity>
              </View>
              <Text style={{ color: C.textTertiary, fontSize: 12, marginBottom: 12 }}>0.5% risk per trade · NQ/MNQ sizing</Text>
              <Text style={styles.inputLabel}>Points at Risk (Stop Size)</Text>
              <TextInput
                style={styles.inputField}
                placeholder="e.g. 10"
                placeholderTextColor={C.textTertiary}
                keyboardType="decimal-pad"
                value={positionCalcPoints}
                onChangeText={setPositionCalcPoints}
              />
              <Text style={[styles.inputLabel, { marginTop: 12 }]}>Account Balance (optional)</Text>
              <TextInput
                style={styles.inputField}
                placeholder={`Default: $${riskGaugeBalance.toLocaleString()}`}
                placeholderTextColor={C.textTertiary}
                keyboardType="decimal-pad"
                value={positionCalcBalance}
                onChangeText={setPositionCalcBalance}
              />
              {posCalcPoints > 0 && (
                <View style={{ marginTop: 16, gap: 10 }}>
                  <View style={styles.calcResultRow}>
                    <Text style={styles.calcResultLabel}>NQ Contracts (0.5% risk)</Text>
                    <Text style={styles.calcResultValue}>{posCalcNQ.toFixed(2)}</Text>
                  </View>
                  <View style={styles.calcResultRow}>
                    <Text style={styles.calcResultLabel}>MNQ Contracts (0.5% risk)</Text>
                    <Text style={styles.calcResultValue}>{posCalcMNQ.toFixed(2)}</Text>
                  </View>
                  <Text style={{ color: C.textTertiary, fontSize: 11, marginTop: 4 }}>
                    Risk Amount: ${posCalcRiskAmount.toFixed(2)} · Balance: ${posCalcBalance.toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Modal>

        {/* Pre-Trade Checklist Modal */}
        <Modal visible={showPreTradeChecklist} animationType="slide" transparent onRequestClose={() => setShowPreTradeChecklist(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalSheet}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Pre-Trade Checklist</Text>
                <TouchableOpacity onPress={() => setShowPreTradeChecklist(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name="close" size={22} color={C.textTertiary} />
                </TouchableOpacity>
              </View>
              <Text style={{ color: C.textTertiary, fontSize: 12, marginBottom: 16 }}>All 4 must be green before you enter a trade.</Text>
              {PRE_TRADE_CHECKLIST_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.checklistRow, riskChecklistChecked[item.id] && styles.checklistRowDone]}
                  onPress={() => toggleRiskChecklist(item.id)}
                >
                  <Ionicons
                    name={riskChecklistChecked[item.id] ? "checkmark-circle" : "ellipse-outline"}
                    size={22}
                    color={riskChecklistChecked[item.id] ? "#00C896" : C.textTertiary}
                  />
                  <Text style={[styles.checklistLabel, riskChecklistChecked[item.id] && styles.checklistLabelDone]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
              {allRiskChecklistDone && (
                <View style={styles.checklistAllDone}>
                  <Ionicons name="shield-checkmark" size={20} color="#00C896" />
                  <Text style={styles.checklistAllDoneText}>All clear — you're ready to trade</Text>
                </View>
              )}
              <TouchableOpacity style={styles.checklistResetBtn} onPress={resetRiskChecklist}>
                <Text style={styles.checklistResetText}>Reset Checklist</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Daily Halt Banner */}
        {showHaltBanner && (
          <View style={styles.haltBanner}>
            <Text style={styles.haltIcon}>⛔</Text>
            <Text style={styles.haltText}>Trading Halted — Daily loss limit reached. Protect your capital.</Text>
            <TouchableOpacity onPress={() => setHaltDismissed(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={18} color="#FF4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* Probability Meter */}
        <View style={styles.meterContainer}>
          <ProbabilityMeter score={probScore} />
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

        {/* Bias Gate overlay */}
        {!biasSelected && (
          <View style={styles.biasGate}>
            <Ionicons name="lock-closed" size={28} color={C.textTertiary} />
            <Text style={styles.biasGateText}>Select your Bias above to unlock Strategy, Levels & Tools</Text>
          </View>
        )}

        {biasSelected && (
          <>
            {/* Strategy Branch */}
            <View style={styles.planCard}>
              <Text style={styles.planCardLabel}>STRATEGY BRANCH</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity
                  style={[styles.strategyBtn, plan.strategy === "conservative" && { borderColor: "#F59E0B", backgroundColor: "#F59E0B18" }]}
                  onPress={() => savePlan({ ...plan, strategy: plan.strategy === "conservative" ? null : "conservative" })}
                >
                  <Text style={[styles.strategyBtnLabel, { color: plan.strategy === "conservative" ? "#F59E0B" : C.textSecondary }]}>CONSERVATIVE</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.strategyBtn, plan.strategy === "aggressive" && { borderColor: "#F97316", backgroundColor: "#F9731618" }]}
                  onPress={() => savePlan({ ...plan, strategy: plan.strategy === "aggressive" ? null : "aggressive" })}
                >
                  <Text style={[styles.strategyBtnLabel, { color: plan.strategy === "aggressive" ? "#F97316" : C.textSecondary }]}>AGGRESSIVE</Text>
                </TouchableOpacity>
              </View>
              {plan.strategy === "conservative" && (
                <View style={styles.strategyHint}>
                  <Text style={[styles.strategyHintText, { color: "#F59E0Baa" }]}>HTF Bias · Premium/Discount · No Red News · 2 confirmations · 0.5% risk</Text>
                </View>
              )}
              {plan.strategy === "aggressive" && (
                <View style={[styles.strategyHint, { borderColor: "#F9731630", backgroundColor: "#F9731608" }]}>
                  <Text style={[styles.strategyHintText, { color: "#F97316aa" }]}>Bias confirmed · At least 1 level · FVG present · 1% risk</Text>
                </View>
              )}
            </View>
            {/* Key Levels */}
            <View style={styles.planCard}>
              <Text style={styles.planCardLabel}>
                KEY LEVELS
                {plan.strategy === "conservative" && "  ·  add ≥ 2"}
                {plan.strategy === "aggressive" && "  ·  add ≥ 1"}
              </Text>

              {/* Preset buttons */}
              <View style={styles.presetRow}>
                {PRESET_LEVELS.map((preset) => {
                  const isActive = plan.keyLevels.some((l) => l.label === preset.label);
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      style={[styles.presetBtn, isActive && styles.presetBtnActive]}
                      onPress={() => addPresetLevel(preset)}
                    >
                      <Text style={[styles.presetBtnLabel, isActive && styles.presetBtnLabelActive]}>{preset.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {plan.keyLevels.length === 0 ? (
                <Text style={styles.planCardEmpty}>Add key support / resistance levels to watch</Text>
              ) : (
                <View style={styles.priceLadder}>
                  {[...plan.keyLevels]
                    .sort((a, b) => parseFloat(b.price || "0") - parseFloat(a.price || "0"))
                    .map((level, idx) => (
                      <View key={level.id || String(idx)} style={styles.ladderRow}>
                        <View style={[styles.ladderDot, { backgroundColor: level.type === "resistance" ? "#EF4444" : "#00C896" }]} />
                        <View style={[styles.ladderLine, { borderColor: level.type === "resistance" ? "#EF444444" : "#00C89644" }]} />
                        {level.label && (
                          <Text style={[styles.ladderType, { color: level.type === "resistance" ? "#EF4444aa" : "#00C896aa", minWidth: 50 }]}>{level.label}</Text>
                        )}
                        <TextInput
                          style={[styles.ladderPrice, { color: level.type === "resistance" ? "#EF4444" : "#00C896", flex: 1 }]}
                          value={level.price}
                          onChangeText={(v) => updateLevelPrice(level.id, v)}
                          placeholder="price"
                          placeholderTextColor={C.textTertiary}
                          keyboardType="numeric"
                        />
                        <Text style={[styles.ladderTypeTag, { color: level.type === "resistance" ? "#EF444488" : "#00C89688" }]}>
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

            {/* Position Sizer */}
            <View style={styles.planCard}>
              <Text style={styles.planCardLabel}>POSITION SIZER</Text>

              {/* Asset selector */}
              <View style={styles.assetRow}>
                {ASSET_LIST.map((asset) => (
                  <TouchableOpacity
                    key={asset}
                    style={[styles.assetChip, selectedAsset === asset && styles.assetChipActive]}
                    onPress={() => savePlan({ ...plan, selectedAsset: asset })}
                  >
                    <Text style={[styles.assetChipLabel, selectedAsset === asset && { color: C.accent }]}>{asset}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {tickInfo && (
                <View style={styles.tickInfo}>
                  <Text style={styles.tickInfoText}>
                    {selectedAsset}: {tickInfo.tick} tick = ${tickInfo.miniValue.toFixed(2)}/contract (Mini) · ${tickInfo.microValue.toFixed(2)}/contract (Micro)
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Stop Loss (ticks)</Text>
                  <TextInput
                    style={styles.levelInput}
                    placeholder="e.g. 20"
                    placeholderTextColor={C.textTertiary}
                    value={plan.stopLossTicks}
                    onChangeText={(v) => savePlan({ ...plan, stopLossTicks: v })}
                    keyboardType="numeric"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Contracts ({riskPct}% risk)</Text>
                  <View style={[styles.levelInput, { backgroundColor: C.backgroundTertiary, justifyContent: "center" }]}>
                    <Text style={{ fontFamily: "Inter_700Bold", color: C.accent, fontSize: 16 }}>
                      {contracts > 0 ? contracts.toFixed(1) : "—"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </>
        )}

        {/* Entry Criteria - Bias Gated */}
        <View style={[styles.planCard, !biasSelected && { opacity: 0.35 }]} pointerEvents={biasSelected ? "auto" : "none"}>
          {!biasSelected && (
            <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, justifyContent: "center", alignItems: "center" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(10,10,15,0.8)", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 }}>
                <Ionicons name="lock-closed" size={14} color={C.textSecondary} />
                <Text style={{ fontSize: 11, color: C.textSecondary, fontFamily: "Inter_500Medium" }}>Select Bias to unlock</Text>
              </View>
            </View>
          )}
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
            const isConservativeRequired =
              plan.strategy === "conservative" &&
              (criterion.key === "htf_bias" || criterion.key === "premium_discount" || criterion.key === "no_red_news");
            return (
              <TouchableOpacity
                key={criterion.key}
                style={[
                  styles.criterionRow,
                  idx > 0 && { borderTopWidth: 1, borderTopColor: C.cardBorder },
                  isConservativeRequired && { backgroundColor: "#F59E0B08" },
                ]}
                onPress={() => toggleCriterion(criterion.key)}
                activeOpacity={0.7}
              >
                <View style={[styles.criterionCheck, checked && { backgroundColor: C.accent, borderColor: C.accent }]}>
                  {checked && <Ionicons name="checkmark" size={12} color="#0A0A0F" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.criterionLabel, { color: checked ? C.text : isConservativeRequired ? "#F59E0B" : C.textSecondary }]}>
                    {criterion.label}
                    {isConservativeRequired && " •"}
                  </Text>
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

        {/* Voice Note */}
        <View style={styles.card}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="mic" size={16} color={isRecording ? "#EF4444" : C.textSecondary} />
              <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text }}>Voice Note</Text>
              {isRecording && (
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#EF4444" }} />
              )}
            </View>
            <TouchableOpacity
              style={{
                width: 42, height: 42, borderRadius: 21,
                backgroundColor: isRecording ? "#EF444430" : C.accent + "20",
                justifyContent: "center", alignItems: "center",
                borderWidth: isRecording ? 2 : 0,
                borderColor: "#EF4444",
              }}
              onPress={isRecording ? stopRecording : startRecording}
            >
              <Ionicons name={isRecording ? "stop" : "mic"} size={20} color={isRecording ? "#EF4444" : C.accent} />
            </TouchableOpacity>
          </View>
          {plan.voiceNoteUri ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 }}>
              <Ionicons name="checkmark-circle" size={14} color={C.accent} />
              <Text style={{ fontSize: 11, color: C.textSecondary, fontFamily: "Inter_400Regular" }}>Recording saved</Text>
              <TouchableOpacity onPress={() => savePlan({ ...plan, voiceNoteUri: "" })}>
                <Ionicons name="trash" size={14} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Send to Journal */}
        <View style={styles.sendRow}>
          <TouchableOpacity
            style={[styles.sendBtn, showHaltBanner && { opacity: 0.5 }]}
            onPress={() => setSendModalOpen(true)}
            disabled={showHaltBanner}
          >
            <Ionicons name="send" size={16} color="#0A0A0F" />
            <Text style={styles.sendBtnLabel}>Send to Journal</Text>
          </TouchableOpacity>
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
      </KeyboardAwareScrollViewCompat>

      {/* Send to Journal Modal */}
      <Modal visible={sendModalOpen} transparent animationType="fade" onRequestClose={() => setSendModalOpen(false)}>
        <View style={[styles.modalOverlay, { justifyContent: "center", padding: 20 }]}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Ready to Trade</Text>
            <Text style={styles.modalSub}>Confirm your plan before logging.</Text>
            <View style={styles.modalRows}>
              <View style={styles.modalRow}>
                <Text style={styles.modalRowLabel}>Bias</Text>
                <Text style={styles.modalRowValue}>{plan.bias ? plan.bias.toUpperCase() : "—"}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalRowLabel}>Strategy</Text>
                <Text style={styles.modalRowValue}>{plan.strategy ? plan.strategy.toUpperCase() : "—"}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalRowLabel}>Session</Text>
                <Text style={styles.modalRowValue}>{plan.targetSession || "—"}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalRowLabel}>Key Levels</Text>
                <Text style={styles.modalRowValue}>{plan.keyLevels.length} level{plan.keyLevels.length !== 1 ? "s" : ""}</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalRowLabel}>Setup Score</Text>
                <Text style={[styles.modalRowValue, { color: probScore >= 80 ? "#00C896" : probScore >= 60 ? "#F59E0B" : "#EF4444" }]}>{probScore}%</Text>
              </View>
            </View>
            <View style={styles.modalBtns}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSendModalOpen(false)}>
                <Text style={styles.modalCancelLabel}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={() => {
                setSendModalOpen(false);
                const notes = [
                  `Pre-Trade Plan: ${plan.bias || "none"} | ${plan.strategy || "no strategy"} | ${plan.targetSession || "no session"}`,
                  plan.keyLevels.length > 0 ? `Key Levels: ${plan.keyLevels.map((l) => `${l.label || ""} ${l.price} (${l.type})`).join(", ")}` : "",
                  `Setup Score: ${probScore}%`,
                  Object.entries(plan.entryCriteria).filter(([, v]) => v).length > 0 ? `Checked: ${Object.entries(plan.entryCriteria).filter(([, v]) => v).map(([k]) => k).join(", ")}` : "",
                  plan.voiceNoteUri ? `Voice note attached` : "",
                ].filter(Boolean).join("\n");
                AsyncStorage.setItem("planner_journal_draft", JSON.stringify({
                  pair: plan.selectedAsset || "NQ",
                  notes,
                  bias: plan.bias,
                  isDraft: true,
                  voiceNoteUri: plan.voiceNoteUri || null,
                }));
                router.push("/(tabs)/journal");
              }}>
                <Text style={styles.modalConfirmLabel}>Log to Journal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: { flex: 1 },
  content: { padding: 16, paddingTop: 20 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.text },
  dateText: { fontSize: 13, color: C.textSecondary, marginTop: 2 },
  clockBadge: { backgroundColor: C.backgroundSecondary, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignItems: "center", borderWidth: 1, borderColor: C.cardBorder },
  clockText: { fontSize: 13, fontFamily: "Inter_700Bold", color: C.accent },
  clockSub: { fontSize: 9, color: C.textSecondary, marginTop: 1 },
  haltBanner: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(255,68,68,0.15)", borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,68,68,0.4)", gap: 8 },
  haltIcon: { fontSize: 18 },
  haltText: { flex: 1, fontSize: 13, color: "#FF9999", fontFamily: "Inter_600SemiBold" },
  meterContainer: { alignItems: "center", marginBottom: 16 },
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
  strategyBtn: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12, backgroundColor: C.backgroundTertiary, borderWidth: 1.5, borderColor: C.cardBorder },
  strategyBtnLabel: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  strategyHint: { marginTop: 10, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: "#F59E0B30", backgroundColor: "#F59E0B08" },
  strategyHintText: { fontSize: 11, fontFamily: "Inter_500Medium" },
  biasGate: { alignItems: "center", justifyContent: "center", backgroundColor: C.backgroundSecondary, borderRadius: 16, borderWidth: 1, borderColor: C.cardBorder, padding: 30, marginBottom: 12, gap: 8 },
  biasGateText: { fontSize: 13, color: C.textTertiary, fontFamily: "Inter_500Medium", textAlign: "center" },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  presetBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1.5, borderColor: C.accent + "66" },
  presetBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  presetBtnLabel: { fontSize: 10, fontFamily: "Inter_700Bold", color: C.accent },
  presetBtnLabelActive: { color: "#0A0A0F" },
  priceLadder: { marginBottom: 12 },
  ladderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  ladderDot: { width: 8, height: 8, borderRadius: 4 },
  ladderLine: { width: 20, height: 1, borderTopWidth: 1, borderStyle: "dashed" },
  ladderPrice: { fontSize: 14, fontFamily: "Inter_700Bold", minWidth: 70, textAlign: "right" },
  ladderType: { fontSize: 10, fontFamily: "Inter_700Bold", width: 14 },
  ladderTypeTag: { fontSize: 10, fontFamily: "Inter_700Bold", width: 14 },
  levelInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  levelInput: { flex: 1, backgroundColor: C.backgroundTertiary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: C.text, fontFamily: "Inter_500Medium", borderWidth: 1, borderColor: C.cardBorder },
  levelTypeToggle: { paddingHorizontal: 8, paddingVertical: 8, backgroundColor: C.backgroundTertiary, borderRadius: 8, borderWidth: 1, borderColor: C.cardBorder },
  levelAddBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
  sessionBtn: { flex: 1, borderRadius: 12, borderWidth: 1.5, borderColor: C.cardBorder, backgroundColor: C.backgroundTertiary, padding: 10, alignItems: "center", gap: 3 },
  sessionBtnName: { fontSize: 10, fontFamily: "Inter_700Bold", textAlign: "center" },
  sessionBtnTime: { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
  assetRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  assetChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: C.cardBorder, backgroundColor: C.backgroundTertiary },
  assetChipActive: { borderColor: C.accent, backgroundColor: C.accent + "18" },
  assetChipLabel: { fontSize: 10, fontFamily: "Inter_700Bold", color: C.textSecondary },
  tickInfo: { backgroundColor: C.backgroundTertiary, borderRadius: 8, padding: 8, marginBottom: 4 },
  tickInfoText: { fontSize: 11, color: C.textSecondary, fontFamily: "Inter_500Medium" },
  inputLabel: { fontSize: 10, color: C.textSecondary, fontFamily: "Inter_600SemiBold", marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  criteriaBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  criteriaBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  criterionRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10 },
  criterionCheck: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.cardBorder, alignItems: "center", justifyContent: "center" },
  criterionLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", marginBottom: 1 },
  criterionDesc: { fontSize: 11, color: C.textTertiary },
  passFailDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  planReadiness: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, padding: 10, borderRadius: 10, borderWidth: 1 },
  planReadinessText: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  sendRow: { marginBottom: 16 },
  sendBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14 },
  sendBtnLabel: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
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
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: C.backgroundSecondary, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36, borderWidth: 1, borderColor: C.cardBorder },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.cardBorder, alignSelf: "center", marginBottom: 16 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  modalCard: { backgroundColor: C.backgroundSecondary, borderRadius: 20, padding: 24, width: "100%", borderWidth: 1, borderColor: C.cardBorder },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text },
  modalSub: { fontSize: 13, color: C.textSecondary, marginBottom: 20 },
  modalRows: { gap: 12, marginBottom: 24 },
  modalRow: { flexDirection: "row", justifyContent: "space-between" },
  modalRowLabel: { fontSize: 14, color: C.textSecondary },
  modalRowValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text },
  modalBtns: { flexDirection: "row", gap: 12 },
  modalCancelBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: C.cardBorder, alignItems: "center" },
  modalCancelLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.textSecondary },
  modalConfirmBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: C.accent, alignItems: "center" },
  modalConfirmLabel: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
  riskToolRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  riskToolBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 12, backgroundColor: C.backgroundSecondary, borderWidth: 1, borderColor: C.cardBorder },
  riskToolBtnDone: { borderColor: "#00C896" + "66", backgroundColor: "#00C896" + "10" },
  riskToolBtnText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.accent },
  gaugeContainer: { backgroundColor: C.backgroundTertiary, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: C.cardBorder },
  gaugeHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  gaugeLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text },
  gaugeValue: { fontSize: 14, fontFamily: "Inter_700Bold" },
  gaugeTrack: { height: 8, backgroundColor: C.cardBorder, borderRadius: 4, overflow: "hidden" },
  gaugeFill: { height: "100%", borderRadius: 4 },
  gaugeMax: { fontSize: 11, color: C.textTertiary, marginTop: 6 },
  inputField: { backgroundColor: C.backgroundTertiary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.text, fontFamily: "Inter_500Medium", borderWidth: 1, borderColor: C.cardBorder },
  calcResultRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.backgroundTertiary, borderRadius: 10, padding: 12, borderWidth: 1, borderColor: C.cardBorder },
  calcResultLabel: { fontSize: 13, color: C.textSecondary, fontFamily: "Inter_500Medium" },
  calcResultValue: { fontSize: 18, fontFamily: "Inter_700Bold", color: C.accent },
  checklistRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  checklistRowDone: { opacity: 0.7 },
  checklistLabel: { fontSize: 14, color: C.text, fontFamily: "Inter_500Medium", flex: 1 },
  checklistLabelDone: { color: C.textSecondary, textDecorationLine: "line-through" },
  checklistAllDone: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 16, padding: 12, backgroundColor: "#00C896" + "14", borderRadius: 10, borderWidth: 1, borderColor: "#00C896" + "40" },
  checklistAllDoneText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#00C896" },
  checklistResetBtn: { marginTop: 16, alignItems: "center", paddingVertical: 10 },
  checklistResetText: { fontSize: 13, color: C.textTertiary, fontFamily: "Inter_500Medium" },
});
