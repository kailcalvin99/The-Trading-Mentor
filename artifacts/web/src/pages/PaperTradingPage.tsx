import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  createChart,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type Time,
  type ISeriesPrimitive,
  type SeriesAttachedParameter,
  type SeriesType,
  type IChartApiBase,
} from "lightweight-charts";
import {
  MousePointer2,
  Square,
  TrendingUp,
  Clock,
  Minus,
  Eraser,
  RotateCcw,
  Eye,
  EyeOff,
  Menu,
  ArrowUpDown,
  GitFork,
  TrendingDown,
} from "lucide-react";
import { useDrawer } from "@/components/Layout";
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
  isIntradayTimeframe,
  type Candle as ICTCandle,
  type FVG,
  type OrderBlock,
  type StructureLabel,
} from "@/utils/ictIndicators";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const INSTRUMENTS = ["EUR/USD", "GBP/USD", "GBP/JPY", "NAS100", "US30", "XAU/USD"];
const TIMEFRAMES = ["1m", "5m", "15m", "1H", "4H", "Daily"];

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

type DrawingTool = "cursor" | "fvg" | "ob" | "bos" | "choch" | "sh" | "sl" | "killzone" | "pdhl" | "eraser";

interface UserAnnotation {
  id: string;
  type: "fvg" | "ob" | "hline";
  startTime: number;
  endTime: number;
  top: number;
  bottom: number;
  label?: string;
  color: string;
}

interface AnalysisStep {
  step: number;
  title: string;
  concept: string;
  priceFrom: number;
  priceTo: number;
  timeFrom: number;
  timeTo: number;
  explanation: string;
  grade: string;
}

interface AnalysisResult {
  steps: AnalysisStep[];
  overallScore: number;
  summary: string;
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

const TOOL_COLORS: Record<string, string> = {
  fvg: "#3b82f6",
  ob: "#f97316",
  bos: "#10b981",
  choch: "#f59e0b",
  sh: "#3b82f6",
  sl: "#a855f7",
  hline: "#f59e0b",
};

const DRAWING_TOOLS: { id: DrawingTool; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "cursor", label: "Select", icon: MousePointer2 },
  { id: "fvg", label: "FVG", icon: Square },
  { id: "ob", label: "Order Block", icon: Square },
  { id: "bos", label: "BOS", icon: TrendingUp },
  { id: "choch", label: "CHoCH", icon: GitFork },
  { id: "sh", label: "Swing H", icon: ArrowUpDown },
  { id: "sl", label: "Swing L", icon: TrendingDown },
  { id: "killzone", label: "Kill Zones", icon: Clock },
  { id: "pdhl", label: "PDH/PDL", icon: Minus },
  { id: "eraser", label: "Eraser", icon: Eraser },
];

function formatPrice(price: number): string {
  if (price >= 10000) return price.toFixed(2);
  if (price >= 100) return price.toFixed(3);
  return price.toFixed(5);
}

