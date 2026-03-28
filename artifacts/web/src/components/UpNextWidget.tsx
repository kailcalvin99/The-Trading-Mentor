import { useState, useEffect, useRef, useCallback } from "react";
import { Clock, Newspaper, Radio, GraduationCap, Play, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getESTNow, KILL_ZONES, getActiveKillZone } from "@/lib/timeUtils";
import { useCalendarEvents, type CalendarEvent } from "@/hooks/useLiveMarket";
import { COURSE_CHAPTERS } from "@/data/academy-data";

const ROTATE_INTERVAL_MS = 40000;
const SLIDES = ["killzone", "news", "academy"] as const;
type SlideId = typeof SLIDES[number];

function getAcademyProgress(): Set<string> {
  try {
    const raw = localStorage.getItem("ict-academy-progress");
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "0s";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${String(s).padStart(2, "0")}s`;
  return `${s}s`;
}

function parseEventTime(timeStr: string): Date | null {
  try {
    const d = new Date(timeStr);
    return isNaN(d.getTime()) ? null : d;
  } catch { return null; }
}

function formatEventTime(timeStr: string): string {
  const d = parseEventTime(timeStr);
  if (!d) return timeStr;
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
}

function getNextHighImpactEvent(events: CalendarEvent[]): CalendarEvent | null {
  const now = Date.now();
  const future = events.filter((ev) => {
    const d = parseEventTime(ev.time);
    return d && d.getTime() > now && ev.impact?.toLowerCase() === "high";
  });
  if (future.length === 0) return null;
  future.sort((a, b) => parseEventTime(a.time)!.getTime() - parseEventTime(b.time)!.getTime());
  return future[0];
}

function countryFlag(countryCode: string): string {
  const upper = (countryCode ?? "").toUpperCase().trim();
  if (upper.length !== 2) return upper;
  const codePoints = [...upper].map((c) => 0x1f1e0 + c.charCodeAt(0) - 65);
  return String.fromCodePoint(...codePoints);
}

type KillZoneState =
  | { status: "active"; zone: typeof KILL_ZONES[number]; msRemaining: number }
  | { status: "upcoming"; zone: typeof KILL_ZONES[number]; msUntil: number }
  | { status: "none" };

function getKillZoneState(): KillZoneState {
  const est = getESTNow();
  const totalMs = (est.getHours() * 3600 + est.getMinutes() * 60 + est.getSeconds()) * 1000;

  for (const zone of KILL_ZONES) {
    const startMs = (zone.startH * 3600 + zone.startM * 60) * 1000;
    const endMs = (zone.endH * 3600 + zone.endM * 60) * 1000;
    if (totalMs >= startMs && totalMs < endMs) {
      return { status: "active", zone, msRemaining: endMs - totalMs };
    }
  }

  for (const zone of KILL_ZONES) {
    const startMs = (zone.startH * 3600 + zone.startM * 60) * 1000;
    if (startMs > totalMs) {
      return { status: "upcoming", zone, msUntil: startMs - totalMs };
    }
  }

  return { status: "none" };
}

function KillZoneSlide() {
  const [kzState, setKzState] = useState<KillZoneState>(getKillZoneState);

  useEffect(() => {
    const id = setInterval(() => setKzState(getKillZoneState()), 1000);
    return () => clearInterval(id);
  }, []);

  if (kzState.status === "none") {
    return (
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 w-8 h-8 rounded-full bg-secondary/60 flex items-center justify-center">
          <Clock className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium">Kill Zones</p>
          <p className="text-sm font-semibold text-foreground">No more sessions today</p>
        </div>
      </div>
    );
  }

  if (kzState.status === "active") {
    const { zone, msRemaining } = kzState;
    return (
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center animate-pulse"
          style={{ backgroundColor: `${zone.color}20`, border: `1.5px solid ${zone.color}` }}
        >
          <span className="text-sm">🎯</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground font-medium">Kill Zone</p>
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${zone.color}20`, color: zone.color }}
            >
              LIVE
            </span>
          </div>
          <div className="flex items-baseline gap-2 min-w-0">
            <p className="text-sm font-bold truncate" style={{ color: zone.color }}>{zone.label}</p>
            <span className="text-xs font-mono text-muted-foreground shrink-0">
              closes in {formatCountdown(msRemaining)}
            </span>
          </div>
        </div>
      </div>
    );
  }

  const { zone, msUntil } = kzState;
  return (
    <div className="flex items-center gap-3 min-w-0">
      <div
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center opacity-60"
        style={{ backgroundColor: `${zone.color}15`, border: `1.5px solid ${zone.color}60` }}
      >
        <Clock className="w-4 h-4" style={{ color: zone.color }} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground font-medium">Next Kill Zone</p>
        <div className="flex items-baseline gap-2 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{zone.label}</p>
          <span className="text-xs font-mono text-muted-foreground shrink-0">
            in {formatCountdown(msUntil)}
          </span>
        </div>
        <p className="text-[10px] text-muted-foreground">
          {zone.startH % 12 || 12}:{String(zone.startM).padStart(2, "0")} {zone.startH >= 12 ? "PM" : "AM"} EST
        </p>
      </div>
    </div>
  );
}

