import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  FileText, StickyNote, ClipboardCheck, CheckSquare, Square,
  Settings, X, Camera,
  CheckCircle2, Play, GraduationCap, Users, Lock,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useListTrades } from "@workspace/api-client-react";
import MorningBriefingWidget from "@/components/MorningBriefingWidget";
import { useAuth } from "@/contexts/AuthContext";
import { useDailyStreak, AchievementBadges, PremiumTeaser } from "@/components/CasinoElements";
import { usePlanner } from "@/contexts/PlannerContext";
import { DASHBOARD_WIDGETS, useDashboardWidgets } from "@/hooks/useDashboardWidgets";
import { useTodaySchedule } from "@/hooks/useTodaySchedule";
import type { LucideIcon } from "lucide-react";
import { COURSE_CHAPTERS } from "@/data/academy-data";

const SESSIONS = [
  { name: "London", emoji: "🌍", startH: 2, startM: 0, endH: 5, endM: 0, color: "#F59E0B", time: "2:00–5:00 AM EST" },
  { name: "NY Open", emoji: "📈", startH: 9, startM: 30, endH: 10, endM: 0, color: "#00C896", time: "9:30–10:00 AM EST" },
  { name: "Silver Bullet", emoji: "🎯", startH: 10, startM: 0, endH: 11, endM: 0, color: "#EF4444", time: "10:00–11:00 AM EST" },
  { name: "London Close", emoji: "🔔", startH: 11, startM: 0, endH: 12, endM: 0, color: "#818CF8", time: "11:00 AM–12:00 PM EST" },
];

const CHECKLIST_STORAGE_KEY = "ict-pretrade-checklist";
const CHECKLIST_TTL_HOURS = 4;
const CHECKLIST_ITEMS = [
  { id: "htf_bias", label: "HTF Bias confirmed on Daily chart", desc: "The Daily chart is clearly bullish or bearish — no choppy indecision." },
  { id: "kill_zone", label: "In a Kill Zone right now", desc: "You are trading during London Open (2-5 AM EST) or Silver Bullet (10-11 AM EST)." },
  { id: "sweep_idm", label: "Liquidity sweep or IDM confirmed", desc: "A liquidity sweep (stop hunt) or IDM (Inducement) has occurred on your entry timeframe." },
  { id: "displacement_fvg", label: "Displacement with FVG or MSS present", desc: "Big displacement candles created an FVG or MSS — Smart Money is behind this move." },
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
  const trimmed = notes.slice(0, 100);
  localStorage.setItem(QUICK_JOURNAL_KEY, JSON.stringify(trimmed));
}

function getChecklistState(): { checked: Record<string, boolean>; timestamp: number } {
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return { checked: {}, timestamp: 0 };
    const data = JSON.parse(raw);
    const ageMs = Date.now() - (data.timestamp || 0);
    if (ageMs > CHECKLIST_TTL_HOURS * 60 * 60 * 1000) {
      localStorage.removeItem(CHECKLIST_STORAGE_KEY);
      return { checked: {}, timestamp: 0 };
    }
    return data;
  } catch { return { checked: {}, timestamp: 0 }; }
}

function saveChecklistState(checked: Record<string, boolean>) {
  localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify({ checked, timestamp: Date.now() }));
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
      <h3 className="text-sm font-bold text-foreground flex-1">{title}</h3>
      {badge}
      {editLink && (
        <button
          onClick={() => navigate(editLink)}
          className="text-[10px] text-primary hover:text-primary/80 font-medium shrink-0 transition-colors"
        >
          {editLabel}
        </button>
      )}
    </div>
  );
}

function CompactGreetingRow() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] || "Trader";
  const checklistDone = CHECKLIST_ITEMS.filter(
    (item) => getChecklistState().checked[item.id]
  ).length;
  const checklistTotal = CHECKLIST_ITEMS.length;

  const est = getESTNow();
  const greetingHour = est.getHours();
  const timeGreeting = greetingHour < 12 ? "Good morning" : greetingHour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-lg select-none">🤖</span>
        <span className="text-sm font-semibold text-foreground">
          {timeGreeting}, {firstName}
        </span>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
        <span>Checklist: {checklistDone}/{checklistTotal}</span>
      </div>
    </div>
  );
}

