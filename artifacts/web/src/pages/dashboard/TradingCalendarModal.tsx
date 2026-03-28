import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useListTrades } from "@workspace/api-client-react";

function pnlBg(pnl: number, maxR = 4): string {
  const intensity = Math.min(Math.abs(pnl) / maxR, 1);
  const alpha = 0.25 + intensity * 0.6;
  return pnl > 0
    ? `rgba(34,197,94,${alpha.toFixed(2)})`
    : `rgba(239,68,68,${alpha.toFixed(2)})`;
}

export function TradingCalendarModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const modalRef = useRef<HTMLDivElement>(null);
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);

  const { data: apiTrades } = useListTrades();
  const trades = useMemo(() => (apiTrades || []) as Array<{
    pnl?: string | number | null;
    createdAt?: string | null;
    isDraft?: boolean | null;
    pair?: string | null;
    sideDirection?: string | null;
    outcome?: string | null;
    riskPct?: string | number | null;
  }>, [apiTrades]);

  const { dailyPnl, dailyTradeCount, dailyTrades } = useMemo(() => {
    const pnl: Record<string, number> = {};
    const count: Record<string, number> = {};
    const byDate: Record<string, typeof trades> = {};
    trades.forEach((t) => {
      if (t.isDraft || !t.createdAt) return;
      const dateStr = new Date(t.createdAt).toISOString().split("T")[0];
      const p = parseFloat(String(t.pnl ?? "0"));
      if (!isNaN(p)) {
        pnl[dateStr] = (pnl[dateStr] ?? 0) + p;
        count[dateStr] = (count[dateStr] ?? 0) + 1;
        if (!byDate[dateStr]) byDate[dateStr] = [];
        byDate[dateStr].push(t);
      }
    });
    return { dailyPnl: pnl, dailyTradeCount: count, dailyTrades: byDate };
  }, [trades]);

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const { year, month } = viewMonth;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDow = firstDay.getDay();
  const monthName = firstDay.toLocaleString("en-US", { month: "long" });

  const prevMonth = () => {
    setSelectedDate(null);
    setViewMonth(({ year: y, month: m }) =>
      m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 }
    );
  };
  const nextMonth = () => {
    setSelectedDate(null);
    setViewMonth(({ year: y, month: m }) =>
      m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 }
    );
  };

  const monFirstOffset = (startDow + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < monFirstOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  const weeklyTotals = weeks.map((week) => {
    let total = 0;
    let hasAny = false;
    week.forEach((day) => {
      if (!day) return;
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(day).padStart(2, "0");
      const dateStr = `${year}-${mm}-${dd}`;
      if (dailyPnl[dateStr] !== undefined) {
        total += dailyPnl[dateStr];
        hasAny = true;
      }
    });
    return hasAny ? total : null;
  });

  const monthPnlValues = Object.entries(dailyPnl)
    .filter(([d]) => d.startsWith(`${year}-${String(month + 1).padStart(2, "0")}`))
    .map(([, v]) => v);

  const winDays = monthPnlValues.filter((v) => v > 0).length;
  const lossDays = monthPnlValues.filter((v) => v < 0).length;
  const totalR = monthPnlValues.reduce((a, b) => a + b, 0);
  const bestDay = monthPnlValues.length ? Math.max(...monthPnlValues) : null;
  const worstDay = monthPnlValues.length ? Math.min(...monthPnlValues) : null;

  const streak = useMemo(() => {
    const sorted = Object.keys(dailyPnl).sort();
    if (!sorted.length) return null;
    let streakCount = 0;
    let sign: "win" | "loss" | null = null;
    for (let i = sorted.length - 1; i >= 0; i--) {
      const v = dailyPnl[sorted[i]];
      const s: "win" | "loss" = v > 0 ? "win" : "loss";
      if (sign === null) { sign = s; streakCount = 1; }
      else if (s === sign) streakCount++;
      else break;
    }
    return sign && streakCount >= 1 ? { sign, count: streakCount } : null;
  }, [dailyPnl]);

  const selectedTrades = useMemo(() => {
    if (!selectedDate) return [];
    return dailyTrades[selectedDate] || [];
  }, [selectedDate, dailyTrades]);

  useEffect(() => {
    if (!selectedDate) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedDate(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [selectedDate]);

  const handleDayClick = (dateStr: string, e: React.MouseEvent<HTMLButtonElement>) => {
    if (selectedDate === dateStr) {
      setSelectedDate(null);
      return;
    }
    const btn = e.currentTarget;
    const modal = modalRef.current;
    if (modal) {
      const btnRect = btn.getBoundingClientRect();
      const modalRect = modal.getBoundingClientRect();
      const popoverWidth = 220;
      const popoverHeight = 200;
      let top = btnRect.bottom - modalRect.top + 6;
      let left = btnRect.left - modalRect.left;
      if (left + popoverWidth > modalRect.width - 8) {
        left = modalRect.width - popoverWidth - 8;
      }
      if (left < 8) left = 8;
      if (top + popoverHeight > modalRect.height - 8) {
        top = btnRect.top - modalRect.top - popoverHeight - 6;
        if (top < 8) top = 8;
      }
      setPopoverPos({ top, left });
    }
    setSelectedDate(dateStr);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        ref={modalRef}
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-sm font-semibold text-foreground flex-1">Trading Calendar</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 pb-4" onClick={() => setSelectedDate(null)}>
          <div className="flex items-center justify-between py-2">
            <button onClick={prevMonth} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold text-foreground">{monthName} {year}</span>
            <button onClick={nextMonth} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-8 gap-1 text-center mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <span key={d} className="text-[10px] text-muted-foreground font-medium">{d}</span>
            ))}
            <span className="text-[10px] text-muted-foreground font-medium">Wk</span>
          </div>

          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-8 gap-1 mb-1">
              {week.map((day, di) => {
                if (!day) return <div key={di} className="aspect-square" />;
                const mm = String(month + 1).padStart(2, "0");
                const dd = String(day).padStart(2, "0");
                const dateStr = `${year}-${mm}-${dd}`;
                const pnl = dailyPnl[dateStr];
                const hasTrades = pnl !== undefined;
                const isProfit = hasTrades && pnl > 0;
                const isLoss = hasTrades && pnl < 0;
                const isToday = dateStr === todayStr;
                const count = dailyTradeCount[dateStr];
                const isSelected = selectedDate === dateStr;
                return (
                  <button
                    key={di}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasTrades) handleDayClick(dateStr, e);
                    }}
                    style={hasTrades ? { backgroundColor: pnlBg(pnl) } : undefined}
                    className={`aspect-square rounded-md text-[10px] transition-all flex flex-col items-center justify-center relative overflow-visible ${
                      hasTrades ? "cursor-pointer hover:opacity-90" : "cursor-default border border-border/40"
                    } ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : ""} ${
                      isSelected ? "ring-2 ring-white/70" : ""
                    }`}
                  >
                    {hasTrades && count > 0 && (
                      <span className="absolute top-0.5 right-0.5 bg-black/30 text-white text-[7px] font-bold rounded-full px-0.5 leading-tight min-w-[10px] text-center">
                        {count}
                      </span>
                    )}
                    <span className={`font-semibold leading-none ${hasTrades ? "text-white" : "text-muted-foreground/60"}`}>
                      {day}
                    </span>
                    {hasTrades && (
                      <span className="text-white/90 leading-none mt-0.5" style={{ fontSize: "7px" }}>
                        {pnl > 0 ? "+" : ""}{pnl.toFixed(1)}R
                      </span>
                    )}
                  </button>
                );
              })}
              <div className={`aspect-square rounded-md flex items-center justify-center text-[9px] font-semibold ${
                weeklyTotals[wi] === null
                  ? "text-muted-foreground/30"
                  : weeklyTotals[wi]! > 0
                  ? "text-green-400"
                  : "text-red-400"
              }`}>
                {weeklyTotals[wi] === null
                  ? "—"
                  : `${weeklyTotals[wi]! > 0 ? "+" : ""}${weeklyTotals[wi]!.toFixed(1)}R`}
              </div>
            </div>
          ))}

          {monthPnlValues.length > 0 && (
            <div className="mt-3 pt-2 border-t border-border">
              <div className="grid grid-cols-4 gap-1.5">
                <div className="bg-secondary/40 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-[9px] text-muted-foreground mb-0.5">Win/Loss</div>
                  <div className="text-[11px] font-bold text-foreground">{winDays}W / {lossDays}L</div>
                </div>
                <div className="bg-secondary/40 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-[9px] text-muted-foreground mb-0.5">Total R</div>
                  <div className={`text-[11px] font-bold ${totalR >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {totalR >= 0 ? "+" : ""}{totalR.toFixed(1)}R
                  </div>
                </div>
                <div className="bg-secondary/40 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-[9px] text-muted-foreground mb-0.5">Best</div>
                  <div className="text-[11px] font-bold text-green-400">
                    {bestDay !== null ? `+${bestDay.toFixed(1)}R` : "—"}
                  </div>
                </div>
                <div className="bg-secondary/40 rounded-lg px-2 py-1.5 text-center">
                  <div className="text-[9px] text-muted-foreground mb-0.5">Worst</div>
                  <div className="text-[11px] font-bold text-red-400">
                    {worstDay !== null ? `${worstDay.toFixed(1)}R` : "—"}
                  </div>
                </div>
              </div>
              {streak && (
                <div className={`mt-2 text-center text-[10px] font-semibold ${streak.sign === "win" ? "text-green-400" : "text-amber-400"}`}>
                  {streak.sign === "win" ? "🔥" : "⚠"} {streak.count}-day {streak.sign === "win" ? "win" : "loss"} streak
                </div>
              )}
            </div>
          )}
        </div>

        {selectedDate && popoverPos && dailyPnl[selectedDate] !== undefined && (() => {
          const dayWins = selectedTrades.filter((t) => {
            const outcome = String(t.outcome ?? "").toLowerCase();
            if (outcome.includes("win") || outcome === "w") return true;
            const p = parseFloat(String(t.pnl ?? "0"));
            return !isNaN(p) && p > 0;
          }).length;
          const dayLosses = selectedTrades.filter((t) => {
            const outcome = String(t.outcome ?? "").toLowerCase();
            if (outcome.includes("loss") || outcome.includes("lose") || outcome === "l") return true;
            const p = parseFloat(String(t.pnl ?? "0"));
            return !isNaN(p) && p < 0;
          }).length;
          return (
            <div
              className="absolute z-10 bg-popover border border-border rounded-xl shadow-2xl p-3 w-[220px]"
              style={{ top: popoverPos.top, left: popoverPos.left }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground">{selectedDate}</span>
                <button onClick={() => setSelectedDate(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-sm font-bold ${dailyPnl[selectedDate] >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {dailyPnl[selectedDate] >= 0 ? "+" : ""}{dailyPnl[selectedDate].toFixed(2)}R
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {dayWins}W / {dayLosses}L
                </span>
              </div>
              <div className="space-y-1 mb-2">
                {selectedTrades.slice(0, 5).map((t, i) => {
                  const tPnl = parseFloat(String(t.pnl ?? "0"));
                  const outcomeStr = t.outcome ? String(t.outcome) : null;
                  return (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1 min-w-0">
                        <span className="font-medium text-foreground truncate">{t.pair || "—"}</span>
                        {t.sideDirection && (
                          <span className={`px-1 rounded text-[8px] font-bold ${
                            String(t.sideDirection).toLowerCase().includes("long") || String(t.sideDirection).toLowerCase() === "buy"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}>
                            {String(t.sideDirection).toUpperCase().slice(0, 4)}
                          </span>
                        )}
                        {outcomeStr && (
                          <span className={`px-1 rounded text-[8px] font-bold ${
                            outcomeStr.toLowerCase().includes("win") || outcomeStr.toLowerCase() === "w"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}>
                            {outcomeStr.toUpperCase().slice(0, 4)}
                          </span>
                        )}
                      </div>
                      <span className={`font-semibold ml-1 shrink-0 ${tPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {tPnl >= 0 ? "+" : ""}{tPnl.toFixed(2)}R
                      </span>
                    </div>
                  );
                })}
              </div>
              <button
                onClick={() => { navigate(`/journal?date=${selectedDate}`); onClose(); }}
                className="w-full text-[10px] text-primary hover:underline text-left font-medium"
              >
                View in Journal →
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

export function TradingCalendarIconButton({ onClick }: { onClick: () => void }) {
  const today = new Date();
  const dayStr = today.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 bg-card border border-border rounded-xl hover:bg-secondary/40 hover:border-primary/40 transition-all"
      title="Open trading calendar"
    >
      <Calendar className="h-4 w-4 text-primary shrink-0" />
      <span className="text-xs font-semibold text-foreground">P&L Calendar</span>
      <span className="text-[10px] text-muted-foreground">{dayStr}</span>
    </button>
  );
}


