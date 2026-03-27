import { useState, useEffect, useRef, useCallback } from "react";
import { Clock, Newspaper, Radio } from "lucide-react";
import { getESTNow, KILL_ZONES } from "@/lib/timeUtils";
import { useCalendarEvents, type CalendarEvent } from "@/hooks/useLiveMarket";

const ROTATE_INTERVAL_MS = 5000;

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
  } catch {
    return null;
  }
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
  future.sort((a, b) => {
    const da = parseEventTime(a.time)!.getTime();
    const db = parseEventTime(b.time)!.getTime();
    return da - db;
  });
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

export default function UpNextWidget() {
  const [slide, setSlide] = useState<"killzone" | "news">("killzone");
  const [visible, setVisible] = useState(true);
  const { events, loading } = useCalendarEvents();
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const switchSlide = useCallback((target: "killzone" | "news") => {
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setVisible(false);
    fadeTimerRef.current = setTimeout(() => {
      setSlide(target);
      setVisible(true);
      fadeTimerRef.current = null;
    }, 300);
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setSlide((prev) => {
        const next = prev === "killzone" ? "news" : "killzone";
        switchSlide(next);
        return prev;
      });
    }, ROTATE_INTERVAL_MS);
    return () => {
      clearInterval(intervalId);
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [switchSlide]);

  const dots: Array<"killzone" | "news"> = ["killzone", "news"];

  return (
    <div className="bg-card border border-border rounded-2xl px-4 py-3">
      <div className="flex items-center gap-2 mb-3">
        <Radio className="h-3.5 w-3.5 text-primary shrink-0 animate-pulse" />
        <h3 className="text-xs font-semibold text-foreground flex-1">Up Next</h3>
        <div className="flex items-center gap-1">
          {dots.map((d) => (
            <button
              key={d}
              onClick={() => switchSlide(d)}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${slide === d ? "bg-primary" : "bg-border"}`}
              aria-label={d === "killzone" ? "Kill Zone" : "News"}
            />
          ))}
        </div>
      </div>

      <div
        className="transition-opacity duration-300 min-h-[52px] flex items-center"
        style={{ opacity: visible ? 1 : 0 }}
      >
        {loading && events.length === 0 ? (
          <div className="flex items-center gap-3 w-full">
            <div className="shrink-0 w-8 h-8 rounded-full bg-secondary/40 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 rounded bg-secondary/40 animate-pulse w-24" />
              <div className="h-3.5 rounded bg-secondary/40 animate-pulse w-36" />
            </div>
          </div>
        ) : slide === "killzone" ? (
          <KillZoneSlide />
        ) : (
          <NewsSlide events={events} />
        )}
      </div>
    </div>
  );
}
