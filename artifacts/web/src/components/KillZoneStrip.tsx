import { useState, useEffect } from "react";
import { Clock } from "lucide-react";
import { useListTrades } from "@workspace/api-client-react";

const SESSIONS = [
  { name: "London", emoji: "🌍", startH: 2, startM: 0, endH: 5, endM: 0, color: "#F59E0B", time: "2:00–5:00 AM EST" },
  { name: "NY Open", emoji: "📈", startH: 9, startM: 30, endH: 10, endM: 0, color: "#00C896", time: "9:30–10:00 AM EST" },
  { name: "Silver Bullet", emoji: "🎯", startH: 10, startM: 0, endH: 11, endM: 0, color: "#EF4444", time: "10:00–11:00 AM EST" },
  { name: "London Close", emoji: "🔔", startH: 11, startM: 0, endH: 12, endM: 0, color: "#818CF8", time: "11:00 AM–12:00 PM EST" },
];

function getESTNow(): Date {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  return new Date(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  );
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "LIVE";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function formatESTTime(date: Date): string {
  let h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, "0");
  const s = String(date.getSeconds()).padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${String(h).padStart(2, "0")}:${m}:${s} ${ampm}`;
}

export default function KillZoneStrip() {
  const [, setTick] = useState(0);

  const { data: apiTrades } = useListTrades();
  const trades = (apiTrades || []) as Array<{
    outcome?: string | null;
    pnl?: string | number | null;
    createdAt?: string | null;
    isDraft?: boolean | null;
  }>;

  const today = new Date().toDateString();
  const todayTrades = trades.filter((t) => {
    if (t.isDraft) return false;
    if (!t.createdAt) return false;
    return new Date(t.createdAt).toDateString() === today;
  });

  const todayCompleted = todayTrades.filter((t) => t.outcome === "win" || t.outcome === "loss");
  const todayWins = todayCompleted.filter((t) => t.outcome === "win").length;
  const todayWinRate = todayCompleted.length > 0 ? Math.round((todayWins / todayCompleted.length) * 100) : null;
  const todayPnL = todayTrades.reduce((sum, t) => {
    const v = parseFloat(String(t.pnl ?? "0"));
    return sum + (isNaN(v) ? 0 : v);
  }, 0);
  const hasTodayTrades = todayTrades.length > 0;
  const pnlColor = todayPnL > 0 ? "#00C896" : todayPnL < 0 ? "#EF4444" : undefined;

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const est = getESTNow();
  const nowMins = est.getHours() * 60 + est.getMinutes();

  function renderCards(prefix: string) {
    const sessionCards = SESSIONS.map((session) => {
      const startMins = session.startH * 60 + session.startM;
      const endMins = session.endH * 60 + session.endM;
      const isLive = endMins > startMins
        ? nowMins >= startMins && nowMins < endMins
        : nowMins >= startMins || nowMins < endMins;
      const isEnded = endMins > startMins
        ? nowMins >= endMins
        : nowMins >= endMins && nowMins < startMins;

      const target = new Date(est);
      target.setHours(session.startH, session.startM, 0, 0);
      if (!isLive && est >= target) target.setDate(target.getDate() + 1);
      const msUntil = isLive ? 0 : target.getTime() - est.getTime();
      const isNear = msUntil > 0 && msUntil <= 30 * 60 * 1000;

      return (
        <div
          key={prefix + session.name}
          className="flex-shrink-0 flex items-center gap-2 px-4 h-[48px] border rounded-xl transition-all border-border bg-[#020203]"
          style={{
            minWidth: 180,
            ...(isLive ? { borderColor: session.color, boxShadow: `0 0 10px ${session.color}30` } : {}),
          }}
        >
          <div
            className={`w-2 h-2 rounded-full shrink-0 ${isLive ? "animate-pulse" : ""}`}
            style={{ backgroundColor: isLive ? session.color : isNear ? "#F59E0B" : "#555" }}
          />
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-foreground whitespace-nowrap text-left text-[14px]">{session.emoji} {session.name}</span>
            <span className="text-muted-foreground whitespace-nowrap text-left text-[11px]">{session.time}</span>
          </div>
          {isLive ? (
            <span
              className="font-bold px-1.5 py-0.5 rounded-full shrink-0 text-[12px] ml-auto"
              style={{ backgroundColor: `${session.color}20`, color: session.color }}
            >
              LIVE
            </span>
          ) : isEnded ? (
            <span className="text-xs text-muted-foreground font-medium shrink-0 ml-auto">Ended</span>
          ) : (
            <span className="font-mono font-medium shrink-0 text-muted-foreground text-[10px] ml-auto">
              {formatCountdown(msUntil)}
            </span>
          )}
        </div>
      );
    });

    const statCards = [
      <div key={prefix + "pnl"} className="flex-shrink-0 flex items-center gap-2 px-3 h-[48px] bg-card border border-border rounded-xl" style={{ minWidth: 100 }}>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap leading-tight">Today's P&L</span>
          <span className="text-sm font-bold whitespace-nowrap leading-tight" style={{ color: hasTodayTrades ? pnlColor : undefined }}>
            {hasTodayTrades ? `${todayPnL >= 0 ? "+" : ""}${todayPnL.toFixed(1)}R` : "—"}
          </span>
        </div>
      </div>,
      <div key={prefix + "wr"} className="flex-shrink-0 flex items-center gap-2 px-3 h-[48px] bg-card border border-border rounded-xl" style={{ minWidth: 100 }}>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap leading-tight">Win Rate</span>
          <span className="text-sm font-bold whitespace-nowrap leading-tight" style={{ color: todayWinRate !== null ? (todayWinRate >= 50 ? "#00C896" : "#F59E0B") : undefined }}>
            {todayWinRate !== null ? `${todayWinRate}%` : "—"}
          </span>
        </div>
      </div>,
      <div key={prefix + "trades"} className="flex-shrink-0 flex items-center gap-2 px-3 h-[48px] bg-card border border-border rounded-xl" style={{ minWidth: 80 }}>
        <div className="flex flex-col min-w-0">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider whitespace-nowrap leading-tight">Trades</span>
          <span className="text-sm font-bold text-foreground whitespace-nowrap leading-tight">
            {todayCompleted.length > 0 ? String(todayCompleted.length) : "—"}
          </span>
        </div>
      </div>,
    ];

    return [...sessionCards, ...statCards];
  }

  const CLOCK_WIDTH = 178;

  return (
    <div
      className="border-b border-border bg-card/80 shrink-0 relative overflow-hidden"
      style={{ height: 64 }}
    >
      <style>{`
        @keyframes kz-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* Locked EST clock — sits on top, cards scroll behind it */}
      <div
        className="absolute left-0 top-0 h-full flex items-center pl-3 pr-2 z-20"
        style={{ width: CLOCK_WIDTH, background: "hsl(var(--card) / 0.95)" }}
      >
        <div
          className="flex items-center gap-2 px-3 h-[48px] border border-border rounded-xl w-full"
          style={{ background: "#02c896" }}
        >
          <Clock className="h-4 w-4 text-primary shrink-0" />
          <div className="flex flex-row items-center gap-1 min-w-0">
            <span className="text-xs font-bold text-muted-foreground">EST</span>
            <span className="text-sm font-mono font-bold text-foreground whitespace-nowrap">
              {formatESTTime(est)}
            </span>
          </div>
        </div>
      </div>

      {/* Gradient fade — cards dissolve as they pass behind the clock */}
      <div
        className="absolute top-0 h-full w-10 z-10 pointer-events-none"
        style={{
          left: CLOCK_WIDTH,
          background: "linear-gradient(to right, hsl(var(--card) / 0.9), transparent)",
        }}
      />

      {/* Infinite ticker area */}
      <div
        className="absolute top-0 h-full overflow-hidden"
        style={{ left: CLOCK_WIDTH + 8, right: 0 }}
      >
        <div
          style={{
            display: "flex",
            gap: 8,
            height: "100%",
            alignItems: "center",
            width: "max-content",
            animation: "kz-ticker 32s linear infinite",
          }}
        >
          {renderCards("a")}
          {renderCards("b")}
        </div>
      </div>

      {/* Right edge fade */}
      <div
        className="absolute top-0 right-0 h-full w-10 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, hsl(var(--card) / 0.9), transparent)" }}
      />
    </div>
  );
}