function NewsSlide({ events }: { events: CalendarEvent[] }) {
  const nextEvent = getNextHighImpactEvent(events);

  if (!nextEvent) {
    return (
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 w-8 h-8 rounded-full bg-secondary/60 flex items-center justify-center">
          <Newspaper className="w-4 h-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium">High-Impact News</p>
          <p className="text-sm font-semibold text-foreground">No more events today</p>
        </div>
      </div>
    );
  }

  const flag = countryFlag(nextEvent.country);
  const eventDate = parseEventTime(nextEvent.time);
  const msUntil = eventDate ? eventDate.getTime() - Date.now() : 0;
  const isSoon = msUntil > 0 && msUntil < 30 * 60 * 1000;

  return (
    <div className="flex items-center gap-3 min-w-0">
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isSoon ? "bg-red-500/20 border border-red-500/40" : "bg-secondary/60"}`}>
        <Newspaper className={`w-4 h-4 ${isSoon ? "text-red-400" : "text-muted-foreground"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-xs text-muted-foreground font-medium">Next High-Impact News</p>
          {isSoon && (
            <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full">SOON</span>
          )}
        </div>
        <p className="text-sm font-semibold text-foreground truncate">{nextEvent.event}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="text-xs">{flag}</span>
          <span className="text-[10px] text-muted-foreground">{nextEvent.country}</span>
          <span className="text-[10px] text-muted-foreground font-mono">{formatEventTime(nextEvent.time)}</span>
          <span className="text-[10px] font-bold text-red-400 uppercase">● High</span>
        </div>
      </div>
    </div>
  );
}

function getLessonTeaser(title: string): string {
  const lower = title.toLowerCase();
  if (lower.includes("market structure")) return "Learn how price forms trends and how to read the flow of the market like an institutional trader.";
  if (lower.includes("fair value gap") || lower.includes("fvg")) return "Discover the price gaps Smart Money leaves behind — and how to use them as precision entry points.";
  if (lower.includes("liquidity")) return "Understand how banks hunt stop-losses and why this is the key to trading with the big players.";
  if (lower.includes("kill zone") || lower.includes("session")) return "Learn the exact trading windows when institutional orders flood the market and setups appear.";
  if (lower.includes("fibonacci") || lower.includes("ote")) return "Master the pullback measurement tool used to find the optimal trade entry zone every time.";
  if (lower.includes("candlestick") || lower.includes("candle")) return "Read the language of price action — every candle tells a story of buyers and sellers battling it out.";
  if (lower.includes("prop firm") || lower.includes("funded")) return "Discover how to get funded with up to $200,000 of someone else's money to trade with.";
  if (lower.includes("risk") || lower.includes("loss")) return "Protect your capital with the exact risk rules used by professional prop firm traders.";
  return "Build your edge with this essential ICT concept used by top traders worldwide.";
}

