import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Users, TrendingUp, X, Sparkles, Shield } from "lucide-react";
import { usePrices } from "@/hooks/useLiveMarket";
import { CandleSvg } from "./LastTradeGradeCard";
import { WidgetHeader } from "./dashboardUtils";

interface FvgSignal {
  direction: "bullish" | "bearish" | "none";
  level: number;
  instrument: string;
  detected_at: string;
}

export function FvgAlertPopup() {
  const { fvg } = useLiveSignals();
  const [visible, setVisible] = useState(false);
  const [alertFvg, setAlertFvg] = useState<FvgSignal | null>(null);
  const lastDetectedAt = useRef<string | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!fvg || fvg.direction === "none") return;
    if (fvg.detected_at === lastDetectedAt.current) return;
    lastDetectedAt.current = fvg.detected_at;
    setAlertFvg({ ...fvg });
    setVisible(true);
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    dismissTimer.current = setTimeout(() => setVisible(false), 4500);
  }, [fvg]);

  useEffect(() => () => { if (dismissTimer.current) clearTimeout(dismissTimer.current); }, []);

  if (!alertFvg) return null;

  const isBullish = alertFvg.direction === "bullish";

  return (
    <div
      className={`fixed bottom-24 right-4 z-50 transition-all duration-400 ${
        visible
          ? "opacity-100 translate-y-0 pointer-events-auto"
          : "opacity-0 translate-y-4 pointer-events-none"
      }`}
    >
      <div
        className={`flex items-center gap-3 rounded-2xl border shadow-2xl px-4 py-3 min-w-[200px] backdrop-blur-sm ${
          isBullish
            ? "bg-emerald-950/90 border-emerald-500/40"
            : "bg-red-950/90 border-red-500/40"
        }`}
      >
        <CandleSvg bullish={isBullish} />
        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-1.5 mb-0.5 ${isBullish ? "text-emerald-400" : "text-red-400"}`}>
            <span className="text-base font-black leading-none">{isBullish ? "▲" : "▼"}</span>
            <span className="text-xs font-black uppercase tracking-wider">FVG</span>
          </div>
          <p className={`text-xs font-bold ${isBullish ? "text-emerald-300" : "text-red-300"}`}>
            {isBullish ? "Bullish" : "Bearish"} Gap
          </p>
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
            {alertFvg.instrument} · {alertFvg.level.toFixed(2)}
          </p>
        </div>
        <button
          onClick={() => setVisible(false)}
          className="text-muted-foreground hover:text-foreground shrink-0 self-start -mt-0.5"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function CommunityBanner({ tierLevel }: { tierLevel: number }) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [post, setPost] = useState<{ authorName?: string | null; content?: string | null; likesCount?: number } | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (tierLevel === 0) return;
    if (window.innerWidth < 768) return;
    const STORAGE_KEY = "community_banner_last_shown";
    const lastShown = localStorage.getItem(STORAGE_KEY);
    const now = Date.now();
    if (lastShown && now - parseInt(lastShown, 10) < 24 * 60 * 60 * 1000) return;

    const apiBase = import.meta.env.VITE_API_URL || "/api";
    fetch(`${apiBase}/community/posts?limit=1`, { credentials: "include" })
      .then(r => r.json())
      .then(data => {
        const posts = Array.isArray(data) ? data : (data.posts ?? []);
        if (posts.length > 0) setPost(posts[0]);
      })
      .catch(() => {});

    const showTimer = setTimeout(() => {
      setVisible(true);
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
      hideTimer.current = setTimeout(() => setVisible(false), 5500);
    }, 3000);

    return () => {
      clearTimeout(showTimer);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [tierLevel]);

  if (tierLevel === 0) return null;

  const content = post?.content ?? "";
  const excerpt = content.length > 60 ? content.slice(0, 60) + "…" : content;

  return (
    <div
      className={`fixed right-0 top-1/2 -translate-y-1/2 z-40 transition-transform duration-500 ease-out ${
        visible ? "translate-x-0" : "translate-x-full"
      }`}
    >
      <div className="bg-card/95 backdrop-blur-sm border-l border-y border-border rounded-l-2xl shadow-2xl w-64 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Users className="h-3.5 w-3.5 text-violet-400 shrink-0" />
          <span className="text-xs font-bold text-foreground flex-1">Community</span>
          <button
            onClick={() => setVisible(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="px-3 py-2.5">
          {post ? (
            <>
              <div className="flex items-center gap-2 mb-1.5">
                <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-bold text-violet-400">
                    {post.authorName?.charAt(0)?.toUpperCase() || "?"}
                  </span>
                </div>
                <p className="text-xs font-semibold text-foreground truncate">{post.authorName ?? "Trader"}</p>
              </div>
              <p className="text-xs text-muted-foreground mb-2.5 leading-relaxed">{excerpt || "New post in community"}</p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground mb-2.5">See what traders are saying</p>
          )}
          <button
            onClick={() => { navigate("/community"); setVisible(false); }}
            className="w-full text-xs font-bold text-primary-foreground bg-primary hover:opacity-90 rounded-lg py-1.5 transition-opacity"
          >
            View Community →
          </button>
        </div>
        <div
          className={`h-0.5 bg-gradient-to-r from-violet-500 to-primary transition-all duration-[5500ms] ease-linear ${
            visible ? "w-0" : "w-full"
          }`}
        />
      </div>
    </div>
  );
}

interface ConfidenceFactor {
  label: string;
  met: boolean;
}

interface ConfidenceData {
  score: number;
  factors: ConfidenceFactor[];
}

export function useLiveSignals(instrument = "NQ") {
  const [fvg, setFvg] = useState<FvgSignal | null>(null);
  const [confidence, setConfidence] = useState<ConfidenceData | null>(null);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || "/api";
    async function fetchSignals() {
      try {
        const [fvgRes, confRes] = await Promise.all([
          fetch(`${apiBase}/signals/fvg?instrument=${instrument}`, { credentials: "include" }),
          fetch(`${apiBase}/signals/confidence?instrument=${instrument}`, { credentials: "include" }),
        ]);
        if (fvgRes.ok) setFvg(await fvgRes.json());
        if (confRes.ok) setConfidence(await confRes.json());
      } catch {}
    }
    fetchSignals();
    const id = setInterval(fetchSignals, 15000);
    return () => clearInterval(id);
  }, [instrument]);

  return { fvg, confidence };
}

export function FvgSignalCard() {
  const { fvg } = useLiveSignals();
  const isBullish = fvg?.direction === "bullish";
  const isBearish = fvg?.direction === "bearish";
  const hasGap = isBullish || isBearish;
  const directionColor = isBullish ? "text-emerald-400" : isBearish ? "text-red-400" : "text-muted-foreground";
  const directionBg = isBullish ? "bg-emerald-500/15 border-emerald-500/30" : isBearish ? "bg-red-500/15 border-red-500/30" : "bg-secondary/30 border-border";

  function formatRelativeTime(isoStr: string): string {
    const diff = Date.now() - new Date(isoStr).getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return `${secs}s ago`;
    return `${Math.floor(secs / 60)}m ago`;
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <WidgetHeader icon={Sparkles} title="Fair Value Gap (FVG)" />
      {!fvg ? (
        <div className="text-xs text-muted-foreground animate-pulse">Scanning 5m chart…</div>
      ) : (
        <div className="space-y-3">
          <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold ${directionBg} ${directionColor}`}>
            {hasGap ? (
              <><span>{isBullish ? "▲" : "▼"}</span><span>{isBullish ? "Bullish FVG" : "Bearish FVG"} detected</span></>
            ) : (
              <span>No FVG detected</span>
            )}
          </div>
          {hasGap && (
            <div className="flex items-center gap-4 text-xs">
              <div><span className="text-muted-foreground">Instrument: </span><span className="font-semibold text-foreground">{fvg.instrument}</span></div>
              <div><span className="text-muted-foreground">~Level: </span><span className="font-mono font-semibold text-foreground">{fvg.level.toFixed(2)}</span></div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">Last scan: {formatRelativeTime(fvg.detected_at)}</p>
        </div>
      )}
    </div>
  );
}

