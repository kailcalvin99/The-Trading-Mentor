import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Plus,
  Trash2,
  Target,
  StickyNote,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  Activity,
  Mic,
  MicOff,
  Send,
  Lock,
  Shield,
  Calculator,
  ClipboardCheck,
  CheckSquare,
  Square,
  X,
  CheckCircle2,
  Circle,
  Zap,
} from "lucide-react";
import { usePlanner } from "@/contexts/PlannerContext";
import SmartMoneyChecklist from "@/components/SmartMoneyChecklist";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { Card, CardContent } from "@/components/ui/card";

import CoolDownOverlay, { FailureAnalysis } from "@/components/CoolDownOverlay";
import { recordDisciplinedDay } from "@/components/HallOfFame";
import { useListTrades, useGetPropAccount } from "@workspace/api-client-react";
import { ConfidenceScoreCard, FvgSignalCard } from "@/pages/dashboard/LiveSignalWidgets";

import {
  PRETRADE_CHECKLIST_ITEMS as RISK_CHECKLIST_ITEMS,
  getPretradeChecklistState as getRiskChecklistState,
  savePretradeChecklistState as saveRiskChecklistState,
  resetPretradeChecklistState as resetRiskChecklistState,
} from "@/lib/pretradeChecklist";

import {
  PRETRADE_FVG_ITEMS,
  getFvgChecklistState,
  saveFvgChecklistState,
  resetFvgChecklistState,
} from "@/lib/fvgChecklist";

import {
  RULES_CHECKLIST_ITEMS,
  getRulesChecklistState,
  saveRulesChecklistState,
  resetRulesChecklistState,
} from "@/lib/ruleChecklist";

const NQ_POINT_VALUE = 20;
const MNQ_POINT_VALUE = 2;

interface PersonalTask {
  id: string;
  text: string;
  done: boolean;
}

interface KeyLevel {
  price: string;
  type: "support" | "resistance";
  label?: string;
}

interface TradePlan {
  bias: string;
  pairsToWatch: string;
  keyLevels: KeyLevel[] | string;
  sessionFocus: string;
  maxTrades: string;
  riskPerTrade: string;
  strategy: "" | "conservative" | "aggressive";
  stopLossTicks: string;
  selectedAsset: string;
  voiceNote: string;
  targetSession: string;
}

interface DayData {
  tasks: PersonalTask[];
  notes: string;
  tradePlan: TradePlan;
}

const TICK_DATA: Record<string, { tick: number; miniValue: number; microValue: number; label: string }> = {
  NQ:  { tick: 0.25, miniValue: 5.00,  microValue: 0.50, label: "NQ" },
  ES:  { tick: 0.25, miniValue: 12.50, microValue: 1.25, label: "ES" },
  GC:  { tick: 0.10, miniValue: 10.00, microValue: 1.00, label: "GC (Gold)" },
  CL:  { tick: 0.01, miniValue: 10.00, microValue: 1.00, label: "CL (Crude)" },
  MNQ: { tick: 0.25, miniValue: 0.50,  microValue: 0.50, label: "MNQ" },
  MES: { tick: 0.25, miniValue: 1.25,  microValue: 1.25, label: "MES" },
  MGC: { tick: 0.10, miniValue: 1.00,  microValue: 1.00, label: "MGC" },
  MCL: { tick: 0.01, miniValue: 1.00,  microValue: 1.00, label: "MCL" },
};

const PRESET_LEVELS = [
  { label: "Prev Day High", type: "resistance" as const, desc: "Prev Day High" },
  { label: "Prev Day Low", type: "support" as const, desc: "Prev Day Low" },
  { label: "Midnight Open", type: "support" as const, desc: "Midnight Open" },
  { label: "New Week Opening Gap", type: "support" as const, desc: "New Week Opening Gap" },
  { label: "Opening Day Low", type: "support" as const, desc: "Opening Day Low" },
  { label: "Opening Day High", type: "resistance" as const, desc: "Opening Day High" },
];

function getDayKey(date: Date) {
  return `planner_day_${date.toISOString().split("T")[0]}`;
}

function formatDate(date: Date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const d = date.toISOString().split("T")[0];
  if (d === today.toISOString().split("T")[0]) return "Today";
  if (d === yesterday.toISOString().split("T")[0]) return "Yesterday";
  if (d === tomorrow.toISOString().split("T")[0]) return "Tomorrow";
  return date.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
}

const DEFAULT_TRADE_PLAN: TradePlan = {
  bias: "",
  pairsToWatch: "",
  keyLevels: [],
  sessionFocus: "",
  maxTrades: "",
  riskPerTrade: "",
  strategy: "",
  stopLossTicks: "",
  selectedAsset: "NQ",
  voiceNote: "",
  targetSession: "",
};

const TARGET_SESSIONS = [
  { id: "london_open",    label: "London Open",    time: "2:00–5:00 AM",   color: "blue",   tip: "Cleanest liquidity sweeps · Best FVGs form in early London · PDH/PDL raids common." },
  { id: "ny_premarket",   label: "NY Pre-Market",  time: "6:00–7:00 AM",   color: "violet", tip: "Gap fills common · Power hour setup window · Watch overnight highs/lows." },
  { id: "ny_open",        label: "NY Open / AM",   time: "7:00–10:00 AM",  color: "amber",  tip: "High volatility · Institutional order flow starts · Best for aggressive entries." },
  { id: "silver_bullet",  label: "Silver Bullet",  time: "10:00–11:00 AM", color: "emerald",tip: "3-candle displacement · look for FVG fill on 1m · usually aligns with HTF draw." },
  { id: "ny_lunch",       label: "NY Lunch",       time: "12:00–1:00 PM",  color: "orange", tip: "Low liquidity · Whipsaw risk is high · Avoid unless very clear setup." },
  { id: "ny_pm",          label: "NY PM",          time: "2:00–4:00 PM",   color: "rose",   tip: "Late day reversals common · Close out positions before 4 PM · Watch daily close." },
] as const;

const SESSION_COLOR_MAP: Record<string, { active: string; border: string; bg: string; text: string }> = {
  blue:    { active: "bg-blue-500/20 border-blue-500 text-blue-400",    border: "border-blue-500/40 text-blue-400 hover:bg-blue-500/10",    bg: "bg-blue-500/10 border-blue-500/25",    text: "text-blue-400" },
  violet:  { active: "bg-violet-500/20 border-violet-500 text-violet-400", border: "border-violet-500/40 text-violet-400 hover:bg-violet-500/10", bg: "bg-violet-500/10 border-violet-500/25", text: "text-violet-400" },
  amber:   { active: "bg-amber-500/20 border-amber-500 text-amber-400",  border: "border-amber-500/40 text-amber-400 hover:bg-amber-500/10",  bg: "bg-amber-500/10 border-amber-500/25",  text: "text-amber-400" },
  emerald: { active: "bg-emerald-500/20 border-emerald-500 text-emerald-400", border: "border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10", bg: "bg-emerald-500/10 border-emerald-500/25", text: "text-emerald-400" },
  orange:  { active: "bg-orange-500/20 border-orange-500 text-orange-400", border: "border-orange-500/40 text-orange-400 hover:bg-orange-500/10", bg: "bg-orange-500/10 border-orange-500/25", text: "text-orange-400" },
  rose:    { active: "bg-rose-500/20 border-rose-500 text-rose-400",    border: "border-rose-500/40 text-rose-400 hover:bg-rose-500/10",    bg: "bg-rose-500/10 border-rose-500/25",    text: "text-rose-400" },
};

