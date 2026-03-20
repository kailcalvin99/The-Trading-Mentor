import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, AlertTriangle, Radio, Clock, Activity, Shield } from "lucide-react";
import { usePrices, useCalendarEvents, useOpenTrades, type PriceItem } from "@/hooks/useLiveMarket";
import { useGetPropAccount } from "@workspace/api-client-react";

function LiveBadge({ delayed }: { delayed: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
      delayed
        ? "bg-amber-500/20 text-amber-400"
        : "bg-emerald-500/20 text-emerald-400"
    }`}>
      <span className={`w-1.5 h-1.5 rounded-full ${delayed ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`} />
      {delayed ? "DELAYED" : "LIVE"}
    </span>
  );
}

function PricePill({ item }: { item: PriceItem }) {
  const isPositive = (item.changePct ?? 0) >= 0;
  const Arrow = isPositive ? TrendingUp : TrendingDown;
  const color = isPositive ? "text-emerald-400" : "text-red-400";

  const formatPrice = (p: number, sym: string) => {
    if (sym === "USDJPY") return p.toFixed(3);
    if (["EURUSD", "GBPUSD"].includes(sym)) return p.toFixed(5);
    return p.toFixed(2);
  };

  return (
    <div className="shrink-0 flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl bg-secondary/40 border border-border min-w-[90px]">
      <div className="flex items-center gap-1">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{item.label}</span>
        {item.approx && <span className="text-[9px] text-amber-400">~</span>}
      </div>
      {item.price !== null ? (
        <>
          <span className="text-sm font-bold font-mono text-foreground leading-none">
            {formatPrice(item.price, item.symbol)}
          </span>
          <div className={`flex items-center gap-0.5 ${color}`}>
            <Arrow className="h-2.5 w-2.5" />
            <span className="text-[10px] font-semibold">
              {isPositive ? "+" : ""}{(item.changePct ?? 0).toFixed(2)}%
            </span>
          </div>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">—</span>
      )}
    </div>
  );
}

export function LivePriceStrip() {
  const { prices, loading, lastUpdated, hasKey } = usePrices();
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasData = prices.some((p) => p.price !== null);
  const anyDelayed = prices.some((p) => p.delayed);

  if (!hasKey) {
    return (
      <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
        <p className="text-xs text-muted-foreground">Live prices unavailable — Finnhub API key not configured.</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
        <Radio className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
        <h3 className="text-xs font-semibold text-foreground flex-1">Live Market</h3>
        {!loading && <LiveBadge delayed={anyDelayed} />}
        {lastUpdated && (
          <span className="text-[10px] text-muted-foreground">
            {new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-4 py-3"
        style={{ scrollbarWidth: "none" }}
      >
        {loading && prices.length === 0 ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shrink-0 w-[90px] h-[58px] rounded-xl bg-secondary/40 animate-pulse" />
          ))
        ) : !hasData ? (
          <p className="text-xs text-muted-foreground py-2">No price data available.</p>
        ) : (
          prices.map((item) => <PricePill key={item.symbol} item={item} />)
        )}
      </div>
      {prices.some((p) => p.approx) && (
        <p className="text-[10px] text-muted-foreground px-4 pb-2">
          ~ Futures show ETF proxy price (QQQ≈NQ, SPY≈ES, DIA≈YM)
        </p>
      )}
    </div>
  );
}

export function OpenTradeCard() {
  const { trades, loading } = useOpenTrades();
  const { prices } = usePrices();
  const { data: account } = useGetPropAccount();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-sm font-semibold text-foreground flex-1">Open Position</h3>
        </div>
        <div className="h-8 rounded-lg bg-secondary/40 animate-pulse" />
      </div>
    );
  }

  if (trades.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="h-4 w-4 text-primary shrink-0" />
          <h3 className="text-sm font-semibold text-foreground flex-1">Open Position</h3>
        </div>
        <p className="text-xs text-muted-foreground">No open positions.</p>
      </div>
    );
  }

  const trade = trades[0];
  const matchedPrice = trade.entryPrice
    ? prices.find((p) => {
        const sym = trade.instrument?.toUpperCase() ?? "";
        return p.symbol === sym || p.label.replace("/", "") === sym || p.label === sym;
      })
    : null;

  const livePrice = matchedPrice?.price ?? null;
  const entryPrice = trade.entryPrice;
  let pnlDir = 0;
  let pnlPoints = 0;

  if (entryPrice && livePrice) {
    pnlPoints = trade.side === "BUY"
      ? livePrice - entryPrice
      : entryPrice - livePrice;
    pnlDir = pnlPoints > 0 ? 1 : pnlPoints < 0 ? -1 : 0;
  }

  const accountBalance = account?.startingBalance ?? 0;
  const riskDollars = accountBalance > 0 && trade.riskPct > 0
    ? (accountBalance * trade.riskPct) / 100
    : null;

  let pnlDollars: number | null = null;
  let rMultiple: number | null = null;

  if (pnlPoints !== 0 && entryPrice && entryPrice > 0) {
    const pnlPct = (pnlPoints / entryPrice) * 100;
    if (accountBalance > 0) {
      pnlDollars = (accountBalance * pnlPct) / 100;
    }
    if (riskDollars && riskDollars > 0 && pnlDollars !== null) {
      rMultiple = pnlDollars / riskDollars;
    }
  }

  const pnlColor = pnlDir > 0 ? "text-emerald-400" : pnlDir < 0 ? "text-red-400" : "text-muted-foreground";
  const pnlBg = pnlDir > 0 ? "border-emerald-500/30 bg-emerald-500/5" : pnlDir < 0 ? "border-red-500/30 bg-red-500/5" : "border-border";

  // Pulse when losing trade would push total drawdown to danger zone (>= 80% of max allowed)
  const currentBalance = account?.currentBalance ?? 0;
  const maxDrawdownAmt = accountBalance > 0 && account?.maxTotalDrawdownPct
    ? (accountBalance * account.maxTotalDrawdownPct) / 100
    : null;
  const existingDrawdown = accountBalance > 0 && currentBalance > 0
    ? accountBalance - currentBalance
    : 0;
  const projectedLoss = pnlDollars !== null && pnlDollars < 0 ? Math.abs(pnlDollars) : 0;
  const drawdownDanger = maxDrawdownAmt && maxDrawdownAmt > 0
    ? (existingDrawdown + projectedLoss) / maxDrawdownAmt >= 0.8
    : false;

  return (
    <div className={`bg-card border rounded-2xl p-4 ${pnlBg} transition-colors ${drawdownDanger ? "animate-pulse" : ""}`}>
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-primary shrink-0" />
        <h3 className="text-sm font-semibold text-foreground flex-1">Open Position</h3>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
          trade.side === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
        }`}>
          {trade.side}
        </span>
        <LiveBadge delayed={matchedPrice?.delayed ?? true} />
        <button
          onClick={() => navigate("/journal")}
          className="text-xs text-primary hover:text-primary/80 font-medium"
        >
          Complete ↗
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Instrument</p>
          <p className="text-sm font-bold text-foreground">{trade.instrument}</p>
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Entry</p>
          <p className="text-sm font-bold font-mono text-foreground">
            {entryPrice ? entryPrice.toFixed(entryPrice < 100 ? 5 : 2) : "—"}
          </p>
        </div>
        {livePrice !== null && (
          <>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Live Price</p>
              <p className="text-sm font-bold font-mono text-foreground">
                {livePrice.toFixed(livePrice < 100 ? 5 : 2)}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Running P&L</p>
              <p className={`text-sm font-bold font-mono ${pnlColor}`}>
                {pnlDollars !== null
                  ? `${pnlDir >= 0 ? "+" : ""}$${Math.abs(pnlDollars).toFixed(2)}`
                  : `${pnlDir >= 0 ? "+" : ""}${pnlPoints.toFixed(livePrice < 100 ? 5 : 1)} pts`}
              </p>
            </div>
            {rMultiple !== null && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">R-Multiple</p>
                <p className={`text-sm font-bold font-mono ${pnlColor}`}>
                  {rMultiple >= 0 ? "+" : ""}{rMultiple.toFixed(2)}R
                </p>
              </div>
            )}
            {trade.stopLoss !== null && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">SL Distance</p>
                <p className="text-sm font-bold font-mono text-red-400">
                  {Math.abs(livePrice - trade.stopLoss).toFixed(livePrice < 100 ? 5 : 1)} pts
                </p>
              </div>
            )}
            {trade.takeProfit !== null && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">TP Distance</p>
                <p className="text-sm font-bold font-mono text-emerald-400">
                  {Math.abs(trade.takeProfit - livePrice).toFixed(livePrice < 100 ? 5 : 1)} pts
                </p>
              </div>
            )}
          </>
        )}
        {trade.session && (
          <div className="col-span-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Session</p>
            <p className="text-xs text-foreground">{trade.session}</p>
          </div>
        )}
      </div>

      {trades.length > 1 && (
        <p className="text-[10px] text-muted-foreground mt-2">+{trades.length - 1} more open trade{trades.length > 2 ? "s" : ""}</p>
      )}
    </div>
  );
}

