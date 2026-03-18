import { useState, useEffect, useCallback, useRef } from "react";
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
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Trophy,
  AlertTriangle,
  Activity,
  Download,
  type LucideIcon,
} from "lucide-react";
import { usePlanner } from "@/contexts/PlannerContext";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

import CoolDownOverlay, { FailureAnalysis } from "@/components/CoolDownOverlay";
import HallOfFame, { recordDisciplinedDay, getDisciplineStats } from "@/components/HallOfFame";
import { useListTrades } from "@workspace/api-client-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Droplets, Wind, Newspaper, BarChart3, CheckCircle2, Target, Clock, Activity, Trophy, AlertTriangle,
};

interface PersonalTask {
  id: string;
  text: string;
  done: boolean;
}

interface KeyLevel {
  price: string;
  type: "support" | "resistance";
}

interface TradePlan {
  bias: string;
  pairsToWatch: string;
  keyLevels: KeyLevel[] | string;
  sessionFocus: string;
  maxTrades: string;
  riskPerTrade: string;
}

interface EntryChecklist {
  htfBias: boolean;
  liquiditySwept: boolean;
  fvgPresent: boolean;
  orderBlockIdentified: boolean;
  premiumDiscountZone: boolean;
  inKillzone: boolean;
}

interface DayData {
  tasks: PersonalTask[];
  notes: string;
  tradePlan: TradePlan;
  entryChecklist?: EntryChecklist;
}

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
};

const DEFAULT_ENTRY_CHECKLIST: EntryChecklist = {
  htfBias: false,
  liquiditySwept: false,
  fvgPresent: false,
  orderBlockIdentified: false,
  premiumDiscountZone: false,
  inKillzone: false,
};

function migrateKeyLevels(keyLevels: KeyLevel[] | string): KeyLevel[] {
  if (Array.isArray(keyLevels)) return keyLevels;
  if (typeof keyLevels === "string" && keyLevels.trim()) {
    return [{ price: keyLevels.trim(), type: "support" }];
  }
  return [];
}

function loadDayData(date: Date): DayData {
  try {
    const raw = localStorage.getItem(getDayKey(date));
    if (raw) {
      const parsed = JSON.parse(raw);
      parsed.tradePlan = parsed.tradePlan || { ...DEFAULT_TRADE_PLAN };
      parsed.tradePlan.keyLevels = migrateKeyLevels(parsed.tradePlan.keyLevels);
      return parsed;
    }
  } catch {}
  return { tasks: [], notes: "", tradePlan: { ...DEFAULT_TRADE_PLAN, keyLevels: [] } };
}

function saveDayData(date: Date, data: DayData) {
  localStorage.setItem(getDayKey(date), JSON.stringify(data));
}

