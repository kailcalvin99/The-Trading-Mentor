import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, BarChart3, Shield,
  Sparkles,
  FileText, StickyNote, ClipboardCheck, CheckSquare, Square,
  Target, Settings, X,
  CheckCircle2,
} from "lucide-react";
import MorningBriefingWidget from "@/components/MorningBriefingWidget";
import { useAuth } from "@/contexts/AuthContext";
import { useDailyStreak, AchievementBadges, PremiumTeaser } from "@/components/CasinoElements";
import { useListTrades } from "@workspace/api-client-react";
import { usePlanner } from "@/contexts/PlannerContext";
import { useGetPropAccount } from "@workspace/api-client-react";
import { DASHBOARD_WIDGETS, useDashboardWidgets } from "@/hooks/useDashboardWidgets";
import type { LucideIcon } from "lucide-react";

const SESSIONS = [
  { name: "London", emoji: "🌍", startH: 2, startM: 0, endH: 5, endM: 0, color: "#F59E0B", time: "2:00–5:00 AM EST" },
  { name: "NY Open", emoji: "📈", startH: 9, startM: 30, endH: 10, endM: 0, color: "#00C896", time: "9:30–10:00 AM EST" },
  { name: "Silver Bullet", emoji: "🎯", startH: 10, startM: 0, endH: 11, endM: 0, color: "#EF4444", time: "10:00–11:00 AM EST" },
  { name: "London Close", emoji: "🔔", startH: 11, startM: 0, endH: 12, endM: 0, color: "#818CF8", time: "11:00 AM–12:00 PM EST" },
];

const SLOT_SESSIONS = ["Silver Bullet 🎯", "NY Open 📈", "London 🌍", "Asian 🌏"];
const SLOT_ACTIONS = ["FVG Entry", "OB Retest", "Liquidity Grab", "Market Structure"];
const SLOT_GOALS = ["1 trade max", "Watch only", "Log in journal", "50-pt target"];

const CHECKLIST_STORAGE_KEY = "ict-pretrade-checklist";
const CHECKLIST_TTL_HOURS = 4;
const CHECKLIST_ITEMS = [
  { id: "htf_bias", label: "HTF Bias confirmed on Daily chart", desc: "The Daily chart is clearly bullish or bearish — no choppy indecision." },
  { id: "kill_zone", label: "In a Kill Zone right now", desc: "You are trading during London Open (2-5 AM EST) or Silver Bullet (10-11 AM EST)." },
  { id: "sweep_idm", label: "Liquidity sweep or IDM confirmed", desc: "A liquidity sweep (stop hunt) or IDM (Inducement) has occurred on your entry timeframe." },
  { id: "displacement_fvg", label: "Displacement with FVG or MSS present", desc: "Big displacement candles created an FVG or MSS — Smart Money is behind this move." },
];

const TRADE_BIAS_CHIPS = [
  { id: "bullish", label: "Bullish bias", color: "#00C896" },
  { id: "bearish", label: "Bearish bias", color: "#EF4444" },
  { id: "waiting", label: "Waiting for sweep", color: "#F59E0B" },
  { id: "silver_bullet", label: "Silver Bullet only", color: "#818CF8" },
  { id: "no_trade", label: "No trade — red news", color: "#6B7280" },
  { id: "targeting_ny", label: "Targeting NY Open", color: "#00C896" },
];

const QUICK_JOURNAL_KEY = "ict-quick-journal-notes";

interface QuickNote {
  id: string;
  text: string;
  timestamp: string;
}

