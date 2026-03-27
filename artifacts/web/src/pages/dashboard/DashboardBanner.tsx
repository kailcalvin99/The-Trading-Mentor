import { useState, useEffect, useRef } from "react";
import { Activity } from "lucide-react";
import { useListTrades } from "@workspace/api-client-react";
import { usePrices, useOpenTrades } from "@/hooks/useLiveMarket";
import { getESTNow, SESSIONS } from "@/lib/timeUtils";

export function useEstClock() {
  const [time, setTime] = useState(() => getESTNow());
  useEffect(() => {
    const id = setInterval(() => setTime(getESTNow()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

export function useScrollDirection() {
  const [scrollDir, setScrollDir] = useState<"up" | "down" | null>(null);
  const lastY = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      const dir = y < lastY.current ? "up" : "down";
      lastY.current = y;
      setScrollDir(dir);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setScrollDir(null), 1500);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return scrollDir;
}

export function useStatsData() {
  const { data: apiTrades, refetch } = useListTrades();

  useEffect(() => {
    const id = setInterval(() => refetch?.(), 60000);
    return () => clearInterval(id);
  }, [refetch]);

  const trades = (apiTrades || []) as Array<{
    pnl?: string | number | null;
    createdAt?: string | null;
    isDraft?: boolean | null;
  }>;

  const estNow = getESTNow();
  const todayStr = `${estNow.getFullYear()}-${String(estNow.getMonth() + 1).padStart(2, "0")}-${String(estNow.getDate()).padStart(2, "0")}`;
  const weekStart = new Date(estNow);
  weekStart.setDate(estNow.getDate() - ((estNow.getDay() + 6) % 7));
  const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, "0")}-${String(weekStart.getDate()).padStart(2, "0")}`;

  const completed = trades.filter(t => !t.isDraft && t.createdAt);
  const todayTrades = completed.filter(t => (t.createdAt ?? "").slice(0, 10) === todayStr);

  const todayRMultiple = todayTrades.reduce((sum, t) => {
    const r = parseFloat(String(t.pnl ?? "0"));
    return sum + (isNaN(r) ? 0 : r);
  }, 0);

  const last20 = completed.filter(t => t.pnl !== null && t.pnl !== undefined).slice(0, 20);
  const wins = last20.filter(t => parseFloat(String(t.pnl ?? "0")) > 0).length;
  const winRate = last20.length > 0 ? Math.round((wins / last20.length) * 100) : null;
  const weekTrades = completed.filter(t => (t.createdAt ?? "").slice(0, 10) >= weekStartStr).length;

  const h = estNow.getHours();
  const m = estNow.getMinutes();
  const totalMin = h * 60 + m;
  const activeSession = SESSIONS.find(s => totalMin >= s.startH * 60 + s.startM && totalMin < s.endH * 60 + s.endM);

  return { todayTrades, todayRMultiple, winRate, last20, weekTrades, activeSession };
}

export function DashboardBanner({
  user,
  onAvatarClick,
}: {
  user: { avatarUrl?: string | null; name?: string | null } | null | undefined;
  onAvatarClick: () => void;
}) {
  const { prices, loading: pricesLoading, hasKey } = usePrices();
  const { trades: openTrades } = useOpenTrades();
  const estTime = useEstClock();
  const { todayRMultiple, activeSession } = useStatsData();

  const firstName = user?.name?.split(" ")[0] || "Trader";
  const h = estTime.getHours();
  const timeGreeting = h < 12 ? "Morning" : h < 17 ? "Afternoon" : "Evening";

  const timeStr = estTime.toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true,
  });

  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });

  const anyDelayed = prices.some(p => p.delayed);
  const hasData = prices.some(p => p.price !== null);
  const pnlIsPositive = todayRMultiple > 0;
  const pnlIsNegative = todayRMultiple < 0;

  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-6xl mx-auto px-3 md:px-6">
        <div className="flex items-center gap-3 py-1.5">
          <button
            onClick={onAvatarClick}
            className="w-8 h-8 rounded-full bg-primary/20 border border-border flex items-center justify-center shrink-0 overflow-hidden hover:ring-2 hover:ring-primary/60 transition-all"
            title="Change avatar"
          >
            {user?.avatarUrl ? (
              user.avatarUrl.startsWith("data:") || user.avatarUrl.startsWith("http") ? (
                <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <span className="text-base leading-none">{user.avatarUrl}</span>
              )
            ) : (
              <span className="text-xs font-bold text-primary">{user?.name?.charAt(0)?.toUpperCase() || "T"}</span>
            )}
          </button>

          <div className="shrink-0 hidden sm:block">
            <p className="text-xs font-semibold text-foreground leading-none">{timeGreeting}, {firstName}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{dateStr}</p>
          </div>

          <div className="shrink-0 text-right hidden md:block">
            <p className="text-xs font-bold font-mono text-foreground leading-none">{timeStr}</p>
            <p className="text-[10px] text-muted-foreground">EST</p>
          </div>

          <div className="w-px h-5 bg-border shrink-0 hidden sm:block" />

          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex gap-1.5 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {!hasKey ? (
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">No market data</span>
              ) : pricesLoading && prices.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="shrink-0 h-5 w-14 rounded bg-secondary/40 animate-pulse" />
                ))
              ) : hasData ? (
                prices.map((item) => (
                  <div
                    key={item.symbol}
                    className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary/50 border border-border/60"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        item.delayed ? "bg-amber-400" : "bg-emerald-400 animate-pulse"
                      }`}
                    />
                    <span className="text-[10px] font-semibold text-foreground whitespace-nowrap">{item.label}</span>
                  </div>
                ))
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-1">
            {openTrades.length > 0 && (
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                openTrades[0].side === "BUY"
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                  : "bg-red-500/15 border-red-500/30 text-red-400"
              }`}>
                <Activity className="h-2.5 w-2.5" />
                <span>{openTrades[0].instrument} {openTrades[0].side}</span>
              </div>
            )}

            {activeSession && (
              <div
                className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-border/60 bg-secondary/50"
                style={{ color: activeSession.color }}
              >
                <span>{activeSession.emoji}</span>
                <span className="hidden sm:inline">{activeSession.name}</span>
              </div>
            )}

            {todayRMultiple !== 0 && (
              <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                pnlIsPositive ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                : pnlIsNegative ? "bg-red-500/15 border-red-500/30 text-red-400"
                : "bg-secondary/50 border-border/60 text-muted-foreground"
              }`}>
                {pnlIsPositive ? "+" : ""}{Math.abs(todayRMultiple).toFixed(1)}R
              </div>
            )}

            {anyDelayed && (
              <span className="text-[9px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20 hidden lg:inline">
                DELAYED
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
