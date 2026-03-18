import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Flame, Star, Trophy, TrendingUp, Clock, Target, BarChart3, Shield,
  Sparkles, HelpCircle,
  FileText, StickyNote, ClipboardCheck, CheckSquare, Square, ArrowRight,
  Calculator, Layers,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDailyStreak, AchievementBadges, PremiumTeaser } from "@/components/CasinoElements";
import { useTourGuideContext } from "@/contexts/TourGuideContext";

const MASCOT_TIPS = [
  "Always wait for the liquidity sweep before entering!",
  "The best setups happen at session opens — be ready!",
  "Never risk more than 1% on a single trade.",
  "FVGs are your best friend — learn to spot them!",
  "Patience is the most profitable trading skill.",
  "Check the daily bias BEFORE looking at charts.",
  "Silver Bullet window (10-11 AM) has the highest probability.",
  "If you missed the move, DON'T chase it!",
  "Your journal is your most powerful trading tool.",
  "3 green days in a row? Time for a rest day.",
  "The market rewards discipline, not aggression.",
  "Always trade with the trend — the trend is your friend.",
];

const RANKS = ["Apprentice", "Student", "Trader", "Pro", "Master", "ICT Legend"];

const SESSIONS = [
  { name: "Asian", emoji: "🌏", startH: 20, startM: 0, endH: 24, endM: 0, color: "#818CF8", tip: "Low volatility — range-bound" },
  { name: "London", emoji: "🌍", startH: 2, startM: 0, endH: 5, endM: 0, color: "#F59E0B", tip: "Trend starts here" },
  { name: "NY Open", emoji: "📈", startH: 9, startM: 30, endH: 10, endM: 0, color: "#00C896", tip: "Main move begins" },
  { name: "Silver Bullet", emoji: "🎯", startH: 10, startM: 0, endH: 11, endM: 0, color: "#EF4444", tip: "Highest probability" },
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

function IctMascot() {
  const { user } = useAuth();
  const [tipIdx, setTipIdx] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const firstName = user?.name?.split(" ")[0] || "Trader";

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setTipIdx((i) => (i + 1) % MASCOT_TIPS.length);
        setFadeIn(true);
      }, 400);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative bg-gradient-to-br from-primary/10 via-card to-primary/5 border border-primary/20 rounded-2xl p-6 overflow-hidden">
      <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />

      <div className="flex items-start gap-5">
        <div className="relative shrink-0">
          <div
            className="text-6xl select-none"
            style={{
              filter: "drop-shadow(0 0 20px hsl(165 100% 39% / 0.5))",
              animation: "mascotBob 3s ease-in-out infinite",
            }}
          >
            🤖
          </div>
          <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground text-[8px] font-bold px-1.5 py-0.5 rounded-full">
            ICT
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-foreground mb-1">
            Hey {firstName}, ready to trade today?
          </h2>
          <div className="relative bg-card/60 border border-border rounded-xl p-3 mt-2">
            <div className="absolute -left-2 top-3 w-3 h-3 bg-card/60 border-l border-b border-border rotate-45" />
            <div className="flex items-start gap-2">
              <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p
                className={`text-sm text-foreground/80 transition-opacity duration-300 ${fadeIn ? "opacity-100" : "opacity-0"}`}
              >
                {MASCOT_TIPS[tipIdx]}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes mascotBob {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  );
}

function GamificationHeaderBadges({ startTour }: { startTour: () => void }) {
  const { streak, xp } = useDailyStreak();
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;
  const rankIdx = Math.min(Math.floor((level - 1) / 2), RANKS.length - 1);
  const rank = RANKS[rankIdx];

  const badgeChecks = [
    true, true,
    streak >= 3,
    localStorage.getItem("dashboard-visited") === "true",
    streak >= 7,
    localStorage.getItem("ict-academy-unlocked") === "true",
    false, false,
  ];
  const earned = badgeChecks.filter(Boolean).length;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5" title={`Level ${level} — ${rank} · ${xpInLevel}/100 XP`}>
        <Star className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-bold text-foreground">Lv {level}</span>
        <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${xpInLevel}%` }} />
        </div>
      </div>

      <div
        className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5"
        title={`${streak}-day login streak`}
      >
        <Flame className={`h-3.5 w-3.5 ${streak >= 7 ? "text-red-500" : streak >= 3 ? "text-amber-500" : "text-amber-400"}`} />
        <span className="text-xs font-bold text-foreground">{streak}d</span>
      </div>

      <div
        className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5"
        title={`${earned}/${badgeChecks.length} badges earned`}
      >
        <Trophy className="h-3.5 w-3.5 text-amber-500" />
        <span className="text-xs font-bold text-foreground">{earned}/{badgeChecks.length}</span>
      </div>

      <button
        onClick={startTour}
        className="flex items-center gap-1.5 bg-card border border-border rounded-full px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
        title="Restart guided tour"
      >
        <HelpCircle className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">Tour</span>
      </button>
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

function SessionsLiveBoard() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const est = getESTNow();
  const nowMins = est.getHours() * 60 + est.getMinutes();

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Clock className="h-5 w-5 text-primary" />
        <h3 className="text-base font-bold text-foreground">Market Sessions</h3>
        <span className="text-xs text-muted-foreground">
          {est.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })} EST
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
              className={`bg-card border rounded-xl p-4 transition-all ${
                isLive ? "border-2" : "border-border"
              }`}
              style={isLive ? { borderColor: session.color } : undefined}
            >
              <div className="flex items-center gap-2 mb-2">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${isLive ? "animate-pulse" : ""}`}
                  style={{ backgroundColor: isLive ? session.color : isNear ? "#F59E0B" : "#555" }}
                />
                <span className="text-sm font-bold text-foreground">{session.emoji} {session.name}</span>
              </div>
              <p className="text-[11px] text-muted-foreground mb-2">{session.tip}</p>
              {isLive ? (
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: `${session.color}20`, color: session.color }}
                >
                  LIVE NOW
                </span>
              ) : isEnded ? (
                <span className="text-xs text-muted-foreground font-medium">Ended</span>
              ) : (
                <span className={`text-xs font-medium ${isNear ? "text-amber-400" : "text-muted-foreground"}`}>
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

function TradePlanWidget() {
  const storageKey = "dashboard-trade-plan-" + new Date().toDateString();
  const [value, setValue] = useState(() => localStorage.getItem(storageKey) || "");

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    localStorage.setItem(storageKey, e.target.value);
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="text-base font-bold text-foreground">Today's Trade Plan</h3>
        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold ml-auto">DAILY</span>
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
  const { startTour } = useTourGuideContext();
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
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1 min-w-0">
          {visible.mascot && <IctMascot />}
        </div>
      </div>

      <GamificationHeaderBadges startTour={startTour} />

      {visible.slotmachine && <SlotMachine />}
      {visible.sessions && <SessionsLiveBoard />}

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