export function ConfidenceScoreCard() {
  const { confidence } = useLiveSignals();
  const score = confidence?.score ?? null;
  const scoreColor = score === null ? "text-muted-foreground" : score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  const barColor = score === null ? "bg-muted" : score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
  const gradeLabel = score === null ? "" : score >= 75 ? "High Probability" : score >= 50 ? "Moderate Setup" : "Wait for Alignment";

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <WidgetHeader icon={Shield} title="Smart Money Movement Score" />
      {!confidence ? (
        <div className="text-xs text-muted-foreground animate-pulse">Computing…</div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className={`text-3xl font-bold font-mono ${scoreColor}`}>{score}</span>
            <div>
              <p className="text-xs text-muted-foreground">/100</p>
              <p className={`text-xs font-semibold ${scoreColor}`}>{gradeLabel}</p>
            </div>
            <div className="flex-1">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${score ?? 0}%` }} />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            {confidence.factors.map((f, i) => (
              <div key={i} className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg border ${f.met ? "bg-emerald-500/10 border-emerald-500/25" : "bg-secondary/30 border-border"}`}>
                <span className={f.met ? "text-emerald-400" : "text-muted-foreground"}>{f.met ? "✓" : "○"}</span>
                <span className={f.met ? "text-emerald-400" : "text-muted-foreground"}>{f.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export const DASH_STOCK_AVATARS = [
  { id: "bull", emoji: "🐂", label: "Bull" },
  { id: "bear", emoji: "🐻", label: "Bear" },
  { id: "chart", emoji: "📈", label: "Chart" },
  { id: "candle", emoji: "🕯️", label: "Candle" },
  { id: "rocket", emoji: "🚀", label: "Rocket" },
  { id: "shield", emoji: "🛡️", label: "Shield" },
  { id: "flame", emoji: "🔥", label: "Flame" },
  { id: "crown", emoji: "👑", label: "Crown" },
];

