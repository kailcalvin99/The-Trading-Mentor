import { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Trophy,
  Target,
  Activity,
  BarChart3,
  Brain,
  Gauge,
  Calendar,
  Clock,
  Lightbulb,
  AlertTriangle,
  Zap,
  Timer,
  Shield,
  Flame,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useListTrades, useGetPropAccount } from "@workspace/api-client-react";

interface ExtendedTrade {
  id: number;
  pair: string;
  entryTime: string;
  riskPct: number;
  liquiditySweep: boolean;
  outcome?: string;
  notes?: string;
  behaviorTag?: string;
  followedTimeRule?: boolean;
  hasFvgConfirmation?: boolean;
  stressLevel?: number;
  isDraft?: boolean;
  ticker?: string;
  sideDirection?: string;
  createdAt: string;
}

function parseEntryMode(notes?: string): string {
  if (!notes) return "Unknown";
  const lower = notes.toLowerCase();
  if (lower.includes("[conservative]") || lower.includes("conservative")) return "Conservative";
  if (lower.includes("[silver bullet]") || lower.includes("silver bullet") || lower.includes("[aggressive]") || lower.includes("aggressive")) return "Silver Bullet";
  return "Unknown";
}

function parseHour(entryTime: string): number | null {
  const match = entryTime.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = parseInt(match[1]);
  const period = match[3]?.toUpperCase();
  if (period === "PM" && hour !== 12) hour += 12;
  if (period === "AM" && hour === 12) hour = 0;
  return hour;
}

function getDayOfWeek(dateStr: string): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const d = new Date(dateStr);
  return days[d.getDay()] ?? "Unknown";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const pnlChartConfig: ChartConfig = {
  pnl: { label: "Cumulative P&L", color: "hsl(142, 76%, 36%)" },
};

const hourChartConfig: ChartConfig = {
  winRate: { label: "Win Rate %", color: "hsl(142, 76%, 36%)" },
};

const dayChartConfig: ChartConfig = {
  winRate: { label: "Win Rate %", color: "hsl(217, 91%, 60%)" },
};

const setupChartConfig: ChartConfig = {
  wins: { label: "Wins", color: "hsl(142, 76%, 36%)" },
  losses: { label: "Losses", color: "hsl(0, 84%, 60%)" },
};

const behaviorChartConfig: ChartConfig = {
  wins: { label: "Wins", color: "hsl(142, 76%, 36%)" },
  losses: { label: "Losses", color: "hsl(0, 84%, 60%)" },
  breakeven: { label: "Breakeven", color: "hsl(45, 93%, 47%)" },
};

const drawdownChartConfig: ChartConfig = {
  drawdown: { label: "Drawdown %", color: "hsl(0, 84%, 60%)" },
};

interface Insight {
  icon: "stress" | "behavior" | "pair" | "time" | "fvg" | "streak" | "session";
  headline: string;
  stat: string;
  sentiment: "positive" | "negative" | "neutral";
}

