import { useState, useEffect, useRef, useCallback, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  FileText, StickyNote, CheckSquare, Square,
  X, Camera, Shield, Pencil,
  CheckCircle2, Play, GraduationCap, Users, Lock,
  ChevronLeft, ChevronRight, Plus, Bot, Calendar,
  Radio, Activity, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  EconomicCalendarWidget,
} from "@/components/LiveMarketWidgets";
import { useListTrades } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { PremiumTeaser } from "@/components/CasinoElements";
import { usePlanner } from "@/contexts/PlannerContext";
import SmartMoneyChecklist from "@/components/SmartMoneyChecklist";
import type { LucideIcon } from "lucide-react";
import { COURSE_CHAPTERS } from "@/data/academy-data";
import { usePrices, useOpenTrades } from "@/hooks/useLiveMarket";

const SESSIONS = [
  { name: "London", emoji: "🌍", startH: 2, startM: 0, endH: 5, endM: 0, color: "#F59E0B" },
  { name: "NY Open", emoji: "📈", startH: 9, startM: 30, endH: 10, endM: 0, color: "#00C896" },
  { name: "Silver Bullet", emoji: "🎯", startH: 10, startM: 0, endH: 11, endM: 0, color: "#EF4444" },
  { name: "London Close", emoji: "🔔", startH: 11, startM: 0, endH: 12, endM: 0, color: "#818CF8" },
];

const QUICK_JOURNAL_KEY = "ict-quick-journal-notes";

interface QuickNote {
  id: string;
  text: string;
  timestamp: string;
}

