import { useState, useEffect } from "react";
import { useListTrades } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { getESTNow, SESSIONS } from "@/lib/timeUtils";

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
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "America/New_York" });
}

export default function KillZoneStrip() {
  const [, setTick] = useState(0);
  const { user } = useAuth();

  const firstName = user?.name ? user.name.split(" ")[0] : "Trader";
  const avatarUrl = user?.avatarUrl ?? null;
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "T";

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
          className="flex-shrink-0 flex items-center gap-1.5 px-2.5 h-[28px] border rounded-lg transition-all border-border bg-[#020203] opacity-[0.5]"
          style={{
            minWidth: 140,
            ...(isLive ? { borderColor: session.color, boxShadow: `0 0 6px ${session.color}30` } : {}),
          }}
        >
          <div
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLive ? "animate-pulse" : ""}`}
            style={{ backgroundColor: isLive ? session.color : isNear ? "#F59E0B" : "#555" }}
          />
          <span className="font-bold text-foreground whitespace-nowrap text-[11px]">{session.emoji} {session.name}</span>
          {isLive ? (
            <span
              className="font-bold px-1 rounded-full shrink-0 text-[9px] ml-auto"
              style={{ backgroundColor: `${session.color}20`, color: session.color }}
            >
              LIVE
            </span>
          ) : isEnded ? (
            <span className="text-[9px] text-muted-foreground font-medium shrink-0 ml-auto">Ended</span>
          ) : (
            <span className="font-mono font-medium shrink-0 text-muted-foreground text-[9px] ml-auto">
              {formatCountdown(msUntil)}
            </span>
          )}
        </div>
      );
    });

    const statCards = [
      <div key={prefix + "pnl"} className="flex-shrink-0 flex items-center gap-1.5 px-2.5 h-[28px] bg-card border border-border rounded-lg" style={{ minWidth: 80 }}>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">P&L:</span>
        <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: hasTodayTrades ? pnlColor : undefined }}>
          {hasTodayTrades ? `${todayPnL >= 0 ? "+" : ""}${todayPnL.toFixed(1)}R` : "—"}
        </span>
      </div>,
      <div key={prefix + "wr"} className="flex-shrink-0 flex items-center gap-1.5 px-2.5 h-[28px] bg-card border border-border rounded-lg" style={{ minWidth: 70 }}>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">WR:</span>
        <span className="text-[11px] font-bold whitespace-nowrap" style={{ color: todayWinRate !== null ? (todayWinRate >= 50 ? "#00C896" : "#F59E0B") : undefined }}>
          {todayWinRate !== null ? `${todayWinRate}%` : "—"}
        </span>
      </div>,
      <div key={prefix + "trades"} className="flex-shrink-0 flex items-center gap-1.5 px-2.5 h-[28px] bg-card border border-border rounded-lg" style={{ minWidth: 60 }}>
        <span className="text-[9px] text-muted-foreground uppercase tracking-wider whitespace-nowrap">Trades:</span>
        <span className="text-[11px] font-bold text-foreground whitespace-nowrap">
          {todayCompleted.length > 0 ? String(todayCompleted.length) : "—"}
        </span>
      </div>,
    ];

    return [...sessionCards, ...statCards];
  }

  const CLOCK_WIDTH = 200;
  const dateStr = formatDate(new Date());
  const timeStr = formatESTTime(est);

  return (
    <div
      className="border-t border-border bg-card/90 shrink-0 relative overflow-hidden"
      style={{ height: 38 }}
    >
      <style>{`
        @keyframes kz-ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* Avatar + greeting — sits on top, cards scroll behind it */}
      <div
        className="absolute left-0 top-0 h-full flex items-center pl-2 pr-1.5 z-20"
        style={{ width: CLOCK_WIDTH, background: "hsl(var(--card) / 0.95)" }}
      >
        <div className="flex items-center gap-1.5 px-2 h-[26px] border border-border rounded-lg w-full bg-card">
          {avatarUrl && (avatarUrl.startsWith("http") || avatarUrl.startsWith("data:")) ? (
            <img
              src={avatarUrl}
              alt={firstName}
              className="w-5 h-5 rounded-full object-cover shrink-0 border border-border"
            />
          ) : avatarUrl && avatarUrl.length <= 4 ? (
            <div
              className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center border border-border text-sm leading-none"
              style={{ background: "#00C896" }}
            >
              {avatarUrl}
            </div>
          ) : (
            <div
              className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold border border-border"
              style={{ background: "#00C896", color: "#020203" }}
            >
              {initials}
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <span className="text-[10px] font-semibold text-foreground whitespace-nowrap leading-none">{firstName} · {timeStr} EST</span>
            <span className="text-[9px] text-muted-foreground whitespace-nowrap leading-none">{dateStr}</span>
          </div>
        </div>
      </div>

      {/* Gradient fade — cards dissolve as they pass behind the clock */}
      <div
        className="absolute top-0 h-full w-8 z-10 pointer-events-none"
        style={{
          left: CLOCK_WIDTH,
          background: "linear-gradient(to right, hsl(var(--card) / 0.9), transparent)",
        }}
      />

      {/* Infinite ticker area */}
      <div
        className="absolute top-0 h-full overflow-hidden"
        style={{ left: CLOCK_WIDTH + 6, right: 0 }}
      >
        <div
          style={{
            display: "flex",
            gap: 6,
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
        className="absolute top-0 right-0 h-full w-8 z-10 pointer-events-none"
        style={{ background: "linear-gradient(to left, hsl(var(--card) / 0.9), transparent)" }}
      />
    </div>
  );
}
