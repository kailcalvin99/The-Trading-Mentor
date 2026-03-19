import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Droplets,
  Wind,
  Newspaper,
  BarChart3,
  CheckCircle2,
  Plus,
  Trash2,
  Edit3,
  Save,
  Target,
  StickyNote,
  ListTodo,
  TrendingUp,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  Activity,
  Download,
  Mic,
  MicOff,
  Send,
  Lock,
  type LucideIcon,
} from "lucide-react";
import { usePlanner } from "@/contexts/PlannerContext";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import ProbabilityMeter from "@/components/ProbabilityMeter";

import CoolDownOverlay, { FailureAnalysis } from "@/components/CoolDownOverlay";
import { recordDisciplinedDay } from "@/components/HallOfFame";
import { useListTrades, useGetPropAccount } from "@workspace/api-client-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Droplets, Wind, Newspaper, BarChart3, CheckCircle2, Target, Clock, Activity, AlertTriangle,
};

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
}

interface EntryChecklist {
  htfBias: boolean;
  liquiditySwept: boolean;
  fvgPresent: boolean;
  orderBlockIdentified: boolean;
  premiumDiscountZone: boolean;
  inKillzone: boolean;
  noRedNews: boolean;
  manipulationPhase: boolean;
}

interface DayData {
  tasks: PersonalTask[];
  notes: string;
  tradePlan: TradePlan;
  entryChecklist?: EntryChecklist;
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
  { label: "PDH", type: "resistance" as const, desc: "Prev Day High" },
  { label: "PDL", type: "support" as const, desc: "Prev Day Low" },
  { label: "Midnight Open", type: "support" as const, desc: "Midnight Open" },
  { label: "NWOG", type: "support" as const, desc: "New Week Opening Gap" },
  { label: "ODL", type: "support" as const, desc: "Opening Day Low" },
  { label: "ODH", type: "resistance" as const, desc: "Opening Day High" },
];

function getDayKey(date: Date) {
  return `planner_day_${date.toISOString().split("T")[0]}`;
}

function getEntryChecklistKey(date: Date) {
  return `planner_entry_checklist_${date.toISOString().split("T")[0]}`;
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
};

const DEFAULT_ENTRY_CHECKLIST: EntryChecklist = {
  htfBias: false,
  liquiditySwept: false,
  fvgPresent: false,
  orderBlockIdentified: false,
  premiumDiscountZone: false,
  inKillzone: false,
  noRedNews: false,
  manipulationPhase: false,
};

