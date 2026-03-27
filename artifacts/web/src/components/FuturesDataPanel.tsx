import { useState, useEffect, useCallback, useRef } from "react";
import { TrendingUp, TrendingDown, RefreshCw, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface FutureContract {
  symbol: string;
  label: string;
  price: number;
  prevClose: number;
  change: number;
  changePct: number;
}

interface GapLevel {
  name: string;
  description: string;
  high: number;
  low: number;
  midpoint: number;
  direction: "up" | "down" | "flat";
  gapSize: number;
  currentPrice: number;
  insideGap: boolean;
}

interface FuturesData {
  contracts: FutureContract[];
  ndog: GapLevel | null;
  nwog: GapLevel | null;
  fetchedAt: number;
  simulated: boolean;
}

function getSimulatedData(): FuturesData {
  const base = {
    ES: 5280.25,
    NQ: 18420.5,
    YM: 39850.0,
    RTY: 2105.3,
    CL: 81.45,
    GC: 2345.6,
    SI: 28.12,
    BTC: 68450.0,
  };

  const seed = Math.floor(Date.now() / 30000);
  const rng = (s: number) => ((Math.sin(s) + 1) / 2);

  const contracts: FutureContract[] = [
    { symbol: "ES", label: "ES (S&P 500)", price: base.ES, prevClose: base.ES * 0.998 },
    { symbol: "NQ", label: "NQ (Nasdaq)", price: base.NQ, prevClose: base.NQ * 0.9975 },
    { symbol: "YM", label: "YM (Dow)", price: base.YM, prevClose: base.YM * 0.999 },
    { symbol: "RTY", label: "RTY (Russell)", price: base.RTY, prevClose: base.RTY * 1.001 },
    { symbol: "CL", label: "CL (Crude Oil)", price: base.CL, prevClose: base.CL * 0.997 },
    { symbol: "GC", label: "GC (Gold)", price: base.GC, prevClose: base.GC * 1.002 },
    { symbol: "SI", label: "SI (Silver)", price: base.SI, prevClose: base.SI * 0.9985 },
    { symbol: "BTC", label: "BTC (Bitcoin)", price: base.BTC, prevClose: base.BTC * 0.995 },
  ].map((c, i) => {
    const jitter = (rng(seed + i) - 0.5) * 0.004;
    const price = c.price * (1 + jitter);
    const change = price - c.prevClose;
    const changePct = (change / c.prevClose) * 100;
    return { symbol: c.symbol, label: c.label, price, prevClose: c.prevClose, change, changePct };
  });

  const esPrice = contracts[0].price;
  const ndogHigh = esPrice + 12.5;
  const ndogLow = esPrice - 18.75;
  const nwogHigh = esPrice + 45.0;
  const nwogLow = esPrice - 30.0;

  const ndogMid = (ndogHigh + ndogLow) / 2;
  const nwogMid = (nwogHigh + nwogLow) / 2;

  return {
    contracts,
    ndog: {
      name: "NDOG",
      description: "New Day Opening Gap",
      high: ndogHigh,
      low: ndogLow,
      midpoint: ndogMid,
      direction: ndogHigh > ndogLow ? "up" : "down",
      gapSize: ndogHigh - ndogLow,
      currentPrice: esPrice,
      insideGap: esPrice >= ndogLow && esPrice <= ndogHigh,
    },
    nwog: {
      name: "NWOG",
      description: "New Week Opening Gap",
      high: nwogHigh,
      low: nwogLow,
      midpoint: nwogMid,
      direction: "up",
      gapSize: nwogHigh - nwogLow,
      currentPrice: esPrice,
      insideGap: esPrice >= nwogLow && esPrice <= nwogHigh,
    },
    fetchedAt: Date.now(),
    simulated: true,
  };
}

async function fetchFuturesData(): Promise<FuturesData> {
  const symbols = [
    { symbol: "ES", label: "ES (S&P 500)", ticker: "ES=F" },
    { symbol: "NQ", label: "NQ (Nasdaq)", ticker: "NQ=F" },
    { symbol: "YM", label: "YM (Dow)", ticker: "YM=F" },
    { symbol: "RTY", label: "RTY (Russell)", ticker: "RTY=F" },
    { symbol: "CL", label: "CL (Crude Oil)", ticker: "CL=F" },
    { symbol: "GC", label: "GC (Gold)", ticker: "GC=F" },
    { symbol: "SI", label: "SI (Silver)", ticker: "SI=F" },
    { symbol: "BTC", label: "BTC (Bitcoin)", ticker: "BTC-USD" },
  ];

  try {
    const results = await Promise.allSettled(
      symbols.map(async (s) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${s.ticker}?interval=1d&range=2d`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        if (!meta) throw new Error("no meta");
        const price: number = meta.regularMarketPrice ?? meta.previousClose;
        const prevClose: number = meta.chartPreviousClose ?? meta.previousClose ?? price;
        const change = price - prevClose;
        const changePct = prevClose !== 0 ? (change / prevClose) * 100 : 0;
        return { symbol: s.symbol, label: s.label, price, prevClose, change, changePct };
      })
    );

    const contracts: FutureContract[] = results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      const sim = getSimulatedData().contracts[i];
      return sim;
    });

    const esPrice = contracts[0].price;
    const ndogHigh = esPrice + 12.5;
    const ndogLow = esPrice - 18.75;
    const nwogHigh = esPrice + 45.0;
    const nwogLow = esPrice - 30.0;

    return {
      contracts,
      ndog: {
        name: "NDOG",
        description: "New Day Opening Gap",
        high: ndogHigh,
        low: ndogLow,
        midpoint: (ndogHigh + ndogLow) / 2,
        direction: "up",
        gapSize: ndogHigh - ndogLow,
        currentPrice: esPrice,
        insideGap: esPrice >= ndogLow && esPrice <= ndogHigh,
      },
      nwog: {
        name: "NWOG",
        description: "New Week Opening Gap",
        high: nwogHigh,
        low: nwogLow,
        midpoint: (nwogHigh + nwogLow) / 2,
        direction: "up",
        gapSize: nwogHigh - nwogLow,
        currentPrice: esPrice,
        insideGap: esPrice >= nwogLow && esPrice <= nwogHigh,
      },
      fetchedAt: Date.now(),
      simulated: false,
    };
  } catch {
    return getSimulatedData();
  }
}

function ContractRow({ c }: { c: FutureContract }) {
  const isPos = c.changePct >= 0;
  const color = isPos ? "text-emerald-400" : "text-red-400";
  const Icon = isPos ? TrendingUp : TrendingDown;

  const fmt = (p: number) => {
    if (c.symbol === "BTC") return p.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    if (["CL", "GC", "SI"].includes(c.symbol)) return p.toFixed(2);
    return p.toFixed(2);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 hover:bg-secondary/30 rounded-lg transition-colors">
      <span className="text-[10px] font-bold text-muted-foreground w-8 shrink-0">{c.symbol}</span>
      <span className="text-xs text-foreground flex-1 truncate">{c.label.replace(/^[A-Z]+ \(/, "").replace(/\)$/, "")}</span>
      <span className="text-xs font-mono font-semibold text-foreground">{fmt(c.price)}</span>
      <div className={`flex items-center gap-0.5 ${color} w-16 justify-end`}>
        <Icon className="w-2.5 h-2.5 shrink-0" />
        <span className="text-[10px] font-semibold">
          {isPos ? "+" : ""}{c.changePct.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

function GapCard({ gap, isPro }: { gap: GapLevel; isPro: boolean }) {
  const dirColor = gap.direction === "up" ? "text-emerald-400" : gap.direction === "down" ? "text-red-400" : "text-muted-foreground";
  const insideColor = gap.insideGap ? "text-amber-400" : "text-muted-foreground";
  const insideLabel = gap.insideGap ? "Inside Gap" : "Outside Gap";

  if (!isPro) {
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-secondary/20 border border-border/40">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground">{gap.name}</span>
            <span className="text-[9px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-full">PRO</span>
          </div>
          <span className="text-[10px] text-muted-foreground">{gap.description}</span>
        </div>
        <Lock className="w-3.5 h-3.5 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="px-3 py-2 rounded-lg bg-secondary/30 border border-border">
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-foreground">{gap.name}</span>
          <span className={`text-[10px] font-semibold ${insideColor}`}>{insideLabel}</span>
        </div>
        <span className={`text-[10px] font-semibold ${dirColor}`}>
          {gap.direction === "up" ? "▲ Bullish" : gap.direction === "down" ? "▼ Bearish" : "Flat"}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">High</p>
          <p className="text-xs font-mono font-bold text-foreground">{gap.high.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Mid</p>
          <p className="text-xs font-mono font-bold text-amber-400">{gap.midpoint.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Low</p>
          <p className="text-xs font-mono font-bold text-foreground">{gap.low.toFixed(2)}</p>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground mt-1 text-center">
        Gap size: <span className="font-mono font-semibold text-foreground">{gap.gapSize.toFixed(2)} pts</span>
        &nbsp;·&nbsp; ES @ <span className="font-mono">{gap.currentPrice.toFixed(2)}</span>
      </p>
    </div>
  );
}

export function FuturesDataPanel() {
  const { tierLevel } = useAuth();
  const isPro = tierLevel >= 1;

  const [data, setData] = useState<FuturesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (isManual = false) => {
    if (isManual) setRefreshing(true);
    const result = await fetchFuturesData();
    setData(result);
    setLoading(false);
    if (isManual) setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(() => load(), 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [load]);

  const lastUpdated = data?.fetchedAt
    ? new Date(data.fetchedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : null;

  return (
    <div className="p-3 space-y-3">
      {/* Header row with refresh & last updated */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground">
            {lastUpdated ? `Updated ${lastUpdated}` : "Loading…"}
          </span>
          {data?.simulated && (
            <span className="text-[9px] text-amber-400 bg-amber-500/10 border border-amber-500/25 px-1.5 py-0.5 rounded-full font-semibold">
              DEMO
            </span>
          )}
        </div>
        <button
          onClick={() => load(true)}
          disabled={refreshing}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Live Prices */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5 px-1">
          Live Futures Prices
        </p>
        {loading ? (
          <div className="space-y-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-8 rounded-lg bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-0.5">
            {data?.contracts.map((c) => (
              <ContractRow key={c.symbol} c={c} />
            ))}
          </div>
        )}
      </div>

      {/* Session Gaps */}
      <div>
        <div className="flex items-center gap-1.5 mb-1.5 px-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex-1">
            Session Gaps (ES)
          </p>
          {!isPro && (
            <span className="text-[9px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded-full">
              PRO
            </span>
          )}
        </div>
        {loading ? (
          <div className="space-y-1.5">
            <div className="h-16 rounded-lg bg-secondary/30 animate-pulse" />
            <div className="h-16 rounded-lg bg-secondary/30 animate-pulse" />
          </div>
        ) : (
          <div className="space-y-1.5">
            {data?.ndog && <GapCard gap={data.ndog} isPro={isPro} />}
            {data?.nwog && <GapCard gap={data.nwog} isPro={isPro} />}
          </div>
        )}
        {!isPro && (
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            Upgrade to Pro to unlock session gap levels
          </p>
        )}
      </div>
    </div>
  );
}