function migrateKeyLevels(keyLevels: KeyLevel[] | string): KeyLevel[] {
  if (Array.isArray(keyLevels)) return keyLevels;
  if (typeof keyLevels === "string" && keyLevels.trim()) {
    return [{ price: keyLevels.trim(), type: "support" }];
  }
  return [];
}

const KILL_ZONE_TO_SESSION: Record<string, string> = {
  "London Open": "london_open",
  "NY Open / AM": "ny_open",
  "Silver Bullet": "silver_bullet",
  "London Close": "ny_lunch",
};

function mapChecklistDefaultsToTradePlan(
  base: TradePlan,
  defaults: { marketBias?: string; riskPct?: string; detectedKillZone?: string; drawOnLiquidity?: string; zoneNotes?: string; targetSession?: string }
): TradePlan {
  const mapped: Partial<TradePlan> = {};
  if (defaults.marketBias) mapped.bias = defaults.marketBias;
  if (defaults.riskPct) mapped.riskPerTrade = defaults.riskPct;
  if (defaults.detectedKillZone) {
    const sessionId = KILL_ZONE_TO_SESSION[defaults.detectedKillZone];
    if (sessionId) mapped.targetSession = sessionId;
  } else if (defaults.targetSession) {
    mapped.targetSession = defaults.targetSession;
  }
  if (defaults.drawOnLiquidity || defaults.zoneNotes) {
    const parts: string[] = [];
    if (defaults.drawOnLiquidity) parts.push(`DOL: ${defaults.drawOnLiquidity}`);
    if (defaults.zoneNotes) parts.push(`Zones: ${defaults.zoneNotes}`);
    mapped.sessionFocus = parts.join(" | ");
  }
  return { ...base, ...mapped };
}

function loadDayDataLocal(date: Date): DayData {
  try {
    const raw = localStorage.getItem(getDayKey(date));
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.tradePlan = { ...DEFAULT_TRADE_PLAN, ...(parsed.tradePlan || {}) };
      parsed.tradePlan.keyLevels = migrateKeyLevels(parsed.tradePlan.keyLevels);
      return parsed;
    }
  } catch {}
  return { tasks: [], notes: "", tradePlan: { ...DEFAULT_TRADE_PLAN, keyLevels: [] } };
}

function saveDayDataLocal(date: Date, data: DayData) {
  localStorage.setItem(getDayKey(date), JSON.stringify(data));
}