function formatDateRange(candles: Candle[]): string {
  if (candles.length === 0) return "";
  const first = new Date(candles[0].time * 1000);
  const last = new Date(candles[candles.length - 1].time * 1000);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${fmt(first)} – ${fmt(last)}`;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 60) return "#f59e0b";
  return "#ef4444";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Outstanding";
  if (score >= 80) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 50) return "Developing";
  return "Needs Work";
}

export default function PaperTradingPage() {
  const { openDrawer } = useDrawer();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);

  const fvgPrimitiveRef = useRef<RectanglePrimitive | null>(null);
  const obPrimitiveRef = useRef<RectanglePrimitive | null>(null);
  const structureLabelPrimitiveRef = useRef<LabelPrimitive | null>(null);
  const structureLinesPrimitiveRef = useRef<HLinePrimitive | null>(null);
  const killZonePrimitiveRef = useRef<KillZonePrimitive | null>(null);
  const pdhlPrimitiveRef = useRef<HLinePrimitive | null>(null);
  const userAnnotationRectPrimitiveRef = useRef<RectanglePrimitive | null>(null);
  const userAnnotationLabelPrimitiveRef = useRef<LabelPrimitive | null>(null);
  const userHLinePrimitiveRef = useRef<HLinePrimitive | null>(null);
  const highlightPrimitiveRef = useRef<RectanglePrimitive | null>(null);

  const [instrument, setInstrument] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("15m");
  const [allCandles, setAllCandles] = useState<Candle[]>([]);
  const [loading, setLoading] = useState(false);

  const [activeTool, setActiveTool] = useState<DrawingTool>("cursor");
  const [showAIIct, setShowAIIct] = useState(false);
  const [showKillZones, setShowKillZones] = useState(false);
  const [showPdhl, setShowPdhl] = useState(false);

  const [userAnnotations, setUserAnnotations] = useState<UserAnnotation[]>([]);

  const isDrawingRef = useRef(false);
  const drawStartRef = useRef<{ time: number; price: number } | null>(null);
  const currentDrawRef = useRef<UserAnnotation | null>(null);

  const [analysisMode, setAnalysisMode] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showFinalGrade, setShowFinalGrade] = useState(false);
  const stepIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const conversationIdRef = useRef<string | null>(null);

  const startDate = useMemo(() => {
    const lookbackDays: Record<string, number> = {
      Daily: 730,
      "4H": 180,
      "1H": 60,
      "15m": 21,
      "5m": 7,
      "1m": 2,
    };
    const days = lookbackDays[timeframe] ?? 21;
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split("T")[0];
  }, [timeframe]);

  const endDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  }, []);

  const fetchCandles = useCallback(async () => {
    setLoading(true);
    setUserAnnotations([]);
    setAnalysisMode(false);
    setAnalysisResult(null);
    setShowFinalGrade(false);
    setStepIndex(0);
    if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);

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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load candles";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [instrument, timeframe, startDate, endDate]);

  useEffect(() => {
    fetchCandles();
  }, [fetchCandles]);

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
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        borderColor: "#374151",
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: "#374151",
      },
      handleScroll: true,
      handleScale: true,
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
    const pdhlPrim = new HLinePrimitive();
    const userRectPrim = new RectanglePrimitive();
    const userLabelPrim = new LabelPrimitive();
    const userHLinePrim = new HLinePrimitive();
    const highlightPrim = new RectanglePrimitive();

    series.attachPrimitive(fvgPrim);
    series.attachPrimitive(obPrim);
    series.attachPrimitive(structLabelPrim);
    series.attachPrimitive(structLinesPrim);
    series.attachPrimitive(killPrim);
    series.attachPrimitive(pdhlPrim);
    series.attachPrimitive(userRectPrim);
    series.attachPrimitive(userLabelPrim);
    series.attachPrimitive(userHLinePrim);
    series.attachPrimitive(highlightPrim);

    fvgPrimitiveRef.current = fvgPrim;
    obPrimitiveRef.current = obPrim;
    structureLabelPrimitiveRef.current = structLabelPrim;
    structureLinesPrimitiveRef.current = structLinesPrim;
    killZonePrimitiveRef.current = killPrim;
    pdhlPrimitiveRef.current = pdhlPrim;
    userAnnotationRectPrimitiveRef.current = userRectPrim;
    userAnnotationLabelPrimitiveRef.current = userLabelPrim;
    userHLinePrimitiveRef.current = userHLinePrim;
    highlightPrimitiveRef.current = highlightPrim;

    const observer = new ResizeObserver(() => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
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
    seriesRef.current.setData(
      allCandles.map((c) => ({
        time: c.time as Time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
      }))
    );
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [allCandles]);

  const ictCandles = useMemo(() => allCandles as ICTCandle[], [allCandles]);

  const allFVGs = useMemo(() => (showAIIct ? detectFVGs(ictCandles) : []), [ictCandles, showAIIct]);
  const mitigatedFVGs = useMemo(
    () => (showAIIct ? updateFVGMitigation(allFVGs, ictCandles) : []),
    [allFVGs, ictCandles, showAIIct]
  );

  const allOBs = useMemo(() => (showAIIct ? detectOrderBlocks(ictCandles) : []), [ictCandles, showAIIct]);
  const mitigatedOBs = useMemo(
    () => (showAIIct ? updateOBMitigation(allOBs, ictCandles) : []),
    [allOBs, ictCandles, showAIIct]
  );

  const swingPoints = useMemo(
    () => (showAIIct ? detectSwingPoints(ictCandles, 3) : []),
    [ictCandles, showAIIct]
  );
  const structureLabels = useMemo(
    () => (showAIIct ? detectMarketStructure(ictCandles, swingPoints) : []),
    [ictCandles, swingPoints, showAIIct]
  );

  const killZones = useMemo(() => {
    if (!showKillZones || !isIntradayTimeframe(timeframe)) return [];
    return getKillZoneTimestamps(ictCandles);
  }, [ictCandles, timeframe, showKillZones]);

  const pdhl = useMemo(() => (showPdhl ? calcPDHL(ictCandles) : null), [ictCandles, showPdhl]);

  const endTime = useMemo(() => {
    if (allCandles.length === 0) return 0;
    return allCandles[allCandles.length - 1].time + 86400 * 30;
  }, [allCandles]);

  function invalidateChart() {
    chartRef.current?.applyOptions({});
  }

  useEffect(() => {
    if (!fvgPrimitiveRef.current) return;
    if (!showAIIct || allCandles.length === 0) {
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
      opacity: fvg.mitigated ? 0.05 : 0.15,
    }));
    fvgPrimitiveRef.current.setRects(rects);
    invalidateChart();
  }, [mitigatedFVGs, endTime, showAIIct, allCandles.length]);

  useEffect(() => {
    if (!obPrimitiveRef.current) return;
    if (!showAIIct || allCandles.length === 0) {
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
      opacity: ob.mitigated ? 0.05 : 0.15,
    }));
    obPrimitiveRef.current.setRects(rects);
    invalidateChart();
  }, [mitigatedOBs, endTime, showAIIct, allCandles.length]);

  useEffect(() => {
    if (!structureLabelPrimitiveRef.current || !structureLinesPrimitiveRef.current) return;
    if (!showAIIct || allCandles.length === 0) {
      structureLabelPrimitiveRef.current.setLabels([]);
      structureLinesPrimitiveRef.current.setLines([]);
      invalidateChart();
      return;
    }
    const labels = structureLabels.map((sl: StructureLabel) => ({
      time: sl.time,
      price: sl.price,
      text: sl.label,
      color: sl.label === "CHoCH" ? "#f59e0b" : sl.direction === "bullish" ? "#22c55e" : "#ef4444",
    }));
    structureLabelPrimitiveRef.current.setLabels(labels);
    structureLinesPrimitiveRef.current.setLines([]);
    invalidateChart();
  }, [structureLabels, showAIIct, allCandles.length]);

  useEffect(() => {
    if (!killZonePrimitiveRef.current) return;
    if (!showKillZones || killZones.length === 0) {
      killZonePrimitiveRef.current.setZones([]);
      invalidateChart();
      return;
    }
    const zones = killZones.map((kz) => ({
      start: kz.start,
      end: kz.end,
      color: kz.color,
      label: kz.label,
    }));
    killZonePrimitiveRef.current.setZones(zones);
    invalidateChart();
  }, [killZones, showKillZones]);

  useEffect(() => {
    if (!pdhlPrimitiveRef.current) return;
    if (!showPdhl || !pdhl) {
      pdhlPrimitiveRef.current.setLines([]);
      invalidateChart();
      return;
    }
    const lines = [
      { price: pdhl.pdh, color: "#ef4444", dash: [6, 3], label: "PDH", labelSide: "right" as const, lineWidth: 1.5 },
      { price: pdhl.pdl, color: "#22c55e", dash: [6, 3], label: "PDL", labelSide: "right" as const, lineWidth: 1.5 },
    ];
    pdhlPrimitiveRef.current.setLines(lines);
    invalidateChart();
  }, [pdhl, showPdhl]);

  useEffect(() => {
    if (!userAnnotationRectPrimitiveRef.current || !userAnnotationLabelPrimitiveRef.current) return;
    const rects = userAnnotations
      .filter((a) => a.type !== "hline")
      .map((a) => ({
        startTime: a.startTime,
        endTime: a.endTime,
        top: a.top,
        bottom: a.bottom,
        fillColor: a.color,
        borderColor: a.color,
        opacity: 0.2,
      }));
    userAnnotationRectPrimitiveRef.current.setRects(rects);
    userAnnotationLabelPrimitiveRef.current.setLabels([]);

    if (userHLinePrimitiveRef.current) {
      const hlines = userAnnotations
        .filter((a) => a.type === "hline")
        .map((a) => ({
          price: a.top,
          color: a.color,
          dash: a.label === "SH" || a.label === "SL" ? [6, 4] : [],
          label: a.label,
          labelSide: "right" as const,
          lineWidth: 1.5,
          opacity: 1,
        }));
      userHLinePrimitiveRef.current.setLines(hlines);
    }
    invalidateChart();
  }, [userAnnotations]);

  const getChartCoords = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): { time: number; price: number } | null => {
      const chart = chartRef.current;
      const series = seriesRef.current;
      const container = chartContainerRef.current;
      if (!chart || !series || !container) return null;

      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const time = chart.timeScale().coordinateToTime(x);
      const price = series.coordinateToPrice(y);

      if (time === null || price === null) return null;
      return { time: time as number, price };
    },
    []
  );

  const handleChartMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (activeTool === "cursor" || activeTool === "killzone" || activeTool === "pdhl") return;
      if (activeTool === "eraser") return;

      const coords = getChartCoords(e);
      if (!coords) return;

      if (activeTool === "bos" || activeTool === "choch" || activeTool === "sh" || activeTool === "sl") {
        const nearestIdx = allCandles.reduce(
          (bestIdx, c, i) => {
            const diff = Math.abs(c.time - coords.time);
            const bestDiff = Math.abs(allCandles[bestIdx].time - coords.time);
            return diff < bestDiff ? i : bestIdx;
          },
          0
        );
        const candle = allCandles[nearestIdx];
        if (!candle) return;

        let price: number;
        let label: string;
        let color: string;

        if (activeTool === "sh") {
          price = candle.high;
          label = "SH";
          color = TOOL_COLORS.sh;
        } else if (activeTool === "sl") {
          price = candle.low;
          label = "SL";
          color = TOOL_COLORS.sl;
        } else {
          const isHigh = Math.abs(coords.price - candle.high) < Math.abs(coords.price - candle.low);
          price = isHigh ? candle.high : candle.low;
          const direction = isHigh ? "↑" : "↓";
          label = activeTool === "bos" ? `BOS ${direction}` : `CHoCH ${direction}`;
          color = TOOL_COLORS[activeTool];
        }

        const annotation: UserAnnotation = {
          id: crypto.randomUUID(),
          type: "hline",
          startTime: candle.time,
          endTime: candle.time + 3600,
          top: price,
          bottom: price,
          label,
          color,
        };
        setUserAnnotations((prev) => [...prev, annotation]);
        return;
      }

      isDrawingRef.current = true;
      drawStartRef.current = coords;

      if (chartRef.current) {
        chartRef.current.applyOptions({ handleScroll: false, handleScale: false });
      }
    },
    [activeTool, getChartCoords, allCandles]
  );

  const handleChartMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isDrawingRef.current || !drawStartRef.current) return;
      const coords = getChartCoords(e);
      if (!coords) return;

      const start = drawStartRef.current;
      const color = TOOL_COLORS[activeTool] || "#3b82f6";

      const draft: UserAnnotation = {
        id: "__draft__",
        type: activeTool === "fvg" ? "fvg" : activeTool === "ob" ? "ob" : "hline",
        startTime: Math.min(start.time, coords.time),
        endTime: Math.max(start.time, coords.time),
        top: Math.max(start.price, coords.price),
        bottom: Math.min(start.price, coords.price),
        label: activeTool === "fvg" ? "FVG" : activeTool === "ob" ? "OB" : undefined,
        color,
      };
      currentDrawRef.current = draft;

      if (userAnnotationRectPrimitiveRef.current) {
        const existing = userAnnotations.filter((a) => a.id !== "__draft__" && a.type !== "hline");
        userAnnotationRectPrimitiveRef.current.setRects([
          ...existing.map((a) => ({
            startTime: a.startTime,
            endTime: a.endTime,
            top: a.top,
            bottom: a.bottom,
            fillColor: a.color,
            borderColor: a.color,
            opacity: 0.2,
          })),
          {
            startTime: draft.startTime,
            endTime: draft.endTime,
            top: draft.top,
            bottom: draft.bottom,
            fillColor: draft.color,
            borderColor: draft.color,
            opacity: 0.25,
          },
        ]);
        invalidateChart();
      }
    },
    [activeTool, getChartCoords, userAnnotations]
  );

  const handleChartMouseUp = useCallback(() => {
    if (!isDrawingRef.current || !currentDrawRef.current) {
      isDrawingRef.current = false;
      if (chartRef.current) {
        chartRef.current.applyOptions({ handleScroll: true, handleScale: true });
      }
      return;
    }

    const draft = currentDrawRef.current;
    if (draft && draft.id === "__draft__" && Math.abs(draft.endTime - draft.startTime) > 0) {
      const finalAnnotation: UserAnnotation = { ...draft, id: crypto.randomUUID() };
      setUserAnnotations((prev) => [...prev, finalAnnotation]);
    }

    isDrawingRef.current = false;
    currentDrawRef.current = null;
    drawStartRef.current = null;

    if (chartRef.current) {
      chartRef.current.applyOptions({ handleScroll: true, handleScale: true });
    }
  }, []);

  const handleChartClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (activeTool !== "eraser") return;
      const coords = getChartCoords(e);
      if (!coords) return;
      setUserAnnotations((prev) =>
        prev.filter((a) => {
          const inTime = coords.time >= a.startTime && coords.time <= a.endTime;
          const inPrice = coords.price >= a.bottom && coords.price <= a.top;
          return !(inTime && inPrice);
        })
      );
    },
    [activeTool, getChartCoords]
  );

  const resetDrawings = useCallback(() => {
    setUserAnnotations([]);
    setShowKillZones(false);
    setShowPdhl(false);
    setShowAIIct(false);
    toast.success("Drawings cleared");
  }, []);

  const runAnalysis = useCallback(async () => {
    if (allCandles.length === 0) {
      toast.error("Load a chart first");
      return;
    }
    setAnalysisLoading(true);

    try {
      const convRes = await fetch(`${API_BASE}/gemini/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: `Chart Lab — ${instrument} ${timeframe}` }),
      });
      if (!convRes.ok) throw new Error("Failed to create conversation");
      const conv = await convRes.json();
      conversationIdRef.current = conv.id;

      const sample = allCandles.slice(-200);
      const structuredAnnotations = userAnnotations.map((a) => ({
        type: a.type,
        label: a.label || a.type.toUpperCase(),
        startTime: a.startTime,
        endTime: a.endTime,
        priceTop: a.top,
        priceBottom: a.bottom,
        priceMid: parseFloat(((a.top + a.bottom) / 2).toFixed(5)),
      }));

      const analysisCandles = ictCandles;
      const analysisFVGs = updateFVGMitigation(detectFVGs(analysisCandles), analysisCandles);
      const analysisOBs = updateOBMitigation(detectOrderBlocks(analysisCandles), analysisCandles);
      const analysisSwings = detectSwingPoints(analysisCandles, 3);
      const analysisStructure = detectMarketStructure(analysisCandles, analysisSwings);
      const analysisKillZones = isIntradayTimeframe(timeframe)
        ? getKillZoneTimestamps(analysisCandles).slice(0, 10)
        : [];
      const analysisPDHL = calcPDHL(analysisCandles);

      const autoDetectedZones = {
        fairValueGaps: analysisFVGs.slice(0, 10).map((f) => ({
          type: f.type,
          top: f.top,
          bottom: f.bottom,
          startTime: f.startTime,
          mitigated: f.mitigated,
        })),
        orderBlocks: analysisOBs.slice(0, 10).map((ob) => ({
          type: ob.type,
          top: ob.top,
          bottom: ob.bottom,
          startTime: ob.startTime,
          mitigated: ob.mitigated,
        })),
        structure: analysisStructure.slice(0, 10).map((sl) => ({
          label: sl.label,
          direction: sl.direction,
          time: sl.time,
          price: sl.price,
        })),
        killZones: analysisKillZones.map((kz) => ({
          label: kz.label,
          start: kz.start,
          end: kz.end,
        })),
        pdhl: analysisPDHL
          ? { previousDayHigh: analysisPDHL.pdh, previousDayLow: analysisPDHL.pdl, date: analysisPDHL.pdDate }
          : null,
      };

      const ohlcSample = sample.map((c) => ({
        t: new Date(c.time * 1000).toISOString().split("T")[0],
        ts: c.time,
        o: parseFloat(c.open.toFixed(5)),
        h: parseFloat(c.high.toFixed(5)),
        l: parseFloat(c.low.toFixed(5)),
        c: parseFloat(c.close.toFixed(5)),
      }));

      const prompt = `You are an ICT (Inner Circle Trader) trading mentor analyzing a chart.

CHART INFO:
- Instrument: ${instrument}
- Timeframe: ${timeframe}
- Candles: ${sample.length} candles from ${new Date(sample[0].time * 1000).toLocaleDateString()} to ${new Date(sample[sample.length - 1].time * 1000).toLocaleDateString()}

OHLC DATA (last ${Math.min(200, sample.length)} candles, one per entry):
${JSON.stringify(ohlcSample)}

USER ANNOTATIONS (what the user marked on the chart):
${structuredAnnotations.length > 0 ? JSON.stringify(structuredAnnotations, null, 2) : "None"}

AUTO-DETECTED ICT ZONES (algorithmic reference for grading user annotations):
${JSON.stringify(autoDetectedZones, null, 2)}

TASK: Walk through this chart identifying Smart Money concepts (FVG, Order Block, BOS, CHoCH, Kill Zone, PDH/PDL, Liquidity Sweep, etc.).

For each concept, output EXACTLY this format with delimiter tags:
[STEP]{"step":1,"title":"Order Block at 1.0850","concept":"Order Block","priceFrom":1.0840,"priceTo":1.0860,"timeFrom":1700000000,"timeTo":1700003600,"explanation":"This bullish order block formed before the impulsive move upward...","grade":"A"}[/STEP]

Then output the overall result:
[SUMMARY]{"overallScore":78,"summary":"Your analysis identified 3 of 5 key concepts correctly..."}[/SUMMARY]

Rules:
- Provide 4-8 steps for the most significant concepts on this chart
- Use UNIX timestamps for timeFrom/timeTo (must be within the chart range ${sample[0].time} to ${sample[sample.length - 1].time})
- Use actual prices from the OHLC data
- Grade A=user correctly identified it, B=partially identified, C=missed but common, D=fundamental gap, F=incorrect identification
- Be educational and specific about each concept`;

      const msgRes = await fetch(
        `${API_BASE}/gemini/conversations/${conv.id}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            content: prompt,
            pageContext: {
              currentPage: "Chart Lab",
              route: "/paper-trading",
              pageData: {
                instrument,
                timeframe,
                candleCount: sample.length,
                userAnnotationCount: structuredAnnotations.length,
              },
            },
          }),
        }
      );

      if (!msgRes.ok) throw new Error("AI analysis failed");

      const reader = msgRes.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let sseBuffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          sseBuffer += decoder.decode(value, { stream: true });
          const lineEnd = sseBuffer.lastIndexOf("\n");
          if (lineEnd === -1) continue;
          const completeLines = sseBuffer.slice(0, lineEnd + 1);
          sseBuffer = sseBuffer.slice(lineEnd + 1);
          for (const line of completeLines.split("\n")) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data: ")) continue;
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              if (parsed.content) fullText += parsed.content;
            } catch {
              /* ignore non-JSON data lines */
            }
          }
        }
        if (sseBuffer.startsWith("data: ")) {
          try {
            const parsed = JSON.parse(sseBuffer.slice(6));
            if (parsed.content) fullText += parsed.content;
          } catch {
            /* ignore */
          }
        }
      }

      const steps: AnalysisStep[] = [];
      const stepMatches = fullText.matchAll(/\[STEP\]([\s\S]*?)\[\/STEP\]/g);
      for (const match of stepMatches) {
        try {
          const step = JSON.parse(match[1].trim());
          steps.push(step);
        } catch {
          /* skip malformed step */
        }
      }

      let overallScore = 70;
      let summary = "Analysis complete. Review each concept highlighted on the chart.";
      const summaryMatch = fullText.match(/\[SUMMARY\]([\s\S]*?)\[\/SUMMARY\]/);
      if (summaryMatch) {
        try {
          const s = JSON.parse(summaryMatch[1].trim());
          overallScore = s.overallScore ?? overallScore;
          summary = s.summary ?? summary;
        } catch {
          /* use defaults */
        }
      }

      if (steps.length === 0) {
        const fallbackStep: AnalysisStep = {
          step: 1,
          title: "Chart Overview",
          concept: "Market Structure",
          priceFrom: allCandles[allCandles.length - 1].low,
          priceTo: allCandles[allCandles.length - 1].high,
          timeFrom: allCandles[Math.max(0, allCandles.length - 20)].time,
          timeTo: allCandles[allCandles.length - 1].time,
          explanation: fullText || "The AI analyzed your chart. Review the overall structure for key Smart Money concepts.",
          grade: "B",
        };
        steps.push(fallbackStep);
      }

      const result: AnalysisResult = { steps, overallScore, summary };
      setAnalysisResult(result);
      setAnalysisMode(true);
      setStepIndex(0);
      setShowFinalGrade(false);

      toast.success(`Mentor found ${steps.length} concepts to review`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      toast.error(message);
    } finally {
      setAnalysisLoading(false);
    }
  }, [allCandles, userAnnotations, instrument, timeframe, ictCandles]);

  useEffect(() => {
    if (!analysisMode || !analysisResult || showFinalGrade) return;

    const currentStep = analysisResult.steps[stepIndex];
    if (!currentStep) return;

    if (chartRef.current && currentStep.timeFrom) {
      try {
        const ts = chartRef.current.timeScale();
        const timeFrom = currentStep.timeFrom as Time;
        const timeTo = (currentStep.timeTo || currentStep.timeFrom + 86400) as Time;

        const fromCoord = ts.timeToCoordinate(timeFrom);
        const toCoord = ts.timeToCoordinate(timeTo);

        if (fromCoord !== null && toCoord !== null) {
          const fromLogical = ts.coordinateToLogical(fromCoord);
          const toLogical = ts.coordinateToLogical(toCoord);
          if (fromLogical !== null && toLogical !== null) {
            const centerLogical = (fromLogical + toLogical) / 2;
            const rangeSize = Math.max(toLogical - fromLogical, 30);
            ts.setVisibleLogicalRange({
              from: centerLogical - rangeSize * 2,
              to: centerLogical + rangeSize * 2,
            });
          }
        } else {
          ts.scrollToRealTime();
        }
      } catch {
        /* ignore scroll errors */
      }
    }

    if (highlightPrimitiveRef.current && currentStep.priceFrom && currentStep.priceTo && currentStep.timeFrom) {
      highlightPrimitiveRef.current.setRects([
        {
          startTime: currentStep.timeFrom,
          endTime: currentStep.timeTo || currentStep.timeFrom + 86400,
          top: Math.max(currentStep.priceFrom, currentStep.priceTo),
          bottom: Math.min(currentStep.priceFrom, currentStep.priceTo),
          fillColor: "#f59e0b",
          borderColor: "#f59e0b",
          opacity: 0.25,
        },
      ]);
      invalidateChart();
    }
  }, [stepIndex, analysisMode, analysisResult, showFinalGrade, allCandles.length]);

  useEffect(() => {
    if (!analysisMode || !analysisResult || isPaused || showFinalGrade) return;

    const interval = setInterval(() => {
      setStepIndex((prev) => {
        const next = prev + 1;
        if (next >= analysisResult.steps.length) {
          clearInterval(interval);
          setShowFinalGrade(true);
          if (highlightPrimitiveRef.current) {
            highlightPrimitiveRef.current.setRects([]);
            invalidateChart();
          }
          return prev;
        }
        return next;
      });
    }, 3500);

    stepIntervalRef.current = interval;

    return () => clearInterval(interval);
  }, [analysisMode, analysisResult, isPaused, showFinalGrade, stepIndex]);

  const exitAnalysis = useCallback(() => {
    setAnalysisMode(false);
    setAnalysisResult(null);
    setStepIndex(0);
    setShowFinalGrade(false);
    setIsPaused(false);
    if (highlightPrimitiveRef.current) {
      highlightPrimitiveRef.current.setRects([]);
      invalidateChart();
    }
    if (stepIntervalRef.current) clearInterval(stepIntervalRef.current);
  }, []);

  const cursorStyle = useMemo(() => {
    if (activeTool === "eraser") return "crosshair";
    if (activeTool === "cursor") return "default";
    return "crosshair";
  }, [activeTool]);

  const currentStep = analysisResult?.steps[stepIndex];

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden" style={{ height: "100dvh" }}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-card shrink-0">
        <button
          onClick={openDrawer}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-bold text-foreground mr-1">Chart Lab</span>
        <div className="flex items-center gap-1.5">
          <select
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
            className="text-xs bg-background border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {INSTRUMENTS.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="text-xs bg-background border border-border rounded px-2 py-1 text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {TIMEFRAMES.map((tf) => (
              <option key={tf} value={tf}>{tf}</option>
            ))}
          </select>
          <button
            onClick={fetchCandles}
            disabled={loading}
            className="text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded px-2.5 py-1 transition-colors disabled:opacity-50"
          >
            {loading ? "Loading…" : "Load"}
          </button>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={() => setShowAIIct((v) => !v)}
            className={`flex items-center gap-1 text-xs border rounded px-2 py-1 transition-colors ${
              showAIIct
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-background border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {showAIIct ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
            Show AI ICT
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-col items-center gap-1 px-1 py-2 border-r border-border bg-card w-16 shrink-0">
          {DRAWING_TOOLS.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            const isToggleOn =
              (tool.id === "killzone" && showKillZones) ||
              (tool.id === "pdhl" && showPdhl);
            return (
              <button
                key={tool.id}
                onClick={() => {
                  setActiveTool(tool.id);
                  if (tool.id === "killzone") {
                    if (!isIntradayTimeframe(timeframe)) {
                      toast.info("Kill Zones only available on intraday timeframes");
                      return;
                    }
                    setShowKillZones((v) => !v);
                  }
                  if (tool.id === "pdhl") {
                    const p = calcPDHL(ictCandles);
                    if (p) setShowPdhl((v) => !v);
                  }
                }}
                title={tool.label}
                className={`w-14 flex flex-col items-center justify-center gap-0.5 py-1.5 rounded transition-all ${
                  isActive || isToggleOn
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="text-[9px] leading-none truncate max-w-full px-0.5">{tool.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="flex-1 relative overflow-hidden">
          <div
            ref={chartContainerRef}
            className="absolute inset-0"
            style={{ cursor: analysisMode ? (isPaused ? "grab" : "default") : cursorStyle }}
            onMouseDown={analysisMode ? undefined : handleChartMouseDown}
            onMouseMove={analysisMode ? undefined : handleChartMouseMove}
            onMouseUp={analysisMode ? undefined : handleChartMouseUp}
            onMouseLeave={analysisMode ? undefined : handleChartMouseUp}
            onClick={analysisMode ? undefined : handleChartClick}
            onPointerDown={analysisMode ? () => setIsPaused(true) : undefined}
            onPointerUp={analysisMode ? () => setIsPaused(false) : undefined}
            onPointerLeave={analysisMode ? () => setIsPaused(false) : undefined}
          >
            {loading && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  <span className="text-sm text-muted-foreground">Loading chart…</span>
                </div>
              </div>
            )}

            {analysisMode && analysisResult && !showFinalGrade && (
              <>
                <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1">
                  {analysisResult.steps.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setStepIndex(i)}
                      className={`h-2 rounded-full transition-all ${
                        i === stepIndex ? "w-5 bg-primary" : i < stepIndex ? "w-2 bg-primary/50" : "w-2 bg-muted"
                      }`}
                    />
                  ))}
                </div>

                {currentStep && (
                  <div
                    className="absolute bottom-0 left-0 right-0 z-20"
                    onPointerDown={() => setIsPaused(true)}
                    onPointerUp={() => setIsPaused(false)}
                    onPointerLeave={() => setIsPaused(false)}
                  >
                    <div
                      className="mx-3 mb-3 rounded-xl border border-border shadow-2xl overflow-hidden"
                      style={{ background: "rgba(10,10,20,0.92)", backdropFilter: "blur(12px)" }}
                    >
                      <div className="flex items-center justify-between px-4 pt-3 pb-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(255,255,255,0.08)", color: "#9ca3af" }}
                          >
                            Step {currentStep.step} of {analysisResult.steps.length}
                          </span>
                          <span className="text-xs font-semibold text-foreground">{currentStep.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="text-xs font-bold px-2 py-0.5 rounded"
                            style={{
                              background:
                                currentStep.grade === "A"
                                  ? "rgba(34,197,94,0.15)"
                                  : currentStep.grade === "B"
                                  ? "rgba(59,130,246,0.15)"
                                  : currentStep.grade === "C"
                                  ? "rgba(245,158,11,0.15)"
                                  : "rgba(239,68,68,0.15)",
                              color:
                                currentStep.grade === "A"
                                  ? "#22c55e"
                                  : currentStep.grade === "B"
                                  ? "#3b82f6"
                                  : currentStep.grade === "C"
                                  ? "#f59e0b"
                                  : "#ef4444",
                            }}
                          >
                            {currentStep.grade}
                          </span>
                          <button
                            onClick={exitAnalysis}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                      <div className="px-4 pb-3">
                        <p className="text-sm text-muted-foreground leading-relaxed">{currentStep.explanation}</p>
                        {isPaused && (
                          <p className="text-[10px] text-primary/70 mt-1">Hold to pause • Release to continue</p>
                        )}
                      </div>
                      <div className="h-0.5 bg-muted/20">
                        {!isPaused && (
                          <div
                            className="h-full bg-primary/60 transition-none"
                            style={{ animation: "progress-bar 3.5s linear forwards" }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {showFinalGrade && analysisResult && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-background/80 backdrop-blur-md">
                <div
                  className="rounded-2xl border border-border p-6 max-w-sm w-full mx-4 shadow-2xl"
                  style={{ background: "rgba(10,10,20,0.95)" }}
                >
                  <div className="text-center mb-4">
                    <div
                      className="text-6xl font-black mb-1"
                      style={{ color: getScoreColor(analysisResult.overallScore) }}
                    >
                      {analysisResult.overallScore}
                    </div>
                    <div className="text-sm font-semibold text-foreground">
                      {getScoreLabel(analysisResult.overallScore)}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground text-center leading-relaxed mb-4">
                    {analysisResult.summary}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={exitAnalysis}
                      className="flex-1 text-sm border border-border rounded-lg py-2 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={() => {
                        exitAnalysis();
                        fetchCandles();
                      }}
                      className="flex-1 text-sm bg-primary text-primary-foreground rounded-lg py-2 font-semibold hover:bg-primary/90 transition-colors"
                    >
                      New Chart
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!analysisMode && (
              <div
                className="absolute bottom-10 left-1/2 -translate-x-1/2 z-30"
                onMouseDown={(e) => e.stopPropagation()}
                onMouseMove={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <button
                  onClick={runAnalysis}
                  disabled={analysisLoading || allCandles.length === 0}
                  className="flex items-center gap-1 h-6 px-3.5 text-xs bg-primary text-primary-foreground font-bold rounded-full shadow-xl hover:bg-primary/90 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {analysisLoading ? (
                    <>
                      <div className="h-3 w-3 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                      Analyzing…
                    </>
                  ) : (
                    <>
                      🤚 Ask Mentor
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
          </div>

          <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-card shrink-0">
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{instrument}</span>
              {allCandles.length > 0 && (
                <span className="ml-1.5">{formatDateRange(allCandles)}</span>
              )}
            </div>

            <button
              onClick={resetDrawings}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground border border-border rounded-lg px-2.5 py-1.5 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes progress-bar {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  );
}