function AcademyHeroSlide() {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<Set<string>>(() => getAcademyProgress());
  const [killzone, setKillzone] = useState(() => getActiveKillZone());

  useEffect(() => {
    const id = setInterval(() => setCompleted(getAcademyProgress()), 2000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setKillzone(getActiveKillZone()), 10000);
    return () => clearInterval(id);
  }, []);

  const allLessons = COURSE_CHAPTERS.flatMap((ch, ci) =>
    ch.lessons.map((l, li) => ({
      ...l,
      chapterTitle: ch.title,
      chapterColor: ch.color,
      lessonIndex: li,
      totalLessons: ch.lessons.length,
      estMins: 8 + ((ci * 10 + li) % 7) * 2,
    }))
  );

  const total = allLessons.length;
  const pct = total > 0 ? Math.round((completed.size / total) * 100) : 0;

  let nextLesson: typeof allLessons[number] | null = null;
  for (const lesson of allLessons) {
    if (!completed.has(lesson.id)) { nextLesson = lesson; break; }
  }

  const allDone = !nextLesson || pct >= 100;

  if (allDone) {
    return (
      <div className="w-full -mx-4 -mb-3">
        <div
          className="relative flex flex-col items-center justify-center py-8 overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #F59E0B40 0%, #F59E0B10 60%, transparent 100%)",
            minHeight: 160,
          }}
        >
          <div className="hero-shimmer-sweep" />
          <div className="hero-trophy-bounce" style={{ fontSize: 56, lineHeight: 1 }}>
            🏆
          </div>
          <div className="mt-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40">
            <span className="text-[10px] font-bold text-amber-400 tracking-wider">ALL DONE!</span>
          </div>
        </div>
        <div className="px-4 py-3">
          <p className="text-base font-bold text-amber-400 mb-0.5">Course Complete! 🎉</p>
          <p className="text-xs text-muted-foreground mb-3">
            You've finished all ICT lessons. Review them anytime.
          </p>
          <div className="relative inline-block">
            <div
              className="absolute inset-0 rounded-lg hero-btn-ring"
              style={{ backgroundColor: "#F59E0B" }}
            />
            <button
              onClick={() => navigate("/academy")}
              className="relative flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs"
              style={{ backgroundColor: "#F59E0B", color: "#0A0A0F" }}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              Review Lessons
            </button>
          </div>
        </div>
      </div>
    );
  }

  const color = nextLesson!.chapterColor;
  const teaser = getLessonTeaser(nextLesson!.title);

  return (
    <div className="w-full -mx-4 -mb-3">
      <div
        className="relative flex flex-col items-center justify-center overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${color}40 0%, ${color}10 60%, transparent 100%)`,
          minHeight: 160,
        }}
      >
        <div className="hero-shimmer-sweep" />

        <div
          className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider"
          style={{ backgroundColor: `${color}25`, color }}
        >
          LESSON {nextLesson!.lessonIndex + 1}
        </div>

        <div
          className={`absolute bottom-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full ${killzone ? "left-2.5" : "right-2.5"}`}
          style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        >
          <Clock className="w-2.5 h-2.5 text-white/70" />
          <span className="text-[9px] font-medium text-white/70">{nextLesson!.estMins} min</span>
        </div>

        {killzone && (
          <div
            className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase"
            style={{
              backgroundColor: `${killzone.color}20`,
              borderColor: `${killzone.color}60`,
              color: killzone.color,
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ backgroundColor: killzone.color }}
            />
            LIVE · {killzone.label}
          </div>
        )}

        <div className="relative flex items-center justify-center" style={{ width: 72, height: 72 }}>
          <div
            className="absolute inset-0 rounded-full border-2 hero-ring-expand"
            style={{ borderColor: `${color}55` }}
          />
          <div
            className="hero-play-pulse flex items-center justify-center rounded-full border-2"
            style={{
              width: 56,
              height: 56,
              backgroundColor: `${color}25`,
              borderColor: `${color}80`,
            }}
          >
            <Play className="w-6 h-6" style={{ color, fill: color }} />
          </div>
        </div>
      </div>

      <div className="px-4 py-3">
        {killzone && (
          <p className="text-[11px] font-semibold mb-1.5" style={{ color: killzone.color }}>
            Markets are moving — great time to study this pattern.
          </p>
        )}

        <div className="flex items-center gap-1.5 mb-0.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-[9px] font-bold tracking-widest uppercase text-muted-foreground">Up Next</span>
        </div>

        <p className="text-[11px] font-medium mb-0.5" style={{ color }}>
          {nextLesson!.chapterTitle}
        </p>
        <p className="text-sm font-bold text-foreground leading-tight mb-1 line-clamp-2">
          {nextLesson!.title}
        </p>
        <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {teaser}
        </p>

        <div className="flex items-center gap-1 mb-3">
          <span className="text-xs">🔥</span>
          <span className="text-[10px] text-muted-foreground">
            Lesson {nextLesson!.lessonIndex + 1} of {nextLesson!.totalLessons} — keep the streak!
          </span>
        </div>

        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>{completed.size} / {total} lessons</span>
            <span className="font-semibold" style={{ color }}>{pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
        </div>

        <div className="relative inline-block">
          <div
            className="absolute inset-0 rounded-lg hero-btn-ring"
            style={{ backgroundColor: color }}
          />
          <button
            onClick={() => navigate(`/academy?lesson=${nextLesson!.id}`)}
            className="relative flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs"
            style={{ backgroundColor: color, color: "#0A0A0F" }}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Watch Now
          </button>
        </div>
      </div>
    </div>
  );
}

