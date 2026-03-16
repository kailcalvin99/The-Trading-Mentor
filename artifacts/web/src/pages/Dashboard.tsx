import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Flame, Star, Trophy, Zap, Crown, TrendingUp, Lock, Gift,
  ArrowRight, Clock, Target, BookOpen, BarChart3, Shield,
  Calendar, GraduationCap, Sparkles,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { SpinWheel, DailyStreak, AchievementBadges, PremiumTeaser } from "@/components/CasinoElements";

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

const QUICK_REF = [
  { term: "FVG", def: "Fair Value Gap — price imbalance left by a fast move", cat: "Structure", back: "3-candle pattern: look for the gap between candle 1 and candle 3", catColor: "bg-blue-500/20 text-blue-400" },
  { term: "OB", def: "Order Block — last candle before a strong move", cat: "Entry", back: "The last down-candle before a big up-move (or vice versa)", catColor: "bg-green-500/20 text-green-400" },
  { term: "Kill Zone", def: "High-probability trading time window", cat: "Timing", back: "London: 2-5AM, NY: 9:30-10AM, Silver Bullet: 10-11AM EST", catColor: "bg-amber-500/20 text-amber-400" },
  { term: "Liquidity", def: "Stop-hunt levels above swing highs/lows", cat: "Smart Money", back: "Equal highs = buyside liquidity, Equal lows = sellside liquidity", catColor: "bg-purple-500/20 text-purple-400" },
  { term: "NWOG", def: "New Week Opening Gap — Fri close to Sun open", cat: "Gap", back: "Price often fills this gap early in the week", catColor: "bg-cyan-500/20 text-cyan-400" },
  { term: "MSS", def: "Market Structure Shift — first sign trend is changing", cat: "Trend", back: "Break of the most recent swing high/low on your timeframe", catColor: "bg-red-500/20 text-red-400" },
  { term: "PD Array", def: "Premium/Discount — buy at discount, sell at premium", cat: "Price", back: "Above 50% of range = premium (sell), below = discount (buy)", catColor: "bg-orange-500/20 text-orange-400" },
  { term: "CISD", def: "Change in State of Delivery — candle that flips order flow", cat: "Reversal", back: "The specific candle where price commits to a new direction", catColor: "bg-pink-500/20 text-pink-400" },
  { term: "HTF", def: "Higher Time Frame — used for directional bias", cat: "Timeframe", back: "Daily/Weekly chart tells you the direction; 5m/15m for entries", catColor: "bg-amber-500/20 text-amber-400" },
  { term: "Silver Bullet", def: "10-11 AM EST high-probability ICT window", cat: "Timing", back: "After NY Open liquidity sweep, look for FVG inside this hour", catColor: "bg-amber-500/20 text-amber-400" },
  { term: "Buyside Liq.", def: "Stop losses above equal highs — market hunts these", cat: "Smart Money", back: "Retail puts stops above equal highs; smart money sweeps them", catColor: "bg-purple-500/20 text-purple-400" },
  { term: "Sellside Liq.", def: "Stop losses below equal lows — market hunts these", cat: "Smart Money", back: "Retail puts stops below equal lows; smart money sweeps them", catColor: "bg-purple-500/20 text-purple-400" },
];

function getESTNow(): Date {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + -5 * 3600000);
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

function GamifiedStatusRow() {
  const xp = parseInt(localStorage.getItem("total_xp") || "0");
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;
  const rankIdx = Math.min(Math.floor((level - 1) / 2), RANKS.length - 1);
  const rank = RANKS[rankIdx];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Star className="h-5 w-5 text-primary" />
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Level {level}</span>
        </div>
        <p className="text-lg font-bold text-foreground">{rank}</p>
        <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-1000"
            style={{ width: `${xpInLevel}%` }}
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-1">{xpInLevel}/100 XP to next level</p>
      </div>

      <DailyStreak />
      <AchievementBadges />
    </div>
  );
}

function DailySpinSection() {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const handler = () => {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    };
    window.addEventListener("spin-complete", handler);
    return () => window.removeEventListener("spin-complete", handler);
  }, []);

  return (
    <div className="bg-card border border-border rounded-2xl p-6 relative overflow-hidden">
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-10">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute animate-confetti-fall"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 0.5}s`,
                animationDuration: `${1 + Math.random() * 1.5}s`,
                backgroundColor: ["#00C896", "#FFD700", "#818CF8", "#EF4444", "#06B6D4"][i % 5],
                width: `${6 + Math.random() * 6}px`,
                height: `${6 + Math.random() * 6}px`,
                borderRadius: Math.random() > 0.5 ? "50%" : "2px",
              }}
            />
          ))}
          <style>{`
            @keyframes confettiFall {
              0% { top: -10%; opacity: 1; transform: rotate(0deg) scale(1); }
              100% { top: 110%; opacity: 0; transform: rotate(720deg) scale(0.3); }
            }
            .animate-confetti-fall { animation: confettiFall 2s ease-out forwards; }
          `}</style>
        </div>
      )}
      <div className="flex items-center gap-2 mb-4">
        <Gift className="h-5 w-5 text-primary" />
        <h3 className="text-base font-bold text-foreground">Daily Tip Wheel — Spin for Today's Insight</h3>
      </div>
      <div className="flex justify-center" style={{ minHeight: 220 }}>
        <SpinWheel size={200} />
      </div>
    </div>
  );
}

function SlotMachine() {
  const [spinning, setSpinning] = useState(true);
  const [results, setResults] = useState<string[]>(["", "", ""]);
  const seed = dateSeed();

  useEffect(() => {
    const r1 = SLOT_SESSIONS[seed % SLOT_SESSIONS.length];
    const r2 = SLOT_ACTIONS[Math.floor(seed / 7) % SLOT_ACTIONS.length];
    const r3 = SLOT_GOALS[Math.floor(seed / 13) % SLOT_GOALS.length];

    const timer = setTimeout(() => {
      setResults([r1, r2, r3]);
      setSpinning(false);
    }, 2200);
    return () => clearTimeout(timer);
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
              {spinning ? (
                <div className="animate-slot-spin">
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

      {!spinning && (
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
          animation: slotSpin 0.3s linear infinite;
        }
      `}</style>
    </div>
  );
}

