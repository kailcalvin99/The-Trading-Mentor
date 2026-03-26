import { useState, useEffect, useRef, useCallback } from "react";
import { createChart, ColorType, type IChartApi, type ISeriesApi, type SeriesMarker, type Time } from "lightweight-charts";
import { Play, Pause, SkipForward, SkipBack, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const INSTRUMENTS = ["EUR/USD", "GBP/USD", "GBP/JPY", "NAS100", "US30", "XAU/USD"];
const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "Daily"];
const SPEEDS = [1, 5, 10, 50];

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface Position {
  id: string;
  direction: "buy" | "sell";
  lotSize: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  entryTime: number;
  pair: string;
}

interface ClosedTrade {
  id: string;
  direction: "buy" | "sell";
  lotSize: number;
  entryPrice: number;
  exitPrice: number;
  stopLoss: number;
  takeProfit: number;
  entryTime: number;
  exitTime: number;
  pair: string;
  pnlUsd: number;
  closedBy: "sl" | "tp" | "manual";
}

function calcPnl(pos: Position, exitPrice: number): number {
  const priceDiff = pos.direction === "buy"
    ? (exitPrice - pos.entryPrice)
    : (pos.entryPrice - exitPrice);

  if (pos.pair === "NAS100" || pos.pair === "US30") {
    return priceDiff * pos.lotSize;
  }

  if (pos.pair === "XAU/USD") {
    return priceDiff * pos.lotSize * 100;
  }

  const pipSize = pos.pair === "GBP/JPY" ? 0.01 : 0.0001;
  const pipsCount = priceDiff / pipSize;
  const pipValueUsd = pos.pair === "GBP/JPY" ? pos.lotSize * 9.0 : pos.lotSize * 10;
  return pipsCount * pipValueUsd;
}

function formatPrice(price: number): string {
  if (price >= 10000) return price.toFixed(2);
  if (price >= 100) return price.toFixed(3);
  return price.toFixed(5);
}