const SLIDE_LABELS: Record<SlideId, string> = {
  killzone: "Kill Zone",
  news: "News",
  academy: "Academy",
};

export default function UpNextWidget() {
  const [slide, setSlide] = useState<SlideId>("killzone");
  const [visible, setVisible] = useState(true);
  const { events, loading } = useCalendarEvents();
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const switchSlide = useCallback((target: SlideId) => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setVisible(false);
    fadeTimerRef.current = setTimeout(() => {
      setSlide(target);
      setVisible(true);
      fadeTimerRef.current = null;
    }, 300);
  }, []);

  const resetAutoTimer = useCallback(() => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    autoTimerRef.current = setInterval(() => {
      setSlide((prev) => {
        const idx = SLIDES.indexOf(prev);
        const next = SLIDES[(idx + 1) % SLIDES.length];
        switchSlide(next);
        return prev;
      });
    }, ROTATE_INTERVAL_MS);
  }, [switchSlide]);

  useEffect(() => {
    resetAutoTimer();
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [resetAutoTimer]);

  function handleManualSwitch(target: SlideId) {
    switchSlide(target);
    resetAutoTimer();
  }

  function handleFlip() {
    const idx = SLIDES.indexOf(slide);
    const next = SLIDES[(idx + 1) % SLIDES.length];
    handleManualSwitch(next);
  }

  return (
    <div className={`bg-card border border-border rounded-2xl px-4 py-3 ${slide === "academy" ? "overflow-hidden" : ""}`}>
      <div className="flex items-center gap-2 mb-3">
        <Radio className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse" />
        <h3 className="text-xs font-semibold text-foreground flex-1">Up Next</h3>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            {SLIDES.map((s) => (
              <button
                key={s}
                onClick={() => handleManualSwitch(s)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${slide === s ? "bg-primary" : "bg-border hover:bg-border/60"}`}
                aria-label={SLIDE_LABELS[s]}
              />
            ))}
          </div>
          <button
            onClick={handleFlip}
            className="w-6 h-6 rounded-full flex items-center justify-center bg-secondary/60 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            title="Next slide"
            aria-label="Flip to next slide"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div
        className="transition-opacity duration-300"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {loading && events.length === 0 && slide !== "academy" ? (
          <div className="flex items-center gap-3 w-full min-h-[52px]">
            <div className="shrink-0 w-8 h-8 rounded-full bg-secondary/40 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 rounded bg-secondary/40 animate-pulse w-24" />
              <div className="h-3.5 rounded bg-secondary/40 animate-pulse w-36" />
            </div>
          </div>
        ) : slide === "killzone" ? (
          <div className="min-h-[52px] flex items-center">
            <KillZoneSlide />
          </div>
        ) : slide === "news" ? (
          <div className="min-h-[52px] flex items-center">
            <NewsSlide events={events} />
          </div>
        ) : (
          <AcademyHeroSlide />
        )}
      </div>
    </div>
  );
}
