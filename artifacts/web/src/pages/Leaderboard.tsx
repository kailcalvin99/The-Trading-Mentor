import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { LockedFeatureOverlay } from "@/components/CasinoElements";
import {
  Trophy,
  Crown,
  Flame,
  Star,
  Medal,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface LeaderboardEntry {
  rank: number;
  userId: number;
  name: string;
  isFounder: boolean;
  founderNumber: number | null;
  winRate: number;
  totalTrades: number;
  disciplinedPct: number;
  tierName: string;
  tierLevel: number;
}

const RANK_ICONS = [
  <Trophy key="1" className="h-5 w-5 text-amber-500" />,
  <Medal key="2" className="h-5 w-5 text-slate-400" />,
  <Medal key="3" className="h-5 w-5 text-amber-700" />,
];

const RANK_COLORS = [
  "bg-amber-500/10 border-amber-500/30",
  "bg-slate-500/10 border-slate-400/30",
  "bg-amber-700/10 border-amber-700/30",
];

function getRankBadgeStyle(rank: number): string {
  if (rank === 1) return "bg-amber-500/20 text-amber-500 border-amber-500/30";
  if (rank === 2) return "bg-slate-500/20 text-slate-400 border-slate-400/30";
  if (rank === 3) return "bg-amber-700/20 text-amber-700 border-amber-700/30";
  return "bg-secondary text-muted-foreground border-border";
}

export default function Leaderboard() {
  const { tierLevel, user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"winRate" | "totalTrades" | "disciplinedPct">("winRate");

  useEffect(() => {
    if (tierLevel < 2) return;
    fetchLeaderboard();
  }, [tierLevel]);

  async function fetchLeaderboard() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/leaderboard`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setEntries(data.entries || []);
      } else {
        const err = await res.json().catch(() => ({}));
        setError(err.error || "Failed to load leaderboard");
      }
    } catch {
      setError("Failed to load leaderboard");
    } finally {
      setLoading(false);
    }
  }

  if (tierLevel < 2) {
    return (
      <div className="relative min-h-[60vh] flex items-center justify-center">
        <LockedFeatureOverlay featureName="Leaderboard" tierRequired="Premium" />
      </div>
    );
  }

  const sorted = [...entries].sort((a, b) => b[sortBy] - a[sortBy]).map((e, i) => ({ ...e, rank: i + 1 }));

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-24">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-amber-500" />
          <div>
            <h1 className="text-2xl font-bold">Leaderboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Team trading performance rankings
            </p>
          </div>
        </div>
        <button
          onClick={fetchLeaderboard}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg px-3 py-2 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="flex items-center gap-2 bg-card border border-border rounded-xl p-1">
        {[
          { key: "winRate" as const, label: "Win Rate" },
          { key: "totalTrades" as const, label: "Total Trades" },
          { key: "disciplinedPct" as const, label: "Discipline" },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
              sortBy === opt.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-5 text-center">
          <p className="text-sm text-red-500 font-medium">{error}</p>
          <button
            onClick={fetchLeaderboard}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground underline"
          >
            Try again
          </button>
        </div>
      ) : sorted.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-8 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-bold text-foreground mb-1">No traders yet</p>
          <p className="text-xs text-muted-foreground">
            Log trades in your Smart Journal to appear on the leaderboard.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.slice(0, 3).length > 0 && (
            <div className={`relative rounded-2xl border-2 ${RANK_COLORS[0] || ""} p-5`}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-bold px-4 py-1 rounded-full flex items-center gap-1">
                <Star className="h-3 w-3" /> TOP TRADER
              </div>
              {sorted[0] && (
                <div className="flex items-center gap-4 pt-2">
                  <div className="text-4xl">🏆</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-foreground">{sorted[0].name}</span>
                      {sorted[0].isFounder && (
                        <span className="inline-flex items-center gap-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full px-1.5 py-0.5">
                          <Crown className="h-2.5 w-2.5 text-amber-500" />
                          <span className="text-[9px] font-bold text-amber-500">#{sorted[0].founderNumber}</span>
                        </span>
                      )}
                      {sorted[0].userId === user?.id && (
                        <span className="text-[9px] font-bold text-primary bg-primary/10 rounded-full px-1.5 py-0.5">YOU</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="text-sm font-bold text-amber-500">{sorted[0].winRate.toFixed(1)}% win rate</span>
                      <span className="text-xs text-muted-foreground">{sorted[0].totalTrades} trades</span>
                      <span className="text-xs text-muted-foreground">{sorted[0].disciplinedPct.toFixed(0)}% disciplined</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            {sorted.map((entry, idx) => (
              <div
                key={entry.userId}
                className={`flex items-center gap-4 px-5 py-4 border-b last:border-b-0 transition-colors ${
                  entry.userId === user?.id ? "bg-primary/5" : "hover:bg-secondary/20"
                }`}
              >
                <div className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-full border text-xs font-bold ${getRankBadgeStyle(entry.rank)}`}>
                  {entry.rank <= 3 ? RANK_ICONS[entry.rank - 1] : `#${entry.rank}`}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate">{entry.name}</span>
                    {entry.isFounder && (
                      <span className="inline-flex items-center gap-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full px-1.5 py-0.5">
                        <Crown className="h-2.5 w-2.5 text-amber-500" />
                        <span className="text-[9px] font-bold text-amber-500">#{entry.founderNumber}</span>
                      </span>
                    )}
                    {entry.userId === user?.id && (
                      <span className="text-[9px] font-bold text-primary bg-primary/10 rounded-full px-1.5 py-0.5">YOU</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-muted-foreground">{entry.totalTrades} trades</span>
                    <span className="text-xs text-muted-foreground">{entry.disciplinedPct.toFixed(0)}% disciplined</span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`text-sm font-bold ${entry.winRate >= 60 ? "text-emerald-500" : entry.winRate >= 40 ? "text-amber-500" : "text-red-500"}`}>
                    {entry.winRate.toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-muted-foreground">win rate</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground">How rankings work</span>
        </div>
        <ul className="space-y-1.5">
          {[
            "Win Rate: percentage of winning trades out of all completed trades",
            "Total Trades: total number of confirmed journal entries",
            "Discipline: percentage of trades tagged as 'Disciplined'",
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
              <span className="text-primary mt-0.5">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