export default function PaperTradingPage() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersRef = useRef<SeriesMarker<Time>[]>([]);
  const prevIndexRef = useRef<number>(0);

  const [instrument, setInstrument] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("15m");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [allCandles, setAllCandles] = useState<Candle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(false);

  const [direction, setDirection] = useState<"buy" | "sell">("buy");
  const [lotSize, setLotSize] = useState("0.10");
  const [slPrice, setSlPrice] = useState("");
  const [tpPrice, setTpPrice] = useState("");

  const [positions, setPositions] = useState<Position[]>([]);
  const [closedTrades, setClosedTrades] = useState<ClosedTrade[]>([]);
  const [savingJournal, setSavingJournal] = useState<string[]>([]);

  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function updateChartMarkers(newMarkers: SeriesMarker<Time>[]) {
    markersRef.current = newMarkers;
    if (seriesRef.current) {
      seriesRef.current.setMarkers(newMarkers);
    }
  }

  function addMarker(marker: SeriesMarker<Time>) {
    const sorted = [...markersRef.current, marker].sort(
      (a, b) => (a.time as number) - (b.time as number),
    );
    updateChartMarkers(sorted);
  }

  const fetchCandles = useCallback(async () => {
    setLoading(true);
    setIsPlaying(false);
    setPositions([]);
    setClosedTrades([]);
    setCurrentIndex(0);
    prevIndexRef.current = 0;
    updateChartMarkers([]);
    if (playIntervalRef.current) clearInterval(playIntervalRef.current);

    try {
      const params = new URLSearchParams({
        symbol: instrument,
        interval: timeframe,
        from: startDate,
        to: endDate,
      });
      const res = await fetch(`${API_BASE}/replay/candles?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch candles");
      const data: Candle[] = await res.json();
      setAllCandles(data);
      if (data.length > 0) {
        setCurrentIndex(1);
        prevIndexRef.current = 1;
      }
      if (data.length < 5) {
        toast.warning(
          "Limited candle data returned for the selected range or symbol. Try a wider date range or different instrument."
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load candles";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [instrument, timeframe, startDate, endDate]);

  useEffect(() => {
    if (!chartContainerRef.current) return;
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#9ca3af",
      },
      grid: {
        vertLines: { color: "#1f2937" },
        horzLines: { color: "#1f2937" },
      },
      width: chartContainerRef.current.clientWidth,
      height: 420,
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#374151",
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#ef4444",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const observer = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    });
    observer.observe(chartContainerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || allCandles.length === 0) return;
    const visible = allCandles.slice(0, currentIndex);
    seriesRef.current.setData(
      visible.map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      })),
    );
    if (chartRef.current && visible.length > 0) {
      chartRef.current.timeScale().fitContent();
    }
    seriesRef.current.setMarkers(markersRef.current);
  }, [allCandles, currentIndex]);

  useEffect(() => {
    if (!isPlaying || allCandles.length === 0) return;

    const intervalMs = Math.max(50, 500 / speed);
    playIntervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => {
        if (prev >= allCandles.length) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, [isPlaying, speed, allCandles.length]);

  useEffect(() => {
    const prev = prevIndexRef.current;
    const isSteppingForward = currentIndex > prev;
    prevIndexRef.current = currentIndex;

    if (!isSteppingForward) return;
    if (currentIndex === 0 || allCandles.length === 0) return;
    const latestCandle = allCandles[currentIndex - 1];
    if (!latestCandle) return;

    setPositions((prevPositions) => {
      const remaining: Position[] = [];
      const newClosed: ClosedTrade[] = [];

      for (const pos of prevPositions) {
        let closed = false;
        let exitPrice = 0;
        let closedBy: "sl" | "tp" = "sl";

        if (pos.direction === "buy") {
          if (latestCandle.low <= pos.stopLoss) {
            exitPrice = pos.stopLoss;
            closedBy = "sl";
            closed = true;
          } else if (latestCandle.high >= pos.takeProfit) {
            exitPrice = pos.takeProfit;
            closedBy = "tp";
            closed = true;
          }
        } else {
          if (latestCandle.high >= pos.stopLoss) {
            exitPrice = pos.stopLoss;
            closedBy = "sl";
            closed = true;
          } else if (latestCandle.low <= pos.takeProfit) {
            exitPrice = pos.takeProfit;
            closedBy = "tp";
            closed = true;
          }
        }

        if (closed) {
          const pnl = calcPnl(pos, exitPrice);
          const closedTrade: ClosedTrade = {
            ...pos,
            exitPrice,
            exitTime: latestCandle.time,
            pnlUsd: pnl,
            closedBy,
          };
          newClosed.push(closedTrade);

          addMarker({
            time: latestCandle.time as Time,
            position: closedBy === "tp" ? "aboveBar" : "belowBar",
            color: closedBy === "tp" ? "#22c55e" : "#ef4444",
            shape: closedBy === "tp" ? "arrowUp" : "arrowDown",
            text: closedBy === "tp" ? `TP +$${pnl.toFixed(0)}` : `SL -$${Math.abs(pnl).toFixed(0)}`,
          });
        } else {
          remaining.push(pos);
        }
      }

      if (newClosed.length > 0) {
        setClosedTrades((ct) => [...ct, ...newClosed]);
        for (const ct of newClosed) {
          if (ct.closedBy === "tp") {
            toast.success(`${ct.pair} ${ct.direction.toUpperCase()} — TP hit! +$${ct.pnlUsd.toFixed(2)}`);
          } else {
            toast.error(`${ct.pair} ${ct.direction.toUpperCase()} — SL hit. -$${Math.abs(ct.pnlUsd).toFixed(2)}`);
          }
        }
      }

      return remaining;
    });
  }, [currentIndex, allCandles]);

  function placeOrder() {
    const lot = parseFloat(lotSize);
    const sl = parseFloat(slPrice);
    const tp = parseFloat(tpPrice);

    if (isNaN(lot) || lot < 0.01 || lot > 10) {
      toast.error("Lot size must be between 0.01 and 10");
      return;
    }
    if (isNaN(sl) || sl <= 0) {
      toast.error("Enter a valid stop loss price");
      return;
    }
    if (isNaN(tp) || tp <= 0) {
      toast.error("Enter a valid take profit price");
      return;
    }
    if (currentIndex === 0 || allCandles.length === 0) {
      toast.error("Load and start the replay first");
      return;
    }

    const latestCandle = allCandles[currentIndex - 1];
    const entryPrice = latestCandle.close;

    const pos: Position = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      direction,
      lotSize: lot,
      entryPrice,
      stopLoss: sl,
      takeProfit: tp,
      entryTime: latestCandle.time,
      pair: instrument,
    };

    setPositions((prev) => [...prev, pos]);

    addMarker({
      time: latestCandle.time as Time,
      position: direction === "buy" ? "belowBar" : "aboveBar",
      color: direction === "buy" ? "#22c55e" : "#ef4444",
      shape: direction === "buy" ? "arrowUp" : "arrowDown",
      text: `${direction.toUpperCase()} @ ${formatPrice(entryPrice)}`,
    });

    toast.success(`${direction.toUpperCase()} order placed at ${formatPrice(entryPrice)}`);
  }

  function closePosition(id: string) {
    const pos = positions.find((p) => p.id === id);
    if (!pos || currentIndex === 0) return;
    const latestCandle = allCandles[currentIndex - 1];
    const exitPrice = latestCandle.close;
    const pnl = calcPnl(pos, exitPrice);
    setPositions((prev) => prev.filter((p) => p.id !== id));
    setClosedTrades((prev) => [
      ...prev,
      { ...pos, exitPrice, exitTime: latestCandle.time, pnlUsd: pnl, closedBy: "manual" as const },
    ]);

    addMarker({
      time: latestCandle.time as Time,
      position: "aboveBar",
      color: "#a855f7",
      shape: "circle",
      text: `Closed $${pnl.toFixed(0)}`,
    });

    toast(`${pos.pair} closed manually. PnL: $${pnl.toFixed(2)}`);
  }

  async function saveToJournal(trade: ClosedTrade) {
    setSavingJournal((prev) => [...prev, trade.id]);
    try {
      const res = await fetch(`${API_BASE}/trades`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pair: trade.pair,
          entryTime: new Date(trade.entryTime * 1000).toISOString(),
          riskPct: "1.00",
          liquiditySweep: false,
          isDraft: true,
          sideDirection: trade.direction,
          entryPrice: trade.entryPrice.toString(),
          stopLoss: trade.stopLoss.toString(),
          takeProfit: trade.takeProfit.toString(),
          outcome: trade.closedBy === "tp" ? "win" : trade.closedBy === "sl" ? "loss" : "breakeven",
          notes: `Paper trade replay. PnL: $${trade.pnlUsd.toFixed(2)}. Closed by: ${trade.closedBy}`,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      toast.success("Saved to journal as draft");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save to journal";
      toast.error(message);
    } finally {
      setSavingJournal((prev) => prev.filter((id) => id !== trade.id));
    }
  }

  const totalTrades = closedTrades.length;
  const wins = closedTrades.filter((t) => t.pnlUsd > 0).length;
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : "0.0";
  const totalPnl = closedTrades.reduce((sum, t) => sum + t.pnlUsd, 0);
  const avgRR =
    totalTrades > 0
      ? (
          closedTrades.reduce((sum, t) => {
            const risk = Math.abs(t.entryPrice - t.stopLoss);
            const reward = Math.abs(t.exitPrice - t.entryPrice);
            return sum + (risk > 0 ? reward / risk : 0);
          }, 0) / totalTrades
        ).toFixed(2)
      : "0.00";

  const latestPrice =
    currentIndex > 0 && allCandles[currentIndex - 1]
      ? allCandles[currentIndex - 1].close
      : null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Paper Trading Replay</h1>
            <p className="text-sm text-muted-foreground">Practise ICT setups on real historical data</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-end bg-card border border-border rounded-xl p-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Instrument</label>
            <div className="relative">
              <select
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
                className="appearance-none bg-secondary border border-border rounded-lg px-3 py-2 text-sm pr-8 focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {INSTRUMENTS.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Timeframe</label>
            <div className="flex gap-1">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    timeframe === tf
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">Start Date</label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              min={new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <button
            onClick={fetchCandles}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 mt-auto"
          >
            {loading ? "Loading…" : "Load Candles"}
          </button>

          {allCandles.length > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <button
                onClick={() => {
                  prevIndexRef.current = currentIndex - 1;
                  setCurrentIndex((i) => Math.max(1, i - 1));
                }}
                disabled={currentIndex <= 1}
                className="p-2 bg-secondary rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                title="Step back"
              >
                <SkipBack className="h-4 w-4" />
              </button>
              <button
                onClick={() => setIsPlaying((p) => !p)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg flex items-center gap-2 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button
                onClick={() => {
                  prevIndexRef.current = currentIndex;
                  setCurrentIndex((i) => Math.min(allCandles.length, i + 1));
                }}
                disabled={currentIndex >= allCandles.length}
                className="p-2 bg-secondary rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                title="Step forward"
              >
                <SkipForward className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1 bg-secondary rounded-lg px-2">
                {SPEEDS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    className={`px-2 py-1.5 text-xs font-medium rounded transition-colors ${
                      speed === s ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>
              <span className="text-xs text-muted-foreground">
                {currentIndex}/{allCandles.length}
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 bg-card border border-border rounded-xl overflow-hidden">
            {allCandles.length === 0 && !loading && (
              <div className="flex items-center justify-center h-[420px] text-muted-foreground text-sm">
                Select an instrument and click "Load Candles" to begin
              </div>
            )}
            {loading && (
              <div className="flex items-center justify-center h-[420px] text-muted-foreground text-sm">
                Fetching historical data…
              </div>
            )}
            <div
              ref={chartContainerRef}
              className={allCandles.length === 0 || loading ? "hidden" : ""}
              style={{ height: 420 }}
            />
          </div>

          <div className="space-y-3">
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold">Place Order</h3>
              {latestPrice !== null && (
                <p className="text-xs text-muted-foreground">
                  Current price: <span className="text-foreground font-mono">{formatPrice(latestPrice)}</span>
                </p>
              )}

              <div className="flex gap-2">
                <button
                  onClick={() => setDirection("buy")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    direction === "buy"
                      ? "bg-green-500/20 text-green-400 border border-green-500/40"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  Buy
                </button>
                <button
                  onClick={() => setDirection("sell")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    direction === "sell"
                      ? "bg-red-500/20 text-red-400 border border-red-500/40"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <TrendingDown className="h-3.5 w-3.5" />
                  Sell
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-xs text-muted-foreground">Lot Size</label>
                  <input
                    type="number"
                    value={lotSize}
                    min="0.01"
                    max="10"
                    step="0.01"
                    onChange={(e) => setLotSize(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Stop Loss</label>
                  <input
                    type="number"
                    value={slPrice}
                    step="0.00001"
                    placeholder="e.g. 1.08500"
                    onChange={(e) => setSlPrice(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Take Profit</label>
                  <input
                    type="number"
                    value={tpPrice}
                    step="0.00001"
                    placeholder="e.g. 1.09200"
                    onChange={(e) => setTpPrice(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                </div>
              </div>

              <button
                onClick={placeOrder}
                disabled={allCandles.length === 0 || currentIndex === 0}
                className={`w-full py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 ${
                  direction === "buy"
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
              >
                Place {direction === "buy" ? "Buy" : "Sell"} Order
              </button>
            </div>

            {positions.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-semibold">Open Positions</h3>
                {positions.map((pos) => {
                  const currentPnl = latestPrice !== null ? calcPnl(pos, latestPrice) : 0;
                  return (
                    <div key={pos.id} className="bg-secondary/50 rounded-lg p-3 space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className={`font-bold ${pos.direction === "buy" ? "text-green-400" : "text-red-400"}`}>
                          {pos.direction.toUpperCase()} {pos.lotSize} lots
                        </span>
                        <span className={`font-mono font-bold ${currentPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {currentPnl >= 0 ? "+" : ""}${currentPnl.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        Entry: <span className="font-mono text-foreground">{formatPrice(pos.entryPrice)}</span>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-muted-foreground">
                          SL: <span className="font-mono text-red-400">{formatPrice(pos.stopLoss)}</span>
                        </span>
                        <span className="text-muted-foreground">
                          TP: <span className="font-mono text-green-400">{formatPrice(pos.takeProfit)}</span>
                        </span>
                      </div>
                      <button
                        onClick={() => closePosition(pos.id)}
                        className="mt-1 text-xs text-muted-foreground hover:text-foreground underline"
                      >
                        Close manually
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {totalTrades > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">{totalTrades}</div>
              <div className="text-xs text-muted-foreground mt-1">Total Trades</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <div
                className={`text-2xl font-bold ${parseFloat(winRate) >= 50 ? "text-green-400" : "text-red-400"}`}
              >
                {winRate}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">Win Rate</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${totalPnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                {totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground mt-1">Total P&L</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="text-2xl font-bold">{avgRR}</div>
              <div className="text-xs text-muted-foreground mt-1">Avg R:R</div>
            </div>
          </div>
        )}

        {closedTrades.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold mb-3">Session Trade Log</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="text-left pb-2">Pair</th>
                    <th className="text-left pb-2">Dir</th>
                    <th className="text-left pb-2">Lots</th>
                    <th className="text-left pb-2">Entry</th>
                    <th className="text-left pb-2">Exit</th>
                    <th className="text-left pb-2">SL</th>
                    <th className="text-left pb-2">TP</th>
                    <th className="text-left pb-2">Closed By</th>
                    <th className="text-right pb-2">P&L</th>
                    <th className="text-right pb-2">Journal</th>
                  </tr>
                </thead>
                <tbody>
                  {closedTrades.map((t) => (
                    <tr key={t.id} className="border-b border-border/50 hover:bg-secondary/30">
                      <td className="py-2 font-medium">{t.pair}</td>
                      <td className={`py-2 font-bold ${t.direction === "buy" ? "text-green-400" : "text-red-400"}`}>
                        {t.direction.toUpperCase()}
                      </td>
                      <td className="py-2">{t.lotSize}</td>
                      <td className="py-2 font-mono">{formatPrice(t.entryPrice)}</td>
                      <td className="py-2 font-mono">{formatPrice(t.exitPrice)}</td>
                      <td className="py-2 font-mono text-red-400">{formatPrice(t.stopLoss)}</td>
                      <td className="py-2 font-mono text-green-400">{formatPrice(t.takeProfit)}</td>
                      <td className="py-2 capitalize">{t.closedBy}</td>
                      <td
                        className={`py-2 text-right font-mono font-bold ${t.pnlUsd >= 0 ? "text-green-400" : "text-red-400"}`}
                      >
                        {t.pnlUsd >= 0 ? "+" : ""}${t.pnlUsd.toFixed(2)}
                      </td>
                      <td className="py-2 text-right">
                        <button
                          onClick={() => saveToJournal(t)}
                          disabled={savingJournal.includes(t.id)}
                          className="text-primary hover:underline disabled:opacity-50"
                        >
                          {savingJournal.includes(t.id) ? "Saving…" : "Save"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
