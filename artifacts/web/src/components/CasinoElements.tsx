import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { Crown, Flame, Star, Trophy, Zap, Gift, Lock, TrendingUp, ArrowRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DAILY_TIPS = [
  "Always wait for the liquidity sweep before entering!",
  "The best setups happen at session opens - be ready!",
  "Never risk more than 1% on a single trade.",
  "FVGs are your best friend - learn to spot them!",
  "Patience is the most profitable trading skill.",
  "Check the daily bias BEFORE looking at charts.",
  "Silver Bullet window (10-11 AM) has the highest probability.",
  "If you missed the move, DON'T chase it!",
  "Your journal is your most powerful trading tool.",
  "3 green days in a row? Time for a rest day.",
  "The market rewards discipline, not aggression.",
  "Always trade with the trend - the trend is your friend.",
];

const PREMIUM_TIPS = [
  "Use Order Blocks as your primary entry model.",
  "Look for displacement + FVG for the highest probability.",
  "ICT Kill Zones are where institutional money flows.",
  "Market Structure Shift confirms the change in direction.",
  "Use the NWOG/NDOG for daily bias confirmation.",
];

export function DailyStreak() {
  const [streak, setStreak] = useState(0);
  const [xp, setXp] = useState(0);
  const [showXpPopup, setShowXpPopup] = useState(false);

  useEffect(() => {
    const lastLogin = localStorage.getItem("last_login_date");
    const savedStreak = parseInt(localStorage.getItem("login_streak") || "0");
    const savedXp = parseInt(localStorage.getItem("total_xp") || "0");
    const today = new Date().toDateString();

    if (lastLogin !== today) {
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      const newStreak = lastLogin === yesterday ? savedStreak + 1 : 1;
      const xpGain = Math.min(newStreak * 10, 100);

      setStreak(newStreak);
      setXp(savedXp + xpGain);
      localStorage.setItem("last_login_date", today);
      localStorage.setItem("login_streak", String(newStreak));
      localStorage.setItem("total_xp", String(savedXp + xpGain));

      setTimeout(() => {
        setShowXpPopup(true);
        setTimeout(() => setShowXpPopup(false), 3000);
      }, 500);
    } else {
      setStreak(savedStreak);
      setXp(savedXp);
    }
  }, []);

  return (
    <div className="relative">
      <div className="bg-gradient-to-r from-amber-500/10 to-red-500/10 border border-amber-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Flame className={`h-8 w-8 ${streak >= 7 ? "text-red-500" : streak >= 3 ? "text-amber-500" : "text-amber-400"}`} />
              {streak >= 3 && (
                <div className="absolute -top-1 -right-1 bg-amber-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {streak}
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                {streak} Day Streak! <Flame className="h-3 w-3 inline text-amber-500" />
              </p>
              <p className="text-xs text-muted-foreground">Keep logging in daily to earn XP</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-amber-500">{xp} XP</p>
            <div className="flex gap-0.5 mt-1">
              {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                <div
                  key={d}
                  className={`w-3 h-3 rounded-sm ${d <= streak ? "bg-amber-500" : "bg-muted"}`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {showXpPopup && (
        <div className="absolute -top-8 right-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-amber-500 text-white text-sm font-bold px-3 py-1 rounded-full shadow-lg">
            +{Math.min(streak * 10, 100)} XP!
          </div>
        </div>
      )}
    </div>
  );
}

export function SpinWheel() {
  const { isFeatureEnabled } = useAppConfig();
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [canSpin, setCanSpin] = useState(true);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    const lastSpin = localStorage.getItem("last_spin_date");
    const today = new Date().toDateString();
    if (lastSpin === today) {
      setCanSpin(false);
      setResult(localStorage.getItem("spin_result") || null);
    }
  }, []);

  const spin = useCallback(() => {
    if (!canSpin || spinning) return;
    setSpinning(true);
    setResult(null);

    const randomIdx = Math.floor(Math.random() * DAILY_TIPS.length);
    const newRotation = rotation + 720 + (randomIdx * (360 / DAILY_TIPS.length));
    setRotation(newRotation);

    setTimeout(() => {
      const tip = DAILY_TIPS[randomIdx];
      setResult(tip);
      setSpinning(false);
      setCanSpin(false);
      localStorage.setItem("last_spin_date", new Date().toDateString());
      localStorage.setItem("spin_result", tip);
    }, 3000);
  }, [canSpin, spinning, rotation]);

  if (!isFeatureEnabled("feature_daily_spin")) {
    return null;
  }

  return (
    <div className="bg-gradient-to-b from-primary/5 to-card border border-primary/20 rounded-xl p-5 text-center">
      <div className="flex items-center justify-center gap-2 mb-3">
        <Gift className="h-5 w-5 text-primary" />
        <h3 className="text-sm font-bold text-foreground">Daily Trading Tip</h3>
      </div>

      <div className="relative w-32 h-32 mx-auto mb-4">
        <div
          className="w-full h-full rounded-full border-4 border-primary/30 flex items-center justify-center transition-transform ease-out"
          style={{
            transform: `rotate(${rotation}deg)`,
            transitionDuration: spinning ? "3s" : "0s",
            background: "conic-gradient(from 0deg, hsl(var(--primary) / 0.1), hsl(var(--primary) / 0.2), hsl(var(--primary) / 0.05), hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.1))",
          }}
        >
          <Star className={`h-8 w-8 text-primary ${spinning ? "animate-pulse" : ""}`} />
        </div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-3 h-3 bg-primary rotate-45" />
      </div>

      {result ? (
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 mb-3">
          <p className="text-sm text-foreground font-medium">{result}</p>
        </div>
      ) : (
        <button
          onClick={spin}
          disabled={!canSpin || spinning}
          className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
            canSpin
              ? "bg-primary text-primary-foreground hover:opacity-90 animate-pulse"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {spinning ? "Spinning..." : canSpin ? "SPIN NOW!" : "Come back tomorrow!"}
        </button>
      )}
    </div>
  );
}

export function AchievementBadges() {
  const achievements = [
    { name: "First Login", icon: Star, earned: true, color: "text-amber-500" },
    { name: "Academy Started", icon: Zap, earned: true, color: "text-blue-400" },
    { name: "3-Day Streak", icon: Flame, earned: parseInt(localStorage.getItem("login_streak") || "0") >= 3, color: "text-red-500" },
    { name: "Quiz Master", icon: Trophy, earned: localStorage.getItem("ict-academy-unlocked") === "true", color: "text-purple-400" },
    { name: "Trading Pro", icon: TrendingUp, earned: false, color: "text-primary", locked: true },
    { name: "Legend", icon: Crown, earned: false, color: "text-amber-400", locked: true },
  ];

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-5 w-5 text-amber-500" />
        <h3 className="text-sm font-bold text-foreground">Achievements</h3>
        <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
          {achievements.filter((a) => a.earned).length}/{achievements.length}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {achievements.map((a) => (
          <div
            key={a.name}
            className={`relative flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
              a.earned
                ? "bg-primary/5 border-primary/20"
                : "bg-muted/30 border-border opacity-50"
            }`}
          >
            <a.icon className={`h-6 w-6 ${a.earned ? a.color : "text-muted-foreground"}`} />
            <span className="text-[10px] font-medium text-center text-foreground/70">{a.name}</span>
            {a.locked && (
              <Lock className="h-3 w-3 absolute top-1 right-1 text-muted-foreground" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export function PremiumTeaser() {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-primary/5 to-purple-500/10 border border-amber-500/20 rounded-xl p-5">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />

      <div className="flex items-center gap-2 mb-3">
        <Crown className="h-5 w-5 text-amber-500" />
        <h3 className="text-sm font-bold text-amber-500">PREMIUM INSIGHTS</h3>
      </div>

      <div className="space-y-2 mb-4">
        {PREMIUM_TIPS.slice(0, 3).map((tip, i) => (
          <div key={i} className="relative">
            <p className="text-xs text-foreground/80 select-none" style={{ filter: "blur(4px)" }}>
              {tip}
            </p>
            {i === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Lock className="h-4 w-4 text-amber-500" />
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate("/pricing")}
        className="w-full bg-gradient-to-r from-amber-500 to-primary text-white font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all animate-pulse"
      >
        Unlock Premium Tips
        <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export function LockedFeatureOverlay({ featureName, tierRequired }: { featureName: string; tierRequired: string }) {
  const navigate = useNavigate();

  return (
    <div className="absolute inset-0 z-40 bg-background/80 backdrop-blur-sm flex items-center justify-center">
      <div className="text-center max-w-sm px-6">
        <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock className="h-8 w-8 text-amber-500" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">{featureName} is Locked</h3>
        <p className="text-sm text-muted-foreground mb-6">
          Upgrade to <span className="text-amber-500 font-bold">{tierRequired}</span> to unlock this feature and take your trading to the next level.
        </p>
        <button
          onClick={() => navigate("/pricing")}
          className="bg-gradient-to-r from-amber-500 to-primary text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-all flex items-center gap-2 mx-auto"
        >
          <Crown className="h-4 w-4" />
          Upgrade Now
        </button>
      </div>
    </div>
  );
}

export function SpinWheelFloatingTrigger({ hasSidebar = false }: { hasSidebar?: boolean }) {
  const { isFeatureEnabled } = useAppConfig();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!hasSidebar || !open) return;
    const mq = window.matchMedia("(min-width: 1280px)");
    const handler = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [hasSidebar, open]);

  if (!isFeatureEnabled("feature_daily_spin")) {
    return null;
  }

  const hideClass = hasSidebar ? "xl:hidden" : "";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`${hideClass} fixed bottom-20 md:bottom-6 right-4 z-40 bg-primary text-primary-foreground rounded-full p-3 shadow-lg hover:opacity-90 transition-all animate-pulse`}
        aria-label="Daily Spin Wheel"
      >
        <Gift className="h-5 w-5" />
      </button>

      {open && (
        <div className={`${hideClass} fixed inset-0 z-50 flex items-center justify-center`}>
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full z-10">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <SpinWheel />
          </div>
        </div>
      )}
    </>
  );
}

export function FreeSidebar() {
  return (
    <div className="space-y-4 p-4">
      <DailyStreak />
      <SpinWheel />
      <AchievementBadges />
      <PremiumTeaser />
    </div>
  );
}
