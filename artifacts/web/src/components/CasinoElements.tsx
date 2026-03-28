import { useState, useEffect } from "react";
import { Crown, Flame, Star, Trophy, Zap, Lock, TrendingUp, ArrowRight, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

const PREMIUM_TIPS = [
  "Use Order Blocks as your primary entry model.",
  "Look for displacement + FVG for the highest probability.",
  "ICT Kill Zones are where institutional money flows.",
  "Market Structure Shift confirms the change in direction.",
  "Use the NWOG/NDOG for daily bias confirmation.",
];

export function useDailyStreak() {
  const [streak, setStreak] = useState(parseInt(localStorage.getItem("login_streak") || "0"));
  const [xp, setXp] = useState(parseInt(localStorage.getItem("total_xp") || "0"));
  const [xpGained, setXpGained] = useState(0);

  useEffect(() => {
    (async () => {
      let savedStreak = parseInt(localStorage.getItem("login_streak") || "0");
      let savedXp = parseInt(localStorage.getItem("total_xp") || "0");
      let lastLogin = localStorage.getItem("last_login_date");

      try {
        const res = await fetch("/api/user-settings", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          if (data.gamification) {
            const g = data.gamification;
            if (g.totalXp > savedXp) savedXp = g.totalXp;
            if (g.loginStreak > savedStreak) savedStreak = g.loginStreak;
            if (g.lastLoginDate) lastLogin = g.lastLoginDate;
          }
        }
      } catch {}

      const today = new Date().toISOString().split("T")[0];

      if (lastLogin !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        const newStreak = lastLogin === yesterday ? savedStreak + 1 : 1;
        const gain = Math.min(newStreak * 10, 100);
        const newXp = savedXp + gain;

        setStreak(newStreak);
        setXp(newXp);
        setXpGained(gain);
        localStorage.setItem("last_login_date", today);
        localStorage.setItem("login_streak", String(newStreak));
        localStorage.setItem("total_xp", String(newXp));

        try {
          await fetch("/api/user-settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ section: "gamification", data: { totalXp: newXp, loginStreak: newStreak, lastLoginDate: today } }),
          });
        } catch {}
      } else {
        setStreak(savedStreak);
        setXp(savedXp);
        localStorage.setItem("login_streak", String(savedStreak));
        localStorage.setItem("total_xp", String(savedXp));
      }
    })();
  }, []);

  return { streak, xp, xpGained };
}

export function DailyStreak() {
  const { streak, xp, xpGained } = useDailyStreak();
  const [showXpPopup, setShowXpPopup] = useState(false);

  useEffect(() => {
    if (xpGained > 0) {
      setTimeout(() => {
        setShowXpPopup(true);
        setTimeout(() => setShowXpPopup(false), 3000);
      }, 500);
    }
  }, [xpGained]);

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


export function AchievementBadges() {
  const achievements = [
    { name: "First Login", icon: Star, earned: true, color: "text-amber-500" },
    { name: "Academy Started", icon: Zap, earned: true, color: "text-blue-400" },
    { name: "3-Day Streak", icon: Flame, earned: parseInt(localStorage.getItem("login_streak") || "0") >= 3, color: "text-red-500" },
    { name: "Dashboard Visitor", icon: Target, earned: localStorage.getItem("dashboard-visited") === "true", color: "text-primary" },
    { name: "7-Day Streak", icon: Flame, earned: parseInt(localStorage.getItem("login_streak") || "0") >= 7, color: "text-orange-500" },
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
      <div className="grid grid-cols-4 gap-2">
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

export function PremiumTeaser({ title, description, buttonText }: { title?: string; description?: string; buttonText?: string } = {}) {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-amber-500/10 via-primary/5 to-purple-500/10 border border-amber-500/20 rounded-xl p-5">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />

      <div className="flex items-center gap-2 mb-3">
        <Crown className="h-5 w-5 text-amber-500" />
        <h3 className="text-sm font-bold text-amber-500">{title || "PREMIUM INSIGHTS"}</h3>
      </div>

      {description ? (
        <p className="text-sm text-foreground/80 mb-4" dangerouslySetInnerHTML={{ __html: description }} />
      ) : (
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
      )}

      <button
        onClick={() => navigate("/pricing")}
        className="w-full bg-gradient-to-r from-amber-500 to-primary text-white font-bold py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all animate-pulse"
      >
        {buttonText || "Unlock Premium Tips"}
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


export function FreeSidebar() {
  return (
    <div className="space-y-4 p-4">
      <DailyStreak />
      <AchievementBadges />
      <PremiumTeaser />
    </div>
  );
}
