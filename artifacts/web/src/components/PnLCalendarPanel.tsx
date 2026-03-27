import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useListTrades } from "@workspace/api-client-react";

export default function PnLCalendarPanel() {
  const { data: apiTrades } = useListTrades();
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const trades = (apiTrades || []) as Array<{
    pnl?: string | number | null;
    createdAt?: string | null;
    isDraft?: boolean | null;
  }>;

  const dailyPnl: Record<string, number> = {};
  trades.forEach((t) => {
    if (t.isDraft || !t.createdAt) return;
    const dateStr = new Date(t.createdAt).toISOString().split("T")[0];
    const pnl = parseFloat(String(t.pnl ?? "0"));
    if (!isNaN(pnl)) dailyPnl[dateStr] = (dailyPnl[dateStr] ?? 0) + pnl;
  });

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const { year, month } = viewMonth;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDow = firstDay.getDay();
  const monthName = firstDay.toLocaleString("en-US", { month: "long" });

  const prevMonth = () =>
    setViewMonth(({ year: y, month: m }) =>
      m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 }
    );
  const nextMonth = () =>
    setViewMonth(({ year: y, month: m }) =>
      m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 }
    );

  const monFirstOffset = (startDow + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < monFirstOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={prevMonth}
          className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/70 border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs font-bold text-foreground">
          {monthName} {year}
        </span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg bg-secondary hover:bg-secondary/70 border border-border text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
              <th
                key={d}
                className="text-center text-[10px] font-semibold text-muted-foreground pb-1.5"
              >
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((day, ci) => {
                if (!day) {
                  return <td key={ci} className="p-0.5" />;
                }
                const mm = String(month + 1).padStart(2, "0");
                const dd = String(day).padStart(2, "0");
                const dateStr = `${year}-${mm}-${dd}`;
                const pnl = dailyPnl[dateStr];
                const hasTrades = pnl !== undefined;
                const isProfit = hasTrades && pnl > 0;
                const isLoss = hasTrades && pnl < 0;
                const isToday = dateStr === todayStr;

                return (
                  <td key={ci} className="p-0.5">
                    <div
                      className={[
                        "flex flex-col items-center justify-center rounded-md h-8 w-full transition-colors",
                        isProfit ? "bg-emerald-500/20" : "",
                        isLoss ? "bg-red-500/20" : "",
                        !hasTrades ? "opacity-40" : "",
                        isToday ? "ring-1 ring-primary ring-offset-0" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    >
                      <span
                        className={[
                          "text-[11px] font-semibold leading-none",
                          isProfit ? "text-emerald-400" : "",
                          isLoss ? "text-red-400" : "",
                          isToday && !hasTrades ? "text-primary" : "",
                          !hasTrades && !isToday ? "text-muted-foreground" : "",
                          hasTrades && isToday ? "" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {day}
                      </span>
                      {hasTrades && (
                        <span
                          className={[
                            "text-[8px] leading-none mt-0.5 font-medium",
                            isProfit ? "text-emerald-400" : "text-red-400",
                          ].join(" ")}
                        >
                          {pnl > 0 ? "+" : ""}
                          {pnl.toFixed(0)}
                        </span>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex gap-3 mt-3 pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500/50" />
          <span className="text-[10px] text-muted-foreground">Profit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-red-500/50" />
          <span className="text-[10px] text-muted-foreground">Loss</span>
        </div>
      </div>
    </div>
  );
}