const API_BASE_URL = "/api";
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function persistToApi(dateStr: string, dayData: DayData) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      await fetch(`${API_BASE_URL}/planner/${dateStr}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ data: dayData }),
      });
    } catch {}
  }, 500);
}

async function loadDayDataFromApi(date: Date): Promise<DayData | null> {
  const dateStr = date.toISOString().split("T")[0];
  try {
    const res = await fetch(`${API_BASE_URL}/planner/${dateStr}`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.data && Object.keys(json.data).length > 0) {
      const d = json.data;
      d.tradePlan = d.tradePlan || { ...DEFAULT_TRADE_PLAN };
      d.tradePlan.keyLevels = migrateKeyLevels(d.tradePlan.keyLevels || []);
      d.tasks = d.tasks || [];
      d.notes = d.notes || "";
      return d;
    }
  } catch {}
  return null;
}

interface TradeRecord {
  outcome?: string | null;
  notes?: string | null;
  pair?: string | null;
  entryTime?: string | null;
  isDraft?: boolean | null;
}

function computeWinRate(trades: TradeRecord[], bias: string, sessionFocus: string): { winRate: number; trades: number; message: string } | null {
  const completed = trades.filter((t) => !t.isDraft && (t.outcome === "win" || t.outcome === "loss"));
  if (completed.length < 3) return null;

  const totalWins = completed.filter((t) => t.outcome === "win").length;
  const overallRate = Math.round((totalWins / completed.length) * 100);

  const hasFilter = !!(bias || sessionFocus);
  if (!hasFilter) {
    return { winRate: overallRate, trades: completed.length, message: `Overall win rate: ${overallRate}% across ${completed.length} trades` };
  }

  const matched = completed.filter((t) => {
    const notes = (t.notes || "").toLowerCase();
    if (bias && sessionFocus) {
      const biasMatch = notes.includes(bias.toLowerCase());
      const sessionMatch = sessionFocus === "london" ? notes.includes("london") || (t.entryTime || "").match(/^0[2-5]:/) : sessionFocus === "new-york" ? notes.includes("new york") || notes.includes("silver bullet") : notes.includes(sessionFocus.replace("-", " "));
      return biasMatch && sessionMatch;
    }
    if (bias) return notes.includes(bias.toLowerCase());
    if (sessionFocus) {
      return sessionFocus === "london" ? notes.includes("london") : sessionFocus === "new-york" ? notes.includes("new york") || notes.includes("silver bullet") : notes.includes(sessionFocus.replace("-", " "));
    }
    return false;
  });

  if (matched.length >= 2) {
    const matchedWins = matched.filter((t) => t.outcome === "win").length;
    const matchedRate = Math.round((matchedWins / matched.length) * 100);
    const diff = matchedRate - overallRate;
    const arrow = diff > 0 ? "+" : "";
    return {
      winRate: matchedRate,
      trades: matched.length,
      message: `${matchedRate}% win rate on ${matched.length} similar trades (${arrow}${diff}% vs overall ${overallRate}%)`,
    };
  }

  return { winRate: overallRate, trades: completed.length, message: `Overall win rate: ${overallRate}% across ${completed.length} trades` };
}


type SpeechRecognitionInstance = {
  lang: string;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEvent = {
  results: { [key: number]: { [key: number]: { transcript: string } } };
  resultIndex: number;
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition?: new () => SpeechRecognitionInstance;
  }
}


function useSmartMoneyScore() {
  const [confidence, setConfidence] = useState<{ score: number; factors: Array<{ label: string; met: boolean }> } | null>(null);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || "/api";
    const doFetch = () =>
      fetch(`${apiBase}/signals/confidence`, { credentials: "include" })
        .then((r) => r.ok ? r.json() : null)
        .then((d) => { if (d) setConfidence(d); })
        .catch(() => {});
    doFetch();
    const id = setInterval(doFetch, 15000);
    return () => clearInterval(id);
  }, []);

  return confidence;
}


export default function DailyPlanner() {
  const navigate = useNavigate();
  const { isRoutineComplete, tradePlanDefaults } = usePlanner();
  const { isFeatureEnabled } = useAppConfig();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayData, setDayData] = useState<DayData>(() => loadDayDataLocal(new Date()));
  const [tradePlanOpen, setTradePlanOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(true);
  const [newLevelPrice, setNewLevelPrice] = useState("");
  const [newLevelType, setNewLevelType] = useState<"support" | "resistance">("support");
  const [haltDismissed, setHaltDismissed] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [showRiskTools, setShowRiskTools] = useState(false);
  const [showPositionCalc, setShowPositionCalc] = useState(false);
  const [showDailyBiasWindow, setShowDailyBiasWindow] = useState(false);
  const [dailyBiasInput, setDailyBiasInput] = useState<string>("");
  const [riskChecked, setRiskChecked] = useState<Record<string, boolean>>(() => getRiskChecklistState());
  const [fvgChecked, setFvgChecked] = useState<Record<string, boolean>>(() => getFvgChecklistState());
  const [rulesChecked, setRulesChecked] = useState<Record<string, boolean>>(() => getRulesChecklistState());
  const [rulesOpen, setRulesOpen] = useState(true);
  const [smartMoneyOpen, setSmartMoneyOpen] = useState(false);
  const [fvgPopupOpen, setFvgPopupOpen] = useState(false);
  const [posCalcPoints, setPosCalcPoints] = useState("");
  const [successToast, setSuccessToast] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const { data: apiTrades } = useListTrades();
  const trades = (apiTrades || []) as TradeRecord[];
  const { data: propAccount } = useGetPropAccount();
  const smartMoneyConfidence = useSmartMoneyScore();

  const isToday = selectedDate.toISOString().split("T")[0] === new Date().toISOString().split("T")[0];
  const keyLevels = migrateKeyLevels(dayData.tradePlan.keyLevels);
  const winRateEstimate = computeWinRate(trades, dayData.tradePlan.bias, "");

  const maxDailyLossPctVal = propAccount?.maxDailyLossPct ?? 2;
  const propStartingBalance = propAccount?.startingBalance ?? 50000;
  const todayStr = new Date().toISOString().split("T")[0];
  const todayClosedPnL = trades
    .filter((t) => {
      if (t.isDraft || (t.outcome !== "win" && t.outcome !== "loss")) return false;
      const tradeDate = t.createdAt ? new Date(t.createdAt).toISOString().split("T")[0] : "";
      return tradeDate === todayStr;
    })
    .reduce((sum, t) => {
      const pnl = (t as { pnl?: number }).pnl ?? 0;
      return sum + pnl;
    }, 0);
  const dailyLossPct = propStartingBalance > 0 ? (Math.abs(Math.min(todayClosedPnL, 0)) / propStartingBalance) * 100 : 0;
  const isDailyHalted = isToday && dailyLossPct >= maxDailyLossPctVal;
  const showHaltBanner = isDailyHalted && !haltDismissed;

  const riskBalance = propAccount?.currentBalance ?? propStartingBalance;
  const maxTotalDrawdownPct = propAccount?.maxTotalDrawdownPct ?? 10;
  const totalLossPct = propStartingBalance > 0 ? ((propStartingBalance - riskBalance) / propStartingBalance) * 100 : 0;
  const riskAmount = riskBalance * 0.005;
  const posCalcPts = parseFloat(posCalcPoints) || 0;
  const nqContracts = posCalcPts > 0 ? riskAmount / (posCalcPts * NQ_POINT_VALUE) : 0;
  const mnqContracts = posCalcPts > 0 ? riskAmount / (posCalcPts * MNQ_POINT_VALUE) : 0;
  const riskAllChecked = RISK_CHECKLIST_ITEMS.every((i) => riskChecked[i.id]);
  const fvgAllChecked = PRETRADE_FVG_ITEMS.every((i) => fvgChecked[i.id]);
  const rulesAllChecked = RULES_CHECKLIST_ITEMS.every((i) => rulesChecked[i.id]);
  const allChecklistsDone = riskAllChecked && fvgAllChecked && rulesAllChecked;

  function toggleRiskChecklist(id: string) {
    const next = { ...riskChecked, [id]: !riskChecked[id] };
    setRiskChecked(next);
    saveRiskChecklistState(next);
  }

  function resetRiskChecklist() {
    setRiskChecked({});
    resetRiskChecklistState();
  }

  function toggleFvgChecklist(id: string) {
    const next = { ...fvgChecked, [id]: !fvgChecked[id] };
    setFvgChecked(next);
    saveFvgChecklistState(next);
  }

  function resetFvgChecklist() {
    setFvgChecked({});
    resetFvgChecklistState();
  }

  function toggleRulesChecklist(id: string) {
    const next = { ...rulesChecked, [id]: !rulesChecked[id] };
    setRulesChecked(next);
    saveRulesChecklistState(next);
  }

  function resetRulesChecklist() {
    setRulesChecked({});
    resetRulesChecklistState();
  }

  const bias = dayData.tradePlan.bias;
  const biasSelected = bias === "bullish" || bias === "bearish" || bias === "neutral";

  const probScore = (() => {
    let score = 0;
    if (biasSelected) score += 8;
    if (keyLevels.length >= 1) score += 8;
    if (riskChecked["htf_bias"]) score += 4;
    if (riskChecked["sweep_idm"] || riskChecked["displacement_fvg"]) score += 4;
    if (riskChecked["kill_zone"]) score += 4;
    if (riskAllChecked) score += 5;
    if (dayData.tradePlan.strategy === "conservative" || dayData.tradePlan.strategy === "aggressive") score += 8;
    const sl = parseFloat(dayData.tradePlan.stopLossTicks);
    if (!isNaN(sl) && sl > 0) score += 8;
    if (dayData.tradePlan.pairsToWatch.trim()) score += 8;
    if (dayData.tradePlan.targetSession) score += 5;
    PRETRADE_FVG_ITEMS.forEach((i) => { if (fvgChecked[i.id]) score += 5; });
    RULES_CHECKLIST_ITEMS.forEach((i) => { if (rulesChecked[i.id]) score += 3; });
    return Math.min(score, 100);
  })();

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(!!SR);
  }, []);

  useEffect(() => {
    if (isRoutineComplete) {
      recordDisciplinedDay();
    }
  }, [isRoutineComplete]);

  useEffect(() => {
    const localData = loadDayDataLocal(selectedDate);
    setDayData(localData);
    setHaltDismissed(false);

    loadDayDataFromApi(selectedDate).then((apiData) => {
      if (apiData) {
        const apiDayData: DayData = {
          tasks: apiData.tasks ?? [],
          notes: apiData.notes ?? "",
          tradePlan: mapChecklistDefaultsToTradePlan(
            { ...DEFAULT_TRADE_PLAN, ...apiData.tradePlan },
            tradePlanDefaults
          ),
        };
        setDayData(apiDayData);
        saveDayDataLocal(selectedDate, apiDayData);
      } else if (localData.tasks.length > 0 || localData.notes || localData.tradePlan.bias) {
        const dateStr = selectedDate.toISOString().split("T")[0];
        persistToApi(dateStr, localData);
      }
    });
  }, [selectedDate]);

  useEffect(() => {
    if (
      !tradePlanDefaults.marketBias &&
      !tradePlanDefaults.riskPct &&
      !tradePlanDefaults.detectedKillZone &&
      !tradePlanDefaults.drawOnLiquidity &&
      !tradePlanDefaults.zoneNotes
    ) return;
    setDayData((prev) => ({
      ...prev,
      tradePlan: mapChecklistDefaultsToTradePlan(prev.tradePlan, tradePlanDefaults),
    }));
  }, [
    tradePlanDefaults.marketBias,
    tradePlanDefaults.riskPct,
    tradePlanDefaults.detectedKillZone,
    tradePlanDefaults.drawOnLiquidity,
    tradePlanDefaults.zoneNotes,
  ]);

  const persist = useCallback((data: DayData) => {
    setDayData(data);
    saveDayDataLocal(selectedDate, data);
    const dateStr = selectedDate.toISOString().split("T")[0];
    persistToApi(dateStr, data);
  }, [selectedDate]);

  function updateNotes(notes: string) {
    persist({ ...dayData, notes });
  }

  function updateTradePlan(field: keyof TradePlan, value: string | KeyLevel[]) {
    persist({ ...dayData, tradePlan: { ...dayData.tradePlan, [field]: value } });
  }

  function addKeyLevel() {
    const price = newLevelPrice.trim();
    if (!price) return;
    const levels = [...keyLevels, { price, type: newLevelType }];
    updateTradePlan("keyLevels", levels);
    setNewLevelPrice("");
  }

  function addPresetLevel(preset: typeof PRESET_LEVELS[0]) {
    const existing = keyLevels.findIndex((l) => l.label === preset.label);
    if (existing !== -1) {
      updateTradePlan("keyLevels", keyLevels.filter((_, i) => i !== existing));
    } else {
      updateTradePlan("keyLevels", [...keyLevels, { price: "", type: preset.type, label: preset.label }]);
      setTimeout(() => {
        const inputs = document.querySelectorAll<HTMLInputElement>('[data-level-price]');
        if (inputs.length > 0) inputs[inputs.length - 1].focus();
      }, 50);
    }
  }

  function removeKeyLevel(idx: number) {
    const levels = keyLevels.filter((_, i) => i !== idx);
    updateTradePlan("keyLevels", levels);
  }

  function updateKeyLevelPrice(idx: number, price: string) {
    const updated = keyLevels.map((l, i) => i === idx ? { ...l, price } : l);
    updateTradePlan("keyLevels", updated);
  }

  function goDay(offset: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d);
  }

  function startVoiceNote() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = e.results[e.resultIndex][0].transcript;
      const newNote = dayData.tradePlan.voiceNote
        ? dayData.tradePlan.voiceNote + " " + transcript
        : transcript;
      updateTradePlan("voiceNote", newNote);
    };
    rec.onerror = () => setIsListening(false);
    rec.onend = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }

  function stopVoiceNote() {
    recognitionRef.current?.stop();
    setIsListening(false);
  }

  function handleSendToJournal() {
    setSendModalOpen(true);
  }

  function handleSetDailyBias() {
    updateTradePlan("bias", dailyBiasInput.toLowerCase());
    setShowDailyBiasWindow(false);
    setDailyBiasInput("");
  }

  function handleOpenDailyBiasWindow() {
    setDailyBiasInput((dayData.tradePlan.bias || "").toLowerCase()); // Pre-fill with current bias if exists
    setShowDailyBiasWindow(true);
  }

  const selectedAsset = dayData.tradePlan.selectedAsset || "NQ";
  const tickInfo = TICK_DATA[selectedAsset];
  const accountBalance = propStartingBalance || 50000;
  const riskPct = dayData.tradePlan.strategy === "conservative" ? 0.5 : dayData.tradePlan.strategy === "aggressive" ? 1.0 : 0.5;
  const stopTicks = parseFloat(dayData.tradePlan.stopLossTicks) || 0;
  const contracts = stopTicks > 0 && tickInfo ? Math.floor((accountBalance * riskPct / 100) / (stopTicks * tickInfo.miniValue) * 10) / 10 : 0;
  const selectedSession = TARGET_SESSIONS.find((s) => s.id === dayData.tradePlan.targetSession) ?? null;
  const selectedSessionColors = selectedSession ? SESSION_COLOR_MAP[selectedSession.color] : null;

  return (
    <>
    <CoolDownOverlay />

    {showHaltBanner && (
      <div className="w-full bg-red-900/80 border-b border-red-500/50 px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">⛔</span>
          <span className="text-red-200 font-semibold text-sm">
            Trading Halted — Daily loss limit reached. Protect your capital.
          </span>
        </div>
        <button
          onClick={() => setHaltDismissed(true)}
          className="text-red-400 hover:text-red-200 text-xs font-medium shrink-0"
        >
          Dismiss
        </button>
      </div>
    )}

    <div className="p-6 pb-24 max-w-screen-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Mission Control</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => goDay(-1)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isToday ? "bg-primary text-primary-foreground" : "bg-secondary hover:bg-secondary/80"}`}
          >
            {formatDate(selectedDate)}
          </button>
          <button onClick={() => goDay(1)} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
      <div className="flex-1 min-w-0 w-full">

      {/* Risk Tool Buttons */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setShowRiskTools(true)}
          className="flex items-center gap-1.5 text-xs font-semibold bg-secondary border border-border hover:bg-secondary/80 text-foreground rounded-xl px-3 py-2 transition-colors"
        >
          <Shield className="h-3.5 w-3.5 text-emerald-400" />
          Risk Gauges
        </button>
        <button
          onClick={() => setShowPositionCalc(true)}
          className="flex items-center gap-1.5 text-xs font-semibold bg-secondary border border-border hover:bg-secondary/80 text-foreground rounded-xl px-3 py-2 transition-colors"
        >
          <Calculator className="h-3.5 w-3.5 text-blue-400" />
          Position Calc
        </button>
      </div>

      <p className="text-muted-foreground mb-6 text-sm">
        Plan your trading day. Complete your routine, set your goals, and stay disciplined.
      </p>

      {/* Risk Gauges Modal */}
      {showRiskTools && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRiskTools(false)} />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-2xl z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-emerald-400" />
                <h2 className="font-bold text-lg">Risk Gauges</h2>
              </div>
              <button onClick={() => setShowRiskTools(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-5">
              {[
                { label: "Daily Drawdown", value: dailyLossPct, max: maxDailyLossPctVal },
                { label: "Total Drawdown", value: totalLossPct, max: maxTotalDrawdownPct },
              ].map(({ label, value, max }) => {
                const pct = Math.min(value / max, 1);
                const color = pct >= 1 ? "#EF4444" : pct >= 0.75 ? "#F59E0B" : "#00C896";
                return (
                  <div key={label} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <span className="text-sm font-bold" style={{ color }}>{value.toFixed(2)}% <span className="text-xs text-muted-foreground">/ {max}%</span></span>
                    </div>
                    <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct * 100}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-border">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Balance</span>
                  <span className="font-bold text-foreground">${riskBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">Starting Balance</span>
                  <span className="font-semibold text-foreground">${propStartingBalance.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Position Calculator Modal */}
      {showPositionCalc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPositionCalc(false)} />
          <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-400" />
                <h2 className="font-bold text-lg">Position Calculator</h2>
              </div>
              <button onClick={() => setShowPositionCalc(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-secondary/40 rounded-xl p-3 text-sm">
                <span className="text-muted-foreground">Balance: </span>
                <span className="font-bold">${riskBalance.toLocaleString()}</span>
                <span className="text-muted-foreground ml-2">· Risk (0.5%): </span>
                <span className="font-bold text-emerald-400">${riskAmount.toFixed(0)}</span>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Points at Risk (Stop Loss)</label>
                <input
                  type="number"
                  value={posCalcPoints}
                  onChange={(e) => setPosCalcPoints(e.target.value)}
                  placeholder="e.g. 10"
                  className="w-full bg-secondary/40 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              {posCalcPts > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-primary">{nqContracts.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">NQ Contracts</div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                    <div className="text-xl font-bold text-blue-400">{mnqContracts.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">MNQ Contracts</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <h2 className="font-semibold text-sm flex-1">Morning Routine</h2>
            {isRoutineComplete && (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold">
                Complete ✓
              </span>
            )}
          </div>
          <SmartMoneyChecklist />
        </CardContent>
      </Card>

      {/* Widget trigger row — Smart Money + FVG */}
      <div className="flex gap-2 mb-4">
        {smartMoneyConfidence && (
          <button
            onClick={() => setSmartMoneyOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-bold shadow hover:border-primary/40 transition-all"
          >
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Smart $</span>
            <span className={smartMoneyConfidence.score >= 80 ? "text-emerald-400" : smartMoneyConfidence.score >= 60 ? "text-amber-400" : "text-red-400"}>
              {smartMoneyConfidence.score}
            </span>
          </button>
        )}
        <button
          onClick={() => setFvgPopupOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-xs font-bold shadow hover:border-cyan-500/30 transition-all"
        >
          <Zap className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-muted-foreground">FVG Scan</span>
          <span className={fvgAllChecked ? "text-cyan-400" : "text-muted-foreground"}>
            {PRETRADE_FVG_ITEMS.filter((i) => fvgChecked[i.id]).length}/{PRETRADE_FVG_ITEMS.length}
          </span>
        </button>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <button onClick={() => setTradePlanOpen(!tradePlanOpen)} className="flex items-center justify-between w-full">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-400" />
              Pre-Trade Plan
            </h2>
            {tradePlanOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {tradePlanOpen && (
            <div className="mt-3 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3" />
                  Market Bias
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handleOpenDailyBiasWindow}
                    className="flex-1 py-2 rounded-lg border text-sm font-semibold transition-all bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                  >
                    Set Daily Bias
                  </button>
                </div>

              {!biasSelected && (
                <div className="relative rounded-xl border border-border overflow-hidden">
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-1">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Select your Bias above to unlock tools</span>
                  </div>
                  <div className="p-4 opacity-30 pointer-events-none select-none">
                    <p className="text-sm text-muted-foreground">Strategy · Key Levels · Position Sizer</p>
                  </div>
                </div>
              )}

              {biasSelected && (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Target Session</label>
                    <div className="flex flex-wrap gap-2">
                      {TARGET_SESSIONS.map((s) => {
                        const colors = SESSION_COLOR_MAP[s.color];
                        const isActive = dayData.tradePlan.targetSession === s.id;
                        return (
                          <button
                            key={s.id}
                            onClick={() => updateTradePlan("targetSession", isActive ? "" : s.id)}
                            className={`flex flex-col items-start px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${isActive ? colors.active : `bg-secondary/30 ${colors.border}`}`}
                          >
                            <span>{s.label}</span>
                            <span className="text-[10px] font-normal opacity-70">{s.time}</span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedSession && selectedSessionColors && (
                      <div className={`mt-2 p-2.5 rounded-lg border ${selectedSessionColors.bg} flex items-start gap-2`}>
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${selectedSessionColors.text} mt-0.5 shrink-0`}>ICT</span>
                        <p className={`text-xs ${selectedSessionColors.text}`}>{selectedSession.tip}</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Strategy Branch</label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateTradePlan("strategy", dayData.tradePlan.strategy === "conservative" ? "" : "conservative")}
                        className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-all ${
                          dayData.tradePlan.strategy === "conservative"
                            ? "bg-amber-500/20 border-amber-500 text-amber-400"
                            : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                        }`}
                      >
                        CONSERVATIVE
                      </button>
                      <button
                        onClick={() => updateTradePlan("strategy", dayData.tradePlan.strategy === "aggressive" ? "" : "aggressive")}
                        className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-all ${
                          dayData.tradePlan.strategy === "aggressive"
                            ? "bg-orange-500/20 border-orange-500 text-orange-400"
                            : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                        }`}
                      >
                        AGGRESSIVE
                      </button>
                    </div>
                    {dayData.tradePlan.strategy === "conservative" && (
                      <div className="mt-2 p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                        <p className="text-xs text-amber-400/80 font-medium">Conservative: HTF Bias · Premium/Discount · No Red News · Wait 2 confirmations · 0.5% risk</p>
                      </div>
                    )}
                    {dayData.tradePlan.strategy === "aggressive" && (
                      <div className="mt-2 p-2.5 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                        <p className="text-xs text-orange-400/80 font-medium">Aggressive: Bias confirmed · At least 1 key level · FVG present · 1% risk</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Pairs / Instruments to Watch</label>
                    <input
                      type="text"
                      value={dayData.tradePlan.pairsToWatch}
                      onChange={(e) => updateTradePlan("pairsToWatch", e.target.value)}
                      placeholder="e.g. NQ, ES, EUR/USD, GBP/USD..."
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">
                      Key Levels &amp; Zones
                      {dayData.tradePlan.strategy === "conservative" && (
                        <span className="ml-2 text-amber-400/70">· Add at least 2 levels</span>
                      )}
                      {dayData.tradePlan.strategy === "aggressive" && (
                        <span className="ml-2 text-orange-400/70">· Add at least 1 level</span>
                      )}
                    </label>

                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {PRESET_LEVELS.map((preset) => {
                        const isActive = keyLevels.some((l) => l.label === preset.label);
                        return (
                          <button
                            key={preset.label}
                            onClick={() => addPresetLevel(preset)}
                            title={preset.desc}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                              isActive
                                ? "bg-primary text-primary-foreground border-primary"
                                : "border-primary/40 text-primary hover:bg-primary/10"
                            }`}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={newLevelPrice}
                        onChange={(e) => setNewLevelPrice(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addKeyLevel()}
                        placeholder="Price level..."
                        className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                      <select
                        value={newLevelType}
                        onChange={(e) => setNewLevelType(e.target.value as "support" | "resistance")}
                        className="bg-background border border-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                      >
                        <option value="support">Support</option>
                        <option value="resistance">Resistance</option>
                      </select>
                      <button
                        onClick={addKeyLevel}
                        disabled={!newLevelPrice.trim()}
                        className="bg-primary text-primary-foreground rounded-lg px-3 py-2 hover:brightness-110 transition-all disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    {keyLevels.length === 0 && (
                      <p className="text-xs text-muted-foreground text-center py-2">No levels added yet.</p>
                    )}
                    <div className="relative pl-4">
                      {keyLevels.length > 0 && (
                        <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-border rounded-full" />
                      )}
                      <div className="space-y-2">
                        {keyLevels.map((level, idx) => (
                          <div key={idx} className="flex items-center gap-2 group">
                            <div
                              className={`w-3 h-3 rounded-full shrink-0 -ml-1.5 border-2 border-background ${
                                level.type === "support" ? "bg-emerald-500" : "bg-red-500"
                              }`}
                            />
                            {level.label ? (
                              <span className="text-xs font-bold text-muted-foreground w-20 shrink-0">{level.label}</span>
                            ) : null}
                            <input
                              type="text"
                              data-level-price="true"
                              value={level.price}
                              onChange={(e) => updateKeyLevelPrice(idx, e.target.value)}
                              placeholder="price..."
                              className="flex-1 bg-transparent text-sm font-mono font-medium focus:outline-none focus:ring-1 focus:ring-primary/30 rounded px-1"
                            />
                            <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                              level.type === "support"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-red-500/10 text-red-400"
                            }`}>
                              {level.type}
                            </span>
                            <button
                              onClick={() => removeKeyLevel(idx)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive rounded transition-opacity"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Rules Before Trade */}
                  <div className="border-t border-border pt-4">
                    <button
                      onClick={() => setRulesOpen(!rulesOpen)}
                      className="flex items-center justify-between w-full mb-3"
                    >
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 cursor-pointer">
                        <ClipboardCheck className="h-3.5 w-3.5 text-orange-400" />
                        Rules Before Trade
                      </label>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${rulesAllChecked ? "bg-orange-500/20 text-orange-400" : "bg-secondary text-muted-foreground"}`}>
                          {RULES_CHECKLIST_ITEMS.filter((i) => rulesChecked[i.id]).length}/{RULES_CHECKLIST_ITEMS.length}
                        </span>
                        {rulesOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                      </div>
                    </button>
                    {rulesOpen && (
                      <>
                        <div className="space-y-2">
                          {RULES_CHECKLIST_ITEMS.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => toggleRulesChecklist(item.id)}
                              className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${rulesChecked[item.id] ? "bg-orange-500/10 border-orange-500/30" : "bg-secondary/30 border-border hover:border-orange-500/30"}`}
                            >
                              {rulesChecked[item.id]
                                ? <CheckSquare className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                                : <Square className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                              <div>
                                <div className={`text-sm font-semibold ${rulesChecked[item.id] ? "text-orange-400" : "text-foreground"}`}>{item.label}</div>
                                <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                        {rulesAllChecked && (
                          <button
                            onClick={resetRulesChecklist}
                            className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
                          >
                            Reset rules
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-2 block">Position Sizer</label>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {Object.keys(TICK_DATA).map((asset) => (
                        <button
                          key={asset}
                          onClick={() => updateTradePlan("selectedAsset", asset)}
                          className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                            selectedAsset === asset
                              ? "bg-primary text-primary-foreground border-primary"
                              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                          }`}
                        >
                          {asset}
                        </button>
                      ))}
                    </div>
                    {tickInfo && (
                      <div className="text-xs text-muted-foreground mb-3 bg-secondary/50 rounded-lg px-3 py-2">
                        <span className="font-semibold text-foreground">{selectedAsset}:</span>{" "}
                        {tickInfo.tick} tick = ${tickInfo.miniValue.toFixed(2)}/contract (Mini) · ${tickInfo.microValue.toFixed(2)}/contract (Micro)
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Stop Loss (ticks)</label>
                        <input
                          type="number"
                          value={dayData.tradePlan.stopLossTicks}
                          onChange={(e) => updateTradePlan("stopLossTicks", e.target.value)}
                          placeholder="e.g. 20"
                          min="0"
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">
                          Risk: {riskPct}% · Contracts
                        </label>
                        <div className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm font-mono font-bold text-primary">
                          {contracts > 0 ? contracts.toFixed(1) : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Max Trades Today</label>
                        <input
                          type="text"
                          value={dayData.tradePlan.maxTrades}
                          onChange={(e) => updateTradePlan("maxTrades", e.target.value)}
                          placeholder="e.g. 2-3"
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-muted-foreground mb-1 block">Risk Per Trade</label>
                        <input
                          type="text"
                          value={dayData.tradePlan.riskPerTrade}
                          onChange={(e) => updateTradePlan("riskPerTrade", e.target.value)}
                          placeholder="e.g. 1% or $50"
                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                        />
                      </div>
                    </div>
                  </div>

                  {isFeatureEnabled("feature_win_rate_estimator") && winRateEstimate && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Activity className="h-4 w-4 text-primary" />
                        <span className="text-xs font-bold text-primary">Win Rate Estimator</span>
                      </div>
                      <p className="text-sm">{winRateEstimate.message}</p>
                      <div className="mt-2 h-2 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${winRateEstimate.winRate}%`,
                            backgroundColor: winRateEstimate.winRate >= 50 ? "hsl(165 100% 39.2%)" : winRateEstimate.winRate >= 35 ? "#F59E0B" : "#EF4444",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <FailureAnalysis />

                  <div className="border-t border-border pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                        <ClipboardCheck className="h-3.5 w-3.5 text-emerald-400" />
                        Entry Criteria
                      </label>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${riskAllChecked ? "bg-emerald-500/20 text-emerald-400" : "bg-secondary text-muted-foreground"}`}>
                        {RISK_CHECKLIST_ITEMS.filter((i) => riskChecked[i.id]).length}/{RISK_CHECKLIST_ITEMS.length}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {RISK_CHECKLIST_ITEMS.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => toggleRiskChecklist(item.id)}
                          className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${riskChecked[item.id] ? "bg-emerald-500/10 border-emerald-500/30" : "bg-secondary/30 border-border hover:border-emerald-500/30"}`}
                        >
                          {riskChecked[item.id]
                            ? <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            : <Square className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
                          <div>
                            <div className={`text-sm font-semibold ${riskChecked[item.id] ? "text-emerald-400" : "text-foreground"}`}>{item.label}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                    {riskAllChecked && (
                      <button
                        onClick={resetRiskChecklist}
                        className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors text-center"
                      >
                        Reset criteria
                      </button>
                    )}
                  </div>

                  {/* Unified Ready-to-Trade Gate */}
                  <div className={`rounded-xl border p-3 text-center text-sm font-bold transition-all ${allChecklistsDone ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-secondary/30 border-border text-muted-foreground"}`}>
                    {allChecklistsDone ? (
                      "✓ CLEARED FOR TAKEOFF"
                    ) : (
                      <span className="space-x-2 text-xs font-semibold">
                        {!riskAllChecked && (
                          <span>Entry Criteria: {RISK_CHECKLIST_ITEMS.filter((i) => riskChecked[i.id]).length}/{RISK_CHECKLIST_ITEMS.length}</span>
                        )}
                        {!fvgAllChecked && (
                          <span className={!riskAllChecked ? "ml-2" : ""}>FVG Scan: {PRETRADE_FVG_ITEMS.filter((i) => fvgChecked[i.id]).length}/{PRETRADE_FVG_ITEMS.length}</span>
                        )}
                        {!rulesAllChecked && (
                          <span className={(!riskAllChecked || !fvgAllChecked) ? "ml-2" : ""}>Rules: {RULES_CHECKLIST_ITEMS.filter((i) => rulesChecked[i.id]).length}/{RULES_CHECKLIST_ITEMS.length}</span>
                        )}
                      </span>
                    )}
                  </div>
                </>
              )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className={!biasSelected ? "pointer-events-none opacity-35 relative" : ""}>
        {!biasSelected && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-auto">
            <div className="flex items-center gap-2 bg-background/80 backdrop-blur-sm px-4 py-2 rounded-xl">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Select your Bias above to unlock</span>
            </div>
          </div>
        )}

        <Card className="mb-4">
          <CardContent className="p-4">
            <button onClick={() => setNotesOpen(!notesOpen)} className="flex items-center justify-between w-full">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-green-400" />
                Daily Notes
              </h2>
              {notesOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {notesOpen && (
              <div className="mt-3">
                <textarea
                  value={dayData.notes}
                  onChange={(e) => updateNotes(e.target.value)}
                  placeholder="Write your thoughts, observations, lessons learned, or anything on your mind..."
                  rows={5}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                />
                {dayData.notes && (
                  <p className="text-xs text-muted-foreground mt-1 text-right">{dayData.notes.length} characters</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {dayData.tradePlan.voiceNote && (
        <div className="mt-3 p-3 bg-secondary/50 border border-border rounded-xl">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Mic className="h-3 w-3 text-primary" />
            <span className="text-xs font-semibold text-primary">Voice Note</span>
          </div>
          <p className="text-sm text-muted-foreground">{dayData.tradePlan.voiceNote}</p>
          <button
            onClick={() => updateTradePlan("voiceNote", "")}
            className="mt-1.5 text-xs text-destructive hover:text-destructive/80"
          >
            Clear
          </button>
        </div>
      )}
      </div>

      {/* Sticky Right Panel — Smart Money & FVG widgets */}
      <div className="w-full lg:w-72 lg:shrink-0">
        <div className="lg:sticky lg:top-6 space-y-4">
          <ConfidenceScoreCard />
          <FvgSignalCard />
        </div>
      </div>

      </div>
    </div>

    {/* Floating Probability Score — top-right corner */}
    <div className="fixed top-16 right-4 z-40 pointer-events-none">
      <div className="pointer-events-auto bg-card/90 backdrop-blur-md border border-border rounded-2xl px-4 py-3 shadow-xl flex flex-col items-center min-w-[88px]">
        <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest mb-1">Setup</span>
        <span className={`text-2xl font-bold font-mono leading-none ${probScore >= 80 ? "text-emerald-400" : probScore >= 60 ? "text-amber-400" : "text-red-400"}`}>
          {probScore}
        </span>
        <span className="text-[10px] text-muted-foreground mt-0.5">/ 100</span>
        <div className="w-full mt-2 h-1.5 bg-muted/40 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${probScore}%`,
              backgroundColor: probScore >= 80 ? "#10b981" : probScore >= 60 ? "#f59e0b" : "#ef4444",
            }}
          />
        </div>
      </div>
    </div>

    {/* Floating Action Buttons — bottom-center, horizontal row */}
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex flex-row items-center gap-2">
      {speechSupported && (
        <button
          onClick={isListening ? stopVoiceNote : startVoiceNote}
          title={isListening ? "Stop recording" : "Voice Note"}
          className={`w-7 h-7 rounded-full shadow-xl flex items-center justify-center transition-all ${
            isListening
              ? "bg-red-500 text-white animate-pulse"
              : "bg-secondary border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 hover:scale-105"
          }`}
        >
          {isListening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        </button>
      )}
      <button
        onClick={handleSendToJournal}
        disabled={showHaltBanner}
        title={showHaltBanner ? "Trading halted" : "Submit Trade"}
        className={`h-7 px-3 rounded-full shadow-xl flex items-center gap-2 font-bold text-xs transition-all ${
          showHaltBanner
            ? "bg-secondary border border-border text-muted-foreground cursor-not-allowed opacity-50"
            : "bg-primary text-primary-foreground hover:brightness-110 hover:scale-105"
        }`}
      >
        <Send className="h-3 w-3 shrink-0" />
        <span>Submit Trade</span>
      </button>
    </div>

    {/* Success Toast */}
    {successToast && (
      <div className="fixed bottom-24 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in duration-300">
        <div className="flex items-center gap-2.5 bg-emerald-900/90 border border-emerald-500/40 text-emerald-300 text-sm font-semibold px-4 py-3 rounded-2xl shadow-2xl backdrop-blur-md">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          Plan sent — ready for next trade!
        </div>
      </div>
    )}

    {sendModalOpen && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSendModalOpen(false)}>
        <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-lg font-bold mb-1">Ready to Trade</h2>
          <p className="text-sm text-muted-foreground mb-4">Confirm your plan details before logging.</p>
          <div className="space-y-2 mb-5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Bias</span>
              <span className="font-semibold capitalize">{dayData.tradePlan.bias || "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Strategy</span>
              <span className="font-semibold capitalize">{dayData.tradePlan.strategy || "—"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Key Levels</span>
              <span className="font-semibold">{keyLevels.length} level{keyLevels.length !== 1 ? "s" : ""}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Setup Score</span>
              <span className={`font-bold ${probScore >= 80 ? "text-emerald-400" : probScore >= 60 ? "text-amber-400" : "text-red-400"}`}>{probScore}%</span>
            </div>
            {dayData.tradePlan.voiceNote && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Voice Note</span>
                <span className="font-semibold text-primary">Attached</span>
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setSendModalOpen(false)}
              className="flex-1 py-2 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setSendModalOpen(false);
                const planPayload = {
                  bias: dayData.tradePlan.bias,
                  strategy: dayData.tradePlan.strategy,
                  keyLevels: keyLevels.map((l) => `${l.label || ""} ${l.price} (${l.type})`).join(", "),
                  pairs: dayData.tradePlan.pairsToWatch,
                  setupScore: probScore,
                  stopLossTicks: dayData.tradePlan.stopLossTicks,
                  voiceNote: dayData.tradePlan.voiceNote,
                  entryChecklist: RISK_CHECKLIST_ITEMS
                    .filter((item) => riskChecked[item.id])
                    .map((item) => item.label)
                    .join(", "),
                };
                const notes = [
                  `Pre-Trade Plan: ${planPayload.bias} | ${planPayload.strategy || "no strategy"}`,
                  planPayload.keyLevels ? `Key Levels: ${planPayload.keyLevels}` : "",
                  planPayload.pairs ? `Pairs: ${planPayload.pairs}` : "",
                  `Setup Score: ${planPayload.setupScore}%`,
                  planPayload.entryChecklist ? `Checked: ${planPayload.entryChecklist}` : "",
                  planPayload.voiceNote ? `Voice Note: ${planPayload.voiceNote}` : "",
                ].filter(Boolean).join("\n");
                localStorage.setItem("planner_journal_draft", JSON.stringify({
                  pair: planPayload.pairs,
                  notes,
                  bias: planPayload.bias,
                  isDraft: true,
                }));

                setRiskChecked({});
                resetRiskChecklistState();
                setFvgChecked({});
                resetFvgChecklistState();
                setRulesChecked({});
                resetRulesChecklistState();
                persist({
                  ...dayData,
                  tradePlan: { ...dayData.tradePlan, voiceNote: "" },
                });
                setSuccessToast(true);
                setTimeout(() => {
                  setSuccessToast(false);
                  navigate("/journal");
                }, 1400);
              }}
              className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:brightness-110 transition-all"
            >
              Log to Journal
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Daily Bias Window */}
    {showDailyBiasWindow && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDailyBiasWindow(false)} />
        <div className="relative bg-card border border-border rounded-2xl p-6 w-full max-w-sm shadow-2xl z-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-400" />
              <h2 className="font-bold text-lg">Set Daily Bias</h2>
            </div>
            <button onClick={() => setShowDailyBiasWindow(false)} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">Market Bias</label>
              <div className="flex gap-2">
                {(["bullish", "bearish", "neutral"] as const).map((bias) => (
                  <button
                    key={bias}
                    onClick={() => setDailyBiasInput(bias)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold border transition-all capitalize ${
                      dailyBiasInput === bias
                        ? bias === "bullish"
                          ? "bg-green-500/20 border-green-500 text-green-400"
                          : bias === "bearish"
                          ? "bg-red-500/20 border-red-500 text-red-400"
                          : "bg-amber-500/20 border-amber-500 text-amber-400"
                        : "bg-secondary/40 border-border text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {bias.charAt(0).toUpperCase() + bias.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDailyBiasWindow(false)}
                className="py-2 px-4 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSetDailyBias}
                disabled={!dailyBiasInput}
                className="py-2 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Set Bias
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
    {/* Smart Money Score popup */}
    {smartMoneyOpen && smartMoneyConfidence && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={() => setSmartMoneyOpen(false)}
      >
        <div
          className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-72 max-w-[90vw]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Smart Money Movement Score
            </h3>
            <button onClick={() => setSmartMoneyOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="text-center mb-4">
            <span className={`text-5xl font-bold font-mono ${smartMoneyConfidence.score >= 80 ? "text-emerald-400" : smartMoneyConfidence.score >= 60 ? "text-amber-400" : "text-red-400"}`}>
              {smartMoneyConfidence.score}
            </span>
            <div className="w-full h-2 bg-muted/40 rounded-full overflow-hidden mt-2">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${smartMoneyConfidence.score}%`,
                  backgroundColor: smartMoneyConfidence.score >= 80 ? "#10b981" : smartMoneyConfidence.score >= 60 ? "#f59e0b" : "#ef4444",
                }}
              />
            </div>
            <span className={`text-sm font-semibold mt-1 block ${smartMoneyConfidence.score >= 80 ? "text-emerald-400" : smartMoneyConfidence.score >= 60 ? "text-amber-400" : "text-red-400"}`}>
              {smartMoneyConfidence.score >= 80 ? "High Prob" : smartMoneyConfidence.score >= 60 ? "Moderate" : "Wait"}
            </span>
          </div>
          <div className="space-y-1.5">
            {smartMoneyConfidence.factors.map((f) => (
              <div
                key={f.label}
                className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg ${f.met ? "bg-emerald-500/10 text-emerald-400" : "bg-secondary text-muted-foreground"}`}
              >
                {f.met ? <CheckCircle2 className="h-3 w-3 shrink-0" /> : <Circle className="h-3 w-3 shrink-0" />}
                {f.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* FVG Scan popup */}
    {fvgPopupOpen && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
        onClick={() => setFvgPopupOpen(false)}
      >
        <div
          className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-80 max-w-[90vw]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-cyan-400" />
              FVG Scan
            </h3>
            <button onClick={() => setFvgPopupOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {PRETRADE_FVG_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => toggleFvgChecklist(item.id)}
                className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${fvgChecked[item.id] ? "bg-cyan-500/10 border-cyan-500/30" : "bg-secondary/30 border-border hover:border-cyan-500/30"}`}
              >
                {fvgChecked[item.id]
                  ? <CheckCircle2 className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" />
                  : <Circle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
                <div>
                  <div className={`text-sm font-semibold ${fvgChecked[item.id] ? "text-cyan-400" : "text-foreground"}`}>{item.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
                </div>
              </button>
            ))}
          </div>
          {fvgAllChecked && (
            <button
              onClick={() => { resetFvgChecklist(); }}
              className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground py-1.5 text-center border border-dashed border-border rounded-lg hover:border-foreground/30 transition-colors"
            >
              Reset FVG scan
            </button>
          )}
        </div>
      </div>
    )}
    </>
  );
}