function PreTradeChecklistWidget() {
  const navigate = useNavigate();
  const [checked, setChecked] = useState<Record<string, boolean>>(() => getChecklistState().checked);
  const [ttlAnchor, setTtlAnchor] = useState(() => getChecklistState().timestamp);
  const allChecked = CHECKLIST_ITEMS.every((item) => checked[item.id]);
  const doneCount = Object.values(checked).filter(Boolean).length;

  useEffect(() => {
    if (ttlAnchor <= 0) return;
    const expiresAt = ttlAnchor + CHECKLIST_TTL_HOURS * 60 * 60 * 1000;
    const msLeft = expiresAt - Date.now();
    if (msLeft <= 0) {
      setChecked({});
      setTtlAnchor(0);
      localStorage.removeItem(CHECKLIST_STORAGE_KEY);
      return;
    }
    const timer = setTimeout(() => {
      setChecked({});
      setTtlAnchor(0);
      localStorage.removeItem(CHECKLIST_STORAGE_KEY);
    }, msLeft);
    return () => clearTimeout(timer);
  }, [ttlAnchor]);

  function toggle(id: string) {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    saveChecklistState(next);
    if (ttlAnchor <= 0) setTtlAnchor(Date.now());
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <WidgetHeader
        icon={ClipboardCheck}
        title="Pre-Trade Checklist"
        badge={
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${allChecked ? "bg-emerald-500/20 text-emerald-400" : "bg-secondary text-muted-foreground"}`}>
            {doneCount}/{CHECKLIST_ITEMS.length}
          </span>
        }
      />
      <div className="space-y-1.5">
        {CHECKLIST_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all text-left ${
              checked[item.id]
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-secondary/30 border-border hover:border-emerald-500/30"
            }`}
          >
            {checked[item.id]
              ? <CheckSquare className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
              : <Square className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            <span className={`text-xs font-medium ${checked[item.id] ? "text-emerald-400" : "text-foreground"}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
      <div className={`mt-2.5 rounded-lg border px-3 py-2 text-center text-xs font-bold transition-all ${
        allChecked
          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
          : "bg-secondary/30 border-border text-muted-foreground"
      }`}>
        {allChecked ? "✓ Ready to Trade" : "Not Ready"}
      </div>
    </div>
  );
}

function QuickJournalWidget() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const [recentNotes, setRecentNotes] = useState<QuickNote[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecentNotes(getQuickNotes().slice(0, 2));
  }, []);

  function handleLog() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const note: QuickNote = {
      id: `qn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: trimmed,
      timestamp: new Date().toISOString(),
    };
    saveQuickNote(note);
    setRecentNotes(getQuickNotes().slice(0, 2));
    setText("");
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    inputRef.current?.focus();
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <WidgetHeader
        icon={StickyNote}
        title="Quick Journal"
        editLink="/journal"
        editLabel="Open Journal ↗"
      />
      <div className="flex items-center gap-2 mb-3">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLog()}
          placeholder="Quick note for today..."
          className="flex-1 bg-secondary/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
          maxLength={500}
        />
        {saved ? (
          <span className="text-xs text-emerald-400 font-semibold whitespace-nowrap shrink-0">Saved ✓</span>
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
      {recentNotes.length > 0 && (
        <div className="space-y-1.5">
          {recentNotes.map((note) => (
            <div key={note.id} className="flex items-start gap-2 text-[10px] text-muted-foreground">
              <span className="shrink-0 mt-0.5">·</span>
              <span className="line-clamp-1">{note.text}</span>
            </div>
          ))}
        </div>
      )}
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

function NextWatchWidget() {
  const navigate = useNavigate();
  const [nextLesson, setNextLesson] = useState<{ id: string; title: string; chapterTitle: string; chapterColor: string; estMins: number } | null>(null);

  useEffect(() => {
    let completed = getAcademyProgress();

    fetch("/api/academy/progress", { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.lessonIds?.length) {
          const merged = new Set([...completed, ...data.lessonIds]);
          localStorage.setItem(ICT_ACADEMY_PROGRESS_KEY_WEB, JSON.stringify([...merged]));
          completed = merged;
          findNext(completed);
        }
      })
      .catch(() => {});

    findNext(completed);

    function findNext(comp: Set<string>) {
      let lessonIndex = 0;
      for (const chapter of COURSE_CHAPTERS) {
        for (const lesson of chapter.lessons) {
          if (!comp.has(lesson.id)) {
            const estMins = 8 + (lessonIndex % 7) * 2;
            setNextLesson({ id: lesson.id, title: lesson.title, chapterTitle: chapter.title, chapterColor: chapter.color, estMins });
            return;
          }
          lessonIndex++;
        }
      }
      setNextLesson(null);
    }
  }, []);

  if (!nextLesson) return null;

  return (
    <div
      className="bg-card border rounded-2xl overflow-hidden cursor-pointer hover:bg-card/80 transition-colors"
      style={{ borderColor: `${nextLesson.chapterColor}30` }}
      onClick={() => navigate(`/academy?lesson=${nextLesson.id}`)}
    >
      <div
        className="relative h-24 flex items-center justify-center"
        style={{ backgroundColor: `${nextLesson.chapterColor}20` }}
      >
        <Play className="h-10 w-10" style={{ color: nextLesson.chapterColor }} />
        <div className="absolute bottom-2 right-3 flex items-center gap-1 bg-black/50 rounded-md px-2 py-1">
          <span className="text-[10px] text-white font-medium">{nextLesson.estMins} min</span>
        </div>
      </div>
      <div className="p-4 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Up Next</span>
            <span
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ backgroundColor: `${nextLesson.chapterColor}20`, color: nextLesson.chapterColor }}
            >
              {nextLesson.chapterTitle}
            </span>
          </div>
          <p className="text-sm font-bold text-foreground leading-tight line-clamp-2">{nextLesson.title}</p>
        </div>
        <button
          className="shrink-0 text-xs font-bold px-4 py-2 rounded-xl transition-opacity hover:opacity-80"
          style={{ backgroundColor: nextLesson.chapterColor, color: "#0A0A0F" }}
          onClick={(e) => { e.stopPropagation(); navigate(`/academy?lesson=${nextLesson.id}`); }}
        >
          Watch Now
        </button>
      </div>
    </div>
  );
}

function LearningProgressWidget() {
  const navigate = useNavigate();
  const { streak } = useDailyStreak();

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
        <h3 className="text-sm font-bold text-foreground flex-1">Learning Progress</h3>
        <button onClick={() => navigate("/academy")} className="text-[10px] text-primary font-medium">Academy ↗</button>
      </div>
      <div className="flex items-center gap-4 mb-3">
        <div className="text-center">
          <p className="text-xl font-bold" style={{ color: streak >= 7 ? "#EF4444" : "#F59E0B" }}>{streak}</p>
          <p className="text-[10px] text-muted-foreground">Day streak</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-primary">{pct}%</p>
          <p className="text-[10px] text-muted-foreground">Complete</p>
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-foreground">{completed.size}/{total}</p>
          <p className="text-[10px] text-muted-foreground">Lessons</p>
        </div>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      {nextTitle && (
        <p className="text-xs text-muted-foreground mb-2">
          <span className="text-primary">▶</span> Next: {nextTitle}
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
        <h3 className="text-sm font-bold text-foreground flex-1">Community</h3>
        <button onClick={() => navigate("/community")} className="text-[10px] text-primary font-medium">See all ↗</button>
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
                    <p className="text-[11px] font-semibold text-foreground truncate">{post.authorName ?? 'Unknown'}</p>
                    {post.createdAt && (
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(post.createdAt)}</span>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground">{excerpt}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">❤ {post.likesCount ?? 0}</span>
              </button>
            );
          })
        )}
      </div>
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

  function dismissCard(id: string) {
    setDismissed((prev) => new Set([...prev, id]));
  }

  if (lessonCards.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <FileText className="h-4 w-4 text-primary shrink-0" />
        <h3 className="text-sm font-bold text-foreground flex-1">Up Next — ICT Lessons</h3>
        <button onClick={() => navigate("/academy")} className="text-[10px] text-primary font-medium">View all ↗</button>
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
              <p className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{lesson.chapterTitle}</p>
              <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">{lesson.title}</p>
              <p className="text-[10px] text-muted-foreground leading-tight line-clamp-2 mt-0.5">{lesson.takeaway}</p>
              <div className="flex items-center gap-1 mt-auto pt-1">
                <Play className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-primary font-semibold">Watch</span>
              </div>
            </button>
            <button
              onClick={() => dismissCard(lesson.id)}
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

const CUSTOM_SCHEDULE_KEY = "custom_schedule_items_v1";

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

function exportScheduleToIcs(items: Array<{ time: string; label: string }>) {
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0].replace(/-/g, "");
  const events: string[] = [];
  items.forEach((item, idx) => {
    const parsed = parseAmPmToH24(item.time) || parseHhmm(item.time);
    if (!parsed) return;
    const { h, m } = parsed;
    const startDT = `${dateStr}T${String(h).padStart(2, "0")}${String(m).padStart(2, "0")}00`;
    const endMins = h * 60 + m + 30;
    const endH = Math.floor(endMins / 60) % 24;
    const endM = endMins % 60;
    const endDT = `${dateStr}T${String(endH).padStart(2, "0")}${String(endM).padStart(2, "0")}00`;
    events.push([
      "BEGIN:VEVENT",
      `UID:ict-schedule-${dateStr}-${idx}@ict-trading`,
      `DTSTART:${startDT}`,
      `DTEND:${endDT}`,
      `SUMMARY:${item.label}`,
      "END:VEVENT",
    ].join("\r\n"));
  });
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//ICT Trading Mentor//EN", ...events, "END:VCALENDAR"].join("\r\n");
  const blob = new Blob([ics], { type: "text/calendar" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ict-schedule-${dateStr}.ics`;
  a.click();
  URL.revokeObjectURL(url);
}

function MasterMorningWidget() {
  const { routineItems, routineConfig, isRoutineComplete, toggleItem } = usePlanner();
  const { sortedSchedule, saveTime } = useTodaySchedule(routineItems);
  const [customItems, setCustomItems] = useState<CustomScheduleItem[]>(() => getCustomItems());
  const [addingAfter, setAddingAfter] = useState<number | null>(null);
  const [newTime, setNewTime] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [editingTimeVal, setEditingTimeVal] = useState("");

  const doneCount = routineConfig.filter((item) => routineItems[item.key]).length;
  const totalCount = routineConfig.length;
  const pct = totalCount > 0 ? doneCount / totalCount : 0;
  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - pct);

  type RowItem = {
    id: string;
    time: string;
    label: string;
    icon?: string;
    done: boolean;
    isRoutine: boolean;
    routineKey?: string;
    customId?: string;
  };

  function rowTimeToMins(timeStr: string): number {
    if (!timeStr) return Infinity;
    const ampm = parseAmPmToH24(timeStr);
    if (ampm) return ampm.h * 60 + ampm.m;
    const hhmm = parseHhmm(timeStr);
    if (hhmm) return hhmm.h * 60 + hhmm.m;
    return Infinity;
  }

  const allRows: RowItem[] = [
    ...sortedSchedule.map((item): RowItem => ({
      id: `routine_${item.id}`,
      time: item.timeStr,
      label: item.label,
      icon: item.icon,
      done: item.checked,
      isRoutine: true,
      routineKey: item.id,
    })),
    ...customItems.map((c): RowItem => ({
      id: c.id,
      time: c.time,
      label: c.label,
      done: c.done ?? false,
      isRoutine: false,
      customId: c.id,
    })),
  ].sort((a, b) => rowTimeToMins(a.time) - rowTimeToMins(b.time));

  function addItem() {
    if (!newLabel.trim()) return;
    const id = `custom_${Date.now()}`;
    const item: CustomScheduleItem = { id, time: newTime || "", label: newLabel.trim(), done: false };
    const updated = [...customItems, item];
    setCustomItems(updated);
    saveCustomItems(updated);
    setAddingAfter(null);
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

  function startEditRoutineTime(routineKey: string, currentTime: string) {
    setEditingTimeId(`routine_${routineKey}`);
    setEditingTimeVal(currentTime);
  }

  function saveRoutineTime(routineKey: string) {
    saveTime(routineKey, editingTimeVal.trim());
    setEditingTimeId(null);
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

  const allExportRows = allRows.map((r) => ({ time: r.time, label: r.label }));

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <WidgetHeader
        icon={CheckCircle2}
        title="☀️ Morning Master Plan"
        editLink="/planner"
        editLabel="Planner ↗"
        badge={
          isRoutineComplete ? (
            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">All Done ✓</span>
          ) : undefined
        }
      />

      <div className="flex items-center gap-4 mb-4">
        <div className="relative shrink-0">
          <svg width="52" height="52" viewBox="0 0 52 52">
            <circle cx="26" cy="26" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
            <circle
              cx="26"
              cy="26"
              r={radius}
              fill="none"
              stroke={isRoutineComplete ? "#00C896" : "#818CF8"}
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              style={{ transform: "rotate(-90deg)", transformOrigin: "center", transition: "stroke-dashoffset 0.4s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[11px] font-bold text-foreground">{doneCount}/{totalCount}</span>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1.5">
          {routineConfig.map((item) => {
            const done = routineItems[item.key];
            return (
              <label
                key={item.key}
                className="flex items-center gap-2 cursor-pointer group"
                onClick={(e) => { e.preventDefault(); toggleItem(item.key); }}
              >
                <div className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors border ${
                  done ? "bg-primary border-primary" : "border-border group-hover:border-primary/50"
                }`}>
                  {done && <CheckSquare className="h-3 w-3 text-primary-foreground" />}
                </div>
                <span className={`text-xs leading-tight ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {item.label}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 my-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider shrink-0">Today's Schedule</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div>
        {allRows.map((row, idx) => (
          <div key={row.id}>
            <div className="flex items-center gap-2 py-1.5 group">
              <div className="w-20 shrink-0">
                {editingTimeId === row.id ? (
                  <input
                    type="text"
                    value={editingTimeVal}
                    onChange={(e) => setEditingTimeVal(e.target.value)}
                    onBlur={() => {
                      if (row.isRoutine && row.routineKey) saveRoutineTime(row.routineKey);
                      else if (row.customId) saveCustomTime(row.customId);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (row.isRoutine && row.routineKey) saveRoutineTime(row.routineKey);
                        else if (row.customId) saveCustomTime(row.customId);
                      }
                      if (e.key === "Escape") setEditingTimeId(null);
                    }}
                    placeholder="7:30 AM"
                    autoFocus
                    className="w-full bg-secondary border border-primary rounded px-1 py-0.5 text-[10px] text-foreground focus:outline-none"
                  />
                ) : (
                  <button
                    onClick={() => {
                      if (row.isRoutine && row.routineKey) startEditRoutineTime(row.routineKey, row.time);
                      else if (row.customId) startEditCustomTime(row.customId, row.time);
                    }}
                    className="text-[10px] font-mono text-muted-foreground whitespace-nowrap leading-tight hover:text-primary cursor-pointer transition-colors"
                  >
                    {row.time || "—"}
                  </button>
                )}
              </div>
              <div className="flex flex-col items-center self-stretch shrink-0" style={{ width: 14 }}>
                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0 mt-1" />
                {idx < allRows.length - 1 && <div className="flex-1 w-px bg-border mt-0.5" />}
              </div>
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  onClick={() => {
                    if (row.isRoutine && row.routineKey) toggleItem(row.routineKey);
                    else if (row.customId) toggleCustomDone(row.customId);
                  }}
                  className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                    row.done ? "bg-primary border-primary" : "border-border hover:border-primary/50"
                  }`}
                >
                  {row.done && <CheckSquare className="h-3 w-3 text-primary-foreground" />}
                </button>
                {row.icon && (
                  <span className="text-sm shrink-0 leading-none">{row.icon}</span>
                )}
                <span className={`text-xs leading-tight min-w-0 flex-1 ${row.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {row.label}
                </span>
                {!row.isRoutine && (
                  <button
                    onClick={() => row.customId && deleteItem(row.customId)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400 shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-center py-0.5 opacity-0 hover:opacity-100 transition-opacity">
              {addingAfter === idx ? (
                <div className="flex items-center gap-1.5 w-full pl-22">
                  <input
                    type="text"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    placeholder="7:30 AM"
                    className="w-20 bg-secondary border border-border rounded px-1 py-0.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addItem(); if (e.key === "Escape") { setAddingAfter(null); setNewLabel(""); setNewTime(""); } }}
                    placeholder="Label..."
                    autoFocus
                    className="flex-1 bg-secondary border border-border rounded px-2 py-0.5 text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button onClick={addItem} className="text-[10px] font-bold text-primary px-2 py-0.5 rounded border border-primary/30 hover:bg-primary/10 transition-colors shrink-0">Add</button>
                  <button onClick={() => { setAddingAfter(null); setNewLabel(""); setNewTime(""); }} className="text-[10px] text-muted-foreground hover:text-foreground shrink-0"><X className="h-3 w-3" /></button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingAfter(idx)}
                  className="text-[10px] text-muted-foreground hover:text-primary transition-colors px-2"
                >
                  +
                </button>
              )}
            </div>
          </div>
        ))}

        <div className="flex justify-center py-0.5">
          {addingAfter === allRows.length ? (
            <div className="flex items-center gap-1.5 w-full pl-22">
              <input
                type="text"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                placeholder="7:30 AM"
                className="w-20 bg-secondary border border-border rounded px-1 py-0.5 text-[10px] text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addItem(); if (e.key === "Escape") { setAddingAfter(null); setNewLabel(""); setNewTime(""); } }}
                placeholder="Label..."
                autoFocus
                className="flex-1 bg-secondary border border-border rounded px-2 py-0.5 text-[10px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button onClick={addItem} className="text-[10px] font-bold text-primary px-2 py-0.5 rounded border border-primary/30 hover:bg-primary/10 transition-colors shrink-0">Add</button>
              <button onClick={() => { setAddingAfter(null); setNewLabel(""); setNewTime(""); }} className="text-[10px] text-muted-foreground hover:text-foreground shrink-0"><X className="h-3 w-3" /></button>
            </div>
          ) : (
            <button
              onClick={() => setAddingAfter(allRows.length)}
              className="text-[10px] text-muted-foreground hover:text-primary transition-colors px-2"
            >
              +
            </button>
          )}
        </div>
      </div>

      <div className="pt-3 mt-2 border-t border-border flex items-center justify-start">
        <button
          onClick={() => exportScheduleToIcs(allExportRows)}
          className="text-[10px] text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Export to Calendar (.ics) ↗
        </button>
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
    if (!isNaN(pnl)) {
      dailyPnl[dateStr] = (dailyPnl[dateStr] ?? 0) + pnl;
    }
  });

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const { year, month } = viewMonth;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDow = firstDay.getDay();

  const monthName = firstDay.toLocaleString("en-US", { month: "long" });

  const prevMonth = () => setViewMonth(({ year: y, month: m }) => {
    if (m === 0) return { year: y - 1, month: 11 };
    return { year: y, month: m - 1 };
  });
  const nextMonth = () => setViewMonth(({ year: y, month: m }) => {
    if (m === 11) return { year: y + 1, month: 0 };
    return { year: y, month: m + 1 };
  });

  const monFirstOffset = (startDow + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < monFirstOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-base select-none">📅</span>
        <h3 className="text-sm font-bold text-foreground flex-1">Trading Calendar</h3>
        <button
          onClick={prevMonth}
          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-semibold text-foreground w-24 text-center">{monthName} {year}</span>
        <button
          onClick={nextMonth}
          className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
        >
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
              className={`aspect-square rounded-md text-[11px] font-semibold transition-all flex items-center justify-center ${
                hasTrades ? "cursor-pointer hover:opacity-90" : "cursor-default"
              } ${
                isProfit
                  ? "bg-primary/75 text-primary-foreground"
                  : isLoss
                    ? "bg-red-500/75 text-white"
                    : "border border-border/40 text-muted-foreground/60"
              } ${
                isToday ? "ring-2 ring-primary ring-offset-1 ring-offset-card font-bold" : ""
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 pt-2.5 border-t border-border">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary/75" />
          <span className="text-[10px] text-muted-foreground">Profit day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500/75" />
          <span className="text-[10px] text-muted-foreground">Loss day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded border border-border" />
          <span className="text-[10px] text-muted-foreground">No trades</span>
        </div>
      </div>
    </div>
  );
}

function CustomizeDrawer({
  open,
  onClose,
  prefs,
  onToggle,
}: {
  open: boolean;
  onClose: () => void;
  prefs: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-40 animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-3xl p-6 animate-in slide-in-from-bottom duration-300 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Customize Dashboard</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Toggle widgets on or off</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-secondary transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="space-y-3">
          {DASHBOARD_WIDGETS.map((widget) => {
            const enabled = prefs[widget.id] !== false;
            return (
              <div key={widget.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <span className="text-sm font-medium text-foreground">{widget.label}</span>
                <button
                  onClick={() => onToggle(widget.id)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                    enabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                      enabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
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
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Choose Avatar</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-4">
          {DASH_STOCK_AVATARS.map((a) => (
            <button
              key={a.id}
              onClick={() => onSelect(a.emoji)}
              className={`w-full aspect-square rounded-xl text-2xl flex items-center justify-center border transition-all ${
                user?.avatarUrl === a.emoji
                  ? "border-primary bg-primary/10 ring-2 ring-primary"
                  : "border-border hover:border-primary/50 bg-secondary"
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
            <button
              onClick={() => onSelect("")}
              className="px-3 py-2 text-xs rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground"
            >
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
  const isLearningMode = appMode === "lite";
  const { prefs, toggle, isEnabled } = useDashboardWidgets();
  const [showCustomize, setShowCustomize] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("dashboard-visited")) {
      localStorage.setItem("dashboard-visited", "true");
    }
  }, []);

  const firstName = user?.name?.split(" ")[0] || "Trader";
  const _now = new Date();
  const dayLabel = `${_now.toLocaleDateString("en-US", { weekday: "long" })} · ${_now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  if (isLearningMode) {
    return (
      <div className="max-w-4xl mx-auto p-4 md:p-6 pb-24">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAvatarPicker(true)}
              className="w-10 h-10 rounded-full bg-primary/20 border border-border flex items-center justify-center shrink-0 overflow-hidden hover:ring-2 hover:ring-primary/60 transition-all"
              title="Change avatar"
            >
              {user?.avatarUrl ? (
                user.avatarUrl.startsWith("data:") || user.avatarUrl.startsWith("http") ? (
                  <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg leading-none">{user.avatarUrl}</span>
                )
              ) : (
                <span className="text-sm font-bold text-primary">{user?.name?.charAt(0)?.toUpperCase() || "T"}</span>
              )}
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Hi, {firstName}! 👋</h1>
              <p className="text-xs text-amber-500 font-medium mt-0.5">Learning Mode · {dayLabel}</p>
            </div>
          </div>
        </div>

        {showAvatarPicker && (
          <DashAvatarPickerModal
            user={user}
            onClose={() => setShowAvatarPicker(false)}
            onSelect={async (val) => { await setAvatarUrl(val); setShowAvatarPicker(false); }}
          />
        )}

        <div className="space-y-4">
          <CompactGreetingRow />
          <LearningProgressWidget />
          <MasterMorningWidget />
          <LessonCarouselWidget />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CommunityWidget />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <CustomizeDrawer
        open={showCustomize}
        onClose={() => setShowCustomize(false)}
        prefs={prefs}
        onToggle={toggle}
      />
      {showAvatarPicker && (
        <DashAvatarPickerModal
          user={user}
          onClose={() => setShowAvatarPicker(false)}
          onSelect={async (val) => { await setAvatarUrl(val); setShowAvatarPicker(false); }}
        />
      )}
      <div className="max-w-6xl mx-auto p-4 md:p-6 pb-24">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAvatarPicker(true)}
              className="w-10 h-10 rounded-full bg-primary/20 border border-border flex items-center justify-center shrink-0 overflow-hidden hover:ring-2 hover:ring-primary/60 transition-all"
              title="Change avatar"
            >
              {user?.avatarUrl ? (
                user.avatarUrl.startsWith("data:") || user.avatarUrl.startsWith("http") ? (
                  <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-lg leading-none">{user.avatarUrl}</span>
                )
              ) : (
                <span className="text-sm font-bold text-primary">{user?.name?.charAt(0)?.toUpperCase() || "T"}</span>
              )}
            </button>
            <div>
              <h1 className="text-xl font-bold text-foreground">Hi, {firstName}! 👋</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{dayLabel}</p>
            </div>
          </div>
          <button
            onClick={() => setShowCustomize(true)}
            className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground bg-secondary hover:bg-secondary/80 border border-border rounded-xl px-3 py-2 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Customize
          </button>
        </div>

        <div className="space-y-4">
          <NextWatchWidget />
          <MorningBriefingWidget />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {isEnabled("mastermorning") && <MasterMorningWidget />}
            {isEnabled("checklist") && <PreTradeChecklistWidget />}
          </div>

          {isEnabled("tradingcalendar") && <TradingCalendarWidget />}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {isEnabled("quickjournal") && <QuickJournalWidget />}
          </div>

          {!isFreeUser && <AchievementBadges />}
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
