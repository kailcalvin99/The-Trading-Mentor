import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type SeriesMarker,
  type Time,
  type ISeriesPrimitive,
  type SeriesAttachedParameter,
  type SeriesType,
  type IChartApiBase,
} from "lightweight-charts";
import { Play, Pause, SkipForward, SkipBack, TrendingUp, TrendingDown, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  detectFVGs,
  updateFVGMitigation,
  detectOrderBlocks,
  updateOBMitigation,
  detectSwingPoints,
  detectMarketStructure,
  getKillZoneTimestamps,
  calcPDHL,
  calcPremiumDiscount,
  isIntradayTimeframe,
  type Candle as ICTCandle,
  type FVG,
  type OrderBlock,
  type StructureLabel,
  type SwingPoint,
} from "@/utils/ictIndicators";

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

interface IndicatorToggles {
  fvg: boolean;
  ob: boolean;
  structure: boolean;
  killZones: boolean;
  premiumDiscount: boolean;
  pdhl: boolean;
}

function calcPnl(pos: Position, exitPrice: number): number {
  const priceDiff =
    pos.direction === "buy" ? exitPrice - pos.entryPrice : pos.entryPrice - exitPrice;

  if (pos.pair === "NAS100" || pos.pair === "US30") return priceDiff * pos.lotSize;
  if (pos.pair === "XAU/USD") return priceDiff * pos.lotSize * 100;

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

type BitmapScope = {
  context: CanvasRenderingContext2D;
  bitmapSize: { width: number; height: number };
  horizontalPixelRatio: number;
  verticalPixelRatio: number;
};

type DrawTarget = { useBitmapCoordinateSpace: (cb: (scope: BitmapScope) => void) => void };

type AttachedSeries = ISeriesApi<SeriesType, Time>;
type AttachedChart = IChartApiBase<Time>;

class RectanglePrimitive implements ISeriesPrimitive<Time> {
  private _rects: Array<{
    startTime: number;
    endTime: number;
    top: number;
    bottom: number;
    fillColor: string;
    borderColor: string;
    opacity: number;
  }> = [];
  private _series: AttachedSeries | null = null;
  private _chart: AttachedChart | null = null;

  attached(param: SeriesAttachedParameter<Time>): void {
    this._series = param.series;
    this._chart = param.chart;
  }

  detached(): void {
    this._series = null;
    this._chart = null;
  }

  setRects(rects: typeof this._rects): void {
    this._rects = rects;
  }

  paneViews() {
    return [this];
  }

  renderer() {
    const chart = this._chart;
    const series = this._series;
    const rects = this._rects;

    return {
      draw(target: DrawTarget) {
        if (!chart || !series) return;
        target.useBitmapCoordinateSpace((scope: BitmapScope) => {
          const ctx = scope.context;
          const ts = chart.timeScale();

          for (const rect of rects) {
            const x1 = ts.timeToCoordinate(rect.startTime as Time);
            const x2 = ts.timeToCoordinate(rect.endTime as Time);
            const y1 = series.priceToCoordinate(rect.top);
            const y2 = series.priceToCoordinate(rect.bottom);

            if (x1 === null || x2 === null || y1 === null || y2 === null) continue;

            const px1 = Math.round(x1 * scope.horizontalPixelRatio);
            const px2 = Math.round(x2 * scope.horizontalPixelRatio);
            const py1 = Math.round(y1 * scope.verticalPixelRatio);
            const py2 = Math.round(y2 * scope.verticalPixelRatio);

            const left = Math.min(px1, px2);
            const top = Math.min(py1, py2);
            const width = Math.abs(px2 - px1);
            const height = Math.abs(py2 - py1);
            if (width === 0 || height === 0) continue;

            ctx.save();
            ctx.globalAlpha = rect.opacity;
            ctx.fillStyle = rect.fillColor;
            ctx.fillRect(left, top, width, height);
            ctx.globalAlpha = Math.min(1, rect.opacity * 2.5);
            ctx.strokeStyle = rect.borderColor;
            ctx.lineWidth = 1;
            ctx.strokeRect(left, top, width, height);
            ctx.restore();
          }
        });
      },
    };
  }
}

class LabelPrimitive implements ISeriesPrimitive<Time> {
  private _labels: Array<{
    time: number;
    price: number;
    text: string;
    color: string;
  }> = [];
  private _series: AttachedSeries | null = null;
  private _chart: AttachedChart | null = null;

  attached(param: SeriesAttachedParameter<Time>): void {
    this._series = param.series;
    this._chart = param.chart;
  }

  detached(): void {
    this._series = null;
    this._chart = null;
  }

  setLabels(labels: typeof this._labels): void {
    this._labels = labels;
  }

  paneViews() {
    return [this];
  }

  renderer() {
    const chart = this._chart;
    const series = this._series;
    const labels = this._labels;

    return {
      draw(target: DrawTarget) {
        if (!chart || !series) return;
        target.useBitmapCoordinateSpace((scope: BitmapScope) => {
          const ctx = scope.context;
          const ts = chart.timeScale();
          const fontSize = Math.round(10 * scope.verticalPixelRatio);
          ctx.font = `bold ${fontSize}px Inter, sans-serif`;

          for (const lbl of labels) {
            const x = ts.timeToCoordinate(lbl.time as Time);
            const y = series.priceToCoordinate(lbl.price);
            if (x === null || y === null) continue;

            const px = Math.round(x * scope.horizontalPixelRatio);
            const py = Math.round(y * scope.verticalPixelRatio);

            const textW = ctx.measureText(lbl.text).width;
            const pad = 3 * scope.horizontalPixelRatio;
            const boxH = fontSize + pad * 2;
            const boxW = textW + pad * 2;

            ctx.save();
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = lbl.color;
            ctx.beginPath();
            ctx.roundRect(px - boxW / 2, py - boxH / 2, boxW, boxH, 3);
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(lbl.text, px, py);
            ctx.restore();
          }
        });
      },
    };
  }
}

class HLinePrimitive implements ISeriesPrimitive<Time> {
  private _lines: Array<{
    price: number;
    color: string;
    dash: number[];
    label?: string;
    labelSide?: "left" | "right";
    lineWidth?: number;
    opacity?: number;
  }> = [];
  private _series: AttachedSeries | null = null;

  attached(param: SeriesAttachedParameter<Time>): void {
    this._series = param.series;
  }

  detached(): void {
    this._series = null;
  }

  setLines(lines: typeof this._lines): void {
    this._lines = lines;
  }

  paneViews() {
    return [this];
  }

  renderer() {
    const series = this._series;
    const lines = this._lines;

    return {
      draw(target: DrawTarget) {
        if (!series) return;
        target.useBitmapCoordinateSpace((scope: BitmapScope) => {
          const ctx = scope.context;
          const width = scope.bitmapSize.width;

          for (const line of lines) {
            const y = series.priceToCoordinate(line.price);
            if (y === null) continue;
            const py = Math.round(y * scope.verticalPixelRatio);

            ctx.save();
            ctx.globalAlpha = line.opacity ?? 1;
            ctx.strokeStyle = line.color;
            ctx.lineWidth = (line.lineWidth ?? 1.5) * scope.horizontalPixelRatio;
            ctx.setLineDash(line.dash.map((d) => d * scope.horizontalPixelRatio));
            ctx.beginPath();
            ctx.moveTo(0, py);
            ctx.lineTo(width, py);
            ctx.stroke();

            if (line.label) {
              const fontSize = Math.round(9 * scope.verticalPixelRatio);
              ctx.font = `bold ${fontSize}px Inter, sans-serif`;
              ctx.setLineDash([]);
              ctx.fillStyle = line.color;
              ctx.textBaseline = "bottom";
              if (line.labelSide === "left") {
                ctx.textAlign = "left";
                ctx.fillText(line.label, 4, py - 2);
              } else {
                ctx.textAlign = "right";
                ctx.fillText(line.label, width - 4, py - 2);
              }
            }
            ctx.restore();
          }
        });
      },
    };
  }
}

class ShadePrimitive implements ISeriesPrimitive<Time> {
  private _bands: Array<{
    top: number;
    bottom: number;
    fillColor: string;
    opacity: number;
    label?: string;
    labelColor?: string;
  }> = [];
  private _series: AttachedSeries | null = null;

  attached(param: SeriesAttachedParameter<Time>): void {
    this._series = param.series;
  }

  detached(): void {
    this._series = null;
  }

  setBands(bands: typeof this._bands): void {
    this._bands = bands;
  }

  paneViews() {
    return [this];
  }

  renderer() {
    const series = this._series;
    const bands = this._bands;

    return {
      draw(target: DrawTarget) {
        if (!series) return;
        target.useBitmapCoordinateSpace((scope: BitmapScope) => {
          const ctx = scope.context;
          const width = scope.bitmapSize.width;

          for (const band of bands) {
            const y1 = series.priceToCoordinate(band.top);
            const y2 = series.priceToCoordinate(band.bottom);
            if (y1 === null || y2 === null) continue;

            const py1 = Math.round(y1 * scope.verticalPixelRatio);
            const py2 = Math.round(y2 * scope.verticalPixelRatio);
            const top = Math.min(py1, py2);
            const height = Math.abs(py2 - py1);
            if (height === 0) continue;

            ctx.save();
            ctx.globalAlpha = band.opacity;
            ctx.fillStyle = band.fillColor;
            ctx.fillRect(0, top, width, height);

            if (band.label && band.labelColor) {
              ctx.globalAlpha = 0.6;
              const fontSize = Math.round(10 * scope.verticalPixelRatio);
              ctx.font = `bold ${fontSize}px Inter, sans-serif`;
              ctx.fillStyle = band.labelColor;
              ctx.textAlign = "left";
              ctx.textBaseline = "middle";
              ctx.fillText(band.label, 8, top + height / 2);
            }
            ctx.restore();
          }
        });
      },
    };
  }
}

class KillZonePrimitive implements ISeriesPrimitive<Time> {
  private _zones: Array<{ start: number; end: number; color: string; label: string }> = [];
  private _chart: AttachedChart | null = null;

  attached(param: SeriesAttachedParameter<Time>): void {
    this._chart = param.chart;
  }

  detached(): void {
    this._chart = null;
  }

  setZones(zones: typeof this._zones): void {
    this._zones = zones;
  }

  paneViews() {
    return [this];
  }

  renderer() {
    const chart = this._chart;
    const zones = this._zones;

    return {
      draw(target: DrawTarget) {
        if (!chart) return;
        target.useBitmapCoordinateSpace((scope: BitmapScope) => {
          const ctx = scope.context;
          const ts = chart.timeScale();
          const height = scope.bitmapSize.height;

          for (const zone of zones) {
            const x1 = ts.timeToCoordinate(zone.start as Time);
            const x2 = ts.timeToCoordinate(zone.end as Time);
            if (x1 === null || x2 === null) continue;

            const px1 = Math.round(x1 * scope.horizontalPixelRatio);
            const px2 = Math.round(x2 * scope.horizontalPixelRatio);
            const left = Math.min(px1, px2);
            const width = Math.abs(px2 - px1);
            if (width === 0) continue;

            ctx.save();
            ctx.globalAlpha = 0.07;
            ctx.fillStyle = zone.color;
            ctx.fillRect(left, 0, width, height);

            ctx.globalAlpha = 0.35;
            ctx.strokeStyle = zone.color;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(left, 0);
            ctx.lineTo(left, height);
            ctx.stroke();
            ctx.restore();
          }
        });
      },
    };
  }
}

const INDICATOR_LABELS: Record<keyof IndicatorToggles, string> = {
  fvg: "FVG",
  ob: "OB",
  structure: "Structure",
  killZones: "Kill Zones",
  premiumDiscount: "Prem/Disc",
  pdhl: "PDH/PDL",
};

interface LegendItem {
  color: string;
  label: string;
  type?: "box" | "line" | "dashed";
}

const INDICATOR_LEGEND_ITEMS: Record<keyof IndicatorToggles, LegendItem[]> = {
  fvg: [
    { color: "#22c55e", label: "Bullish FVG", type: "box" },
    { color: "#ef4444", label: "Bearish FVG", type: "box" },
  ],
  ob: [
    { color: "#3b82f6", label: "Bullish OB", type: "box" },
    { color: "#f97316", label: "Bearish OB", type: "box" },
  ],
  structure: [
    { color: "#22c55e", label: "BOS (Bull)", type: "line" },
    { color: "#ef4444", label: "BOS (Bear)", type: "line" },
    { color: "#f59e0b", label: "CHoCH", type: "line" },
    { color: "#ef444466", label: "Swing High", type: "dashed" },
    { color: "#22c55e66", label: "Swing Low", type: "dashed" },
  ],
  killZones: [
    { color: "#818cf8", label: "London KZ", type: "box" },
    { color: "#F59E0B", label: "NY Open KZ", type: "box" },
    { color: "#ef4444", label: "Silver Bullet", type: "box" },
  ],
  premiumDiscount: [
    { color: "#ef4444", label: "Premium", type: "box" },
    { color: "#22c55e", label: "Discount", type: "box" },
    { color: "#f59e0b", label: "Equilibrium", type: "dashed" },
  ],
  pdhl: [
    { color: "#ef4444", label: "PDH", type: "dashed" },
    { color: "#22c55e", label: "PDL", type: "dashed" },
  ],
};

function IndicatorLegend({
  indicators,
  killZonesDisabled,
}: {
  indicators: IndicatorToggles;
  killZonesDisabled: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  const activeItems: LegendItem[] = (
    Object.keys(indicators) as Array<keyof IndicatorToggles>
  ).flatMap((key) => {
    if (!indicators[key]) return [];
    if (key === "killZones" && killZonesDisabled) return [];
    return INDICATOR_LEGEND_ITEMS[key];
  });

  if (activeItems.length === 0) return null;

  return (
    <div
      className="absolute top-2 right-2 z-10 rounded-md pointer-events-none select-none"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
    >
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="flex items-center gap-1 px-2 py-1.5 w-full text-white/80 hover:text-white transition-colors pointer-events-auto"
        aria-label={collapsed ? "Expand legend" : "Collapse legend"}
        aria-expanded={!collapsed}
      >
        <span className="text-[10px] font-semibold leading-none tracking-wide uppercase">
          Key
        </span>
        <svg
          className={`w-2.5 h-2.5 transition-transform duration-200 ${collapsed ? "rotate-180" : ""}`}
          viewBox="0 0 10 10"
          fill="currentColor"
        >
          <path d="M5 3L9 7H1L5 3Z" />
        </svg>
      </button>
      {!collapsed && (
        <div className="px-2 pb-1.5 space-y-0.5">
          {activeItems.map((item, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Swatch color={item.color} type={item.type} />
              <span className="text-[10px] leading-none text-white/90 font-medium whitespace-nowrap">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Swatch({ color, type }: { color: string; type?: "box" | "line" | "dashed" }) {
  if (type === "line") {
    return (
      <span
        className="inline-block flex-shrink-0"
        style={{
          width: 14,
          height: 2,
          borderRadius: 1,
          backgroundColor: color,
        }}
      />
    );
  }
  if (type === "dashed") {
    return (
      <span
        className="inline-block flex-shrink-0"
        style={{
          width: 14,
          height: 0,
          borderTop: `2px dashed ${color}`,
        }}
      />
    );
  }
  return (
    <span
      className="inline-block flex-shrink-0 rounded-sm"
      style={{
        width: 10,
        height: 10,
        backgroundColor: color,
        opacity: 0.85,
      }}
    />
  );
}

export default function PaperTradingPage() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersRef = useRef<SeriesMarker<Time>[]>([]);
  const prevIndexRef = useRef<number>(0);

  const fvgPrimitiveRef = useRef<RectanglePrimitive | null>(null);
  const obPrimitiveRef = useRef<RectanglePrimitive | null>(null);
  const structureLabelPrimitiveRef = useRef<LabelPrimitive | null>(null);
  const structureLinesPrimitiveRef = useRef<HLinePrimitive | null>(null);
  const killZonePrimitiveRef = useRef<KillZonePrimitive | null>(null);
  const pdShadePrimitiveRef = useRef<ShadePrimitive | null>(null);
  const pdLinePrimitiveRef = useRef<HLinePrimitive | null>(null);

  const pdhlLinesRef = useRef<{ pdh: IPriceLine | null; pdl: IPriceLine | null }>({
    pdh: null,
    pdl: null,
  });

  const [instrument, setInstrument] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("15m");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 8);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  });
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

  const [indicators, setIndicators] = useState<IndicatorToggles>({
    fvg: false,
    ob: false,
    structure: false,
    killZones: false,
    premiumDiscount: false,
    pdhl: false,
  });

  const [visibleTimeRange, setVisibleTimeRange] = useState<{ from: number; to: number } | null>(null);

  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function updateChartMarkers(newMarkers: SeriesMarker<Time>[]) {
    markersRef.current = newMarkers;
    if (seriesRef.current) {
      seriesRef.current.setMarkers(newMarkers);
    }
  }

  function addMarker(marker: SeriesMarker<Time>) {
    const sorted = [...markersRef.current, marker].sort(
      (a, b) => (a.time as number) - (b.time as number)
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
        const contextStart = Math.min(50, data.length);
        setCurrentIndex(contextStart);
        prevIndexRef.current = contextStart;
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

    const fvgPrim = new RectanglePrimitive();
    const obPrim = new RectanglePrimitive();
    const structLabelPrim = new LabelPrimitive();
    const structLinesPrim = new HLinePrimitive();
    const killPrim = new KillZonePrimitive();
    const pdShadePrim = new ShadePrimitive();
    const pdLinePrim = new HLinePrimitive();

    series.attachPrimitive(fvgPrim);
    series.attachPrimitive(obPrim);
    series.attachPrimitive(structLabelPrim);
    series.attachPrimitive(structLinesPrim);
    series.attachPrimitive(killPrim);
    series.attachPrimitive(pdShadePrim);
    series.attachPrimitive(pdLinePrim);

    fvgPrimitiveRef.current = fvgPrim;
    obPrimitiveRef.current = obPrim;
    structureLabelPrimitiveRef.current = structLabelPrim;
    structureLinesPrimitiveRef.current = structLinesPrim;
    killZonePrimitiveRef.current = killPrim;
    pdShadePrimitiveRef.current = pdShadePrim;
    pdLinePrimitiveRef.current = pdLinePrim;

    const handleVisibleRangeChange = () => {
      const range = chart.timeScale().getVisibleRange();
      if (range) {
        setVisibleTimeRange({ from: range.from as number, to: range.to as number });
      }
    };
    chart.timeScale().subscribeVisibleTimeRangeChange(handleVisibleRangeChange);

    const observer = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    });
    observer.observe(chartContainerRef.current);

    return () => {
      chart.timeScale().unsubscribeVisibleTimeRangeChange(handleVisibleRangeChange);
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      fvgPrimitiveRef.current = null;
      obPrimitiveRef.current = null;
      structureLabelPrimitiveRef.current = null;
      structureLinesPrimitiveRef.current = null;
      killZonePrimitiveRef.current = null;
      pdShadePrimitiveRef.current = null;
      pdLinePrimitiveRef.current = null;
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
      }))
    );
    if (chartRef.current && visible.length > 0) {
      chartRef.current.timeScale().fitContent();
      chartRef.current.timeScale().applyOptions({ barSpacing: 7 });
    }
    seriesRef.current.setMarkers(markersRef.current);
  }, [allCandles, currentIndex]);

  const visibleCandles = useMemo(
    () => allCandles.slice(0, currentIndex) as ICTCandle[],
    [allCandles, currentIndex]
  );

  const allFVGs = useMemo(() => detectFVGs(visibleCandles), [visibleCandles]);
  const mitigatedFVGs = useMemo(
    () => updateFVGMitigation(allFVGs, visibleCandles),
    [allFVGs, visibleCandles]
  );

  const allOBs = useMemo(() => detectOrderBlocks(visibleCandles), [visibleCandles]);
  const mitigatedOBs = useMemo(
    () => updateOBMitigation(allOBs, visibleCandles),
    [allOBs, visibleCandles]
  );

  const swingPoints = useMemo(() => detectSwingPoints(visibleCandles, 3), [visibleCandles]);
  const structureLabels = useMemo(
    () => detectMarketStructure(visibleCandles, swingPoints),
    [visibleCandles, swingPoints]
  );

  const killZones = useMemo(() => {
    if (!isIntradayTimeframe(timeframe)) return [];
    return getKillZoneTimestamps(visibleCandles);
  }, [visibleCandles, timeframe]);

  const pdhl = useMemo(() => calcPDHL(visibleCandles), [visibleCandles]);

  const premiumDiscount = useMemo(
    () =>
      calcPremiumDiscount(
        visibleCandles,
        visibleTimeRange?.from,
        visibleTimeRange?.to
      ),
    [visibleCandles, visibleTimeRange]
  );

  const endTime = useMemo(() => {
    if (visibleCandles.length === 0) return 0;
    return visibleCandles[visibleCandles.length - 1].time + 86400 * 30;
  }, [visibleCandles]);

  function invalidateChart() {
    chartRef.current?.applyOptions({});
  }

  useEffect(() => {
    if (!fvgPrimitiveRef.current) return;
    if (!indicators.fvg || visibleCandles.length === 0) {
      fvgPrimitiveRef.current.setRects([]);
      invalidateChart();
      return;
    }

    const rects = mitigatedFVGs.map((fvg: FVG) => ({
      startTime: fvg.startTime,
      endTime: fvg.mitigated ? fvg.mitigatedTime! : endTime,
      top: fvg.top,
      bottom: fvg.bottom,
      fillColor: fvg.type === "bullish" ? "#22c55e" : "#ef4444",
      borderColor: fvg.type === "bullish" ? "#22c55e" : "#ef4444",
      opacity: fvg.mitigated ? 0.04 : 0.13,
    }));

    fvgPrimitiveRef.current.setRects(rects);
    invalidateChart();
  }, [mitigatedFVGs, indicators.fvg, visibleCandles.length, endTime]);

  useEffect(() => {
    if (!obPrimitiveRef.current) return;
    if (!indicators.ob || visibleCandles.length === 0) {
      obPrimitiveRef.current.setRects([]);
      invalidateChart();
      return;
    }

    const rects = mitigatedOBs.map((ob: OrderBlock) => ({
      startTime: ob.startTime,
      endTime: ob.mitigated ? ob.mitigatedTime! : endTime,
      top: ob.top,
      bottom: ob.bottom,
      fillColor: ob.type === "bullish" ? "#3b82f6" : "#f97316",
      borderColor: ob.type === "bullish" ? "#3b82f6" : "#f97316",
      opacity: ob.mitigated ? 0.03 : 0.11,
    }));

    obPrimitiveRef.current.setRects(rects);
    invalidateChart();
  }, [mitigatedOBs, indicators.ob, visibleCandles.length, endTime]);

  useEffect(() => {
    if (!structureLabelPrimitiveRef.current || !structureLinesPrimitiveRef.current) return;

    if (!indicators.structure || visibleCandles.length === 0) {
      structureLabelPrimitiveRef.current.setLabels([]);
      structureLinesPrimitiveRef.current.setLines([]);
      invalidateChart();
      return;
    }

    const labels = structureLabels.map((sl: StructureLabel) => ({
      time: sl.time,
      price: sl.price,
      text: sl.label,
      color:
        sl.label === "BOS"
          ? sl.direction === "bullish"
            ? "#22c55e"
            : "#ef4444"
          : "#f59e0b",
    }));
    structureLabelPrimitiveRef.current.setLabels(labels);

    const swingLines = swingPoints.map((sp: SwingPoint) => ({
      price: sp.price,
      color: sp.type === "high" ? "#ef444466" : "#22c55e66",
      dash: [2, 4],
      lineWidth: 1,
      opacity: 0.5,
    }));
    structureLinesPrimitiveRef.current.setLines(swingLines);

    invalidateChart();
  }, [structureLabels, swingPoints, indicators.structure, visibleCandles.length]);

  useEffect(() => {
    if (!killZonePrimitiveRef.current) return;
    if (!indicators.killZones || killZones.length === 0) {
      killZonePrimitiveRef.current.setZones([]);
      invalidateChart();
      return;
    }
    killZonePrimitiveRef.current.setZones(killZones);
    invalidateChart();
  }, [killZones, indicators.killZones]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;

    const { pdh: existingPdh, pdl: existingPdl } = pdhlLinesRef.current;
    if (existingPdh) {
      try { series.removePriceLine(existingPdh); } catch {}
    }
    if (existingPdl) {
      try { series.removePriceLine(existingPdl); } catch {}
    }
    pdhlLinesRef.current = { pdh: null, pdl: null };

    if (!indicators.pdhl || !pdhl) return;

    const pdhLine = series.createPriceLine({
      price: pdhl.pdh,
      color: "#ef4444",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: `PDH ${formatPrice(pdhl.pdh)}`,
    });

    const pdlLine = series.createPriceLine({
      price: pdhl.pdl,
      color: "#22c55e",
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: `PDL ${formatPrice(pdhl.pdl)}`,
    });

    pdhlLinesRef.current = { pdh: pdhLine, pdl: pdlLine };

    return () => {
      try { series.removePriceLine(pdhLine); } catch {}
      try { series.removePriceLine(pdlLine); } catch {}
    };
  }, [pdhl, indicators.pdhl]);

  useEffect(() => {
    if (!pdShadePrimitiveRef.current || !pdLinePrimitiveRef.current) return;
    if (!indicators.premiumDiscount || !premiumDiscount) {
      pdShadePrimitiveRef.current.setBands([]);
      pdLinePrimitiveRef.current.setLines([]);
      invalidateChart();
      return;
    }

    pdShadePrimitiveRef.current.setBands([
      {
        top: premiumDiscount.high,
        bottom: premiumDiscount.mid,
        fillColor: "#ef4444",
        opacity: 0.05,
        label: "Premium",
        labelColor: "#ef4444",
      },
      {
        top: premiumDiscount.mid,
        bottom: premiumDiscount.low,
        fillColor: "#22c55e",
        opacity: 0.05,
        label: "Discount",
        labelColor: "#22c55e",
      },
    ]);

    pdLinePrimitiveRef.current.setLines([
      {
        price: premiumDiscount.mid,
        color: "#f59e0b",
        dash: [4, 4],
        label: "EQ 50%",
        labelSide: "left",
      },
    ]);
    invalidateChart();
  }, [premiumDiscount, indicators.premiumDiscount]);

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
          newClosed.push({
            ...pos,
            exitPrice,
            exitTime: latestCandle.time,
            pnlUsd: pnl,
            closedBy,
          });

          addMarker({
            time: latestCandle.time as Time,
            position: closedBy === "tp" ? "aboveBar" : "belowBar",
            color: closedBy === "tp" ? "#22c55e" : "#ef4444",
            shape: closedBy === "tp" ? "arrowUp" : "arrowDown",
            text:
              closedBy === "tp"
                ? `TP +$${pnl.toFixed(0)}`
                : `SL -$${Math.abs(pnl).toFixed(0)}`,
          });
        } else {
          remaining.push(pos);
        }
      }

      if (newClosed.length > 0) {
        setClosedTrades((ct) => [...ct, ...newClosed]);
        for (const ct of newClosed) {
          if (ct.closedBy === "tp") {
            toast.success(
              `${ct.pair} ${ct.direction.toUpperCase()} — TP hit! +$${ct.pnlUsd.toFixed(2)}`
            );
          } else {
            toast.error(
              `${ct.pair} ${ct.direction.toUpperCase()} — SL hit. -$${Math.abs(ct.pnlUsd).toFixed(2)}`
            );
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
      {
        ...pos,
        exitPrice,
        exitTime: latestCandle.time,
        pnlUsd: pnl,
        closedBy: "manual" as const,
      },
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
          outcome:
            trade.closedBy === "tp"
              ? "win"
              : trade.closedBy === "sl"
              ? "loss"
              : "breakeven",
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

  function toggleIndicator(key: keyof IndicatorToggles) {
    setIndicators((prev) => ({ ...prev, [key]: !prev[key] }));
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

  const killZonesDisabled = !isIntradayTimeframe(timeframe);

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
              min={
                new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000)
                  .toISOString()
                  .split("T")[0]
              }
              onChange={(e) => {
                const newStart = e.target.value;
                setStartDate(newStart);
                const defaultEnd = new Date(newStart);
                defaultEnd.setDate(defaultEnd.getDate() + 7);
                const today = new Date().toISOString().split("T")[0];
                const proposed = defaultEnd.toISOString().split("T")[0];
                const clampedEnd = proposed > today ? today : proposed;
                setEndDate(clampedEnd);
              }}
              className="bg-secondary border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground font-medium">End Date</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setEndDate(e.target.value)}
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
                      speed === s
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
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

        <div className="flex flex-wrap items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5">
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">
            ICT Overlays
          </span>
          {(Object.keys(INDICATOR_LABELS) as Array<keyof IndicatorToggles>).map((key) => {
            const isDisabled = key === "killZones" && killZonesDisabled;
            const isOn = indicators[key];
            return (
              <button
                key={key}
                onClick={() => !isDisabled && toggleIndicator(key)}
                disabled={isDisabled}
                title={
                  isDisabled ? "Kill Zones only available on 1m, 5m, 15m" : undefined
                }
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  isDisabled
                    ? "opacity-30 cursor-not-allowed border-border text-muted-foreground"
                    : isOn
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                }`}
              >
                {isOn ? "● " : "○ "}
                {INDICATOR_LABELS[key]}
              </button>
            );
          })}
          {killZonesDisabled && (
            <span className="text-[10px] text-muted-foreground ml-1">
              Kill Zones: intraday only
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-3 bg-card border border-border rounded-xl overflow-hidden relative">
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
            {allCandles.length > 0 && !loading && (
              <IndicatorLegend indicators={indicators} killZonesDisabled={killZonesDisabled} />
            )}
          </div>

          <div className="space-y-3">
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold">Place Order</h3>
              {latestPrice !== null && (
                <p className="text-xs text-muted-foreground">
                  Current price:{" "}
                  <span className="text-foreground font-mono">
                    {formatPrice(latestPrice)}
                  </span>
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
                        <span
                          className={`font-bold ${
                            pos.direction === "buy" ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {pos.direction.toUpperCase()} {pos.lotSize} lots
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            currentPnl >= 0 ? "text-green-400" : "text-red-400"
                          }`}
                        >
                          {currentPnl >= 0 ? "+" : ""}${currentPnl.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-muted-foreground">
                        Entry:{" "}
                        <span className="font-mono text-foreground">
                          {formatPrice(pos.entryPrice)}
                        </span>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-muted-foreground">
                          SL:{" "}
                          <span className="font-mono text-red-400">
                            {formatPrice(pos.stopLoss)}
                          </span>
                        </span>
                        <span className="text-muted-foreground">
                          TP:{" "}
                          <span className="font-mono text-green-400">
                            {formatPrice(pos.takeProfit)}
                          </span>
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
                className={`text-2xl font-bold ${
                  parseFloat(winRate) >= 50 ? "text-green-400" : "text-red-400"
                }`}
              >
                {winRate}%
              </div>
              <div className="text-xs text-muted-foreground mt-1">Win Rate</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <div
                className={`text-2xl font-bold ${
                  totalPnl >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
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
                      <td
                        className={`py-2 font-bold ${
                          t.direction === "buy" ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {t.direction.toUpperCase()}
                      </td>
                      <td className="py-2">{t.lotSize}</td>
                      <td className="py-2 font-mono">{formatPrice(t.entryPrice)}</td>
                      <td className="py-2 font-mono">{formatPrice(t.exitPrice)}</td>
                      <td className="py-2 font-mono text-red-400">{formatPrice(t.stopLoss)}</td>
                      <td className="py-2 font-mono text-green-400">{formatPrice(t.takeProfit)}</td>
                      <td className="py-2 capitalize">{t.closedBy}</td>
                      <td
                        className={`py-2 text-right font-mono font-bold ${
                          t.pnlUsd >= 0 ? "text-green-400" : "text-red-400"
                        }`}
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
