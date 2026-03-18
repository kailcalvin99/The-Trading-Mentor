import { useEffect, useRef, useState } from "react";
import { Sparkles, X, ChevronRight } from "lucide-react";
import { useMorningBriefing } from "@/hooks/useMorningBriefing";
import { useAuth } from "@/contexts/AuthContext";
import { useListTrades } from "@workspace/api-client-react";
import { useGetPropAccount } from "@workspace/api-client-react";

const AUTO_DISMISS_MS = 15000;

export default function MorningBriefingWidget() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "Trader";
  const { data: apiTrades } = useListTrades();
  const { data: propAccount } = useGetPropAccount();

  const startingBalance = propAccount?.startingBalance ?? 0;
  const balance = propAccount?.currentBalance ?? startingBalance;
  const drawdownPct = startingBalance > 0 ? ((startingBalance - balance) / startingBalance) * 100 : 0;

  const trades = (apiTrades || []) as Array<{
    outcome?: string | null;
    pnl?: string | number | null;
    createdAt?: string | null;
    isDraft?: boolean | null;
  }>;

  const { shouldShow, data, dismiss } = useMorningBriefing({ firstName, trades, drawdownPct, userId: user?.id });

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(100);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (shouldShow) {
      const t = setTimeout(() => setVisible(true), 50);
      return () => clearTimeout(t);
    }
  }, [shouldShow]);

  useEffect(() => {
    if (!visible) return;

    startTimeRef.current = Date.now();

    function tick() {
      if (!startTimeRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, 100 - (elapsed / AUTO_DISMISS_MS) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        frameRef.current = requestAnimationFrame(tick);
      }
    }

    frameRef.current = requestAnimationFrame(tick);

    dismissTimerRef.current = setTimeout(() => {
      handleDismiss();
    }, AUTO_DISMISS_MS);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [visible]);

  function handleDismiss() {
    setVisible(false);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setTimeout(() => dismiss(), 350);
  }

  if (!shouldShow) return null;

  return (
    <div
      className={`transition-all duration-350 overflow-hidden ${visible ? "opacity-100 max-h-96" : "opacity-0 max-h-0"}`}
      style={{ transition: "opacity 350ms ease, max-height 350ms ease" }}
    >
      <div
        className="bg-card border border-red-500/30 rounded-2xl overflow-hidden cursor-pointer hover:border-red-500/50 transition-colors"
        onClick={handleDismiss}
        role="button"
        tabIndex={0}
        aria-label="Dismiss morning briefing"
        onKeyDown={(e) => e.key === "Enter" && handleDismiss()}
      >
        <div className="flex items-center gap-2 px-4 py-2.5 bg-red-600/10 border-b border-red-500/20">
          <Sparkles className="h-3.5 w-3.5 text-red-500 shrink-0" />
          <span className="text-[11px] font-bold text-red-500 uppercase tracking-wider flex-1">AI Morning Briefing</span>
          <span className="text-[10px] text-muted-foreground">Tap to dismiss</span>
          <X className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        </div>

        <div className="px-4 pt-3 pb-2">
          {data && (
            <>
              <div className="flex items-start gap-3 mb-3">
                <span className="text-xl select-none shrink-0">🤖</span>
                <p className="text-sm text-foreground leading-relaxed">{data.briefingMessage}</p>
              </div>

              <div className="flex gap-3 mb-3 flex-wrap">
                <div className="flex items-center gap-1.5 bg-secondary/50 border border-border rounded-full px-2.5 py-1">
                  <span className="text-[10px] text-muted-foreground">Today P&L</span>
                  <span className={`text-[11px] font-bold ${data.todayPnL > 0 ? "text-emerald-400" : data.todayPnL < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                    {data.hasTrades ? data.todayPnLFormatted : "—"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-secondary/50 border border-border rounded-full px-2.5 py-1">
                  <span className="text-[10px] text-muted-foreground">Drawdown</span>
                  <span className={`text-[11px] font-bold ${data.drawdownPct >= 5 ? "text-red-400" : "text-muted-foreground"}`}>
                    {data.drawdownPct > 0 ? `${data.drawdownPct.toFixed(1)}%` : "0.0%"}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-secondary/50 border border-border rounded-full px-2.5 py-1">
                  <span className="text-[10px] text-muted-foreground">Streak</span>
                  <span className={`text-[11px] font-bold ${data.winStreak > 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {data.winStreak > 0 ? `${data.winStreak}W` : "—"}
                  </span>
                </div>
              </div>

              <div className="space-y-1 mb-3">
                {data.actionItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <ChevronRight className="h-3 w-3 text-red-500 shrink-0" />
                    <span className="text-xs text-muted-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="h-0.5 bg-muted/30">
          <div
            className="h-full bg-red-500/60 transition-none"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