function getQuickNotes(): QuickNote[] {
  try {
    const raw = localStorage.getItem(QUICK_JOURNAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveQuickNote(note: QuickNote) {
  const notes = getQuickNotes();
  notes.unshift(note);
  const trimmed = notes.slice(0, 100);
  localStorage.setItem(QUICK_JOURNAL_KEY, JSON.stringify(trimmed));
}

function getChecklistState(): { checked: Record<string, boolean>; timestamp: number } {
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return { checked: {}, timestamp: 0 };
    const data = JSON.parse(raw);
    const ageMs = Date.now() - (data.timestamp || 0);
    if (ageMs > CHECKLIST_TTL_HOURS * 60 * 60 * 1000) {
      localStorage.removeItem(CHECKLIST_STORAGE_KEY);
      return { checked: {}, timestamp: 0 };
    }
    return data;
  } catch { return { checked: {}, timestamp: 0 }; }
}

function saveChecklistState(checked: Record<string, boolean>) {
  localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify({ checked, timestamp: Date.now() }));
}

function getESTNow(): Date {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  return new Date(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  );
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "LIVE";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function dateSeed(): number {
  const d = new Date().toDateString();
  let hash = 0;
  for (let i = 0; i < d.length; i++) {
    hash = ((hash << 5) - hash) + d.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function WidgetHeader({
  icon: Icon,
  title,
  editLink,
  editLabel = "Edit ↗",
  badge,
}: {
  icon: LucideIcon;
  title: string;
  editLink?: string;
  editLabel?: string;
  badge?: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <h3 className="text-sm font-bold text-foreground flex-1">{title}</h3>
      {badge}
      {editLink && (
        <button
          onClick={() => navigate(editLink)}
          className="text-[10px] text-primary hover:text-primary/80 font-medium shrink-0 transition-colors"
        >
          {editLabel}
        </button>
      )}
    </div>
  );
}

function CompactGreetingRow() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "Trader";
  const checklistDone = CHECKLIST_ITEMS.filter(
    (item) => getChecklistState().checked[item.id]
  ).length;
  const checklistTotal = CHECKLIST_ITEMS.length;

  const est = getESTNow();
  const greetingHour = est.getHours();
  const timeGreeting = greetingHour < 12 ? "Good morning" : greetingHour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-lg select-none">🤖</span>
        <span className="text-sm font-semibold text-foreground">
          {timeGreeting}, {firstName}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
        <span>Checklist: {checklistDone}/{checklistTotal}</span>
      </div>
    </div>
  );
}

function SlotMachine() {
  const [reelsStopped, setReelsStopped] = useState([false, false, false]);
  const [results, setResults] = useState<string[]>(["", "", ""]);
  const seed = dateSeed();

  useEffect(() => {
    const r1 = SLOT_SESSIONS[seed % SLOT_SESSIONS.length];
    const r2 = SLOT_ACTIONS[Math.floor(seed / 7) % SLOT_ACTIONS.length];
    const r3 = SLOT_GOALS[Math.floor(seed / 13) % SLOT_GOALS.length];
    const finalResults = [r1, r2, r3];

    const delays = [1200, 1800, 2400];
    const timers = delays.map((delay, i) =>
      setTimeout(() => {
        setResults((prev) => { const next = [...prev]; next[i] = finalResults[i]; return next; });
        setReelsStopped((prev) => { const next = [...prev]; next[i] = true; return next; });
      }, delay)
    );
    return () => timers.forEach(clearTimeout);
  }, [seed]);

  return (
    <div className="bg-gradient-to-b from-red-600/5 to-card border border-red-600/20 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-red-500" />
        <h3 className="text-base font-bold text-foreground">Today's Mission</h3>
        <span className="text-[10px] bg-red-600/10 text-red-500 px-2 py-0.5 rounded-full font-bold">DAILY</span>
      </div>

      <div className="flex gap-3 justify-center mb-4">
        {["Session", "Action", "Goal"].map((label, i) => (
          <div key={label} className="flex-1 max-w-[140px]">
            <p className="text-[10px] text-muted-foreground text-center mb-1 uppercase tracking-wider">{label}</p>
            <div className="h-16 bg-muted/50 border border-border rounded-xl flex items-center justify-center overflow-hidden relative">
              {!reelsStopped[i] ? (
                <div className={`animate-slot-spin slot-reel-${i}`}>
                  <div className="text-sm font-bold text-foreground/50 text-center space-y-2">
                    {(i === 0 ? SLOT_SESSIONS : i === 1 ? SLOT_ACTIONS : SLOT_GOALS).map((item, j) => (
                      <p key={j}>{item}</p>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm font-bold text-foreground text-center px-2 animate-in fade-in duration-500">
                  {results[i]}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {reelsStopped.every(Boolean) && (
        <div className="bg-red-600/10 border border-red-600/20 rounded-xl p-3 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
          <p className="text-sm font-medium text-foreground">
            <span className="text-red-500 font-bold">Mission:</span> {results[0]} → {results[1]} → {results[2]}
          </p>
        </div>
      )}

      <style>{`
        @keyframes slotSpin {
          0% { transform: translateY(0); }
          100% { transform: translateY(-100%); }
        }
        .animate-slot-spin {
          animation: slotSpin 0.15s linear infinite;
          filter: blur(2px);
        }
        .slot-reel-0 { animation-duration: 0.15s; animation-delay: 0s; }
        .slot-reel-1 { animation-duration: 0.2s; }
        .slot-reel-2 { animation-duration: 0.3s; filter: blur(3px); }
      `}</style>
    </div>
  );
}

function KillZoneStripWidget() {
  const navigate = useNavigate();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const est = getESTNow();
  const nowMins = est.getHours() * 60 + est.getMinutes();

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <WidgetHeader
        icon={Target}
        title="Kill Zones"
        editLink="/planner"
        editLabel="Planner ↗"
      />
      <div
        className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide cursor-pointer"
        style={{ height: 52 }}
        onClick={() => navigate("/planner")}
      >
        {SESSIONS.map((session) => {
          const startMins = session.startH * 60 + session.startM;
          const endMins = session.endH * 60 + session.endM;
          const isLive = endMins > startMins
            ? nowMins >= startMins && nowMins < endMins
            : nowMins >= startMins || nowMins < endMins;
          const isEnded = endMins > startMins
            ? nowMins >= endMins
            : nowMins >= endMins && nowMins < startMins;

          const target = new Date(est);
          target.setHours(session.startH, session.startM, 0, 0);
          if (!isLive && est >= target) target.setDate(target.getDate() + 1);
          const msUntil = isLive ? 0 : target.getTime() - est.getTime();
          const isNear = msUntil > 0 && msUntil <= 30 * 60 * 1000;

          return (
            <div
              key={session.name}
              className={`flex-shrink-0 flex items-center gap-2 px-3 h-full bg-card border rounded-xl transition-all ${
                isLive ? "border-2" : "border-border"
              }`}
              style={isLive ? { borderColor: session.color, boxShadow: `0 0 8px ${session.color}25` } : undefined}
            >
              <div
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLive ? "animate-pulse" : ""}`}
                style={{ backgroundColor: isLive ? session.color : isNear ? "#F59E0B" : "#555" }}
              />
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-foreground whitespace-nowrap leading-tight">{session.emoji} {session.name}</span>
                <span className="text-[10px] text-muted-foreground whitespace-nowrap leading-tight">{session.time}</span>
              </div>
              {isLive ? (
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-1"
                  style={{ backgroundColor: `${session.color}20`, color: session.color }}
                >
                  LIVE
                </span>
              ) : isEnded ? (
                <span className="text-[10px] text-muted-foreground font-medium shrink-0 ml-1">Ended</span>
              ) : (
                <span className={`text-[10px] font-mono font-medium shrink-0 ml-1 ${isNear ? "text-amber-400" : "text-muted-foreground"}`}>
                  {formatCountdown(msUntil)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MorningRoutineWidget() {
  const navigate = useNavigate();
  const { routineItems, routineConfig, isRoutineComplete, toggleItem } = usePlanner();

  const doneCount = routineConfig.filter((item) => routineItems[item.key]).length;
  const totalCount = routineConfig.length;
  const pct = totalCount > 0 ? doneCount / totalCount : 0;

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <WidgetHeader
        icon={CheckCircle2}
        title="Morning Routine"
        editLink="/planner"
        editLabel="Planner ↗"
        badge={
          isRoutineComplete ? (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">Done ✓</span>
          ) : undefined
        }
      />
      <div className="flex items-center gap-4">
        <div className="relative shrink-0">
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <circle
              cx="26"
              cy="26"
              r={radius}
              fill="none"
              stroke={isRoutineComplete ? "#00C896" : "#818CF8"}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 0.4s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-bold text-foreground">{doneCount}/{totalCount}</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {routineConfig.map((item) => {
            const done = routineItems[item.key];
            return (
              <label
                key={item.key}
                className="flex items-center gap-2 cursor-pointer group"
                onClick={(e) => { e.preventDefault(); toggleItem(item.key); }}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors border ${
                  done ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"
                }`}>
                  {done && <CheckSquare className="h-3 w-3 text-primary-foreground" />}
                </div>
                <span className={`text-xs leading-tight ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {item.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PreTradeChecklistWidget() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState<Record<string, boolean>>(() => getChecklistState().checked);
  const [ttlAnchor, setTtlAnchor] = useState(() => getChecklistState().timestamp);
  const allChecked = CHECKLIST_ITEMS.every((item) => checked[item.id]);
  const doneCount = Object.values(checked).filter(Boolean).length;

  useEffect(() => {
    if (ttlAnchor <= 0) return;
    const expiresAt = ttlAnchor + CHECKLIST_TTL_HOURS * 60 * 60 * 1000;
    const msLeft = expiresAt - Date.now();
    if (msLeft <= 0) {
      setChecked({});
      setTtlAnchor(0);
      localStorage.removeItem(CHECKLIST_STORAGE_KEY);
      return;
    }
    const timer = setTimeout(() => {
      setChecked({});
      setTtlAnchor(0);
      localStorage.removeItem(CHECKLIST_STORAGE_KEY);
    }, msLeft);
    return () => clearTimeout(timer);
  }, [ttlAnchor]);

  function toggle(id: string) {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    saveChecklistState(next);
    if (ttlAnchor <= 0) setTtlAnchor(Date.now());
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <WidgetHeader
        icon={ClipboardCheck}
        title="Pre-Trade Checklist"
        editLink="/planner"
        editLabel="Planner ↗"
        badge={
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${allChecked ? "bg-emerald-500/20 text-emerald-400" : "bg-secondary text-muted-foreground"}`}>
            {doneCount}/{CHECKLIST_ITEMS.length}
          </span>
        }
      />
      <div className="space-y-1.5">
        {CHECKLIST_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all text-left ${
              checked[item.id]
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-secondary/30 border-border hover:border-emerald-500/30"
            }`}
          >
            {checked[item.id]
              ? <CheckSquare className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              : <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            <span className={`text-xs font-medium ${checked[item.id] ? "text-emerald-400" : "text-foreground"}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
      <div className={`mt-2.5 rounded-lg border px-3 py-2 text-center text-xs font-bold transition-all ${
        allChecked
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          : "bg-secondary/30 border-border text-muted-foreground"
      }`}>
        {allChecked ? "✓ Ready to Trade" : "Not Ready"}
      </div>
    </div>
  );
}

const PLANNER_DAY_KEY_PREFIX = "planner_day_";

function getTodayPlannerKey() {
  return `${PLANNER_DAY_KEY_PREFIX}${new Date().toISOString().split("T")[0]}`;
}

interface TodayTradePlan {
  bias: string;
  pairsToWatch: string;
  sessionFocus: string;
  maxTrades: string;
}

function loadTodayTradePlan(): TodayTradePlan {
  try {
    const raw = localStorage.getItem(getTodayPlannerKey());
    if (raw) {
      const parsed = JSON.parse(raw);
      return parsed.tradePlan || {};
    }
  } catch {}
  return { bias: "", pairsToWatch: "", sessionFocus: "", maxTrades: "" };
}

function saveTodayBias(bias: string) {
  try {
    const key = getTodayPlannerKey();
    const raw = localStorage.getItem(key);
    const data = raw ? JSON.parse(raw) : { tasks: [], notes: "", tradePlan: {} };
    data.tradePlan = { ...data.tradePlan, bias };
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

function TradePlanWidget() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<TodayTradePlan>(() => loadTodayTradePlan());

  useEffect(() => {
    const handleStorage = () => setPlan(loadTodayTradePlan());
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const activeBiasChip = TRADE_BIAS_CHIPS.find((c) =>
    plan.bias?.toLowerCase().includes(c.id.replace("_", " ")) ||
    plan.bias?.toLowerCase().includes(c.label.toLowerCase().split(" ")[0])
  );

  function tapBias(chip: typeof TRADE_BIAS_CHIPS[0]) {
    const newBias = plan.bias === chip.label ? "" : chip.label;
    setPlan((prev) => ({ ...prev, bias: newBias }));
    saveTodayBias(newBias);
  }

  const hasPlan = plan.bias || plan.pairsToWatch || plan.sessionFocus || plan.maxTrades;

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <WidgetHeader
        icon={FileText}
        title="Today's Trade Plan"
        editLink="/planner"
        editLabel="Edit ↗"
      />
      <div className="flex flex-wrap gap-1.5 mb-3">
        {TRADE_BIAS_CHIPS.map((chip) => {
          const isActive = plan.bias === chip.label;
          return (
            <button
              key={chip.id}
              onClick={() => tapBias(chip)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all whitespace-nowrap"
              style={{
                borderColor: isActive ? chip.color : "var(--border)",
                color: isActive ? chip.color : "var(--muted-foreground)",
                backgroundColor: isActive ? `${chip.color}15` : "transparent",
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
      {hasPlan ? (
        <div className="space-y-1.5">
          {plan.bias && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-16 shrink-0">Bias</span>
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ color: activeBiasChip?.color || "var(--foreground)", backgroundColor: `${activeBiasChip?.color || "#666"}15` }}
              >
                {plan.bias}
              </span>
            </div>
          )}
          {plan.pairsToWatch && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-16 shrink-0">Pairs</span>
              <span className="text-xs text-foreground">{plan.pairsToWatch}</span>
            </div>
          )}
          {plan.sessionFocus && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-16 shrink-0">Session</span>
              <span className="text-xs text-foreground">{plan.sessionFocus}</span>
            </div>
          )}
          {plan.maxTrades && (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider w-16 shrink-0">Max trades</span>
              <span className="text-xs text-foreground">{plan.maxTrades}</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">Tap a bias chip above or go to Planner to set today's plan.</p>
      )}
    </div>
  );
}

function RiskShieldMiniWidget() {
  const navigate = useNavigate();
  const { data: account } = useGetPropAccount();

  const startingBalance = account?.startingBalance ?? 0;
  const dailyLoss = account?.dailyLoss ?? 0;
  const maxDailyLossPct = account?.maxDailyLossPct ?? 2;
  const maxDrawdownPct = account?.maxTotalDrawdownPct ?? 10;
  const balance = account?.currentBalance ?? startingBalance;
  const dailyLossPct = startingBalance > 0 ? (dailyLoss / startingBalance) * 100 : 0;
  const totalDrawdownPct = startingBalance > 0 ? ((startingBalance - balance) / startingBalance) * 100 : 0;
  const hasData = startingBalance > 0;

  const dailyColor = dailyLossPct >= maxDailyLossPct ? "#EF4444" : dailyLossPct >= maxDailyLossPct * 0.75 ? "#F59E0B" : "#00C896";
  const drawdownColor = totalDrawdownPct >= maxDrawdownPct ? "#EF4444" : totalDrawdownPct >= maxDrawdownPct * 0.75 ? "#F59E0B" : "#00C896";

  const [accountSizeInput, setAccountSizeInput] = useState(
    startingBalance > 0 ? String(startingBalance) : ""
  );
  const [riskPctInput, setRiskPctInput] = useState("1");
  const [slPointsInput, setSlPointsInput] = useState("10");

  const acctSize = parseFloat(accountSizeInput) || 0;
  const riskPct = parseFloat(riskPctInput) || 1;
  const slPoints = parseFloat(slPointsInput) || 0;
  const dollarRisk = acctSize > 0 ? (acctSize * riskPct) / 100 : null;
  const contractCount = dollarRisk !== null && slPoints > 0 ? dollarRisk / slPoints : null;

  return (
    <div className="bg-card border border-red-500/20 rounded-2xl p-4">
      <WidgetHeader
        icon={Shield}
        title="Risk Shield"
        editLink="/risk-shield"
        editLabel="Full Shield ↗"
      />
      {hasData && (
        <div className="space-y-3 mb-4">
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Daily Loss</span>
              <span style={{ color: dailyColor }}>{dailyLossPct.toFixed(2)}% / {maxDailyLossPct}% limit</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min((dailyLossPct / maxDailyLossPct) * 100, 100)}%`, backgroundColor: dailyColor }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
              <span>Drawdown</span>
              <span style={{ color: drawdownColor }}>{totalDrawdownPct.toFixed(2)}% / {maxDrawdownPct}% limit</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min((totalDrawdownPct / maxDrawdownPct) * 100, 100)}%`, backgroundColor: drawdownColor }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Compact position sizer */}
      <div className="rounded-xl border border-border bg-secondary/30 p-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Quick Position Sizer</p>
        <div className="flex items-center gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <label className="text-[10px] text-muted-foreground block mb-1">Account ($)</label>
            <input
              type="number"
              value={accountSizeInput}
              onChange={(e) => setAccountSizeInput(e.target.value)}
              placeholder={startingBalance > 0 ? String(startingBalance) : "50000"}
              className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div style={{ width: 60 }}>
            <label className="text-[10px] text-muted-foreground block mb-1">Risk %</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              max="5"
              value={riskPctInput}
              onChange={(e) => setRiskPctInput(e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div style={{ width: 60 }}>
            <label className="text-[10px] text-muted-foreground block mb-1">SL (pts)</label>
            <input
              type="number"
              step="1"
              min="1"
              value={slPointsInput}
              onChange={(e) => setSlPointsInput(e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="10"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className={`flex items-center justify-between rounded-lg px-2.5 py-2 ${dollarRisk !== null ? "bg-primary/10 border border-primary/20" : "bg-card border border-border"}`}>
            <span className="text-[10px] text-muted-foreground">$ Risk</span>
            <span className="text-sm font-bold text-primary">
              {dollarRisk !== null ? `$${dollarRisk.toFixed(0)}` : "—"}
            </span>
          </div>
          <div className={`flex items-center justify-between rounded-lg px-2.5 py-2 ${contractCount !== null ? "bg-primary/10 border border-primary/20" : "bg-card border border-border"}`}>
            <span className="text-[10px] text-muted-foreground">Contracts</span>
            <span className="text-sm font-bold text-primary">
              {contractCount !== null ? (contractCount < 0.1 ? contractCount.toFixed(2) : contractCount.toFixed(1)) : "—"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickJournalWidget() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [recentNotes, setRecentNotes] = useState<QuickNote[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecentNotes(getQuickNotes().slice(0, 2));
  }, []);

  function handleLog() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const note: QuickNote = {
      id: `qn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: trimmed,
      timestamp: new Date().toISOString(),
    };
    saveQuickNote(note);
    setRecentNotes(getQuickNotes().slice(0, 2));
    setText("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    inputRef.current?.focus();
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <WidgetHeader
        icon={StickyNote}
        title="Quick Journal"
        editLink="/journal"
        editLabel="Open Journal ↗"
      />
      <div className="flex items-center gap-2 mb-3">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLog()}
          placeholder="Quick note for today..."
          className="flex-1 bg-secondary/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
          maxLength={500}
        />
        {saved ? (
          <span className="text-xs text-emerald-400 font-semibold whitespace-nowrap shrink-0">Saved ✓</span>
        ) : (
          <button
            onClick={handleLog}
            disabled={!text.trim()}
            className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
          >
            Log
          </button>
        )}
      </div>
      {recentNotes.length > 0 && (
        <div className="space-y-1.5">
          {recentNotes.map((note) => (
            <div key={note.id} className="flex items-start gap-2 text-[10px] text-muted-foreground">
              <span className="shrink-0 mt-0.5">·</span>
              <span className="line-clamp-1">{note.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatsTickerStrip() {
  const navigate = useNavigate();
  const { data: apiTrades } = useListTrades();
  const { streak } = useDailyStreak();

  const trades = (apiTrades || []) as Array<{
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
  const todayWinRate = todayCompleted.length > 0 ? Math.round((todayWins / todayCompleted.length) * 100) : null;

  const todayPnL = todayTrades.reduce((sum, t) => {
    const v = parseFloat(String(t.pnl ?? "0"));
    return sum + (isNaN(v) ? 0 : v);
  }, 0);

  const hasTodayTrades = todayTrades.length > 0;
  const pnlColor = todayPnL > 0 ? "text-emerald-400" : todayPnL < 0 ? "text-red-400" : "text-muted-foreground";

  const pills = [
    {
      label: "Today's P&L",
      value: hasTodayTrades ? `${todayPnL >= 0 ? "+" : ""}${todayPnL.toFixed(1)}R` : "—",
      color: hasTodayTrades ? pnlColor : "text-muted-foreground",
      bg: hasTodayTrades && todayPnL > 0 ? "bg-emerald-500/10 border-emerald-500/20" : hasTodayTrades && todayPnL < 0 ? "bg-red-500/10 border-red-500/20" : "bg-secondary border-border",
    },
    {
      label: "Win Rate",
      value: todayWinRate !== null ? `${todayWinRate}%` : "—",
      color: todayWinRate !== null && todayWinRate >= 50 ? "text-emerald-400" : todayWinRate !== null ? "text-amber-400" : "text-muted-foreground",
      bg: todayWinRate !== null && todayWinRate >= 50 ? "bg-emerald-500/10 border-emerald-500/20" : todayWinRate !== null ? "bg-amber-500/10 border-amber-500/20" : "bg-secondary border-border",
    },
    {
      label: "Trades",
      value: todayCompleted.length > 0 ? String(todayCompleted.length) : "—",
      color: "text-foreground",
      bg: "bg-secondary border-border",
    },
    {
      label: "Streak",
      value: `${streak}d`,
      color: streak >= 7 ? "text-red-400" : streak >= 3 ? "text-amber-400" : "text-muted-foreground",
      bg: streak >= 3 ? "bg-amber-500/10 border-amber-500/20" : "bg-secondary border-border",
    },
  ];

  return (
    <div className="flex items-center gap-2">
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide flex-1 min-w-0">
        {pills.map((pill) => (
          <div
            key={pill.label}
            className={`flex-shrink-0 flex items-center gap-2 border rounded-full px-3 py-1.5 ${pill.bg}`}
          >
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">{pill.label}</span>
            <span className={`text-xs font-bold whitespace-nowrap ${pill.color}`}>{pill.value}</span>
          </div>
        ))}
      </div>
      <button
        onClick={() => navigate("/analytics")}
        className="text-[10px] text-primary hover:text-primary/80 font-medium shrink-0 whitespace-nowrap transition-colors"
      >
        Analytics ↗
      </button>
    </div>
  );
}

function CustomizeDrawer({
  open,
  onClose,
  prefs,
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
  prefs: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Customize Dashboard</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Toggle widgets on or off</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="space-y-3">
          {DASHBOARD_WIDGETS.map((widget) => {
            const enabled = prefs[widget.id] !== false;
            return (
              <div key={widget.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-sm font-medium text-foreground">{widget.label}</span>
                <button
                  onClick={() => onToggle(widget.id)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                    enabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { tierLevel } = useAuth();
  const isFreeUser = tierLevel === 0;
  const { prefs, toggle, isEnabled } = useDashboardWidgets();
  const [showCustomize, setShowCustomize] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("dashboard-visited")) {
      localStorage.setItem("dashboard-visited", "true");
    }
  }, []);

  return (
    <>
      <CustomizeDrawer
        open={showCustomize}
        onClose={() => setShowCustomize(false)}
        prefs={prefs}
        onToggle={toggle}
      />
      <div className="max-w-6xl mx-auto p-4 md:p-6 pb-24">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <button
            onClick={() => setShowCustomize(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 border border-border rounded-xl px-3 py-2 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Customize
          </button>
        </div>

        <div className="space-y-4">
          <MorningBriefingWidget />
          {isEnabled("killzone") && <KillZoneStripWidget />}
          <CompactGreetingRow />
          {isEnabled("stats") && <StatsTickerStrip />}
          <SlotMachine />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {isEnabled("morningroutine") && <MorningRoutineWidget />}
            {isEnabled("checklist") && <PreTradeChecklistWidget />}
          </div>

          {isEnabled("tradeplan") && <TradePlanWidget />}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {isEnabled("riskshield") && <RiskShieldMiniWidget />}
            {isEnabled("quickjournal") && <QuickJournalWidget />}
          </div>

          {!isFreeUser && <AchievementBadges />}
        </div>

        {isFreeUser && (
          <div className="mt-4">
            <PremiumTeaser
              title="UNLOCK PREMIUM TOOLS"
              description="Upgrade to access the <strong>Smart Journal</strong> to log and analyze every trade, plus <strong>Analytics</strong> with performance charts, win-rate tracking, and AI-powered insights."
              buttonText="See Plans"
            />
          </div>
        )}
      </div>
    </>
  );
}