function loadEntryChecklist(date: Date): EntryChecklist {
  try {
    const raw = localStorage.getItem(getEntryChecklistKey(date));
    if (raw) return { ...DEFAULT_ENTRY_CHECKLIST, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULT_ENTRY_CHECKLIST };
}

function saveEntryChecklist(date: Date, checklist: EntryChecklist) {
  localStorage.setItem(getEntryChecklistKey(date), JSON.stringify(checklist));
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
];

const SESSION_CARDS = [
  { value: "london", label: "London Open", time: "2:00–5:00 AM EST", color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
  { value: "silver-bullet", label: "Silver Bullet", time: "10:00–11:00 AM EST", color: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
  { value: "new-york", label: "NY Open", time: "9:30–11:00 AM EST", color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
];

export default function DailyPlanner() {
  const { routineItems, routineConfig, isRoutineComplete, toggleItem } = usePlanner();
  const { isFeatureEnabled } = useAppConfig();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayData, setDayData] = useState<DayData>(() => loadDayData(new Date()));
  const [entryChecklist, setEntryChecklist] = useState<EntryChecklist>(() => loadEntryChecklist(new Date()));
  const [newTask, setNewTask] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [routineOpen, setRoutineOpen] = useState(true);
  const [tasksOpen, setTasksOpen] = useState(true);
  const [tradePlanOpen, setTradePlanOpen] = useState(true);
  const [entryChecklistOpen, setEntryChecklistOpen] = useState(true);
  const [scheduleOpen, setScheduleOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(true);
  const [hallOfFameOpen, setHallOfFameOpen] = useState(false);
  const [newLevelPrice, setNewLevelPrice] = useState("");
  const [newLevelType, setNewLevelType] = useState<"support" | "resistance">("support");
  const taskInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const { data: apiTrades } = useListTrades();
  const trades = (apiTrades || []) as TradeRecord[];

  const isToday = selectedDate.toISOString().split("T")[0] === new Date().toISOString().split("T")[0];

  const keyLevels = migrateKeyLevels(dayData.tradePlan.keyLevels);
  const winRateEstimate = computeWinRate(trades, dayData.tradePlan.bias, dayData.tradePlan.sessionFocus);

  useEffect(() => {
    if (isRoutineComplete) {
      recordDisciplinedDay();
    }
  }, [isRoutineComplete]);

  useEffect(() => {
    setDayData(loadDayData(selectedDate));
    setEntryChecklist(loadEntryChecklist(selectedDate));
  }, [selectedDate]);

  const persist = useCallback((data: DayData) => {
    setDayData(data);
    saveDayData(selectedDate, data);
  }, [selectedDate]);

  const persistChecklist = useCallback((checklist: EntryChecklist) => {
    setEntryChecklist(checklist);
    saveEntryChecklist(selectedDate, checklist);
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

  function removeKeyLevel(idx: number) {
    const levels = keyLevels.filter((_, i) => i !== idx);
    updateTradePlan("keyLevels", levels);
  }

  function goDay(offset: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d);
  }

  const completedTasks = dayData.tasks.filter((t) => t.done).length;
  const totalTasks = dayData.tasks.length;

  const timelineItems = [
    ...routineConfig.map((item) => ({
      id: `routine-${item.key}`,
      label: item.label,
      sublabel: item.desc,
      done: routineItems[item.key] || false,
      type: "routine" as const,
    })),
    ...SESSION_CARDS.map((s) => ({
      id: `session-${s.value}`,
      label: s.label,
      sublabel: s.time,
      done: dayData.tradePlan.sessionFocus === s.value,
      type: "session" as const,
      color: s.color,
    })),
  ];

  return (
    <>
    <CoolDownOverlay />
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

      <p className="text-muted-foreground mb-6 text-sm">
        Plan your trading day. Complete your routine, set your goals, and stay disciplined.
      </p>

      {isToday && (
        <Card className={`mb-4 ${isRoutineComplete ? "border-primary/30" : ""}`}>
          <CardContent className="p-4">
            <button onClick={() => setRoutineOpen(!routineOpen)} className="flex items-center justify-between w-full">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <CheckCircle2 className={`h-4 w-4 ${isRoutineComplete ? "text-primary" : "text-muted-foreground"}`} />
                Morning Routine
                {isRoutineComplete && (
                  <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                    Done
                  </span>
                )}
              </h2>
              {routineOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {routineOpen && (
              <div className="mt-3 space-y-2">
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
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardContent className="p-4">
          <button onClick={() => setTasksOpen(!tasksOpen)} className="flex items-center justify-between w-full">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <ListTodo className="h-4 w-4 text-blue-400" />
              My Tasks
              {totalTasks > 0 && (
                <span className="text-xs text-muted-foreground">
                  {completedTasks}/{totalTasks}
                </span>
              )}
            </h2>
            {tasksOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
          </button>
          {tasksOpen && (
            <div className="mt-3">
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
          )}
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
                <label className="text-xs font-medium text-muted-foreground mb-2 block">Key Levels & Zones</label>
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
                        <span className="text-sm font-mono font-medium flex-1">{level.price}</span>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
            </div>
          )}
        </CardContent>
      </Card>

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
              {ICT_ENTRY_CRITERIA.map((item) => (
                <label key={item.key} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-lg hover:bg-secondary/50 transition-colors border border-border">
                  <Checkbox
                    checked={entryChecklist[item.key]}
                    onCheckedChange={() => persistChecklist({ ...entryChecklist, [item.key]: !entryChecklist[item.key] })}
                  />
                  <span className={`text-sm font-medium ${entryChecklist[item.key] ? "text-primary line-through opacity-70" : ""}`}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {isToday && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <button onClick={() => setScheduleOpen(!scheduleOpen)} className="flex items-center justify-between w-full">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-cyan-400" />
                Today's Schedule
              </h2>
              {scheduleOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {scheduleOpen && (
              <div className="mt-3 relative pl-5">
                <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-border rounded-full" />
                <div className="space-y-3">
                  {timelineItems.map((item) => (
                    <div key={item.id} className="flex items-start gap-3">
                      <div className={`w-3 h-3 rounded-full shrink-0 -ml-1.5 mt-0.5 border-2 border-background transition-colors ${
                        item.done ? "bg-primary" : "bg-border"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium leading-tight ${item.done ? "text-primary" : "text-foreground"}`}>
                          {item.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.sublabel}</p>
                      </div>
                      {item.type === "routine" && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                          item.done ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                        }`}>
                          {item.done ? "Done" : "Routine"}
                        </span>
                      )}
                      {item.type === "session" && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${
                          item.done ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30" : "bg-secondary text-muted-foreground"
                        }`}>
                          {item.done ? "Selected" : "Session"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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

      {isFeatureEnabled("feature_hall_of_fame") && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <button onClick={() => setHallOfFameOpen(!hallOfFameOpen)} className="flex items-center justify-between w-full">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400" />
                Hall of Fame
                {getDisciplineStats().currentStreak > 0 && (
                  <span className="text-xs font-semibold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                    {getDisciplineStats().currentStreak} day streak
                  </span>
                )}
              </h2>
              {hallOfFameOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {hallOfFameOpen && (
              <div className="mt-3">
                <HallOfFame />
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
    </>
  );
}