function computeInsights(trades: ExtendedTrade[]): Insight[] {
  if (trades.length < 10) return [];
  const insights: Insight[] = [];
  const wins = trades.filter((t) => t.outcome === "win");
  const losses = trades.filter((t) => t.outcome === "loss");
  const overallWinRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;

  const highStress = trades.filter((t) => t.stressLevel != null && t.stressLevel > 6);
  const lowStress = trades.filter((t) => t.stressLevel != null && t.stressLevel <= 6);
  if (highStress.length >= 3 && lowStress.length >= 3) {
    const highWR = (highStress.filter((t) => t.outcome === "win").length / highStress.length) * 100;
    const lowWR = (lowStress.filter((t) => t.outcome === "win").length / lowStress.length) * 100;
    const diff = Math.abs(lowWR - highWR);
    if (diff >= 10) {
      insights.push({
        icon: "stress",
        headline: lowWR > highWR ? "High Stress = Low Win Rate" : "You Thrive Under Pressure",
        stat: lowWR > highWR
          ? `${Math.round(lowWR)}% win rate when calm vs ${Math.round(highWR)}% when stressed`
          : `${Math.round(highWR)}% win rate under pressure vs ${Math.round(lowWR)}% when calm`,
        sentiment: lowWR > highWR ? "negative" : "positive",
      });
    }
  }

  const behaviorTags = ["FOMO", "Chased", "Greedy", "Disciplined"];
  for (const tag of behaviorTags) {
    const tagged = trades.filter((t) => t.behaviorTag === tag);
    if (tagged.length >= 3) {
      const tagWR = (tagged.filter((t) => t.outcome === "win").length / tagged.length) * 100;
      const tagLosses = tagged.filter((t) => t.outcome === "loss").length;
      if (tag !== "Disciplined" && tagWR < 30) {
        insights.push({
          icon: "behavior",
          headline: `${tag} Trades Are Costing You`,
          stat: `${Math.round(tagWR)}% win rate on ${tagged.length} "${tag}" trades — ${tagLosses} losses`,
          sentiment: "negative",
        });
        break;
      } else if (tag === "Disciplined" && tagWR > overallWinRate + 10) {
        insights.push({
          icon: "behavior",
          headline: "Discipline Pays Off",
          stat: `${Math.round(tagWR)}% win rate when disciplined vs ${Math.round(overallWinRate)}% overall`,
          sentiment: "positive",
        });
        break;
      }
    }
  }

  const pairMap: Record<string, { wins: number; total: number }> = {};
  trades.forEach((t) => {
    const p = t.pair || t.ticker || "Unknown";
    if (!pairMap[p]) pairMap[p] = { wins: 0, total: 0 };
    pairMap[p].total++;
    if (t.outcome === "win") pairMap[p].wins++;
  });
  const pairs = Object.entries(pairMap).filter(([, d]) => d.total >= 3);
  if (pairs.length >= 2) {
    pairs.sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total));
    const best = pairs[0];
    const worst = pairs[pairs.length - 1];
    const bestWR = Math.round((best[1].wins / best[1].total) * 100);
    const worstWR = Math.round((worst[1].wins / worst[1].total) * 100);
    if (bestWR - worstWR >= 15) {
      insights.push({
        icon: "pair",
        headline: `${best[0]} Is Your Best Pair`,
        stat: `${bestWR}% win rate on ${best[0]} vs ${worstWR}% on ${worst[0]}`,
        sentiment: "positive",
      });
    }
  }

  const followed = trades.filter((t) => t.followedTimeRule === true);
  const notFollowed = trades.filter((t) => t.followedTimeRule === false);
  if (followed.length >= 3 && notFollowed.length >= 3) {
    const followedWR = (followed.filter((t) => t.outcome === "win").length / followed.length) * 100;
    const notWR = (notFollowed.filter((t) => t.outcome === "win").length / notFollowed.length) * 100;
    if (followedWR - notWR >= 10) {
      insights.push({
        icon: "time",
        headline: "Time Rule Works for You",
        stat: `${Math.round(followedWR)}% win rate in the kill zone vs ${Math.round(notWR)}% outside it`,
        sentiment: "positive",
      });
    } else if (notWR - followedWR >= 10) {
      insights.push({
        icon: "time",
        headline: "Time Rule Isn't Helping",
        stat: `${Math.round(notWR)}% win rate outside kill zone vs ${Math.round(followedWR)}% inside — rethink your timing`,
        sentiment: "negative",
      });
    }
  }

  const withFVG = trades.filter((t) => t.hasFvgConfirmation === true);
  const noFVG = trades.filter((t) => t.hasFvgConfirmation === false);
  if (withFVG.length >= 3 && noFVG.length >= 3) {
    const fvgWR = (withFVG.filter((t) => t.outcome === "win").length / withFVG.length) * 100;
    const noFvgWR = (noFVG.filter((t) => t.outcome === "win").length / noFVG.length) * 100;
    if (fvgWR - noFvgWR >= 10) {
      insights.push({
        icon: "fvg",
        headline: "FVG Confirmation Boosts Wins",
        stat: `${Math.round(fvgWR)}% with FVG vs ${Math.round(noFvgWR)}% without — always wait for it`,
        sentiment: "positive",
      });
    }
  }

  const sorted = [...trades].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  let maxStreak = 0;
  let current = 0;
  for (const t of sorted) {
    if (t.outcome === "loss") {
      current++;
      maxStreak = Math.max(maxStreak, current);
    } else {
      current = 0;
    }
  }
  if (maxStreak >= 3) {
    insights.push({
      icon: "streak",
      headline: `${maxStreak}-Trade Losing Streak`,
      stat: `Your worst streak was ${maxStreak} consecutive losses — consider stepping away after 2 losses`,
      sentiment: "negative",
    });
  }

  const hourMap: Record<string, { wins: number; total: number }> = {};
  trades.forEach((t) => {
    const h = parseHour(t.entryTime);
    if (h === null) return;
    const session = h >= 9 && h <= 11 ? "NY AM" : h >= 13 && h <= 15 ? "NY PM" : "Other";
    if (!hourMap[session]) hourMap[session] = { wins: 0, total: 0 };
    hourMap[session].total++;
    if (t.outcome === "win") hourMap[session].wins++;
  });
  const sessions = Object.entries(hourMap).filter(([, d]) => d.total >= 3);
  if (sessions.length >= 2) {
    sessions.sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total));
    const bestSession = sessions[0];
    const bestSWR = Math.round((bestSession[1].wins / bestSession[1].total) * 100);
    if (bestSWR > overallWinRate + 5) {
      insights.push({
        icon: "session",
        headline: `${bestSession[0]} Is Your Best Session`,
        stat: `${bestSWR}% win rate during ${bestSession[0]} (${bestSession[1].total} trades)`,
        sentiment: "positive",
      });
    }
  }

  return insights.slice(0, 6);
}