function FlipCard({ term, def, cat, back, catColor }: typeof QUICK_REF[0]) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="cursor-pointer group"
      style={{ perspective: "800px" }}
      onClick={() => setFlipped(!flipped)}
    >
      <div
        className="relative transition-transform duration-500"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        <div
          className="bg-card border border-border rounded-xl p-4 border-l-4 border-l-primary/50"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${catColor}`}>{cat}</span>
            <span className="text-[10px] text-muted-foreground">tap to flip</span>
          </div>
          <p className="text-base font-bold text-foreground">{term}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{def}</p>
        </div>

        <div
          className="absolute inset-0 bg-primary/5 border border-primary/20 rounded-xl p-4 flex flex-col justify-center"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <p className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">How to use it</p>
          <p className="text-sm text-foreground/80">{back}</p>
        </div>
      </div>
    </div>
  );
}

function QuickReference() {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="h-5 w-5 text-primary" />
        <h3 className="text-base font-bold text-foreground">ICT Quick Reference</h3>
        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">{QUICK_REF.length} terms</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {QUICK_REF.map((item) => (
          <FlipCard key={item.term} {...item} />
        ))}
      </div>
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
                  className={`w-2.5 h-2.5 rounded-full ${
                    isLive ? "animate-pulse" : ""
                  }`}
                  style={{ backgroundColor: isLive ? session.color : isNear ? "#F59E0B" : isEnded ? "#555" : "#555" }}
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

function DashboardPremiumTeaser() {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-primary/5 to-purple-500/10 border border-amber-500/20 rounded-xl p-5">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
      <div className="flex items-center gap-2 mb-3">
        <Crown className="h-5 w-5 text-amber-500" />
        <h3 className="text-sm font-bold text-amber-500">UNLOCK PREMIUM TOOLS</h3>
      </div>
      <p className="text-sm text-foreground/80 mb-3">
        Upgrade to access the <strong>Smart Journal</strong> to log and analyze every trade,
        plus <strong>Analytics</strong> with performance charts, win-rate tracking, and AI-powered insights.
      </p>
      <button
        onClick={() => navigate("/pricing")}
        className="px-5 py-2 bg-amber-500 text-black font-bold rounded-lg text-sm hover:bg-amber-400 transition-colors"
      >
        See Plans
      </button>
    </div>
  );
}

function QuickNavCards() {
  const { tierLevel } = useAuth();
  const navigate = useNavigate();
  const cards = [
    { to: "/academy", label: "ICT Academy", desc: "39 lessons from zero to pro", icon: GraduationCap, color: "#818CF8", tier: 0 },
    { to: "/planner", label: "Daily Planner", desc: "Morning routine & session timers", icon: Calendar, color: "#00C896", tier: 0 },
    { to: "/risk-shield", label: "Risk Shield", desc: "Track drawdowns & position size", icon: Shield, color: "#EF4444", tier: 1 },
    { to: "/journal", label: "Smart Journal", desc: "Log trades & track win rate", icon: BookOpen, color: "#F59E0B", tier: 2 },
    { to: "/analytics", label: "Analytics", desc: "Performance charts & insights", icon: BarChart3, color: "#06B6D4", tier: 2 },
  ];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <ArrowRight className="h-5 w-5 text-primary" />
        <h3 className="text-base font-bold text-foreground">Jump To</h3>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cards.map((card) => {
          const locked = card.tier > tierLevel;
          return (
            <button
              key={card.to}
              onClick={() => !locked && navigate(card.to)}
              className={`relative text-left bg-card border border-border rounded-xl p-4 transition-all ${
                locked ? "opacity-40 cursor-not-allowed" : "hover:border-primary/30 hover:bg-primary/5 cursor-pointer"
              }`}
            >
              <card.icon className="h-8 w-8 mb-2" style={{ color: card.color }} />
              <p className="text-sm font-bold text-foreground">{card.label}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{card.desc}</p>
              {locked && <Lock className="h-4 w-4 absolute top-3 right-3 text-muted-foreground" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { tierLevel } = useAuth();
  const isFreeUser = tierLevel === 0;

  useEffect(() => {
    if (!localStorage.getItem("dashboard-visited")) {
      localStorage.setItem("dashboard-visited", "true");
    }
  }, []);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 pb-24">
      <IctMascot />
      <GamifiedStatusRow />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailySpinSection />
        <SlotMachine />
      </div>

      <SessionsLiveBoard />
      <QuickReference />
      <AchievementBadges />
      {isFreeUser && <DashboardPremiumTeaser />}
      <QuickNavCards />
    </div>
  );
}