function formatEventTime(timeStr: string): string {
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return timeStr;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
  } catch {
    return timeStr;
  }
}

function isEventPast(timeStr: string): boolean {
  try {
    return new Date(timeStr).getTime() < Date.now();
  } catch {
    return false;
  }
}

function isEventSoon(timeStr: string): boolean {
  try {
    const diff = new Date(timeStr).getTime() - Date.now();
    return diff > 0 && diff < 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export function EconomicCalendarWidget() {
  const { events, loading } = useCalendarEvents();

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="h-4 w-4 text-primary shrink-0" />
        <h3 className="text-sm font-semibold text-foreground flex-1">Today's News</h3>
        <span className="text-[10px] text-muted-foreground">High/Med impact</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 rounded-lg bg-secondary/40 animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No major economic events today.</p>
      ) : (
        <div className="space-y-1.5">
          {events.map((ev, i) => {
            const past = isEventPast(ev.time);
            const soon = !past && isEventSoon(ev.time);
            const isHigh = ev.impact?.toLowerCase() === "high";

            return (
              <div
                key={i}
                className={`flex items-start gap-2.5 px-3 py-2 rounded-lg border text-xs ${
                  past
                    ? "border-border/40 bg-secondary/20 opacity-60"
                    : soon
                    ? "border-amber-500/40 bg-amber-500/10"
                    : "border-border bg-secondary/30"
                }`}
              >
                <div className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${
                  isHigh ? "bg-red-400" : "bg-amber-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold truncate ${past ? "text-muted-foreground" : "text-foreground"}`}>
                    {ev.event}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-muted-foreground font-mono">{formatEventTime(ev.time)}</span>
                    <span className="text-muted-foreground">{ev.country}</span>
                    {ev.actual && <span className="text-emerald-400 font-semibold">A: {ev.actual}</span>}
                    {!ev.actual && ev.estimate && <span className="text-amber-400">E: {ev.estimate}</span>}
                  </div>
                </div>
                {soon && (
                  <span className="text-[10px] font-bold text-amber-400 shrink-0">SOON</span>
                )}
                {past && ev.actual && (
                  <span className="text-[10px] text-muted-foreground shrink-0">DONE</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const SESSIONS_LIVE = [
  { name: "London", startH: 2, startM: 0, endH: 5, endM: 0, color: "#F59E0B" },
  { name: "NY Open", startH: 9, startM: 30, endH: 10, endM: 0, color: "#00C896" },
  { name: "Silver Bullet", startH: 10, startM: 0, endH: 11, endM: 0, color: "#EF4444" },
  { name: "London Close", startH: 11, startM: 0, endH: 12, endM: 0, color: "#818CF8" },
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
  if (ms <= 0) return "ending";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

export function KillZoneCountdownWidget() {
  const [now, setNow] = useState(() => getESTNow());

  useEffect(() => {
    const id = setInterval(() => setNow(getESTNow()), 1000);
    return () => clearInterval(id);
  }, []);

  const totalMin = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  const activeSession = SESSIONS_LIVE.find(
    (s) => totalMin >= s.startH * 60 + s.startM && totalMin < s.endH * 60 + s.endM
  );

  const nextSession = !activeSession
    ? SESSIONS_LIVE.find((s) => {
        const sessionStart = s.startH * 60 + s.startM;
        return sessionStart > totalMin;
      })
    : null;

  const minsUntilEnd = activeSession
    ? (activeSession.endH * 60 + activeSession.endM - totalMin) * 60 * 1000
    : 0;

  const minsUntilNext = nextSession
    ? (nextSession.startH * 60 + nextSession.startM - totalMin) * 60 * 1000
    : 0;

  return (
    <div className="bg-card border border-border rounded-2xl px-4 py-3">
      <div className="flex items-center gap-2 mb-2">
        <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
        <h3 className="text-xs font-semibold text-foreground flex-1">Kill Zone Timer</h3>
        <span className="text-[10px] font-mono text-muted-foreground">
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })} EST
        </span>
      </div>

      {activeSession ? (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: activeSession.color }} />
              <span className="text-sm font-bold" style={{ color: activeSession.color }}>{activeSession.name}</span>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">ACTIVE</span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Closes in <span className="font-bold text-foreground font-mono">{formatCountdown(minsUntilEnd)}</span>
            </p>
          </div>
        </div>
      ) : nextSession ? (
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full opacity-40" style={{ backgroundColor: nextSession.color }} />
            <span className="text-sm font-semibold text-muted-foreground">{nextSession.name}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Opens in <span className="font-bold text-foreground font-mono">{formatCountdown(minsUntilNext)}</span>
          </p>
        </div>
      ) : (
        <p className="text-sm font-semibold text-muted-foreground">Off-Hours</p>
      )}
    </div>
  );
}

export function DailyRiskGaugeWidget() {
  const { data: account } = useGetPropAccount();

  if (!account) {
    return (
      <div className="bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-3">
        <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
        <div>
          <p className="text-xs font-semibold text-foreground">Daily Risk Gauge</p>
          <p className="text-xs text-muted-foreground">Set up your prop account to track drawdown.</p>
        </div>
      </div>
    );
  }

  const startingBalance = account.startingBalance ?? 0;
  const dailyLoss = Math.abs(account.dailyLoss ?? 0);
  const maxDailyLossPct = account.maxDailyLossPct ?? 2;
  const maxDailyLossDollars = (startingBalance * maxDailyLossPct) / 100;
  const usedPct = maxDailyLossDollars > 0 ? Math.min((dailyLoss / maxDailyLossDollars) * 100, 100) : 0;

  const barColor =
    usedPct >= 80 ? "#EF4444"
    : usedPct >= 50 ? "#F59E0B"
    : "#00C896";

  const statusLabel =
    usedPct >= 80 ? "DANGER"
    : usedPct >= 50 ? "CAUTION"
    : "SAFE";

  const statusColor =
    usedPct >= 80 ? "text-red-400"
    : usedPct >= 50 ? "text-amber-400"
    : "text-emerald-400";

  return (
    <div className={`bg-card border rounded-2xl px-4 py-3 ${usedPct >= 80 ? "border-red-500/40 animate-pulse" : "border-border"}`}>
      <div className="flex items-center gap-2 mb-3">
        <Shield className="h-3.5 w-3.5 text-primary shrink-0" />
        <h3 className="text-xs font-semibold text-foreground flex-1">Daily Risk Gauge</h3>
        <span className={`text-[10px] font-bold ${statusColor}`}>{statusLabel}</span>
      </div>

      <div className="mb-2">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-muted-foreground">Used: <span className="font-bold text-foreground font-mono">${dailyLoss.toFixed(2)}</span></span>
          <span className="text-muted-foreground">Limit: <span className="font-mono">${maxDailyLossDollars.toFixed(2)}</span></span>
        </div>
        <div className="h-3 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${usedPct}%`, backgroundColor: barColor }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-muted-foreground">0%</span>
          <span className="text-[10px] font-bold font-mono" style={{ color: barColor }}>{usedPct.toFixed(1)}% used</span>
          <span className="text-[10px] text-muted-foreground">{maxDailyLossPct}% max</span>
        </div>
      </div>

      {usedPct >= 80 && (
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertTriangle className="h-3 w-3 text-red-400 shrink-0" />
          <p className="text-[10px] font-semibold text-red-400">Approaching daily loss limit — consider stopping</p>
        </div>
      )}
    </div>
  );
}
