import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp, Target, BarChart3, Shield,
  Sparkles,
  FileText, StickyNote, ClipboardCheck, CheckSquare, Square, ArrowRight,
  Calculator, Layers,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDailyStreak, AchievementBadges, PremiumTeaser } from "@/components/CasinoElements";
import { useListTrades } from "@workspace/api-client-react";

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

const TRADE_PLAN_CHIPS = [
  "Bullish bias",
  "Bearish bias",
  "Waiting for sweep",
  "Silver Bullet only",
  "No trade — red news",
  "Targeting NY Open",
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
    <div className="bg-gradient-to-b from-amber-500/5 to-card border border-amber-500/20 rounded-2xl p-6">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-amber-500" />
        <h3 className="text-base font-bold text-foreground">Today's Mission</h3>
        <span className="text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-bold">DAILY</span>
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
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-center animate-in fade-in slide-in-from-bottom-2 duration-500">
          <p className="text-sm font-medium text-foreground">
            <span className="text-amber-500 font-bold">Mission:</span> {results[0]} → {results[1]} → {results[2]}
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

function KillZoneStrip() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const est = getESTNow();
  const nowMins = est.getHours() * 60 + est.getMinutes();

  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide" style={{ height: 48 }}>
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
  );
}

function StatsTickerStrip() {
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
      label: "Login Streak",
      value: `${streak}d`,
      color: streak >= 7 ? "text-red-400" : streak >= 3 ? "text-amber-400" : "text-muted-foreground",
      bg: streak >= 3 ? "bg-amber-500/10 border-amber-500/20" : "bg-secondary border-border",
    },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
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
  );
}

