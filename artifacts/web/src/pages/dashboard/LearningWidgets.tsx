import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { GraduationCap, Play, Lock, FileText, X, Clock } from "lucide-react";
import { COURSE_CHAPTERS } from "@/data/academy-data";

const ICT_ACADEMY_PROGRESS_KEY_WEB = "ict-academy-progress";

function getAcademyProgress(): Set<string> {
  try {
    const raw = localStorage.getItem(ICT_ACADEMY_PROGRESS_KEY_WEB);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch { return new Set(); }
}

export function LearningProgressWidget() {
  const navigate = useNavigate();
  const [completed, setCompleted] = useState<Set<string>>(() => getAcademyProgress());

  useEffect(() => {
    const id = setInterval(() => setCompleted(getAcademyProgress()), 2000);
    return () => clearInterval(id);
  }, []);

  let total = 0;
  for (const ch of COURSE_CHAPTERS) total += ch.lessons.length;
  const pct = total > 0 ? Math.round((completed.size / total) * 100) : 0;

  if (pct >= 100) return null;

  const allLessons = COURSE_CHAPTERS.flatMap((ch, ci) =>
    ch.lessons.map((l, li) => ({
      ...l,
      chapterTitle: ch.title,
      chapterColor: ch.color,
      estMins: 8 + ((ci * 10 + li) % 7) * 2,
    }))
  );

  let nextLesson: typeof allLessons[number] | null = null;
  for (const lesson of allLessons) {
    if (!completed.has(lesson.id)) { nextLesson = lesson; break; }
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <GraduationCap className="h-4 w-4 text-primary shrink-0" />
        <h3 className="text-sm font-semibold text-foreground flex-1">Up Next — ICT Lessons</h3>
        <button onClick={() => navigate("/academy")} className="text-xs text-primary font-medium">Academy ↗</button>
      </div>

      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xs font-medium text-muted-foreground">{completed.size} / {total} lessons</span>
        <span className="text-muted-foreground/40 text-xs">·</span>
        <span className="text-xs font-semibold text-primary">{pct}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-4">
        <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      {nextLesson && (
        <div
          className="flex gap-3 rounded-xl border overflow-hidden mb-3"
          style={{ borderColor: `${nextLesson.chapterColor}30` }}
        >
          <div
            className="w-20 shrink-0 flex items-center justify-center relative"
            style={{ backgroundColor: `${nextLesson.chapterColor}18`, minHeight: 80 }}
          >
            <Play className="h-7 w-7" style={{ color: nextLesson.chapterColor }} />
            <div className="absolute bottom-1.5 right-1.5 flex items-center gap-1 bg-black/55 rounded px-1.5 py-0.5">
              <Clock className="h-2.5 w-2.5 text-white" />
              <span className="text-[10px] text-white font-semibold">{nextLesson.estMins} min</span>
            </div>
          </div>
          <div className="flex-1 py-2.5 pr-2.5 flex flex-col justify-center min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: nextLesson.chapterColor }} />
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Up Next</span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate">{nextLesson.chapterTitle}</p>
            <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2 mb-2">{nextLesson.title}</p>
            <button
              onClick={() => navigate(`/academy?lesson=${nextLesson!.id}`)}
              className="flex items-center gap-1.5 self-start px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
              style={{ background: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
            >
              <Play className="h-3 w-3" />
              Watch Now
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
        <Lock className="h-3 w-3 text-primary shrink-0" />
        <p className="text-xs text-primary font-medium">Complete all lessons to unlock Full Mode</p>
      </div>
    </div>
  );
}

export function LessonCarouselWidget() {
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
