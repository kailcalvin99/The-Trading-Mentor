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
} from "lucide-react";
import { usePlanner } from "@/contexts/PlannerContext";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";

const ROUTINE_ITEMS = [
  { key: "water" as const, label: "Drink Water", desc: "Hydrate before you start trading", icon: Droplets },
  { key: "breathing" as const, label: "Breathing Exercise", desc: "5 minutes of calm, focused breathing", icon: Wind },
  { key: "news" as const, label: "Check for Big News Events", desc: "Are there any big news events today that could move the market?", icon: Newspaper },
  { key: "bias" as const, label: "Check the Big Picture Chart", desc: "HTF (Higher Timeframe) — Is the market going up or down today?", icon: BarChart3 },
];

interface PersonalTask {
  id: string;
  text: string;
  done: boolean;
}

interface TradePlan {
  bias: string;
  pairsToWatch: string;
  keyLevels: string;
  sessionFocus: string;
  maxTrades: string;
  riskPerTrade: string;
}

interface DayData {
  tasks: PersonalTask[];
  notes: string;
  tradePlan: TradePlan;
}

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
  keyLevels: "",
  sessionFocus: "",
  maxTrades: "",
  riskPerTrade: "",
};

function loadDayData(date: Date): DayData {
  try {
    const raw = localStorage.getItem(getDayKey(date));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { tasks: [], notes: "", tradePlan: { ...DEFAULT_TRADE_PLAN } };
}

function saveDayData(date: Date, data: DayData) {
  localStorage.setItem(getDayKey(date), JSON.stringify(data));
}

export default function DailyPlanner() {
  const { routineItems, isRoutineComplete, toggleItem } = usePlanner();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [dayData, setDayData] = useState<DayData>(() => loadDayData(new Date()));
  const [newTask, setNewTask] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [routineOpen, setRoutineOpen] = useState(true);
  const [tasksOpen, setTasksOpen] = useState(true);
  const [tradePlanOpen, setTradePlanOpen] = useState(true);
  const [notesOpen, setNotesOpen] = useState(true);
  const taskInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const isToday = selectedDate.toISOString().split("T")[0] === new Date().toISOString().split("T")[0];

  useEffect(() => {
    setDayData(loadDayData(selectedDate));
  }, [selectedDate]);

  const persist = useCallback((data: DayData) => {
    setDayData(data);
    saveDayData(selectedDate, data);
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

  function updateTradePlan(field: keyof TradePlan, value: string) {
    persist({ ...dayData, tradePlan: { ...dayData.tradePlan, [field]: value } });
  }

  function goDay(offset: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + offset);
    setSelectedDate(d);
  }

  const completedTasks = dayData.tasks.filter((t) => t.done).length;
  const totalTasks = dayData.tasks.length;

  return (
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
                {ROUTINE_ITEMS.map(({ key, label, desc, icon: Icon }) => (
                  <label key={key} className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                    <Checkbox checked={routineItems[key]} onCheckedChange={() => toggleItem(key)} className="mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={`text-sm font-medium ${routineItems[key] ? "text-primary line-through opacity-70" : ""}`}>{label}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{desc}</span>
                    </div>
                  </label>
                ))}
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
            <div className="mt-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1.5">
                    <TrendingUp className="h-3 w-3" />
                    Market Bias
                  </label>
                  <select
                    value={dayData.tradePlan.bias}
                    onChange={(e) => updateTradePlan("bias", e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="">Select...</option>
                    <option value="bullish">Bullish</option>
                    <option value="bearish">Bearish</option>
                    <option value="neutral">Neutral / Range</option>
                    <option value="no-trade">No Trade Day</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block flex items-center gap-1.5">
                    <Clock className="h-3 w-3" />
                    Session Focus
                  </label>
                  <select
                    value={dayData.tradePlan.sessionFocus}
                    onChange={(e) => updateTradePlan("sessionFocus", e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  >
                    <option value="">Select...</option>
                    <option value="london">London Session</option>
                    <option value="new-york">New York Session</option>
                    <option value="london-ny-overlap">London/NY Overlap</option>
                    <option value="asian">Asian Session</option>
                    <option value="all">All Sessions</option>
                  </select>
                </div>
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
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Key Levels & Zones</label>
                <textarea
                  value={dayData.tradePlan.keyLevels}
                  onChange={(e) => updateTradePlan("keyLevels", e.target.value)}
                  placeholder="Note important support/resistance, order blocks, FVGs, liquidity pools..."
                  rows={3}
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
                />
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
  );
}
