import { useNavigate } from "react-router-dom";
import { Award } from "lucide-react";
import { useListTrades } from "@workspace/api-client-react";

function scoreToGrade(score: number | null | undefined): string {
  if (score === null || score === undefined) return "—";
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B";
  if (score >= 60) return "C";
  return "D";
}

export function LastTradeGradeCard() {
  const navigate = useNavigate();
  const { data: apiTrades } = useListTrades();
  const trades = (apiTrades || []) as Array<{
    pnl?: string | number | null;
    createdAt?: string | null;
    isDraft?: boolean | null;
    setupScore?: string | number | null;
    pair?: string | null;
    ticker?: string | null;
    instrument?: string | null;
  }>;

  const lastTrade = trades.find((t) => !t.isDraft);

  if (!lastTrade) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Award className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-sm font-semibold text-foreground flex-1">Last Trade Grade</h3>
          <button onClick={() => navigate("/journal")} className="text-xs text-primary font-medium shrink-0">
            Journal ↗
          </button>
        </div>
        <p className="text-xs text-muted-foreground">No trades logged yet</p>
      </div>
    );
  }

  const rawScore = lastTrade.setupScore;
  const score = rawScore !== null && rawScore !== undefined ? parseFloat(String(rawScore)) : null;
  const grade = scoreToGrade(score);
  const symbol = lastTrade.ticker || lastTrade.pair || lastTrade.instrument || "—";
  const pnl = lastTrade.pnl !== null && lastTrade.pnl !== undefined
    ? parseFloat(String(lastTrade.pnl))
    : null;
  const dateStr = lastTrade.createdAt
    ? new Date(lastTrade.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

  const gradeColor =
    grade === "A+" || grade === "A" ? "#00C896"
    : grade === "B" ? "#F59E0B"
    : grade === "C" ? "#F97316"
    : grade === "D" ? "#EF4444"
    : "hsl(var(--muted-foreground))";

  const pnlIsPositive = pnl !== null && pnl > 0;
  const pnlIsNegative = pnl !== null && pnl < 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Award className="h-4 w-4 text-primary shrink-0" />
        <h3 className="text-sm font-semibold text-foreground flex-1">Last Trade Grade</h3>
        <button onClick={() => navigate("/journal")} className="text-xs text-primary font-medium shrink-0">
          Journal ↗
        </button>
      </div>
      <div className="flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 border"
          style={{ borderColor: `${gradeColor}40`, backgroundColor: `${gradeColor}15` }}
        >
          <span className="text-3xl font-black" style={{ color: gradeColor }}>{grade}</span>
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{symbol}</span>
            {dateStr && <span className="text-xs text-muted-foreground">{dateStr}</span>}
          </div>
          {score !== null && (
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden max-w-24">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${score}%`, backgroundColor: gradeColor }}
                />
              </div>
              <span className="text-xs text-muted-foreground font-mono">{Math.round(score)}/100</span>
            </div>
          )}
          {score === null && (
            <p className="text-xs text-muted-foreground">No setup score recorded</p>
          )}
          {pnl !== null && (
            <span className={`text-xs font-bold ${
              pnlIsPositive ? "text-emerald-400" : pnlIsNegative ? "text-red-400" : "text-muted-foreground"
            }`}>
              {pnlIsPositive ? "+" : ""}{pnl.toFixed(1)}R
            </span>
          )}
        </div>
      </div>
    </div>
  );
}


export function CandleSvg({ bullish }: { bullish: boolean }) {
  const bodyColor = bullish ? "#10b981" : "#ef4444";
  const wickColor = bullish ? "#34d399" : "#f87171";
  return (
    <svg width="28" height="48" viewBox="0 0 28 48" fill="none">
      <line x1="14" y1="2" x2="14" y2="12" stroke={wickColor} strokeWidth="2" strokeLinecap="round" />
      <rect
        x="5" y="12" width="18" height="22" rx="2"
        fill={bodyColor} fillOpacity="0.9"
      />
      <line x1="14" y1="34" x2="14" y2="46" stroke={wickColor} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

