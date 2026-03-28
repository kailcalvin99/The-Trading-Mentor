import { useState } from "react";
import { Share2, Copy, Check, X } from "lucide-react";

interface ShareStats {
  winRate: number;
  totalPnlPct: number;
  totalTrades: number;
  profitFactor: number;
  disciplineScore?: number;
}

interface ShareButtonProps {
  stats: ShareStats;
  label?: string;
  className?: string;
}

function buildShareText(stats: ShareStats): string {
  const sign = stats.totalPnlPct >= 0 ? "+" : "";
  const wr = Math.round(stats.winRate);
  const pnl = stats.totalPnlPct.toFixed(2);
  const pf = stats.profitFactor === Infinity ? "∞" : stats.profitFactor.toFixed(2);
  const trades = stats.totalTrades;
  const disc =
    stats.disciplineScore != null
      ? `\n🧠 Discipline: ${Math.round(stats.disciplineScore)}%`
      : "";

  return (
    `📊 My ICT Trading Performance\n` +
    `✅ Win Rate: ${wr}%\n` +
    `💰 Cumulative P&L: ${sign}${pnl}%\n` +
    `⚡ Profit Factor: ${pf}×\n` +
    `📈 Total Trades: ${trades}` +
    disc +
    `\n\nTrained with The Trading Mentor 🤖\nNot financial advice.`
  );
}

export function ShareButton({ stats, label = "Share Stats", className = "" }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const text = buildShareText(stats);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: "My ICT Trading Stats", text });
        setShowMenu(false);
        return;
      } catch (_) {}
    }
    setShowMenu(true);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowMenu(false);
      }, 2000);
    } catch (_) {}
  }

  return (
    <div className="relative">
      <button
        onClick={handleShare}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20 ${className}`}
      >
        <Share2 className="h-4 w-4" />
        {label}
      </button>

      {showMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border rounded-xl shadow-xl z-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-foreground">Share your stats</span>
              <button
                onClick={() => setShowMenu(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <pre className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 whitespace-pre-wrap break-words font-mono">
              {text}
            </pre>

            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy to clipboard
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
