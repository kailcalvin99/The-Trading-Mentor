import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useListTrades } from "@workspace/api-client-react";

export function CumulativePnLChart() {
  const navigate = useNavigate();
  const { data: apiTrades } = useListTrades();
  const trades = (apiTrades || []) as Array<{
    pnl?: string | number | null;
    createdAt?: string | null;
    isDraft?: boolean | null;
  }>;

  const completed = trades
    .filter((t) => !t.isDraft && t.createdAt && t.pnl !== null && t.pnl !== undefined)
    .slice()
    .reverse();

  let cumulative = 0;
  const chartData = completed.map((t, i) => {
    const pnl = parseFloat(String(t.pnl ?? "0"));
    cumulative += isNaN(pnl) ? 0 : pnl;
    const date = t.createdAt ? new Date(t.createdAt) : new Date();
    return {
      label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      cumPnL: parseFloat(cumulative.toFixed(2)),
      idx: i + 1,
    };
  });

  const isPositive = cumulative >= 0;
  const chartColor = isPositive ? "#00C896" : "#EF4444";
  const hasData = chartData.length > 0;

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="h-4 w-4 text-primary shrink-0" />
        <h3 className="text-sm font-semibold text-foreground flex-1">Cumulative P&L</h3>
        {hasData && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${
            isPositive
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
              : "bg-red-500/15 border-red-500/30 text-red-400"
          }`}>
            {isPositive ? "+" : ""}{cumulative.toFixed(1)}R
          </span>
        )}
        <button onClick={() => navigate("/analytics")} className="text-xs text-primary font-medium shrink-0">
          Analytics ↗
        </button>
      </div>
      {!hasData ? (
        <div className="h-28 flex items-center justify-center">
          <p className="text-xs text-muted-foreground">Log trades to see your equity curve</p>
        </div>
      ) : (
        <div className="h-28">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColor} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={chartColor} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 9 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}R`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 11,
                  color: "hsl(var(--foreground))",
                }}
                formatter={(v: number) => [`${v > 0 ? "+" : ""}${v.toFixed(2)}R`, "Cumul. P&L"]}
                labelFormatter={(label) => label}
              />
              <Area
                type="monotone"
                dataKey="cumPnL"
                stroke={chartColor}
                strokeWidth={1.5}
                fill="url(#pnlGrad)"
                dot={false}
                activeDot={{ r: 3, fill: chartColor }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
