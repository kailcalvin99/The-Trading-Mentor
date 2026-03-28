import { useState, useEffect, useRef, useCallback } from "react";
import { Clock, Newspaper, Radio, GraduationCap, Play, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getESTNow, KILL_ZONES } from "@/lib/timeUtils";
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

function AcademySlide() {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<Set<string>>(() => getAcademyProgress());

  useEffect(() => {
    const id = setInterval(() => setCompleted(getAcademyProgress()), 2000);
    return () => clearInterval(id);
  }, []);

  const allLessons = COURSE_CHAPTERS.flatMap((ch, ci) =>
    ch.lessons.map((l, li) => ({
      ...l,
      chapterTitle: ch.title,
      chapterColor: ch.color,
      estMins: 8 + ((ci * 10 + li) % 7) * 2,
    }))
  );

  const total = allLessons.length;
  const pct = total > 0 ? Math.round((completed.size / total) * 100) : 0;

  let nextLesson: typeof allLessons[number] | null = null;
  for (const lesson of allLessons) {
    if (!completed.has(lesson.id)) { nextLesson = lesson; break; }
  }

  if (!nextLesson || pct >= 100) {
    return (
      <div className="flex items-center gap-3 min-w-0">
        <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
          <GraduationCap className="w-4 h-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground font-medium">ICT Academy</p>
          <p className="text-sm font-semibold text-foreground">All lessons complete!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-medium text-muted-foreground">{completed.size} / {total} lessons</span>
        <span className="text-muted-foreground/40 text-xs">·</span>
        <span className="text-xs font-semibold text-primary">{pct}%</span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center gap-3">
        <div
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ backgroundColor: `${nextLesson.chapterColor}18` }}
        >
          <Play className="w-4 h-4" style={{ color: nextLesson.chapterColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground truncate">{nextLesson.chapterTitle}</p>
          <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{nextLesson.title}</p>
        </div>
        <button
          onClick={() => navigate(`/academy?lesson=${nextLesson!.id}`)}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Play className="h-2.5 w-2.5" />
          Watch
        </button>
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
    <div className="bg-card border border-border rounded-2xl px-4 py-3">
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
        className="transition-opacity duration-300 min-h-[52px] flex items-center"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {loading && events.length === 0 && slide !== "academy" ? (
          <div className="flex items-center gap-3 w-full">
            <div className="shrink-0 w-8 h-8 rounded-full bg-secondary/40 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 rounded bg-secondary/40 animate-pulse w-24" />
              <div className="h-3.5 rounded bg-secondary/40 animate-pulse w-36" />
            </div>
          </div>
        ) : slide === "killzone" ? (
          <KillZoneSlide />
        ) : slide === "news" ? (
          <NewsSlide events={events} />
        ) : (
          <AcademySlide />
        )}
      </div>
    </div>
  );
}