function getQuickNotes(): QuickNote[] {
  try {
    const raw = localStorage.getItem(QUICK_JOURNAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveQuickNote(note: QuickNote) {
  const notes = getQuickNotes();
  notes.unshift(note);
  localStorage.setItem(QUICK_JOURNAL_KEY, JSON.stringify(notes.slice(0, 100)));
}

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

function useEstClock() {
  const [time, setTime] = useState(() => getESTNow());
  useEffect(() => {
    const id = setInterval(() => setTime(getESTNow()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

function useScrollDirection() {
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

function useStatsData() {
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

function WidgetHeader({
  icon: Icon,
  title,
  editLink,
  editLabel = "Edit ↗",
  badge,
}: {
  icon: LucideIcon;
  title: string;
  editLink?: string;
  editLabel?: string;
  badge?: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <h3 className="text-sm font-semibold text-foreground flex-1">{title}</h3>
      {badge}
      {editLink && (
        <button
          onClick={() => navigate(editLink)}
          className="text-xs text-primary hover:text-primary/80 font-medium shrink-0 transition-colors"
        >
          {editLabel}
        </button>
      )}
    </div>
  );
}

function DashboardBanner({
  user,
  onAvatarClick,
}: {
  user: { avatarUrl?: string | null; name?: string | null } | null | undefined;
  onAvatarClick: () => void;
}) {
  const { prices, loading: pricesLoading, hasKey } = usePrices();
  const { trades: openTrades } = useOpenTrades();
  const estTime = useEstClock();
  const { todayRMultiple, winRate, activeSession } = useStatsData();

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

function LiveMarketPopover() {
  const [open, setOpen] = useState(false);
  const { prices, loading } = usePrices();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOut);
    return () => document.removeEventListener("mousedown", onClickOut);
  }, [open]);

  const futuresPrices = prices.filter(p =>
    ["QQQ", "SPY", "DIA", "IWM"].includes(p.symbol)
  );

  const FUTURES_MAP: Record<string, string> = {
    QQQ: "NQ (QQQ proxy)",
    SPY: "ES (SPY proxy)",
    DIA: "YM (DIA proxy)",
    IWM: "RTY (IWM proxy)",
  };

  function formatPrice(p: number, sym: string) {
    return p.toFixed(2);
  }

  return (
    <div ref={ref} className="fixed right-4 top-16 z-30">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all border ${
          open
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/50"
        }`}
        title="Live Market"
      >
        <Radio className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-64 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
            <Radio className="h-3.5 w-3.5 text-emerald-400" />
            <h3 className="text-xs font-bold text-foreground flex-1">Futures (US)</h3>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-3 space-y-2">
            {loading && futuresPrices.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 rounded-lg bg-secondary/40 animate-pulse" />
              ))
            ) : futuresPrices.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No futures data</p>
            ) : (
              futuresPrices.map((item) => {
                const isPositive = (item.changePct ?? 0) >= 0;
                return (
                  <div
                    key={item.symbol}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/40 border border-border"
                  >
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">{FUTURES_MAP[item.symbol] || item.label}</p>
                      {item.price !== null && (
                        <p className="text-sm font-bold font-mono text-foreground leading-none mt-0.5">
                          {formatPrice(item.price, item.symbol)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <span className={`w-1.5 h-1.5 rounded-full ${item.delayed ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`} />
                        <span className="text-[9px] font-bold text-muted-foreground">{item.delayed ? "DELAYED" : "LIVE"}</span>
                      </div>
                      {item.changePct !== null && (
                        <p className={`text-xs font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                          {isPositive ? "+" : ""}{(item.changePct ?? 0).toFixed(2)}%
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="px-4 pb-3">
            <p className="text-[9px] text-muted-foreground">ETF proxies: QQQ≈NQ, SPY≈ES, DIA≈YM, IWM≈RTY</p>
          </div>
        </div>
      )}
    </div>
  );
}

function QuickNoteFAB({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-6 right-6 z-30 w-10 h-10 rounded-full bg-secondary border border-border shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
      title="Quick Note"
    >
      <StickyNote className="h-4 w-4" />
    </button>
  );
}

function QuickNoteModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleLog() {
    const trimmed = text.trim();
    if (!trimmed) return;
    saveQuickNote({
      id: `qn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: trimmed,
      timestamp: new Date().toISOString(),
    });
    setText("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      <div className="pointer-events-auto w-72 bg-card border border-border rounded-2xl shadow-2xl p-4 animate-in slide-in-from-bottom-2 duration-200">
        <div className="flex items-center gap-2 mb-3">
          <StickyNote className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold flex-1">Quick Note</span>
          <button onClick={() => navigate("/journal")} className="text-xs text-primary font-medium">Journal ↗</button>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-1">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLog()}
            placeholder="Note something..."
            className="flex-1 bg-secondary/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
            maxLength={500}
          />
          {saved ? (
            <span className="text-xs text-emerald-400 font-semibold whitespace-nowrap">✓</span>
          ) : (
            <button
              onClick={handleLog}
              disabled={!text.trim()}
              className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
            >
              Log
            </button>
          )}
        </div>
        {getQuickNotes().slice(0, 2).map((note) => (
          <div key={note.id} className="flex items-start gap-2 text-xs text-muted-foreground mt-2">
            <span className="shrink-0 mt-0.5">·</span>
            <span className="line-clamp-1">{note.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AskAIFloater({ visible, onOpen }: { visible: boolean; onOpen: () => void }) {
  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-30 transition-all duration-300 ${
        visible ? "top-20 opacity-100 pointer-events-auto" : "-top-12 opacity-0 pointer-events-none"
      }`}
    >
      <button
        onClick={onOpen}
        className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground shadow-lg text-xs font-bold hover:opacity-90 transition-opacity"
      >
        <Bot className="h-3.5 w-3.5" />
        Ask AI Mentor
      </button>
    </div>
  );
}

const ICT_ACADEMY_PROGRESS_KEY_WEB = "ict-academy-progress";

function getAcademyProgress(): Set<string> {
  try {
    const raw = localStorage.getItem(ICT_ACADEMY_PROGRESS_KEY_WEB);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

function LearningProgressWidget() {
  const navigate = useNavigate();

  const completed = getAcademyProgress();
  let total = 0;
  for (const ch of COURSE_CHAPTERS) total += ch.lessons.length;
  const pct = total > 0 ? Math.round((completed.size / total) * 100) : 0;

  let nextTitle = "";
  for (const chapter of COURSE_CHAPTERS) {
    for (const lesson of chapter.lessons) {
      if (!completed.has(lesson.id)) { nextTitle = lesson.title; break; }
    }
    if (nextTitle) break;
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap className="h-4 w-4 text-primary shrink-0" />
        <h3 className="text-sm font-semibold text-foreground flex-1">Learning Progress</h3>
        <button onClick={() => navigate("/academy")} className="text-xs text-primary font-medium">Academy ↗</button>
      </div>
      <div className="flex items-center gap-4 mb-3">
        <div className="text-center">
          <p className="text-xl font-bold text-primary">{pct}%</p>
          <p className="text-xs text-muted-foreground">Complete</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-foreground">{completed.size}/{total}</p>
          <p className="text-xs text-muted-foreground">Lessons</p>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      {nextTitle && (
        <p className="text-xs text-muted-foreground mb-2">
          <span className="text-primary">▶</span> Up Next: {nextTitle}
        </p>
      )}
      <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2 mb-3">
        <Lock className="h-3 w-3 text-primary shrink-0" />
        <p className="text-xs text-primary font-medium">Complete all lessons to unlock Full Mode</p>
      </div>
      <button
        onClick={() => navigate("/academy")}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors"
        style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
      >
        Continue Learning
      </button>
    </div>
  );
}

function LessonCarouselWidget() {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<Set<string>>(() => getAcademyProgress());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const id = setInterval(() => setCompleted(getAcademyProgress()), 2000);
    return () => clearInterval(id);
  }, []);

  const allLessons = COURSE_CHAPTERS.flatMap((ch) =>
    ch.lessons.map((l) => ({ ...l, chapterTitle: ch.title, chapterColor: ch.color }))
  );

  const lessonCards = allLessons
    .filter((l) => !completed.has(l.id) && !dismissed.has(l.id))
    .slice(0, 3);

  if (lessonCards.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <FileText className="h-4 w-4 text-primary shrink-0" />
        <h3 className="text-sm font-semibold text-foreground flex-1">Up Next — ICT Lessons</h3>
        <button onClick={() => navigate("/academy")} className="text-xs text-primary font-medium">View all ↗</button>
      </div>
      <div className="flex gap-3 overflow-x-auto px-4 py-3 scrollbar-thin" style={{ scrollbarWidth: "none" }}>
        {lessonCards.map((lesson) => (
          <div key={lesson.id} className="relative shrink-0 w-44">
            <button
              onClick={() => navigate(`/academy?lesson=${lesson.id}`)}
              className="w-full flex flex-col gap-1 p-3 pt-5 rounded-xl border text-left transition-colors hover:bg-secondary/50"
              style={{ borderColor: `${lesson.chapterColor}30` }}
            >
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lesson.chapterColor }} />
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{lesson.chapterTitle}</p>
              <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{lesson.title}</p>
              <p className="text-xs text-muted-foreground leading-tight line-clamp-2 mt-0.5">{lesson.takeaway}</p>
              <div className="flex items-center gap-1 mt-auto pt-1">
                <Play className="h-3 w-3 text-primary" />
                <span className="text-xs text-primary font-semibold">Watch</span>
              </div>
            </button>
            <button
              onClick={() => setDismissed((prev) => new Set([...prev, lesson.id]))}
              className="absolute top-1.5 right-1.5 p-0.5 rounded-full text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function CommunityWidget() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Array<{ id: number; content?: string | null; authorName?: string | null; likesCount: number; createdAt?: string }>>([]);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || "/api";
    fetch(`${apiBase}/community/posts?limit=3`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPosts(data.slice(0, 3));
        else if (Array.isArray(data.posts)) setPosts(data.posts.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-violet-400 shrink-0" />
        <h3 className="text-sm font-semibold text-foreground flex-1">Community</h3>
        <button onClick={() => navigate("/community")} className="text-xs text-primary font-medium">See all ↗</button>
      </div>
      <div className="space-y-3">
        {posts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No posts yet. Be the first to share!</p>
        ) : (
          posts.map((post) => {
            const content = post.content ?? '';
            const excerpt = content.length > 80 ? content.slice(0, 80) + "…" : content;
            return (
              <button key={post.id} className="w-full flex items-start gap-2 text-left hover:opacity-80 transition-opacity" onClick={() => navigate("/community")}>
                <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-violet-400">{post.authorName?.charAt(0)?.toUpperCase() || "?"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-xs font-semibold text-foreground truncate">{post.authorName ?? 'Unknown'}</p>
                    {post.createdAt && (
                      <span className="text-xs text-muted-foreground shrink-0">{timeAgo(post.createdAt)}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{excerpt}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">❤ {post.likesCount ?? 0}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

const CUSTOM_SCHEDULE_KEY = "custom_schedule_items_v1";
const SCHEDULE_LOCKED_KEY = "today_schedule_locked_v1";
const SCHEDULE_COMPLETE_KEY = "schedule_completed_";

interface CustomScheduleItem {
  id: string;
  time: string;
  label: string;
  done?: boolean;
}

function getCustomItems(): CustomScheduleItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SCHEDULE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCustomItems(items: CustomScheduleItem[]) {
  localStorage.setItem(CUSTOM_SCHEDULE_KEY, JSON.stringify(items));
}

function parseAmPmToH24(timeStr: string): { h: number; m: number } | null {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  if (isNaN(h) || isNaN(m)) return null;
  return { h, m };
}

function parseHhmm(timeStr: string): { h: number; m: number } | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return { h, m };
}

function TodayScheduleWidget() {
  const { isRoutineComplete } = usePlanner();
  const [customItems, setCustomItems] = useState<CustomScheduleItem[]>(() => getCustomItems());
  const [newTime, setNewTime] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [editingTimeVal, setEditingTimeVal] = useState("");
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelVal, setEditingLabelVal] = useState("");
  const [showAddCustom, setShowAddCustom] = useState(false);

  type RowItem = {
    id: string; time: string; label: string;
    done: boolean; customId?: string;
  };

  function rowTimeToMins(timeStr: string): number {
    if (!timeStr) return Infinity;
    const ampm = parseAmPmToH24(timeStr);
    if (ampm) return ampm.h * 60 + ampm.m;
    const hhmm = parseHhmm(timeStr);
    if (hhmm) return hhmm.h * 60 + hhmm.m;
    return Infinity;
  }

  const customRows: RowItem[] = customItems.map((c): RowItem => ({
    id: c.id, time: c.time, label: c.label, done: c.done ?? false, customId: c.id,
  })).sort((a, b) => rowTimeToMins(a.time) - rowTimeToMins(b.time));

  function addItem() {
    if (!newLabel.trim()) return;
    const id = `custom_${Date.now()}`;
    const item: CustomScheduleItem = { id, time: newTime || "", label: newLabel.trim(), done: false };
    const updated = [...customItems, item];
    setCustomItems(updated);
    saveCustomItems(updated);
    setNewTime("");
    setNewLabel("");
  }

  function deleteItem(customId: string) {
    const updated = customItems.filter((c) => c.id !== customId);
    setCustomItems(updated);
    saveCustomItems(updated);
  }

  function toggleCustomDone(customId: string) {
    const updated = customItems.map((c) =>
      c.id === customId ? { ...c, done: !c.done } : c
    );
    setCustomItems(updated);
    saveCustomItems(updated);
  }

  function startEditCustomTime(customId: string, currentTime: string) {
    setEditingTimeId(customId);
    setEditingTimeVal(currentTime);
  }

  function saveCustomTime(customId: string) {
    const updated = customItems.map((c) =>
      c.id === customId ? { ...c, time: editingTimeVal.trim() } : c
    );
    setCustomItems(updated);
    saveCustomItems(updated);
    setEditingTimeId(null);
  }

  function startEditCustomLabel(customId: string, currentLabel: string) {
    setEditingLabelId(customId);
    setEditingLabelVal(currentLabel);
    setEditingTimeId(null);
  }

  function saveCustomLabel(customId: string) {
    const trimmed = editingLabelVal.trim();
    if (trimmed) {
      const updated = customItems.map((c) =>
        c.id === customId ? { ...c, label: trimmed } : c
      );
      setCustomItems(updated);
      saveCustomItems(updated);
    }
    setEditingLabelId(null);
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
        <h3 className="text-sm font-semibold text-foreground flex-1">Morning Routine</h3>
        {isRoutineComplete && (
          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold animate-pulse">
            Complete ✓
          </span>
        )}
      </div>

      <SmartMoneyChecklist />

      {customRows.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Custom Items</p>
          <div className="space-y-0.5">
            {customRows.map((row, idx) => (
              <div key={row.id} className="flex items-center gap-2 py-1.5 group">
                <div className="w-16 shrink-0">
                  {editingTimeId === row.id ? (
                    <input
                      type="text"
                      value={editingTimeVal}
                      onChange={(e) => setEditingTimeVal(e.target.value)}
                      onBlur={() => row.customId && saveCustomTime(row.customId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && row.customId) saveCustomTime(row.customId);
                        if (e.key === "Escape") setEditingTimeId(null);
                      }}
                      placeholder="7:30 AM"
                      autoFocus
                      className="w-full bg-secondary border border-primary rounded px-1 py-0.5 text-xs text-foreground focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => row.customId && startEditCustomTime(row.customId, row.time)}
                      className="text-xs font-mono text-muted-foreground whitespace-nowrap leading-tight transition-colors hover:text-primary cursor-pointer"
                    >
                      {row.time || "—"}
                    </button>
                  )}
                </div>
                <div className="flex flex-col items-center self-stretch shrink-0" style={{ width: 14 }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0 mt-1" />
                  {idx < customRows.length - 1 && <div className="flex-1 w-px bg-border mt-0.5" />}
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    onClick={() => row.customId && toggleCustomDone(row.customId)}
                    className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                      row.done ? "bg-primary border-primary" : "border-border hover:border-primary/50"
                    }`}
                  >
                    {row.done && <CheckSquare className="h-3 w-3 text-primary-foreground" />}
                  </button>
                  {editingLabelId === row.customId ? (
                    <input
                      type="text"
                      value={editingLabelVal}
                      onChange={(e) => setEditingLabelVal(e.target.value)}
                      onBlur={() => row.customId && saveCustomLabel(row.customId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && row.customId) saveCustomLabel(row.customId);
                        if (e.key === "Escape") setEditingLabelId(null);
                      }}
                      autoFocus
                      className="flex-1 bg-secondary border border-primary rounded px-1 py-0.5 text-xs text-foreground focus:outline-none min-w-0"
                    />
                  ) : (
                    <span className={`text-xs leading-tight min-w-0 flex-1 ${row.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {row.label}
                    </span>
                  )}
                  {editingLabelId !== row.customId && (
                    <>
                      <button
                        onClick={() => row.customId && startEditCustomLabel(row.customId, row.label)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary shrink-0"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => row.customId && deleteItem(row.customId)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400 shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3">
        {showAddCustom ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              placeholder="7:30 AM"
              className="w-20 bg-secondary border border-border rounded px-1 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { addItem(); setShowAddCustom(false); }
                if (e.key === "Escape") { setShowAddCustom(false); setNewLabel(""); setNewTime(""); }
              }}
              placeholder="Add custom item..."
              autoFocus
              className="flex-1 bg-secondary border border-border rounded px-2 py-0.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button onClick={() => { addItem(); setShowAddCustom(false); }} className="text-xs font-bold text-primary px-2 py-0.5 rounded border border-primary/30 hover:bg-primary/10 transition-colors shrink-0">Add</button>
            <button onClick={() => { setShowAddCustom(false); setNewLabel(""); setNewTime(""); }} className="text-xs text-muted-foreground hover:text-foreground shrink-0"><X className="h-3 w-3" /></button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddCustom(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/40 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus className="h-3 w-3" />
            + Add custom item
          </button>
        )}
      </div>
    </div>
  );
}

function TradingCalendarWidget() {
  const navigate = useNavigate();
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [expanded, setExpanded] = useState(false);

  const { data: apiTrades } = useListTrades();
  const trades = (apiTrades || []) as Array<{
    pnl?: string | number | null;
    createdAt?: string | null;
    isDraft?: boolean | null;
  }>;

  const dailyPnl: Record<string, number> = {};
  trades.forEach((t) => {
    if (t.isDraft || !t.createdAt) return;
    const dateStr = new Date(t.createdAt).toISOString().split("T")[0];
    const pnl = parseFloat(String(t.pnl ?? "0"));
    if (!isNaN(pnl)) dailyPnl[dateStr] = (dailyPnl[dateStr] ?? 0) + pnl;
  });

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const { year, month } = viewMonth;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDow = firstDay.getDay();
  const monthName = firstDay.toLocaleString("en-US", { month: "long" });

  const prevMonth = () => setViewMonth(({ year: y, month: m }) =>
    m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 }
  );
  const nextMonth = () => setViewMonth(({ year: y, month: m }) =>
    m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 }
  );

  const monFirstOffset = (startDow + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < monFirstOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-secondary/30 transition-colors"
      >
        <Calendar className="h-4 w-4 text-primary shrink-0" />
        <h3 className="text-sm font-semibold text-foreground flex-1 text-left">Trading Calendar</h3>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-border">
          <div className="flex items-center justify-between py-2">
            <button onClick={prevMonth} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-semibold text-foreground">{monthName} {year}</span>
            <button onClick={nextMonth} className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
              <span key={d} className="text-[10px] text-muted-foreground font-medium">{d}</span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (!day) return <div key={i} className="aspect-square" />;
              const mm = String(month + 1).padStart(2, "0");
              const dd = String(day).padStart(2, "0");
              const dateStr = `${year}-${mm}-${dd}`;
              const pnl = dailyPnl[dateStr];
              const hasTrades = pnl !== undefined;
              const isProfit = hasTrades && pnl > 0;
              const isLoss = hasTrades && pnl < 0;
              const isToday = dateStr === todayStr;
              return (
                <button
                  key={i}
                  onClick={() => hasTrades ? navigate(`/journal?date=${dateStr}`) : undefined}
                  className={`aspect-square rounded-md text-xs font-semibold transition-all flex items-center justify-center ${
                    hasTrades ? "cursor-pointer hover:opacity-90" : "cursor-default"
                  } ${
                    isProfit ? "bg-primary/75 text-primary-foreground"
                    : isLoss ? "bg-red-500/75 text-white"
                    : "border border-border/40 text-muted-foreground/60"
                  } ${isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-card font-bold" : ""}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-3 pt-2 border-t border-border">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-primary/75" />
              <span className="text-[10px] text-muted-foreground">Profit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-red-500/75" />
              <span className="text-[10px] text-muted-foreground">Loss</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface FvgSignal {
  direction: "bullish" | "bearish" | "none";
  level: number;
  instrument: string;
  detected_at: string;
}

function CandleSvg({ bullish }: { bullish: boolean }) {
  const bodyColor = bullish ? "#10b981" : "#ef4444";
  const wickColor = bullish ? "#34d399" : "#f87171";
  return (
    <svg width="28" height="48" viewBox="0 0 28 48" fill="none">
      <line x1="14" y1="2" x2="14" y2="12" stroke={wickColor} strokeWidth="2" strokeLinecap="round" />
      <rect
        x="5" y="12" width="18" height="22" rx="2"
        fill={bodyColor} fillOpacity="0.9"
      />
      <line x1="14" y1="34" x2="14" y2="46" stroke={wickColor} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function FvgAlertPopup() {
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

function CommunityBanner({ tierLevel }: { tierLevel: number }) {
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

function useLiveSignals(instrument = "NQ") {
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

function FvgSignalCard() {
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

function ConfidenceScoreCard() {
  const { confidence } = useLiveSignals();
  const score = confidence?.score ?? null;
  const scoreColor = score === null ? "text-muted-foreground" : score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400";
  const barColor = score === null ? "bg-muted" : score >= 75 ? "bg-emerald-500" : score >= 50 ? "bg-amber-500" : "bg-red-500";
  const gradeLabel = score === null ? "" : score >= 75 ? "High Probability" : score >= 50 ? "Moderate Setup" : "Wait for Alignment";

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <WidgetHeader icon={Shield} title="ICT Confidence Score" />
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

const DASH_STOCK_AVATARS = [
  { id: "bull", emoji: "🐂", label: "Bull" },
  { id: "bear", emoji: "🐻", label: "Bear" },
  { id: "chart", emoji: "📈", label: "Chart" },
  { id: "candle", emoji: "🕯️", label: "Candle" },
  { id: "rocket", emoji: "🚀", label: "Rocket" },
  { id: "shield", emoji: "🛡️", label: "Shield" },
  { id: "flame", emoji: "🔥", label: "Flame" },
  { id: "crown", emoji: "👑", label: "Crown" },
];

function resizeDashImageToBase64(file: File, maxSize = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No canvas context")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function DashAvatarPickerModal({
  user,
  onClose,
  onSelect,
}: {
  user: { avatarUrl?: string | null; name?: string | null } | null | undefined;
  onClose: () => void;
  onSelect: (val: string) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const b64 = await resizeDashImageToBase64(file);
      await onSelect(b64);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Choose Avatar</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {DASH_STOCK_AVATARS.map((a) => (
            <button
              key={a.id}
              onClick={() => onSelect(a.emoji)}
              className={`w-full aspect-square rounded-xl text-2xl flex items-center justify-center border transition-all ${
                user?.avatarUrl === a.emoji ? "border-primary bg-primary/10 ring-2 ring-primary" : "border-border hover:border-primary/50 bg-secondary"
              }`}
              title={a.label}
            >
              {a.emoji}
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            <Camera className="h-3.5 w-3.5" />
            {uploading ? "Uploading…" : "Upload Photo"}
          </button>
          {user?.avatarUrl && (
            <button onClick={() => onSelect("")} className="px-3 py-2 text-xs rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground">
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, tierLevel, appMode, setAvatarUrl } = useAuth();
  const isFreeUser = tierLevel === 0;
  const navigate = useNavigate();
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [showQuickNote, setShowQuickNote] = useState(false);
  const scrollDir = useScrollDirection();

  const firstName = user?.name?.split(" ")[0] || "Trader";

  function handleAIClick() {
    const btn = document.querySelector<HTMLButtonElement>("[data-ai-trigger]");
    if (btn) btn.click();
    else navigate("/");
  }

  useEffect(() => {
    if (!localStorage.getItem("dashboard-visited")) {
      localStorage.setItem("dashboard-visited", "true");
    }
  }, []);

  return (
    <>

      <LiveMarketPopover />

      <AskAIFloater visible={scrollDir === "up"} onOpen={handleAIClick} />

      {showAvatarPicker && (
        <DashAvatarPickerModal
          user={user}
          onClose={() => setShowAvatarPicker(false)}
          onSelect={async (val) => { await setAvatarUrl(val); setShowAvatarPicker(false); }}
        />
      )}

      {showQuickNote && <QuickNoteModal onClose={() => setShowQuickNote(false)} />}
      <QuickNoteFAB onOpen={() => setShowQuickNote(true)} />

      <FvgAlertPopup />
      <CommunityBanner tierLevel={tierLevel} />

      <div className="max-w-6xl mx-auto p-4 md:p-6 pb-28">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/journal?new=1")}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl px-3 py-2 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Log Trade
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <TodayScheduleWidget />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <EconomicCalendarWidget />
            <TradingCalendarWidget />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <FvgSignalCard />
            <ConfidenceScoreCard />
          </div>
        </div>

        {isFreeUser && (
          <div className="mt-4">
            <PremiumTeaser
              title="UNLOCK PREMIUM TOOLS"
              description="Upgrade to access the <strong>Smart Journal</strong> to log and analyze every trade, plus <strong>Analytics</strong> with performance charts, win-rate tracking, and AI-powered insights."
              buttonText="See Plans"
            />
          </div>
        )}
      </div>
    </>
  );
}
