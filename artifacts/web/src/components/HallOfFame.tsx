import { useState, useEffect } from "react";
import { Trophy, Flame, Star, Shield, Crown, Medal, Target, Zap } from "lucide-react";

const DISCIPLINE_STREAK_KEY = "ict-discipline-streak";
const DISCIPLINE_LAST_DATE_KEY = "ict-discipline-last-date";
const DISCIPLINE_BEST_STREAK_KEY = "ict-discipline-best-streak";
const DISCIPLINE_TOTAL_DAYS_KEY = "ict-discipline-total-days";
const DISCIPLINE_ACHIEVEMENTS_KEY = "ict-discipline-achievements";

interface DisciplineStats {
  currentStreak: number;
  bestStreak: number;
  totalDays: number;
  achievements: string[];
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
}

export function getDisciplineStats(): DisciplineStats {
  try {
    return {
      currentStreak: parseInt(localStorage.getItem(DISCIPLINE_STREAK_KEY) || "0", 10),
      bestStreak: parseInt(localStorage.getItem(DISCIPLINE_BEST_STREAK_KEY) || "0", 10),
      totalDays: parseInt(localStorage.getItem(DISCIPLINE_TOTAL_DAYS_KEY) || "0", 10),
      achievements: JSON.parse(localStorage.getItem(DISCIPLINE_ACHIEVEMENTS_KEY) || "[]"),
    };
  } catch {
    return { currentStreak: 0, bestStreak: 0, totalDays: 0, achievements: [] };
  }
}

export function recordDisciplinedDay() {
  const lastDate = localStorage.getItem(DISCIPLINE_LAST_DATE_KEY) || "";
  const today = getTodayStr();

  if (lastDate === today) return;

  let streak = parseInt(localStorage.getItem(DISCIPLINE_STREAK_KEY) || "0", 10);
  const bestStreak = parseInt(localStorage.getItem(DISCIPLINE_BEST_STREAK_KEY) || "0", 10);
  let totalDays = parseInt(localStorage.getItem(DISCIPLINE_TOTAL_DAYS_KEY) || "0", 10);

  if (lastDate === getYesterdayStr()) {
    streak += 1;
  } else {
    streak = 1;
  }

  totalDays += 1;
  const newBest = Math.max(bestStreak, streak);

  localStorage.setItem(DISCIPLINE_STREAK_KEY, String(streak));
  localStorage.setItem(DISCIPLINE_BEST_STREAK_KEY, String(newBest));
  localStorage.setItem(DISCIPLINE_TOTAL_DAYS_KEY, String(totalDays));
  localStorage.setItem(DISCIPLINE_LAST_DATE_KEY, today);

  const achievements: string[] = JSON.parse(localStorage.getItem(DISCIPLINE_ACHIEVEMENTS_KEY) || "[]");
  const newAchievements = [...achievements];

  const checks: [string, () => boolean][] = [
    ["first_day", () => totalDays >= 1],
    ["3_day_streak", () => streak >= 3],
    ["7_day_streak", () => streak >= 7],
    ["14_day_streak", () => streak >= 14],
    ["30_day_streak", () => streak >= 30],
    ["50_total_days", () => totalDays >= 50],
    ["100_total_days", () => totalDays >= 100],
  ];

  for (const [id, check] of checks) {
    if (!newAchievements.includes(id) && check()) {
      newAchievements.push(id);
    }
  }

  localStorage.setItem(DISCIPLINE_ACHIEVEMENTS_KEY, JSON.stringify(newAchievements));
}

const ALL_ACHIEVEMENTS = [
  { id: "first_day", label: "First Step", desc: "Completed your first disciplined day", icon: Star, color: "#00C896" },
  { id: "3_day_streak", label: "Getting Serious", desc: "3-day discipline streak", icon: Flame, color: "#F59E0B" },
  { id: "7_day_streak", label: "One Week Strong", desc: "7-day discipline streak", icon: Shield, color: "#818CF8" },
  { id: "14_day_streak", label: "Two Weeks of Iron", desc: "14-day discipline streak", icon: Trophy, color: "#EC4899" },
  { id: "30_day_streak", label: "Monthly Master", desc: "30-day discipline streak", icon: Crown, color: "#FFD700" },
  { id: "50_total_days", label: "Veteran Trader", desc: "50 total disciplined days", icon: Medal, color: "#06B6D4" },
  { id: "100_total_days", label: "ICT Elite", desc: "100 total disciplined days", icon: Zap, color: "#EF4444" },
];

export default function HallOfFame() {
  const [stats, setStats] = useState(getDisciplineStats);

  useEffect(() => {
    const interval = setInterval(() => setStats(getDisciplineStats()), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border rounded-xl p-4 text-center">
          <Flame className="h-5 w-5 text-orange-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">{stats.currentStreak}</p>
          <p className="text-xs text-muted-foreground">Current Streak</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <Trophy className="h-5 w-5 text-amber-500 mx-auto mb-1" />
          <p className="text-2xl font-bold">{stats.bestStreak}</p>
          <p className="text-xs text-muted-foreground">Best Streak</p>
        </div>
        <div className="bg-card border rounded-xl p-4 text-center">
          <Target className="h-5 w-5 text-primary mx-auto mb-1" />
          <p className="text-2xl font-bold">{stats.totalDays}</p>
          <p className="text-xs text-muted-foreground">Total Days</p>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
          <Medal className="h-4 w-4 text-amber-500" />
          Achievements
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ALL_ACHIEVEMENTS.map((a) => {
            const earned = stats.achievements.includes(a.id);
            const Icon = a.icon;
            return (
              <div
                key={a.id}
                className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${earned ? "bg-card border-border" : "bg-secondary/30 border-transparent opacity-40"}`}
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: earned ? a.color + "22" : undefined }}
                >
                  <Icon className="h-4 w-4" style={{ color: earned ? a.color : undefined }} />
                </div>
                <div>
                  <p className={`text-xs font-bold ${earned ? "" : "text-muted-foreground"}`}>{a.label}</p>
                  <p className="text-[10px] text-muted-foreground">{a.desc}</p>
                </div>
                {earned && (
                  <Star className="h-3 w-3 text-amber-500 ml-auto shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