function QuickJournalWidget() {
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleLog() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const note: QuickNote = {
      id: `qn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: trimmed,
      timestamp: new Date().toISOString(),
    };
    saveQuickNote(note);
    setText("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    inputRef.current?.focus();
  }

  return (
    <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2.5">
      <StickyNote className="h-4 w-4 text-amber-500 shrink-0" />
      <input
        ref={inputRef}
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleLog()}
        placeholder="Quick note for today..."
        className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none min-w-0"
        maxLength={500}
      />
      {saved ? (
        <span className="text-xs text-emerald-400 font-semibold whitespace-nowrap shrink-0">Saved ✓</span>
      ) : (
        <button
          onClick={handleLog}
          disabled={!text.trim()}
          className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1 rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
        >
          Log
        </button>
      )}
    </div>
  );
}

function TradePlanWidget() {
  const storageKey = "dashboard-trade-plan-" + new Date().toDateString();
  const [value, setValue] = useState(() => localStorage.getItem(storageKey) || "");

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    localStorage.setItem(storageKey, e.target.value);
  }

  function appendChip(phrase: string) {
    const sep = value && !value.endsWith(" ") && !value.endsWith("\n") ? " " : "";
    const next = value + sep + phrase + ". ";
    setValue(next);
    localStorage.setItem(storageKey, next);
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="text-base font-bold text-foreground">Today's Trade Plan</h3>
        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold ml-auto">DAILY</span>
      </div>
      <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 mb-3">
        {TRADE_PLAN_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => appendChip(chip)}
            className="flex-shrink-0 text-[11px] font-medium bg-secondary hover:bg-secondary/70 border border-border rounded-full px-2.5 py-1 text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
          >
            {chip}
          </button>
        ))}
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder="Write your trade plan for today — bias, key levels, sessions to watch, max risk..."
        rows={5}
        className="w-full bg-secondary/40 border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
      />
      <p className="text-[10px] text-muted-foreground mt-2">Auto-saved · Resets each day</p>
    </div>
  );
}

function NotesWidget() {
  const [value, setValue] = useState(() => localStorage.getItem("dashboard-notes") || "");

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    localStorage.setItem("dashboard-notes", e.target.value);
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <StickyNote className="h-5 w-5 text-amber-500" />
        <h3 className="text-base font-bold text-foreground">Notes</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">Scratch-pad</span>
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder="Quick notes, observations, reminders..."
        rows={4}
        className="w-full bg-secondary/40 border border-border rounded-xl p-3 text-sm text-foreground placeholder:text-muted-foreground/50 resize-none focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
      />
      <p className="text-[10px] text-muted-foreground mt-2">Auto-saved · Persists between sessions</p>
    </div>
  );
}

function PreTradeChecklistWidget() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => getChecklistState().checked);
  const [ttlAnchor, setTtlAnchor] = useState(() => getChecklistState().timestamp);
  const allChecked = CHECKLIST_ITEMS.every((item) => checked[item.id]);

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

  function reset() {
    setChecked({});
    setTtlAnchor(0);
    localStorage.removeItem(CHECKLIST_STORAGE_KEY);
  }

  const doneCount = Object.values(checked).filter(Boolean).length;

  return (
    <div className="bg-card border border-emerald-500/30 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <ClipboardCheck className="h-5 w-5 text-emerald-500" />
        <h3 className="text-base font-bold text-foreground">Pre-Trade Checklist</h3>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ml-auto ${allChecked ? "bg-emerald-500/20 text-emerald-400" : "bg-secondary text-muted-foreground"}`}>
          {doneCount}/{CHECKLIST_ITEMS.length}
        </span>
        <button onClick={reset} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
          Reset
        </button>
      </div>
      <div className="space-y-2">
        {CHECKLIST_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
              checked[item.id]
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-secondary/30 border-border hover:border-emerald-500/30"
            }`}
          >
            {checked[item.id]
              ? <CheckSquare className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              : <Square className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />}
            <div>
              <div className={`text-sm font-semibold ${checked[item.id] ? "text-emerald-400" : "text-foreground"}`}>
                {item.label}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
            </div>
          </button>
        ))}
      </div>
      <div className={`mt-3 rounded-xl border p-2.5 text-center text-xs font-bold transition-all ${
        allChecked
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          : "bg-secondary/30 border-border text-muted-foreground"
      }`}>
        {allChecked ? "✓ All criteria met — you're ready to trade" : `${doneCount} / ${CHECKLIST_ITEMS.length} criteria met`}
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">Resets after 4 hours · Synced with Risk Shield</p>
    </div>
  );
}

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface PropAccountData {
  startingBalance: number;
  currentBalance: number;
  dailyLoss: number;
  maxDailyLossPct: number;
  maxTotalDrawdownPct: number;
}

function RiskShieldMiniWidget() {
  const navigate = useNavigate();
  const [account, setAccount] = useState<PropAccountData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/prop/account`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => { if (data) setAccount(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const dailyLossPct = account && account.startingBalance > 0
    ? (account.dailyLoss / account.startingBalance) * 100
    : null;
  const drawdownPct = account && account.startingBalance > 0
    ? ((account.startingBalance - account.currentBalance) / account.startingBalance) * 100
    : null;
  const dailyPnL = account ? -account.dailyLoss : null;

  const pnlColor = dailyPnL === null ? "text-muted-foreground" : dailyPnL >= 0 ? "text-emerald-400" : "text-red-400";
  const drawdownColor = drawdownPct === null ? "text-muted-foreground"
    : drawdownPct < (account?.maxTotalDrawdownPct ?? 10) * 0.5 ? "text-emerald-400"
    : drawdownPct < (account?.maxTotalDrawdownPct ?? 10) * 0.75 ? "text-amber-400"
    : "text-red-400";

  return (
    <div className="bg-card border border-red-500/20 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-red-500" />
        <h3 className="text-base font-bold text-foreground">Risk Shield</h3>
        <button
          onClick={() => navigate("/risk-shield")}
          className="ml-auto text-[10px] text-primary hover:underline font-medium"
        >
          Open full view →
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-4">
          <div className="h-5 w-5 border-2 border-border border-t-primary rounded-full animate-spin" />
        </div>
      ) : account ? (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-secondary/40 rounded-xl p-3 text-center">
              <TrendingUp className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Daily P&L</p>
              <p className={`text-lg font-bold ${pnlColor}`}>
                {dailyPnL === null ? "—" : `${dailyPnL >= 0 ? "+" : ""}$${Math.abs(dailyPnL).toFixed(0)}`}
              </p>
            </div>
            <div className="bg-secondary/40 rounded-xl p-3 text-center">
              <BarChart3 className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Drawdown</p>
              <p className={`text-lg font-bold ${drawdownColor}`}>
                {drawdownPct === null ? "—" : `${drawdownPct.toFixed(1)}%`}
              </p>
            </div>
          </div>
          {dailyLossPct !== null && account && (
            <div className="mb-3">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Daily loss used</span>
                <span>{dailyLossPct.toFixed(1)}% / {account.maxDailyLossPct}% limit</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min((dailyLossPct / account.maxDailyLossPct) * 100, 100)}%`,
                    backgroundColor: dailyLossPct >= account.maxDailyLossPct ? "#EF4444" : dailyLossPct >= account.maxDailyLossPct * 0.75 ? "#F59E0B" : "#00C896",
                  }}
                />
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-2 mb-3">
          Set up your account in Risk Shield to track P&L and drawdown here.
        </p>
      )}

      <button
        onClick={() => navigate("/risk-shield")}
        className="w-full flex items-center justify-center gap-2 bg-secondary/60 hover:bg-secondary border border-border rounded-xl py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <Calculator className="h-4 w-4" />
        Position Size Calculator
      </button>
    </div>
  );
}

function SwipeModeCard() {
  const navigate = useNavigate();

  return (
    <div
      className="relative overflow-hidden bg-gradient-to-br from-primary/15 via-primary/5 to-card border border-primary/30 rounded-2xl p-6 cursor-pointer group hover:border-primary/50 transition-all"
      onClick={() => navigate("/academy?swipe=1")}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl" />
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 bg-primary/20 rounded-2xl flex items-center justify-center group-hover:bg-primary/30 transition-colors">
          <Layers className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h3 className="text-base font-bold text-foreground">Swipe Mode</h3>
          <p className="text-xs text-muted-foreground">ICT Academy flashcards</p>
        </div>
        <ArrowRight className="h-5 w-5 text-primary ml-auto group-hover:translate-x-1 transition-transform" />
      </div>
      <p className="text-sm text-foreground/70">
        Review ICT concepts in a quick swipe format. Perfect for daily review before your session.
      </p>
    </div>
  );
}

const WIDGET_DEFS = [
  { id: "mascot", label: "Mascot Greeting" },
  { id: "slotmachine", label: "Daily Mission" },
  { id: "sessions", label: "Market Sessions Clock" },
  { id: "tradeplan", label: "Today's Trade Plan" },
  { id: "notes", label: "Notes Scratch-pad" },
  { id: "checklist", label: "Pre-Trade Checklist" },
  { id: "riskshield", label: "Risk Shield Mini-widget" },
  { id: "swipemode", label: "Start Swipe Mode" },
  { id: "achievements", label: "Achievement Badges" },
] as const;

type WidgetId = typeof WIDGET_DEFS[number]["id"];

const DEFAULT_VISIBLE: Record<WidgetId, boolean> = {
  mascot: true,
  slotmachine: true,
  sessions: true,
  tradeplan: true,
  notes: true,
  checklist: true,
  riskshield: true,
  swipemode: true,
  achievements: true,
};

function loadWidgetPrefs(): Record<WidgetId, boolean> {
  try {
    const raw = localStorage.getItem("dashboard-widget-prefs-v2");
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Record<WidgetId, boolean>>;
      return { ...DEFAULT_VISIBLE, ...parsed };
    }
  } catch {}
  return { ...DEFAULT_VISIBLE };
}

export default function Dashboard() {
  const { tierLevel } = useAuth();
  const isFreeUser = tierLevel === 0;
  const [widgetPrefs, setWidgetPrefs] = useState<Record<WidgetId, boolean>>(loadWidgetPrefs);

  useEffect(() => {
    if (!localStorage.getItem("dashboard-visited")) {
      localStorage.setItem("dashboard-visited", "true");
    }
  }, []);

  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === "dashboard-widget-prefs-v2") {
        setWidgetPrefs(loadWidgetPrefs());
      }
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const visible = widgetPrefs;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-4 pb-24">
      <KillZoneStrip />

      {visible.mascot && <CompactGreetingRow />}

      <StatsTickerStrip />

      <QuickJournalWidget />

      {visible.slotmachine && <SlotMachine />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visible.tradeplan && <TradePlanWidget />}
        {visible.notes && <NotesWidget />}
      </div>

      {visible.checklist && <PreTradeChecklistWidget />}
      {visible.riskshield && <RiskShieldMiniWidget />}
      {visible.swipemode && <SwipeModeCard />}
      {visible.achievements && !isFreeUser && <AchievementBadges />}

      {isFreeUser && (
        <PremiumTeaser
          title="UNLOCK PREMIUM TOOLS"
          description="Upgrade to access the <strong>Smart Journal</strong> to log and analyze every trade, plus <strong>Analytics</strong> with performance charts, win-rate tracking, and AI-powered insights."
          buttonText="See Plans"
        />
      )}
    </div>
  );
}
