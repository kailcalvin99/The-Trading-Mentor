import { useMemo, useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import FrostedGateOverlay from "@/components/FrostedGateOverlay";
import { AnalyticsDemoSnapshot } from "@/components/DemoSnapshots";
import { ShareButton } from "@/components/ShareButton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
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
  ReferenceArea,
  ReferenceLine,
  Label,
  Tooltip,
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
  DollarSign,
  Layers,
  Lock,
  Maximize2,
  X,
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
  setupType?: string | null;
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

  const behaviorTags = ["FOMO", "Chased", "Revenge", "Greedy", "Disciplined"];
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

type ExpandedChart = "pnl" | "hour" | "day" | "setup" | "behavior" | "confluence" | null;

const LIST_TRADES_OPTIONS = { query: { refetchOnMount: "always" as const } };

export default function Analytics() {
  const navigate = useNavigate();
  const { tierLevel, isAdmin } = useAuth();
  const isPremium = isAdmin || (tierLevel ?? 0) >= 2;
  const { data: rawTrades, isLoading: tradesLoading } = useListTrades(LIST_TRADES_OPTIONS);
  const { data: propAccount } = useGetPropAccount();
  const [expandedChart, setExpandedChart] = useState<ExpandedChart>(null);

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
    const tags = ["Disciplined", "FOMO", "Chased", "Revenge", "Greedy"];
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

  const isDisciplinedTag = (tag: string | null | undefined) =>
    ["Disciplined", "Patient", "Waited for Confirmation"].includes(tag ?? "");

  const gradeScore = useMemo(() => {
    if (trades.length === 0) return 0;

    const disciplinedCount = trades.filter((t) => isDisciplinedTag(t.behaviorTag)).length;
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
    const disciplinedCount = trades.filter((t) => isDisciplinedTag(t.behaviorTag)).length;
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

  const maxDrawdownInfo = useMemo(() => {
    if (pnlData.length < 2) return null;
    let peak = pnlData[0].pnl;
    let peakIdx = 0;
    let maxDd = 0;
    let ddStart = 0;
    let ddEnd = 0;
    for (let i = 1; i < pnlData.length; i++) {
      if (pnlData[i].pnl > peak) {
        peak = pnlData[i].pnl;
        peakIdx = i;
      }
      const dd = peak - pnlData[i].pnl;
      if (dd > maxDd) {
        maxDd = dd;
        ddStart = peakIdx;
        ddEnd = i;
      }
    }
    if (maxDd === 0) return null;
    return {
      startDate: pnlData[ddStart].date,
      endDate: pnlData[ddEnd].date,
      value: maxDd,
    };
  }, [pnlData]);

  const mistakeCost = useMemo(() => {
    const mistakeTags = ["FOMO", "Revenge", "Chased"];
    const mistakeTrades = trades.filter(
      (t) => t.behaviorTag && mistakeTags.includes(t.behaviorTag) && t.outcome === "loss"
    );
    const totalRiskPct = mistakeTrades.reduce((sum, t) => sum + t.riskPct, 0);
    const totalR = mistakeTrades.length > 0 ? totalRiskPct : 0;
    return {
      rValue: totalR.toFixed(1),
      pctOfAccount: totalRiskPct.toFixed(1),
      tradeCount: mistakeTrades.length,
    };
  }, [trades]);

  const confluenceData = useMemo(() => {
    const setupTypes = ["FVG", "Order Block", "Liquidity Sweep", "Turtle Soup", "BOS/CHoCH"];
    const setupMap: Record<string, { wins: number; losses: number; total: number; totalR: number }> = {};
    trades.forEach((t) => {
      if (!t.setupType) return;
      const types = t.setupType.split(",").map((s) => s.trim());
      types.forEach((st) => {
        if (!setupMap[st]) setupMap[st] = { wins: 0, losses: 0, total: 0, totalR: 0 };
        setupMap[st].total++;
        if (t.outcome === "win") {
          setupMap[st].wins++;
          setupMap[st].totalR += t.riskPct;
        } else if (t.outcome === "loss") {
          setupMap[st].losses++;
          setupMap[st].totalR -= t.riskPct;
        }
      });
    });
    return Object.entries(setupMap)
      .map(([type, data]) => ({
        type,
        trades: data.total,
        winRate: data.total > 0 ? Math.round((data.wins / data.total) * 100) : 0,
        avgR: data.total > 0 ? (data.totalR / data.total).toFixed(2) : "0.00",
      }))
      .sort((a, b) => b.winRate - a.winRate);
  }, [trades]);

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

  if (!isPremium) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <div className="rounded-full bg-muted p-4">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-lg font-semibold">Premium Feature</h2>
            <p className="text-sm text-muted-foreground">
              Analytics are available on the Premium plan. Upgrade to unlock full trade history charts, insights, and performance scores.
            </p>
            <Link
              to="/pricing"
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              View Pricing
            </Link>
          </div>
        </div>
        <IctBreakdownSection />
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="flex flex-col items-center gap-4 text-center max-w-sm">
            <BarChart3 className="h-12 w-12 text-muted-foreground" />
            <h2 className="text-lg font-semibold">No Trade Data Yet</h2>
            <p className="text-sm text-muted-foreground">
              Log trades in your Smart Journal and your charts, win rate, and performance scores will appear here automatically.
            </p>
            <Link
              to="/journal"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
            >
              Log Your First Trade &rarr;
            </Link>
          </div>
        </div>
        <IctBreakdownSection />
      </div>
    );
  }

  if (tierLevel < 2) {
    return (
      <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
        <FrostedGateOverlay mode="premium">
          <AnalyticsDemoSnapshot />
        </FrostedGateOverlay>
        <IctBreakdownSection />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            See how you are doing across {stats.totalTrades} completed trades
          </p>
        </div>
        {stats.totalTrades > 0 && (
          <ShareButton
            stats={{
              winRate: stats.winRate,
              totalPnlPct: pnlData.length > 0 ? pnlData[pnlData.length - 1].pnl : 0,
              totalTrades: stats.totalTrades,
              profitFactor: stats.profitFactor,
            }}
          />
        )}
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

      {mistakeCost.tradeCount > 0 && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                  <p className="text-sm font-semibold text-red-500">Total Cost of Discipline Errors</p>
                </div>
                <p className="text-2xl font-bold text-red-500">
                  {mistakeCost.rValue}R / {mistakeCost.pctOfAccount}% of account
                </p>
                <p className="text-xs text-muted-foreground">
                  Combined risk lost on {mistakeCost.tradeCount} trade{mistakeCost.tradeCount !== 1 ? "s" : ""} tagged FOMO, Revenge, or Chased
                </p>
              </div>
              <div className="rounded-lg bg-red-500/10 p-2">
                <DollarSign className="h-4 w-4 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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

      {expandedChart && (
        <Dialog open onOpenChange={(open) => { if (!open) setExpandedChart(null); }}>
          <DialogContent className="max-w-5xl w-full p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="font-semibold text-sm">
                {expandedChart === "pnl" && "Cumulative P&L (Risk Units)"}
                {expandedChart === "hour" && "Performance by Hour"}
                {expandedChart === "day" && "Performance by Day"}
                {expandedChart === "setup" && "Setup Analysis"}
                {expandedChart === "behavior" && "Behavior Breakdown"}
                {expandedChart === "confluence" && "Setup Confluence"}
              </p>
              <button onClick={() => setExpandedChart(null)} className="rounded-full p-1.5 hover:bg-muted transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="p-4">
              {expandedChart === "pnl" && (
                <ChartContainer config={pnlChartConfig} className="h-[500px] w-full">
                  <AreaChart data={pnlData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="pnlGradientX" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="pnl" stroke="hsl(142, 76%, 36%)" fill="url(#pnlGradientX)" strokeWidth={2.5} />
                    {maxDrawdownInfo && (
                      <ReferenceArea x1={maxDrawdownInfo.startDate} x2={maxDrawdownInfo.endDate} fill="hsl(0, 84%, 60%)" fillOpacity={0.15} stroke="hsl(0, 84%, 60%)" strokeOpacity={0.3}
                        label={{ value: `Max Drawdown: -${maxDrawdownInfo.value.toFixed(1)}R`, position: "insideTop", fill: "hsl(0, 84%, 60%)", fontSize: 12, fontWeight: 600 }} />
                    )}
                  </AreaChart>
                </ChartContainer>
              )}
              {expandedChart === "hour" && (
                <ChartContainer config={hourChartConfig} className="h-[500px] w-full">
                  <BarChart data={hourData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                      {hourData.map((entry, index) => (
                        <Cell key={index} fill={entry.winRate < 40 ? "hsl(0, 84%, 60%)" : "hsl(142, 76%, 36%)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
              {expandedChart === "day" && (
                <ChartContainer config={dayChartConfig} className="h-[500px] w-full">
                  <BarChart data={dayData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                      {dayData.map((entry, index) => (
                        <Cell key={index} fill={entry.winRate >= 50 ? "hsl(217, 91%, 60%)" : "hsl(0, 84%, 60%)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              )}
              {expandedChart === "behavior" && (
                <ChartContainer config={behaviorChartConfig} className="h-[500px] w-full">
                  <BarChart data={behaviorData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="tag" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="wins" fill="hsl(142, 76%, 36%)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="losses" fill="hsl(0, 84%, 60%)" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="breakeven" fill="hsl(45, 93%, 47%)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Cumulative P&L (Risk Units)
              </CardTitle>
              <button onClick={() => setExpandedChart("pnl")} className="rounded-full p-1.5 hover:bg-muted transition-colors" title="Expand chart">
                <Maximize2 className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
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
                {maxDrawdownInfo && (
                  <ReferenceArea
                    x1={maxDrawdownInfo.startDate}
                    x2={maxDrawdownInfo.endDate}
                    fill="hsl(0, 84%, 60%)"
                    fillOpacity={0.15}
                    stroke="hsl(0, 84%, 60%)"
                    strokeOpacity={0.3}
                    label={{
                      value: `Max Drawdown: -${maxDrawdownInfo.value.toFixed(1)}R`,
                      position: "insideTop",
                      fill: "hsl(0, 84%, 60%)",
                      fontSize: 11,
                      fontWeight: 600,
                    }}
                  />
                )}
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Performance by Hour
              </CardTitle>
              {hourData.length > 0 && (
                <button onClick={() => setExpandedChart("hour")} className="rounded-full p-1.5 hover:bg-muted transition-colors" title="Expand chart">
                  <Maximize2 className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
            <CardDescription>Win rate during each hour (your best Kill Zones)</CardDescription>
          </CardHeader>
          <CardContent>
            {hourData.length > 0 ? (
              <ChartContainer config={hourChartConfig} className="h-[200px] w-full">
                <BarChart data={hourData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      return (
                        <div className="rounded-lg border bg-background p-2 shadow-md text-xs">
                          <p className="font-semibold">{data.hour} — {data.trades} trade{data.trades !== 1 ? "s" : ""}</p>
                          <p className={data.winRate < 40 ? "text-red-500 font-bold" : ""}>
                            Win Rate: {data.winRate}%
                          </p>
                          {data.winRate < 40 && (
                            <p className="text-red-500 font-semibold mt-1">⚠ Avoid trading this session</p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                    {hourData.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={entry.winRate < 40 ? "hsl(0, 84%, 60%)" : "hsl(142, 76%, 36%)"}
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Performance by Day
              </CardTitle>
              {dayData.length > 0 && (
                <button onClick={() => setExpandedChart("day")} className="rounded-full p-1.5 hover:bg-muted transition-colors" title="Expand chart">
                  <Maximize2 className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
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
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Behavior Analysis (How You Traded)
              </CardTitle>
              {behaviorData.length > 0 && (
                <button onClick={() => setExpandedChart("behavior")} className="rounded-full p-1.5 hover:bg-muted transition-colors" title="Expand chart">
                  <Maximize2 className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
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

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Confluence Tracker
          </CardTitle>
          <CardDescription>Setup types ranked by win rate and average R</CardDescription>
        </CardHeader>
        <CardContent>
          {confluenceData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-xs font-semibold text-muted-foreground">Setup Type</th>
                    <th className="text-center py-2 text-xs font-semibold text-muted-foreground">Trades</th>
                    <th className="text-center py-2 text-xs font-semibold text-muted-foreground">Win Rate</th>
                    <th className="text-center py-2 text-xs font-semibold text-muted-foreground">Avg R</th>
                  </tr>
                </thead>
                <tbody>
                  {confluenceData.map((row) => (
                    <tr key={row.type} className="border-b border-border/50">
                      <td className="py-2 font-medium">{row.type}</td>
                      <td className="text-center py-2 text-muted-foreground">{row.trades}</td>
                      <td className={cn("text-center py-2 font-semibold", row.winRate >= 50 ? "text-green-600" : "text-red-500")}>
                        {row.winRate}%
                      </td>
                      <td className={cn("text-center py-2 font-semibold", parseFloat(row.avgR) >= 0 ? "text-green-600" : "text-red-500")}>
                        {row.avgR}R
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground">No setup type data yet</p>
              <p className="text-xs text-muted-foreground mt-1">Log setup types when adding trades to populate this table</p>
            </div>
          )}
        </CardContent>
      </Card>

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

      <IctBreakdownSection />
    </div>
  );
}

interface SessionPerf {
  session: string;
  wins: number;
  losses: number;
  total: number;
  winRate: number;
  avgR: number;
}

interface FvgHitRate {
  total: number;
  tp: number;
  sl: number;
  hitRate: number;
}

interface NewsDayImpact {
  newsDay: { total: number; wins: number; winRate: number };
  cleanDay: { total: number; wins: number; winRate: number };
}

interface IctBreakdownData {
  sessionPerformance: SessionPerf[];
  fvgHitRate: FvgHitRate;
  newsDayImpact: NewsDayImpact;
}

const TOKEN_KEY = "ICT_TRADING_MENTOR_TOKEN";

function IctBreakdownSection() {
  const [open, setOpen] = useState(true);
  const [data, setData] = useState<IctBreakdownData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!open || hasFetched.current) return;
    hasFetched.current = true;
    const apiBase = import.meta.env.VITE_API_URL || "/api";
    setLoading(true);
    const token = localStorage.getItem(TOKEN_KEY);
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    fetch(`${apiBase}/analytics/ict-breakdown`, { credentials: "include", headers })
      .then((r) => {
        if (r.status === 403) { setNeedsUpgrade(true); setLoading(false); return null; }
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => { if (d) { setData(d); } setLoading(false); })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : "Unable to load ICT analytics";
        setError(msg);
        setLoading(false);
      });
  }, [open]);

  const sessionChartConfig: ChartConfig = {
    winRate: { label: "Win Rate %", color: "hsl(142, 76%, 36%)" },
  };

  const newsChartConfig: ChartConfig = {
    winRate: { label: "Win Rate %", color: "hsl(217, 91%, 60%)" },
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center justify-between w-full text-left group"
        >
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              ICT Breakdown
            </CardTitle>
            <CardDescription>Session performance, FVG hit rate, and news day impact</CardDescription>
          </div>
          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            {open ? "▲ Collapse" : "▼ Expand"}
          </span>
        </button>
      </CardHeader>

      {open && (
        <CardContent className="space-y-6">
          {loading && <p className="text-sm text-muted-foreground text-center py-4">Loading ICT analytics…</p>}
          {needsUpgrade && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <Lock className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">Premium feature</p>
              <p className="text-xs text-muted-foreground">Upgrade to Premium to unlock ICT session breakdown, FVG hit rate, and news day impact analytics.</p>
              <Link to="/pricing" className="inline-flex items-center justify-center rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">View Pricing</Link>
            </div>
          )}
          {error && <p className="text-sm text-red-500 text-center py-4">{error}</p>}

          {data && (
            <>
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary" /> Session Performance
                </h4>
                {data.sessionPerformance.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No session data yet. Log trades with entry times to populate.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-2 text-xs font-semibold text-muted-foreground">Session</th>
                          <th className="text-center py-2 text-xs font-semibold text-muted-foreground">Trades</th>
                          <th className="text-center py-2 text-xs font-semibold text-muted-foreground">Win Rate</th>
                          <th className="text-center py-2 text-xs font-semibold text-muted-foreground">Avg R</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.sessionPerformance.map((row) => (
                          <tr key={row.session} className="border-b border-border/50">
                            <td className="py-2 font-medium">{row.session}</td>
                            <td className="text-center py-2 text-muted-foreground">{row.total}</td>
                            <td className={cn("text-center py-2 font-bold", row.winRate >= 50 ? "text-green-600" : "text-red-500")}>
                              {row.winRate}%
                            </td>
                            <td className={cn("text-center py-2 font-semibold", row.avgR >= 0 ? "text-green-600" : "text-red-500")}>
                              {row.avgR >= 0 ? "+" : ""}{row.avgR}R
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-primary" /> FVG Trade Hit Rate
                </h4>
                {data.fvgHitRate.total === 0 ? (
                  <p className="text-xs text-muted-foreground">No FVG-tagged trades yet. Enable "FVG Confirmation" when logging trades.</p>
                ) : (
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-primary">{data.fvgHitRate.hitRate}%</p>
                      <p className="text-xs text-muted-foreground">Hit Rate</p>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-green-600 font-semibold w-20">TP Hit: {data.fvgHitRate.tp}</span>
                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-green-500 rounded-full" style={{ width: `${data.fvgHitRate.total > 0 ? (data.fvgHitRate.tp / data.fvgHitRate.total) * 100 : 0}%` }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-red-500 font-semibold w-20">SL Hit: {data.fvgHitRate.sl}</span>
                        <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${data.fvgHitRate.total > 0 ? (data.fvgHitRate.sl / data.fvgHitRate.total) * 100 : 0}%` }} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{data.fvgHitRate.total} total FVG trades</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-4">
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-primary" /> News Day Impact
                </h4>
                {data.newsDayImpact.newsDay.total === 0 && data.newsDayImpact.cleanDay.total === 0 ? (
                  <p className="text-xs text-muted-foreground">No trade data yet.</p>
                ) : (
                  <ChartContainer config={newsChartConfig} className="h-[160px] w-full">
                    <BarChart
                      data={[
                        { label: "News Days", winRate: data.newsDayImpact.newsDay.winRate, total: data.newsDayImpact.newsDay.total },
                        { label: "Clean Days", winRate: data.newsDayImpact.cleanDay.winRate, total: data.newsDayImpact.cleanDay.total },
                      ]}
                      margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                      <Tooltip
                        formatter={(value: number, _: string, props: { payload?: { total?: number } }) => [
                          `${value}% (${props.payload?.total ?? 0} trades)`,
                          "Win Rate",
                        ]}
                      />
                      <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                        <Cell fill="hsl(0, 84%, 60%)" />
                        <Cell fill="hsl(142, 76%, 36%)" />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                )}
              </div>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