function migrateKeyLevels(keyLevels: KeyLevel[] | string): KeyLevel[] {
  if (Array.isArray(keyLevels)) return keyLevels;
  if (typeof keyLevels === "string" && keyLevels.trim()) {
    return [{ price: keyLevels.trim(), type: "support" }];
  }
  return [];
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

function loadEntryChecklistLocal(date: Date): EntryChecklist {
  try {
    const raw = localStorage.getItem(getEntryChecklistKey(date));
    if (raw) return { ...DEFAULT_ENTRY_CHECKLIST, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_ENTRY_CHECKLIST };
}

function saveEntryChecklistLocal(date: Date, checklist: EntryChecklist) {
  localStorage.setItem(getEntryChecklistKey(date), JSON.stringify(checklist));
}

const API_BASE_URL = "/api";
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function persistToApi(dateStr: string, dayData: DayData, entryChecklist: EntryChecklist) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    try {
      await fetch(`${API_BASE_URL}/planner/${dateStr}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ data: { ...dayData, entryChecklist } }),
      });
    } catch {}
  }, 500);
}

async function loadDayDataFromApi(date: Date): Promise<DayData & { entryChecklist?: EntryChecklist } | null> {
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

const SESSION_WINDOWS: Record<string, { start: string; end: string; label: string }> = {
  "london": { start: "02:00", end: "05:00", label: "London Open" },
  "silver-bullet": { start: "10:00", end: "11:00", label: "Silver Bullet" },
  "new-york": { start: "09:30", end: "11:00", label: "NY Open" },
};

function exportToIcs(sessionFocus: string, date: Date) {
  const session = SESSION_WINDOWS[sessionFocus] || SESSION_WINDOWS["new-york"];
  const dateStr = date.toISOString().split("T")[0].replace(/-/g, "");
  const startDT = `${dateStr}T${session.start.replace(":", "")}00Z`;
  const endDT = `${dateStr}T${session.end.replace(":", "")}00Z`;
  const uid = `ict-session-${dateStr}-${sessionFocus}@ict-trading`;

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//ICT Trading Mentor//EN",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART:${startDT}`,
    `DTEND:${endDT}`,
    `SUMMARY:${session.label} - Trading Session`,
    `DESCRIPTION:ICT ${session.label} trading window`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ict-session-${dateStr}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

const ICT_ENTRY_CRITERIA = [
  { key: "htfBias" as keyof EntryChecklist, label: "HTF Bias Confirmed" },
  { key: "liquiditySwept" as keyof EntryChecklist, label: "Liquidity Swept" },
  { key: "fvgPresent" as keyof EntryChecklist, label: "FVG Present" },
  { key: "orderBlockIdentified" as keyof EntryChecklist, label: "Order Block Identified" },
  { key: "premiumDiscountZone" as keyof EntryChecklist, label: "Premium/Discount Zone" },
  { key: "inKillzone" as keyof EntryChecklist, label: "In Killzone" },
  { key: "noRedNews" as keyof EntryChecklist, label: "No Red News" },
  { key: "manipulationPhase" as keyof EntryChecklist, label: "Manipulation Phase Confirmed" },
];

const SESSION_CARDS = [
  { value: "london", label: "London Open", time: "2:00-5:00 AM EST", color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
  { value: "silver-bullet", label: "Silver Bullet", time: "10:00-11:00 AM EST", color: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
  { value: "new-york", label: "NY Open", time: "9:30-11:00 AM EST", color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
];

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

export default function DailyPlanner() {
  const navigate = useNavigate();
  const { routineItems, routineConfig, isRoutineComplete, toggleItem } = usePlanner();
  const { isFeatureEnabled } = useAppConfig();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayData, setDayData] = useState<DayData>(() => loadDayDataLocal(new Date()));
  const [entryChecklist, setEntryChecklist] = useState<EntryChecklist>(() => loadEntryChecklistLocal(new Date()));
  const [newTask, setNewTask] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [tradePlanOpen, setTradePlanOpen] = useState(true);
  const [entryChecklistOpen, setEntryChecklistOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(true);
  const [newLevelPrice, setNewLevelPrice] = useState("");
  const [newLevelType, setNewLevelType] = useState<"support" | "resistance">("support");
  const [haltDismissed, setHaltDismissed] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const taskInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const { data: apiTrades } = useListTrades();
  const trades = (apiTrades || []) as TradeRecord[];
  const { data: propAccount } = useGetPropAccount();

  const isToday = selectedDate.toISOString().split("T")[0] === new Date().toISOString().split("T")[0];
  const keyLevels = migrateKeyLevels(dayData.tradePlan.keyLevels);
  const winRateEstimate = computeWinRate(trades, dayData.tradePlan.bias, dayData.tradePlan.sessionFocus);

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

  const bias = dayData.tradePlan.bias;
  const biasSelected = bias === "bullish" || bias === "bearish";

  const probScore = (() => {
    let score = 0;
    if (biasSelected) score++;
    if (dayData.tradePlan.sessionFocus) score++;
    if (keyLevels.length >= 1) score++;
    if (entryChecklist.htfBias) score++;
    if (entryChecklist.fvgPresent || entryChecklist.orderBlockIdentified) score++;
    if (entryChecklist.manipulationPhase) score++;
    if (entryChecklist.noRedNews) score++;
    if (dayData.tradePlan.strategy === "conservative" || dayData.tradePlan.strategy === "aggressive") score++;
    const sl = parseFloat(dayData.tradePlan.stopLossTicks);
    if (!isNaN(sl) && sl > 0) score++;
    if (dayData.tradePlan.pairsToWatch.trim()) score++;
    return score * 10;
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
    const localChecklist = loadEntryChecklistLocal(selectedDate);
    setDayData(localData);
    setEntryChecklist(localChecklist);
    setHaltDismissed(false);

    loadDayDataFromApi(selectedDate).then((apiData) => {
      if (apiData) {
        const { entryChecklist: apiChecklist, ...rest } = apiData;
        const apiDayData: DayData = {
          tasks: rest.tasks ?? [],
          notes: rest.notes ?? "",
          tradePlan: { ...DEFAULT_TRADE_PLAN, ...rest.tradePlan },
        };
        setDayData(apiDayData);
        saveDayDataLocal(selectedDate, apiDayData);
        if (apiChecklist) {
          const mergedChecklist = { ...DEFAULT_ENTRY_CHECKLIST, ...apiChecklist };
          setEntryChecklist(mergedChecklist);
          saveEntryChecklistLocal(selectedDate, mergedChecklist);
        }
      } else if (localData.tasks.length > 0 || localData.notes || localData.tradePlan.bias) {
        const dateStr = selectedDate.toISOString().split("T")[0];
        persistToApi(dateStr, localData, localChecklist);
      }
    });
  }, [selectedDate]);

  const persist = useCallback((data: DayData) => {
    setDayData(data);
    saveDayDataLocal(selectedDate, data);
    const dateStr = selectedDate.toISOString().split("T")[0];
    setEntryChecklist((current) => {
      persistToApi(dateStr, data, current);
      return current;
    });
  }, [selectedDate]);

  const persistChecklist = useCallback((checklist: EntryChecklist) => {
    setEntryChecklist(checklist);
    saveEntryChecklistLocal(selectedDate, checklist);
    const dateStr = selectedDate.toISOString().split("T")[0];
    setDayData((current) => {
      persistToApi(dateStr, current, checklist);
      return current;
    });
  }, [selectedDate]);

  function addTask() {
    const text = newTask.trim();
    if (!text) return;
    const task: PersonalTask = { id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, text, done: false };
    persist({ ...dayData, tasks: [...dayData.tasks, task] });
    setNewTask("");
    taskInputRef.current?.focus();
  }

  function toggleTask(id: string) {
    persist({ ...dayData, tasks: dayData.tasks.map((t) => t.id === id ? { ...t, done: !t.done } : t) });
  }

  function deleteTask(id: string) {
    persist({ ...dayData, tasks: dayData.tasks.filter((t) => t.id !== id) });
  }

  function startEdit(task: PersonalTask) {
    setEditingTaskId(task.id);
    setEditingText(task.text);
    setTimeout(() => editInputRef.current?.focus(), 50);
  }

  function saveEdit() {
    if (!editingTaskId) return;
    const text = editingText.trim();
    if (!text) return;
    persist({ ...dayData, tasks: dayData.tasks.map((t) => t.id === editingTaskId ? { ...t, text } : t) });
    setEditingTaskId(null);
    setEditingText("");
  }

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

  const completedTasks = dayData.tasks.filter((t) => t.done).length;
  const totalTasks = dayData.tasks.length;

  const selectedAsset = dayData.tradePlan.selectedAsset || "NQ";
  const tickInfo = TICK_DATA[selectedAsset];
  const accountBalance = propStartingBalance || 50000;
  const riskPct = dayData.tradePlan.strategy === "conservative" ? 0.5 : dayData.tradePlan.strategy === "aggressive" ? 1.0 : 0.5;
  const stopTicks = parseFloat(dayData.tradePlan.stopLossTicks) || 0;
  const contracts = stopTicks > 0 && tickInfo ? Math.floor((accountBalance * riskPct / 100) / (stopTicks * tickInfo.miniValue) * 10) / 10 : 0;

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

    <div className="p-6 max-w-3xl mx-auto pb-20">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Daily Planner</h1>
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

      <div className="flex justify-center mb-6">
        <ProbabilityMeter score={probScore} />
      </div>

      <p className="text-muted-foreground mb-6 text-sm">
        Plan your trading day. Complete your routine, set your goals, and stay disciplined.
      </p>

      <Card className="mb-4">
        <CardContent className="p-4 space-y-0">
          {isToday && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className={`h-4 w-4 ${isRoutineComplete ? "text-primary" : "text-muted-foreground"}`} />
                <h2 className="font-semibold text-sm">Morning Routine</h2>
                {isRoutineComplete && (
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    Done
                  </span>
                )}
              </div>
              <div className="space-y-2 mb-4">
                <p className="text-xs text-muted-foreground mb-2">
                  Finish all steps to unlock trade logging in the Smart Journal.
                </p>
                {routineConfig.map((item) => {
                  const Icon = ICON_MAP[item.icon] || CheckCircle2;
                  return (
                    <label key={item.key} className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                      <Checkbox checked={routineItems[item.key]} onCheckedChange={() => toggleItem(item.key)} className="mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className={`text-sm font-medium ${routineItems[item.key] ? "text-primary line-through opacity-70" : ""}`}>{item.label}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{item.desc}</span>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="border-t border-border my-4" />
            </>
          )}

          {isToday && (
            <>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-cyan-400" />
                <h2 className="font-semibold text-sm">Session Schedule</h2>
              </div>
              <div className="relative pl-5 mb-4">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border rounded-full" />
                <div className="space-y-3">
                  {routineConfig.map((item) => {
                    const done = routineItems[item.key] || false;
                    return (
                      <div key={`timeline-routine-${item.key}`} className="flex items-start gap-3">
                        <div className={`w-3 h-3 rounded-full shrink-0 -ml-1.5 mt-0.5 border-2 border-background transition-colors ${
                          done ? "bg-primary" : "bg-border"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-tight ${done ? "text-primary" : "text-foreground"}`}>
                            {item.label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                          done ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                        }`}>
                          {done ? "Done" : "Routine"}
                        </span>
                      </div>
                    );
                  })}
                  {SESSION_CARDS.map((s) => {
                    const isSelected = dayData.tradePlan.sessionFocus === s.value;
                    return (
                      <div key={`timeline-session-${s.value}`} className="flex items-start gap-3">
                        <div className={`w-3 h-3 rounded-full shrink-0 -ml-1.5 mt-0.5 border-2 border-background transition-colors ${
                          isSelected ? "bg-primary" : "bg-border"
                        }`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium leading-tight ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {s.label}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.time}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                          isSelected ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30" : "bg-secondary text-muted-foreground"
                        }`}>
                          {isSelected ? "Selected" : "Session"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border my-4" />
            </>
          )}

          <div className="flex items-center gap-2 mb-3">
            <ListTodo className="h-4 w-4 text-blue-400" />
            <h2 className="font-semibold text-sm">My Tasks</h2>
            {totalTasks > 0 && (
              <span className="text-xs text-muted-foreground">
                {completedTasks}/{totalTasks}
              </span>
            )}
          </div>
          <div>
            <div className="flex gap-2 mb-3">
              <input
                ref={taskInputRef}
                type="text"
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addTask()}
                placeholder="Add a task..."
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              />
              <button onClick={addTask} className="bg-primary text-primary-foreground rounded-lg px-3 py-2 hover:brightness-110 transition-all" disabled={!newTask.trim()}>
                <Plus className="h-4 w-4" />
              </button>
            </div>

            {dayData.tasks.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">No tasks yet. Add your first task above.</p>
            )}

            <div className="space-y-1">
              {dayData.tasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-secondary/50 transition-colors group">
                  <Checkbox checked={task.done} onCheckedChange={() => toggleTask(task.id)} className="shrink-0" />
                  {editingTaskId === task.id ? (
                    <div className="flex-1 flex gap-2">
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingTaskId(null); }}
                        className="flex-1 bg-background border border-primary/50 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                      />
                      <button onClick={saveEdit} className="text-primary hover:text-primary/80">
                        <Save className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className={`flex-1 text-sm ${task.done ? "line-through text-muted-foreground" : ""}`}>{task.text}</span>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        <button onClick={() => startEdit(task)} className="p-1 text-muted-foreground hover:text-foreground rounded">
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button onClick={() => deleteTask(task.id)} className="p-1 text-muted-foreground hover:text-destructive rounded">
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {totalTasks > 0 && (
              <div className="mt-3 h-1.5 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(completedTasks / totalTasks) * 100}%` }}
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="p-4">
          <button onClick={() => setTradePlanOpen(!tradePlanOpen)} className="flex items-center justify-between w-full">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Target className="h-4 w-4 text-amber-400" />
              Trade Plan
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
                  {[
                    { value: "bullish", label: "Bullish", activeClass: "bg-emerald-500 text-white border-emerald-500" },
                    { value: "neutral", label: "Neutral", activeClass: "bg-amber-500 text-white border-amber-500" },
                    { value: "bearish", label: "Bearish", activeClass: "bg-red-500 text-white border-red-500" },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateTradePlan("bias", dayData.tradePlan.bias === opt.value ? "" : opt.value)}
                      className={`flex-1 py-2 rounded-lg border text-sm font-semibold transition-all ${
                        dayData.tradePlan.bias === opt.value
                          ? opt.activeClass
                          : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {!biasSelected && (
                <div className="relative rounded-xl border border-border overflow-hidden">
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px] z-10 flex flex-col items-center justify-center gap-1">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Select your Bias above to unlock tools</span>
                  </div>
                  <div className="p-4 opacity-30 pointer-events-none select-none">
                    <p className="text-sm text-muted-foreground">Strategy · Session Focus · Key Levels · Position Sizer</p>
                  </div>
                </div>
              )}

              {biasSelected && (
                <>
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
                    <label className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                      <Clock className="h-3 w-3" />
                      Session Focus
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {SESSION_CARDS.map((s) => (
                        <button
                          key={s.value}
                          onClick={() => updateTradePlan("sessionFocus", dayData.tradePlan.sessionFocus === s.value ? "" : s.value)}
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-center transition-all ${
                            dayData.tradePlan.sessionFocus === s.value
                              ? s.color
                              : "bg-secondary border-border text-muted-foreground hover:border-foreground/30"
                          }`}
                        >
                          <span className="text-xs font-bold leading-tight">{s.label}</span>
                          <span className="text-[10px] opacity-70 leading-tight">{s.time}</span>
                        </button>
                      ))}
                    </div>
                    {dayData.tradePlan.sessionFocus && SESSION_WINDOWS[dayData.tradePlan.sessionFocus] && (
                      <button
                        onClick={() => exportToIcs(dayData.tradePlan.sessionFocus, selectedDate)}
                        className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                      >
                        <Download className="h-3 w-3" />
                        Export to Calendar (.ics)
                      </button>
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
                </>
              )}
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
            <button onClick={() => setEntryChecklistOpen(!entryChecklistOpen)} className="flex items-center justify-between w-full">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-purple-400" />
                ICT Entry Criteria
                <span className="text-xs text-muted-foreground">
                  {Object.values(entryChecklist).filter(Boolean).length}/{ICT_ENTRY_CRITERIA.length}
                </span>
              </h2>
              {entryChecklistOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {entryChecklistOpen && (
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {ICT_ENTRY_CRITERIA.map((item) => {
                  const isAmberRequired =
                    dayData.tradePlan.strategy === "conservative" &&
                    (item.key === "htfBias" || item.key === "premiumDiscountZone" || item.key === "noRedNews");
                  return (
                    <label
                      key={item.key}
                      className={`flex items-center gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-secondary/50 transition-colors border ${
                        isAmberRequired ? "border-amber-500/40 bg-amber-500/5" : "border-border"
                      }`}
                    >
                      <Checkbox
                        checked={entryChecklist[item.key]}
                        onCheckedChange={() => persistChecklist({ ...entryChecklist, [item.key]: !entryChecklist[item.key] })}
                      />
                      <span className={`text-sm font-medium ${entryChecklist[item.key] ? "text-primary line-through opacity-70" : isAmberRequired ? "text-amber-400" : ""}`}>
                        {item.label}
                      </span>
                      {isAmberRequired && <span className="ml-auto text-[10px] text-amber-400 font-bold">REQ</span>}
                    </label>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

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

      <div className="flex gap-3 items-center">
        {speechSupported && (
          <button
            onClick={isListening ? stopVoiceNote : startVoiceNote}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
              isListening
                ? "bg-red-500/20 border-red-500 text-red-400 animate-pulse"
                : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
            }`}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {isListening ? "Stop" : "Voice Note"}
          </button>
        )}
        <button
          onClick={handleSendToJournal}
          disabled={showHaltBanner}
          title={showHaltBanner ? "Trading halted" : "Send to Journal"}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${
            showHaltBanner
              ? "bg-secondary border border-border text-muted-foreground cursor-not-allowed opacity-50"
              : "bg-primary text-primary-foreground hover:brightness-110"
          }`}
        >
          <Send className="h-4 w-4" />
          Send to Journal
        </button>
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
              <span className="text-muted-foreground">Session</span>
              <span className="font-semibold">{dayData.tradePlan.sessionFocus || "—"}</span>
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
                  session: dayData.tradePlan.sessionFocus,
                  keyLevels: keyLevels.map((l) => `${l.label || ""} ${l.price} (${l.type})`).join(", "),
                  pairs: dayData.tradePlan.pairsToWatch,
                  setupScore: probScore,
                  stopLossTicks: dayData.tradePlan.stopLossTicks,
                  voiceNote: dayData.tradePlan.voiceNote,
                  entryChecklist: Object.entries(entryChecklist)
                    .filter(([, v]) => v)
                    .map(([k]) => k)
                    .join(", "),
                };
                const notes = [
                  `Pre-Trade Plan: ${planPayload.bias} | ${planPayload.strategy || "no strategy"} | ${planPayload.session || "no session"}`,
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
                navigate("/journal");
              }}
              className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:brightness-110 transition-all"
            >
              Log to Journal
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