const INSIGHT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  stress: Flame,
  behavior: Brain,
  pair: Trophy,
  time: Timer,
  fvg: Shield,
  streak: AlertTriangle,
  session: Zap,
};

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <p className={cn(
              "text-2xl font-bold",
              trend === "up" && "text-green-600",
              trend === "down" && "text-red-500",
            )}>{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="rounded-lg bg-muted p-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function GradeGauge({ score }: { score: number }) {
  const getGradeColor = (s: number) => {
    if (s >= 80) return "text-green-500";
    if (s >= 60) return "text-yellow-500";
    if (s >= 40) return "text-orange-500";
    return "text-red-500";
  };

  const getGradeLabel = (s: number) => {
    if (s >= 90) return "Elite";
    if (s >= 80) return "Excellent";
    if (s >= 70) return "Good";
    if (s >= 60) return "Average";
    if (s >= 40) return "Needs Work";
    return "Poor";
  };

  const circumference = 2 * Math.PI * 60;
  const progress = (score / 100) * circumference * 0.75;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative h-40 w-40">
        <svg className="h-40 w-40 -rotate-[135deg]" viewBox="0 0 140 140">
          <circle
            cx="70"
            cy="70"
            r="60"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className="text-muted"
            strokeDasharray={`${circumference * 0.75} ${circumference * 0.25}`}
            strokeLinecap="round"
          />
          <circle
            cx="70"
            cy="70"
            r="60"
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            className={getGradeColor(score)}
            strokeDasharray={`${progress} ${circumference - progress}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("text-3xl font-bold", getGradeColor(score))}>{Math.round(score)}</span>
          <span className="text-xs text-muted-foreground">/100</span>
        </div>
      </div>
      <span className={cn("text-sm font-semibold mt-1", getGradeColor(score))}>
        {getGradeLabel(score)}
      </span>
    </div>
  );
}

export default function Analytics() {
  const { data: rawTrades, isLoading: tradesLoading } = useListTrades();
  const { data: propAccount } = useGetPropAccount();

  const trades = useMemo(() => {
    if (!rawTrades) return [];
    return (rawTrades as unknown as ExtendedTrade[]).filter((t) => !t.isDraft);
  }, [rawTrades]);

  const stats = useMemo(() => {
    if (trades.length === 0)
      return { wins: 0, losses: 0, breakeven: 0, winRate: 0, totalTrades: 0, profitFactor: 0, avgRisk: 0 };

    const wins = trades.filter((t) => t.outcome === "win").length;
    const losses = trades.filter((t) => t.outcome === "loss").length;
    const breakeven = trades.filter((t) => t.outcome === "breakeven").length;
    const totalTrades = trades.length;
    const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;

    const avgWinRisk = wins > 0
      ? trades.filter((t) => t.outcome === "win").reduce((s, t) => s + t.riskPct, 0) / wins
      : 0;
    const avgLossRisk = losses > 0
      ? trades.filter((t) => t.outcome === "loss").reduce((s, t) => s + t.riskPct, 0) / losses
      : 0;

    const profitFactor =
      losses > 0 && avgLossRisk > 0
        ? (wins * avgWinRisk) / (losses * avgLossRisk)
        : wins > 0
        ? Infinity
        : 0;

    const avgRisk = totalTrades > 0
      ? trades.reduce((s, t) => s + t.riskPct, 0) / totalTrades
      : 0;

    return { wins, losses, breakeven, winRate, totalTrades, profitFactor, avgRisk };
  }, [trades]);

  const pnlData = useMemo(() => {
    if (trades.length === 0) return [];
    const sorted = [...trades].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    let cumulative = 0;
    return sorted.map((t) => {
      if (t.outcome === "win") cumulative += t.riskPct;
      else if (t.outcome === "loss") cumulative -= t.riskPct;
      return {
        date: formatDate(t.createdAt),
        pnl: parseFloat(cumulative.toFixed(2)),
        trade: `${t.pair} - ${t.outcome}`,
      };
    });
  }, [trades]);

  const hourData = useMemo(() => {
    if (trades.length === 0) return [];
    const hourMap: Record<number, { wins: number; total: number }> = {};
    trades.forEach((t) => {
      const h = parseHour(t.entryTime);
      if (h === null) return;
      if (!hourMap[h]) hourMap[h] = { wins: 0, total: 0 };
      hourMap[h].total++;
      if (t.outcome === "win") hourMap[h].wins++;
    });
    return Object.entries(hourMap)
      .map(([hour, data]) => ({
        hour: `${parseInt(hour) % 12 || 12}${parseInt(hour) >= 12 ? "PM" : "AM"}`,
        hourNum: parseInt(hour),
        winRate: Math.round((data.wins / data.total) * 100),
        trades: data.total,
      }))
      .sort((a, b) => a.hourNum - b.hourNum);
  }, [trades]);

  const dayData = useMemo(() => {
    if (trades.length === 0) return [];
    const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const dayMap: Record<string, { wins: number; total: number }> = {};
    trades.forEach((t) => {
      const day = getDayOfWeek(t.createdAt);
      if (!dayMap[day]) dayMap[day] = { wins: 0, total: 0 };
      dayMap[day].total++;
      if (t.outcome === "win") dayMap[day].wins++;
    });
    return dayOrder
      .filter((d) => dayMap[d])
      .map((day) => ({
        day,
        winRate: Math.round((dayMap[day].wins / dayMap[day].total) * 100),
        trades: dayMap[day].total,
      }));
  }, [trades]);

  const setupData = useMemo(() => {
    if (trades.length === 0) return [];
    const setupMap: Record<string, { wins: number; losses: number; breakeven: number; total: number }> = {};
    trades.forEach((t) => {
      const mode = parseEntryMode(t.notes);
      if (!setupMap[mode]) setupMap[mode] = { wins: 0, losses: 0, breakeven: 0, total: 0 };
      setupMap[mode].total++;
      if (t.outcome === "win") setupMap[mode].wins++;
      else if (t.outcome === "loss") setupMap[mode].losses++;
      else setupMap[mode].breakeven++;
    });
    return Object.entries(setupMap).map(([mode, data]) => ({
      mode,
      wins: data.wins,
      losses: data.losses,
      breakeven: data.breakeven,
      total: data.total,
      winRate: Math.round((data.wins / data.total) * 100),
    }));
  }, [trades]);

  const behaviorData = useMemo(() => {
    if (trades.length === 0) return [];
    const tags = ["Disciplined", "FOMO", "Chased", "Greedy"];
    const tagMap: Record<string, { wins: number; losses: number; breakeven: number; total: number }> = {};
    trades.forEach((t) => {
      const tag = t.behaviorTag || "Untagged";
      if (!tagMap[tag]) tagMap[tag] = { wins: 0, losses: 0, breakeven: 0, total: 0 };
      tagMap[tag].total++;
      if (t.outcome === "win") tagMap[tag].wins++;
      else if (t.outcome === "loss") tagMap[tag].losses++;
      else tagMap[tag].breakeven++;
    });
    const orderedTags = [...tags.filter((t) => tagMap[t]), ...Object.keys(tagMap).filter((t) => !tags.includes(t))];
    return orderedTags.map((tag) => ({
      tag,
      wins: tagMap[tag].wins,
      losses: tagMap[tag].losses,
      breakeven: tagMap[tag].breakeven,
      total: tagMap[tag].total,
      winRate: tagMap[tag].total > 0 ? Math.round((tagMap[tag].wins / tagMap[tag].total) * 100) : 0,
    }));
  }, [trades]);

  const gradeScore = useMemo(() => {
    if (trades.length === 0) return 0;

    const disciplinedCount = trades.filter((t) => t.behaviorTag === "Disciplined").length;
    const disciplineRate = trades.length > 0 ? (disciplinedCount / trades.length) * 100 : 0;

    const winRate = stats.winRate;

    const riskAdherenceCount = trades.filter((t) => t.riskPct <= 2).length;
    const riskAdherence = trades.length > 0 ? (riskAdherenceCount / trades.length) * 100 : 0;

    const timeRuleCount = trades.filter((t) => t.followedTimeRule === true).length;
    const timeRuleRate = trades.length > 0 ? (timeRuleCount / trades.length) * 100 : 0;

    return disciplineRate * 0.3 + winRate * 0.25 + riskAdherence * 0.25 + timeRuleRate * 0.2;
  }, [trades, stats.winRate]);

  const drawdownData = useMemo(() => {
    if (!propAccount) return [];
    const account = propAccount as { startingBalance: number; currentBalance: number; totalDrawdown: number };
    if (!account.startingBalance || account.startingBalance === 0) return [];
    const drawdownPct = (account.totalDrawdown / account.startingBalance) * 100;
    return [{ label: "Current", drawdown: parseFloat(drawdownPct.toFixed(2)) }];
  }, [propAccount]);

  const gradeBreakdown = useMemo(() => {
    if (trades.length === 0) return [];
    const disciplinedCount = trades.filter((t) => t.behaviorTag === "Disciplined").length;
    const disciplineRate = (disciplinedCount / trades.length) * 100;
    const riskAdherenceCount = trades.filter((t) => t.riskPct <= 2).length;
    const riskAdherence = (riskAdherenceCount / trades.length) * 100;
    const timeRuleCount = trades.filter((t) => t.followedTimeRule === true).length;
    const timeRuleRate = (timeRuleCount / trades.length) * 100;

    return [
      { metric: "Discipline (Following the Plan)", value: Math.round(disciplineRate), weight: "30%", fill: "hsl(142, 76%, 36%)" },
      { metric: "Win Rate (How Often You Win)", value: Math.round(stats.winRate), weight: "25%", fill: "hsl(217, 91%, 60%)" },
      { metric: "Risk Control (Staying Within Limits)", value: Math.round(riskAdherence), weight: "25%", fill: "hsl(280, 67%, 51%)" },
      { metric: "Time Rule (Trading at the Right Time)", value: Math.round(timeRuleRate), weight: "20%", fill: "hsl(45, 93%, 47%)" },
    ];
  }, [trades, stats.winRate]);

  const insights = useMemo(() => computeInsights(trades), [trades]);

  if (tradesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <Activity className="h-8 w-8 animate-pulse text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-center max-w-sm">
          <BarChart3 className="h-12 w-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold">No Trade Data Yet</h2>
          <p className="text-sm text-muted-foreground">
            Log some trades in your Smart Journal to see how you're doing — charts, scores, and more will show up here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">
          See how you are doing across {stats.totalTrades} completed trades
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          title="Win Rate (How Often You Win)"
          value={`${stats.winRate.toFixed(1)}%`}
          subtitle={`${stats.wins}W / ${stats.losses}L / ${stats.breakeven}BE`}
          icon={Trophy}
          trend={stats.winRate >= 50 ? "up" : "down"}
        />
        <StatCard
          title="Total Trades"
          value={stats.totalTrades}
          subtitle="Completed trades"
          icon={Target}
        />
        <StatCard
          title="Profit Factor (Win $ ÷ Loss $)"
          value={stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2)}
          subtitle="Above 1.0 = making money"
          icon={stats.profitFactor >= 1 ? TrendingUp : TrendingDown}
          trend={stats.profitFactor >= 1 ? "up" : "down"}
        />
        <StatCard
          title="Avg Risk (How Much You Risked)"
          value={`${stats.avgRisk.toFixed(2)}%`}
          subtitle="Per trade"
          icon={Activity}
          trend={stats.avgRisk <= 2 ? "up" : "down"}
        />
      </div>

      {trades.length >= 10 && insights.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              Your Insights
            </CardTitle>
            <CardDescription>Patterns we spotted in your recent trading</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {insights.map((insight, i) => {
                const IconComp = INSIGHT_ICONS[insight.icon] || Lightbulb;
                return (
                  <div
                    key={i}
                    className={cn(
                      "rounded-lg border p-3 space-y-1.5",
                      insight.sentiment === "positive" && "border-green-500/30 bg-green-500/5",
                      insight.sentiment === "negative" && "border-red-500/30 bg-red-500/5",
                      insight.sentiment === "neutral" && "border-primary/20 bg-primary/5",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <IconComp className={cn(
                        "h-4 w-4",
                        insight.sentiment === "positive" && "text-green-500",
                        insight.sentiment === "negative" && "text-red-500",
                        insight.sentiment === "neutral" && "text-primary",
                      )} />
                      <span className="text-sm font-semibold">{insight.headline}</span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{insight.stat}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : trades.length > 0 && trades.length < 10 ? (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Lightbulb className="h-5 w-5 text-primary/50" />
              <div>
                <p className="text-sm font-medium">Log more trades to unlock insights</p>
                <p className="text-xs">{10 - trades.length} more completed trades needed to surface patterns</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Cumulative P&L (Risk Units)
            </CardTitle>
            <CardDescription>Your running total of wins and losses (measured in risk %)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={pnlChartConfig} className="h-[250px] w-full">
              <AreaChart data={pnlData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="pnlGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fontSize: 11 }} />
                <YAxis className="text-xs" tick={{ fontSize: 11 }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="pnl"
                  stroke="hsl(142, 76%, 36%)"
                  fill="url(#pnlGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Gauge className="h-4 w-4" />
              Trade Grade (Your Overall Score)
            </CardTitle>
            <CardDescription>How well you are following your trading plan</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-3">
            <GradeGauge score={gradeScore} />
            <div className="w-full space-y-2 mt-2">
              {gradeBreakdown.map((item) => (
                <div key={item.metric} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: item.fill }} />
                    <span className="text-muted-foreground">{item.metric}</span>
                    <span className="text-muted-foreground/60">({item.weight})</span>
                  </div>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Performance by Hour
            </CardTitle>
            <CardDescription>Win rate during each hour (your best Kill Zones)</CardDescription>
          </CardHeader>
          <CardContent>
            {hourData.length > 0 ? (
              <ChartContainer config={hourChartConfig} className="h-[200px] w-full">
                <BarChart data={hourData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                    {hourData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.winRate >= 50 ? "hsl(142, 76%, 36%)" : "hsl(0, 84%, 60%)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No time data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Performance by Day
            </CardTitle>
            <CardDescription>Win rate by day of the week</CardDescription>
          </CardHeader>
          <CardContent>
            {dayData.length > 0 ? (
              <ChartContainer config={dayChartConfig} className="h-[200px] w-full">
                <BarChart data={dayData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                    {dayData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.winRate >= 50 ? "hsl(217, 91%, 60%)" : "hsl(0, 84%, 60%)"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No day data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Setup Analysis
            </CardTitle>
            <CardDescription>How well each entry type is working for you</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {setupData.map((setup) => (
                <div key={setup.mode} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{setup.mode}</span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-bold",
                        setup.winRate >= 50 ? "text-green-600" : "text-red-500"
                      )}>
                        {setup.winRate}% WR
                      </span>
                      <span className="text-xs text-muted-foreground">({setup.total} trades)</span>
                    </div>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                    {setup.wins > 0 && (
                      <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${(setup.wins / setup.total) * 100}%` }}
                      />
                    )}
                    {setup.breakeven > 0 && (
                      <div
                        className="bg-yellow-500 transition-all"
                        style={{ width: `${(setup.breakeven / setup.total) * 100}%` }}
                      />
                    )}
                    {setup.losses > 0 && (
                      <div
                        className="bg-red-500 transition-all"
                        style={{ width: `${(setup.losses / setup.total) * 100}%` }}
                      />
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      {setup.wins}W
                    </span>
                    <span className="flex items-center gap-1">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      {setup.losses}L
                    </span>
                    {setup.breakeven > 0 && (
                      <span className="flex items-center gap-1">
                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                        {setup.breakeven}BE
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Behavior Analysis (How You Traded)
            </CardTitle>
            <CardDescription>See which mindsets lead to wins and which lead to losses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {behaviorData.map((b) => (
                <div key={b.tag} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-sm font-medium",
                      b.tag === "Disciplined" && "text-green-600",
                      b.tag === "FOMO" && "text-orange-500",
                      b.tag === "Chased" && "text-yellow-600",
                      b.tag === "Greedy" && "text-red-500",
                    )}>
                      {b.tag}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-sm font-bold",
                        b.winRate >= 50 ? "text-green-600" : "text-red-500"
                      )}>
                        {b.winRate}% WR
                      </span>
                      <span className="text-xs text-muted-foreground">({b.total})</span>
                    </div>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden bg-muted">
                    {b.wins > 0 && (
                      <div
                        className="bg-green-500 transition-all"
                        style={{ width: `${(b.wins / b.total) * 100}%` }}
                      />
                    )}
                    {b.breakeven > 0 && (
                      <div
                        className="bg-yellow-500 transition-all"
                        style={{ width: `${(b.breakeven / b.total) * 100}%` }}
                      />
                    )}
                    {b.losses > 0 && (
                      <div
                        className="bg-red-500 transition-all"
                        style={{ width: `${(b.losses / b.total) * 100}%` }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {drawdownData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Account Drawdown
            </CardTitle>
            <CardDescription>
              Current drawdown from prop account balance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="flex-1">
                <div className="space-y-3">
                  {(() => {
                    const account = propAccount as { startingBalance: number; currentBalance: number; totalDrawdown: number; maxTotalDrawdownPct: number } | undefined;
                    if (!account) return null;
                    const drawdownPct = (account.totalDrawdown / account.startingBalance) * 100;
                    const maxPct = account.maxTotalDrawdownPct;
                    const usagePct = maxPct > 0 ? (drawdownPct / maxPct) * 100 : 0;
                    return (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span className={cn(
                            "text-3xl font-bold",
                            drawdownPct > maxPct * 0.8 ? "text-red-500" : drawdownPct > maxPct * 0.5 ? "text-yellow-500" : "text-green-600"
                          )}>
                            {drawdownPct.toFixed(2)}%
                          </span>
                          <span className="text-sm text-muted-foreground">/ {maxPct}% max</span>
                        </div>
                        <div className="h-4 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              usagePct > 80 ? "bg-red-500" : usagePct > 50 ? "bg-yellow-500" : "bg-green-500"
                            )}
                            style={{ width: `${Math.min(usagePct, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Balance: ${account.currentBalance.toLocaleString()}</span>
                          <span>Started: ${account.startingBalance.toLocaleString()}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
