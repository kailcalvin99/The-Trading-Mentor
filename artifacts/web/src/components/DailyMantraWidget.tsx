import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useListTrades } from "@workspace/api-client-react";

const STORAGE_KEY = "ict-daily-mantra";
const DEFAULT_MANTRA = "You got this";
const FLIP_DELAY_MS = 20_000;

const GLOW =
  "0 0 40px rgba(255,255,255,0.65), 0 0 16px rgba(255,255,255,0.4), 0 0 6px rgba(255,255,255,0.25)";

const shimmerKeyframes = `
@keyframes mantraWave {
  0%,100% { transform: translateY(0px); }
  50%      { transform: translateY(-6px); }
}
`;

function loadMantra(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_MANTRA;
  } catch {
    return DEFAULT_MANTRA;
  }
}

function usePnLChartData() {
  const { data: apiTrades } = useListTrades();
  const trades = (apiTrades || []) as Array<{
    pnl?: string | number | null;
    createdAt?: string | null;
    isDraft?: boolean | null;
  }>;

  const completed = trades
    .filter(
      (t) =>
        !t.isDraft &&
        t.createdAt &&
        t.pnl !== null &&
        t.pnl !== undefined
    )
    .slice()
    .reverse();

  let cumulative = 0;
  const chartData = completed.map((t, i) => {
    const pnl = parseFloat(String(t.pnl ?? "0"));
    cumulative += isNaN(pnl) ? 0 : pnl;
    const date = t.createdAt ? new Date(t.createdAt) : new Date();
    return {
      label: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      cumPnL: parseFloat(cumulative.toFixed(2)),
      idx: i + 1,
    };
  });

  const isPositive = cumulative >= 0;
  const chartColor = isPositive ? "#00C896" : "#EF4444";
  const hasData = chartData.length > 0;

  return { chartData, cumulative, isPositive, chartColor, hasData };
}

export default function DailyMantraWidget() {
  const [text, setText] = useState<string>(loadMantra);
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [showChart, setShowChart] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { chartData, cumulative, isPositive, chartColor, hasData } =
    usePnLChartData();

  function resetTimer() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowChart(false);
    timerRef.current = setTimeout(() => {
      setShowChart(true);
    }, FLIP_DELAY_MS);
  }

  useEffect(() => {
    if (!editing) {
      resetTimer();
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      setShowChart(false);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [editing]);

  function startEdit() {
    setEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }

  function commit(value: string) {
    const trimmed = value.trim() || DEFAULT_MANTRA;
    setText(trimmed);
    try {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } catch {}
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit(e.currentTarget.value);
    }
    if (e.key === "Escape") {
      setEditing(false);
    }
  }

  function handleChartClick(e: React.MouseEvent) {
    e.stopPropagation();
    resetTimer();
  }

  return (
    <>
      <style>{shimmerKeyframes}</style>
      <div
        className="relative flex items-center justify-center py-6 select-none overflow-hidden"
        style={{ minHeight: 96 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 70%)",
          }}
        />

        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            opacity: showChart ? 1 : 0,
            transition: "opacity 0.6s ease",
            pointerEvents: showChart ? "auto" : "none",
          }}
          onClick={handleChartClick}
          role="button"
          tabIndex={showChart ? 0 : -1}
          aria-label="Click to return to mantra"
          onKeyDown={(e) => e.key === "Enter" && showChart && resetTimer()}
        >
          <div className="w-full px-2">
            {!hasData ? (
              <div className="h-20 flex items-center justify-center">
                <p className="text-xs text-white/40">
                  Log trades to see your equity curve
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-1 px-1">
                  <span className="text-xs text-white/50">Cumulative P&L</span>
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                      isPositive
                        ? "text-emerald-400"
                        : "text-red-400"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {cumulative.toFixed(1)}R
                  </span>
                </div>
                <div className="h-16">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 2, right: 2, left: -32, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="mantraChartGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={chartColor}
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={chartColor}
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="label"
                        tick={{
                          fill: "rgba(255,255,255,0.3)",
                          fontSize: 8,
                        }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis hide />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: 8,
                          fontSize: 11,
                          color: "hsl(var(--foreground))",
                        }}
                        formatter={(v: number) => [
                          `${v > 0 ? "+" : ""}${v.toFixed(2)}R`,
                          "Cumul. P&L",
                        ]}
                        labelFormatter={(label) => label}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumPnL"
                        stroke={chartColor}
                        strokeWidth={1.5}
                        fill="url(#mantraChartGrad)"
                        dot={false}
                        activeDot={{ r: 3, fill: chartColor }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-center text-xs text-white/25 mt-1">
                  Click to return
                </p>
              </>
            )}
          </div>
        </div>

        <div
          className="w-full flex items-center justify-center"
          style={{
            opacity: showChart ? 0 : 1,
            transition: "opacity 0.6s ease",
            pointerEvents: showChart ? "none" : "auto",
          }}
        >
          {editing ? (
            <input
              ref={inputRef}
              defaultValue={text}
              onBlur={(e) => commit(e.target.value)}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="relative z-10 w-full max-w-2xl bg-transparent border-none outline-none text-center text-3xl md:text-4xl font-bold text-white caret-white tracking-tight"
              style={{ textShadow: GLOW }}
              spellCheck={false}
              autoComplete="off"
            />
          ) : (
            <span
              className="relative z-10 text-3xl md:text-4xl font-bold text-white text-center leading-tight tracking-tight cursor-pointer"
              style={{ display: "inline-flex", gap: 0 }}
              onClick={() => startEdit()}
              role="button"
              tabIndex={0}
              aria-label="Edit daily mantra"
              onKeyDown={(e) =>
                e.key === "Enter" && !editing && startEdit()
              }
            >
              {text.split("").map((char, i) => (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    textShadow: GLOW,
                    animation: `mantraWave 1.5s ease-in-out ${(i * 80) % 1200}ms infinite`,
                    whiteSpace: "pre",
                  }}
                >
                  {char}
                </span>
              ))}
            </span>
          )}

          {!editing && hovered && (
            <span className="absolute top-2 right-2 text-white/20 pointer-events-none z-10">
              <Pencil className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
      </div>
    </>
  );
}
