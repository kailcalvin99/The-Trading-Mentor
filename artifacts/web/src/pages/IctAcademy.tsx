import { useState, useRef, useEffect, useCallback } from "react";
import GraduationCelebration, { useGraduationCheck } from "@/components/GraduationCelebration";
import { useAuth } from "@/contexts/AuthContext";
import {
  GraduationCap,
  ChevronDown,
  ChevronUp,
  Send,
  Plus,
  ArrowLeft,
  MessageSquare,
  Loader2,
  BookOpen,
  CheckCircle2,
  Circle,
  Lock,
  Flame,
  Zap,
  Trophy,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Play,
} from "lucide-react";
import {
  COURSE_CHAPTERS,
  GLOSSARY,
  QUIZ_BANK,
  PLAN_SECTIONS,
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
  DIFFICULTY_ICONS,
  TOTAL_QUIZ_QUESTIONS,
  pickQuestion,
  type Difficulty,
  type QuizQuestion,
  type Chapter,
  type Lesson,
} from "../data/academy-data";

type Tab = "learn" | "glossary" | "quiz" | "mentor" | "plan";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: number;
  title: string;
}

const PROGRESS_KEY = "ict-academy-progress";

function getProgress(): Set<string> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

function setProgress(completed: Set<string>) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify([...completed]));
}

function getImageUrl(filename: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base}images/${filename}`;
}

function getApiUrl(): string {
  return "/api/";
}

const STREAK_KEY = "ict-learn-streak";
const XP_KEY = "ict-learn-xp";
const LAST_DATE_KEY = "ict-learn-last-date";

function getStreak(): number {
  try { return parseInt(localStorage.getItem(STREAK_KEY) || "0", 10); } catch { return 0; }
}
function getXP(): number {
  try { return parseInt(localStorage.getItem(XP_KEY) || "0", 10); } catch { return 0; }
}
function getLastDate(): string {
  try { return localStorage.getItem(LAST_DATE_KEY) || ""; } catch { return ""; }
}

function getAllCards(): { lesson: Lesson; chapter: Chapter; globalIdx: number }[] {
  const cards: { lesson: Lesson; chapter: Chapter; globalIdx: number }[] = [];
  let idx = 0;
  for (const ch of COURSE_CHAPTERS) {
    for (const l of ch.lessons) {
      cards.push({ lesson: l, chapter: ch, globalIdx: idx++ });
    }
  }
  return cards;
}

function ConfettiBurst({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = ["#00C896", "#818CF8", "#FFD700", "#EF4444", "#06B6D4", "#F59E0B"];
    const particles: { x: number; y: number; vx: number; vy: number; r: number; color: string; life: number }[] = [];

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: canvas.width / 2,
        y: canvas.height / 2,
        vx: (Math.random() - 0.5) * 16,
        vy: (Math.random() - 0.5) * 16 - 4,
        r: Math.random() * 5 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
      });
    }

    let frame = 0;
    const maxFrames = 50;

    function animate() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.3;
        p.life -= 1 / maxFrames;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      frame++;
      if (frame < maxFrames) requestAnimationFrame(animate);
      else onDone();
    }
    animate();
  }, [onDone]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-50"
      style={{ width: "100%", height: "100%" }}
    />
  );
}

function SwipeLearnView({ onExit }: { onExit: () => void }) {
  const allCards = getAllCards();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [completed, setCompleted] = useState<Set<string>>(getProgress);
  const [cardStep, setCardStep] = useState(0);
  const [swipeX, setSwipeX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [xp, setXp] = useState(getXP);
  const [streak, setStreak] = useState(getStreak);
  const [justCompleted, setJustCompleted] = useState(false);
  const [xpPop, setXpPop] = useState(0);
  const dragStart = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const card = allCards[currentIdx];
  const lesson = card.lesson;
  const chapter = card.chapter;
  const isDone = completed.has(lesson.id);
  const totalCards = allCards.length;
  const completedCount = allCards.filter((c) => completed.has(c.lesson.id)).length;

  const totalSteps = lesson.paragraphs.length + (lesson.chartImage ? 1 : 0) + (lesson.videoFile ? 1 : 0) + 1;

  function markComplete() {
    if (completed.has(lesson.id)) return;
    const next = new Set(completed);
    next.add(lesson.id);
    setCompleted(next);
    setProgress(next);

    const today = new Date().toDateString();
    const lastDate = getLastDate();
    let newStreak = streak;
    if (lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      newStreak = lastDate === yesterday.toDateString() ? streak + 1 : 1;
      localStorage.setItem(STREAK_KEY, String(newStreak));
      localStorage.setItem(LAST_DATE_KEY, today);
      setStreak(newStreak);
    }

    const earnedXp = 25 * Math.max(1, newStreak);
    const newXp = xp + earnedXp;
    localStorage.setItem(XP_KEY, String(newXp));
    setXp(newXp);
    setXpPop(earnedXp);
    setShowConfetti(true);
    setJustCompleted(true);
    setTimeout(() => { setXpPop(0); setJustCompleted(false); }, 1800);
  }

  function goNext() {
    if (cardStep < totalSteps - 1) {
      setCardStep(cardStep + 1);
    } else {
      if (!isDone && !completed.has(lesson.id)) markComplete();
      if (currentIdx < totalCards - 1) {
        setCurrentIdx(currentIdx + 1);
        setCardStep(0);
        setSwipeX(0);
      }
    }
  }

  function goPrev() {
    if (cardStep > 0) {
      setCardStep(cardStep - 1);
    } else if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
      setCardStep(0);
      setSwipeX(0);
    }
  }

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragStart.current = e.clientX;
    setIsDragging(true);
    setSwipeX(0);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    setSwipeX(e.clientX - dragStart.current);
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);
    if (swipeX > 100) {
      if (!isDone) markComplete();
      setSwipeX(0);
    } else if (swipeX < -100) {
      goPrev();
      setSwipeX(0);
    } else {
      setSwipeX(0);
    }
  }, [isDragging, swipeX, isDone, currentIdx]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); goNext(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      if (e.key === "ArrowUp") { e.preventDefault(); goPrev(); }
      if (e.key === "ArrowDown") { e.preventDefault(); goNext(); }
      if (e.key === "Escape") onExit();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  const stepContent = (() => {
    const paraCount = lesson.paragraphs.length;
    let step = cardStep;
    if (step < paraCount) {
      return { type: "paragraph" as const, text: lesson.paragraphs[step], stepLabel: `${cardStep + 1} of ${totalSteps}` };
    }
    step -= paraCount;
    if (lesson.chartImage && step === 0) {
      return { type: "chart" as const, stepLabel: `${cardStep + 1} of ${totalSteps}` };
    }
    if (lesson.chartImage) step--;
    if (lesson.videoFile && step === 0) {
      return { type: "video" as const, stepLabel: `${cardStep + 1} of ${totalSteps}` };
    }
    return { type: "takeaway" as const, stepLabel: `${cardStep + 1} of ${totalSteps}` };
  })();

  const swipeOpacity = Math.min(1, Math.abs(swipeX) / 150);
  const swipeRotation = swipeX * 0.05;

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col" ref={containerRef}>
      {showConfetti && <ConfettiBurst onDone={() => setShowConfetti(false)} />}

      <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-5 w-5" />
          <span className="hidden sm:inline">Exit</span>
        </button>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-bold text-orange-500">{streak}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-bold text-yellow-500">{xp} XP</span>
          </div>
        </div>

        <div className="text-xs text-muted-foreground font-medium">
          {completedCount}/{totalCards}
        </div>
      </div>

      <div className="flex gap-0.5 px-4 pt-3">
        {allCards.map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{
              backgroundColor:
                i < currentIdx || completed.has(allCards[i].lesson.id)
                  ? "#00C896"
                  : i === currentIdx
                  ? "#00C896"
                  : "hsl(var(--border))",
              opacity: i === currentIdx ? 1 : i < currentIdx || completed.has(allCards[i].lesson.id) ? 0.5 : 0.2,
            }}
          />
        ))}
      </div>

      <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
        <button
          onClick={goPrev}
          disabled={currentIdx === 0 && cardStep === 0}
          className="absolute left-0 top-0 bottom-0 w-16 z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity disabled:hidden"
          aria-label="Previous"
        >
          <div className="bg-card/80 backdrop-blur border border-border rounded-full p-2">
            <ChevronLeft className="h-5 w-5 text-foreground" />
          </div>
        </button>

        <button
          onClick={() => {
            if (stepContent.type === "takeaway" && !isDone) {
              markComplete();
            } else {
              goNext();
            }
          }}
          disabled={currentIdx === totalCards - 1 && cardStep === totalSteps - 1}
          className="absolute right-0 top-0 bottom-0 w-16 z-20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity disabled:hidden"
          aria-label="Next"
        >
          <div className="bg-card/80 backdrop-blur border border-border rounded-full p-2">
            <ChevronRight className="h-5 w-5 text-foreground" />
          </div>
        </button>

        <div
          className="relative w-full max-w-lg select-none"
          style={{
            transform: `translateX(${swipeX}px) rotate(${swipeRotation}deg)`,
            transition: isDragging ? "none" : "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {swipeX > 20 && (
            <div
              className="absolute -top-2 -right-2 bg-green-500 text-white px-4 py-1.5 rounded-full font-bold text-sm z-10 shadow-lg"
              style={{ opacity: swipeOpacity }}
            >
              GOT IT
            </div>
          )}

          <div
            className="rounded-2xl border-2 overflow-hidden bg-card shadow-2xl"
            style={{ borderColor: justCompleted ? "#00C896" : chapter.color + "40" }}
          >
            <div
              className="px-5 py-4 flex items-center gap-3"
              style={{ background: `linear-gradient(135deg, ${chapter.color}15, ${chapter.color}05)` }}
            >
              <span className="text-2xl">{chapter.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold uppercase tracking-wider" style={{ color: chapter.color }}>
                  {chapter.title}
                </div>
                <div className="text-lg font-bold text-foreground truncate">{lesson.title}</div>
              </div>
              {isDone && (
                <div className="shrink-0 bg-primary/20 rounded-full p-1.5">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                </div>
              )}
            </div>

            <div className="px-5 py-6 min-h-[280px] flex flex-col justify-center">
              {stepContent.type === "paragraph" && (
                <p className="text-base leading-relaxed text-foreground/90 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {stepContent.text}
                </p>
              )}

              {stepContent.type === "chart" && lesson.chartImage && (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                    See it on the chart
                  </p>
                  <img
                    src={getImageUrl(lesson.chartImage)}
                    alt={`${lesson.title} chart`}
                    className="w-full rounded-xl border cursor-zoom-in"
                    style={{ maxHeight: "400px", objectFit: "contain" }}
                    onClick={(e) => {
                      const el = e.currentTarget;
                      if (el.style.maxHeight === "none") {
                        el.style.maxHeight = "400px";
                        el.style.objectFit = "contain";
                      } else {
                        el.style.maxHeight = "none";
                        el.style.objectFit = "contain";
                      }
                    }}
                  />
                  <p className="text-[10px] text-muted-foreground/50 text-center mt-1">Tap image to enlarge</p>
                </div>
              )}

              {stepContent.type === "video" && lesson.videoFile && (
                <div className="animate-in fade-in zoom-in-95 duration-300">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Play className="h-3.5 w-3.5" />
                    Watch it in action
                  </p>
                  <video
                    src={getImageUrl(lesson.videoFile)}
                    className="w-full rounded-xl border"
                    style={{ maxHeight: "400px", objectFit: "contain" }}
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls
                  />
                </div>
              )}

              {stepContent.type === "takeaway" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div
                    className="rounded-xl p-5 border-l-[4px]"
                    style={{ borderLeftColor: chapter.color, backgroundColor: chapter.color + "12" }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <Sparkles className="h-4 w-4" style={{ color: chapter.color }} />
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: chapter.color }}>
                        Key Takeaway
                      </p>
                    </div>
                    <p className="text-base leading-relaxed font-semibold text-foreground">
                      {lesson.takeaway}
                    </p>
                  </div>

                  {!isDone && (
                    <p className="text-center text-xs text-muted-foreground mt-4 animate-pulse">
                      Swipe right or tap below to complete
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-1 px-5 pb-2">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div
                  key={i}
                  className="h-1.5 flex-1 rounded-full transition-all duration-300 cursor-pointer"
                  onClick={() => setCardStep(i)}
                  style={{
                    backgroundColor: i <= cardStep ? chapter.color : "hsl(var(--border))",
                    opacity: i <= cardStep ? 1 : 0.3,
                  }}
                />
              ))}
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-t border-border">
              <button
                onClick={goPrev}
                disabled={currentIdx === 0 && cardStep === 0}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>

              <span className="text-xs text-muted-foreground">{stepContent.stepLabel}</span>

              {stepContent.type === "takeaway" && !isDone ? (
                <button
                  onClick={markComplete}
                  className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Got it!
                </button>
              ) : (
                <button
                  onClick={goNext}
                  disabled={currentIdx === totalCards - 1 && cardStep === totalSteps - 1}
                  className="flex items-center gap-1 text-sm text-primary font-semibold hover:opacity-80 disabled:opacity-30 transition-opacity"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {xpPop > 0 && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-50">
              <div className="animate-bounce text-center">
                <div className="text-3xl font-black text-yellow-400 drop-shadow-lg">
                  +{xpPop} XP
                </div>
                {streak > 1 && (
                  <div className="text-sm font-bold text-orange-400 mt-1">
                    {streak}x streak bonus!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="text-center py-3 text-xs text-muted-foreground/50 shrink-0">
        Use arrow keys, swipe, click edges, or use the buttons to navigate
      </div>
    </div>
  );
}

function LearnView() {
  const [swipeMode, setSwipeMode] = useState(false);
  const [completed, setCompleted] = useState<Set<string>>(getProgress);

  useEffect(() => {
    const interval = setInterval(() => setCompleted(getProgress()), 500);
    return () => clearInterval(interval);
  }, []);

  const totalLessons = COURSE_CHAPTERS.reduce((sum, ch) => sum + ch.lessons.length, 0);
  const completedCount = COURSE_CHAPTERS.reduce(
    (sum, ch) => sum + ch.lessons.filter((l) => completed.has(l.id)).length,
    0
  );
  const streak = getStreak();
  const xp = getXP();

  function toggleComplete(lessonId: string) {
    const next = new Set(completed);
    if (next.has(lessonId)) next.delete(lessonId);
    else next.add(lessonId);
    setCompleted(next);
    setProgress(next);
  }

  if (swipeMode) {
    return <SwipeLearnView onExit={() => { setSwipeMode(false); setCompleted(getProgress()); }} />;
  }

  const isAllDone = completedCount >= totalLessons;
  const quizPassed = (() => { try { return localStorage.getItem("ict-quiz-passed") === "true"; } catch { return false; } })();

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="rounded-2xl overflow-hidden border mb-6 bg-card">
        <video
          src={getImageUrl("video-academy-intro.mp4")}
          className="w-full h-56 sm:h-72 object-cover"
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="p-5">
          <h2 className="text-xl font-bold mb-2">ICT Trading Course</h2>
          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
            Learn NQ Futures trading from scratch using the ICT methodology — a proven approach to understanding how markets really move.
          </p>
          <div className="bg-secondary/50 rounded-xl p-3 border border-border">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-semibold text-foreground/80">Created with respect for Michael J. Huddleston</span> — the original Inner Circle Trader (ICT) who pioneered Smart Money Concepts, market structure analysis, and institutional order flow theory. His decades of teaching have transformed how traders worldwide understand price action. This course distills his core concepts into beginner-friendly lessons.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-orange-500/10 rounded-lg px-3 py-1.5">
            <Flame className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-bold text-orange-500">{streak} day streak</span>
          </div>
          <div className="flex items-center gap-1.5 bg-yellow-500/10 rounded-lg px-3 py-1.5">
            <Zap className="h-4 w-4 text-yellow-500" />
            <span className="text-sm font-bold text-yellow-500">{xp} XP</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-primary">{completedCount}/{totalLessons}</div>
          <div className="text-xs text-muted-foreground">lessons done</div>
        </div>
      </div>

      {isAllDone && !quizPassed && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Trophy className="h-6 w-6 text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-bold text-amber-500">All Lessons Complete!</p>
            <p className="text-xs text-muted-foreground">Now pass the Quiz tab with 70%+ to unlock all app features.</p>
          </div>
        </div>
      )}

      <button
        onClick={() => setSwipeMode(true)}
        className="w-full mb-8 flex items-center justify-center gap-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-2xl py-4 px-6 font-bold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
      >
        <Play className="h-6 w-6" />
        Start Swipe Mode
        <span className="text-sm font-medium opacity-80 ml-1">TikTok-style</span>
      </button>

      <div className="h-2 bg-border rounded-full mb-8 overflow-hidden">
        <div
          className="h-2 bg-primary rounded-full transition-all duration-500"
          style={{ width: `${totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0}%` }}
        />
      </div>

      <div className="space-y-4">
        {COURSE_CHAPTERS.map((chapter, chIdx) => {
          const chCompleted = chapter.lessons.filter((l) => completed.has(l.id)).length;
          const chTotal = chapter.lessons.length;
          const chDone = chCompleted === chTotal && chTotal > 0;

          return (
            <ChapterAccordion
              key={chapter.id}
              chapter={chapter}
              chIdx={chIdx}
              chCompleted={chCompleted}
              chTotal={chTotal}
              chDone={chDone}
              completed={completed}
              toggleComplete={toggleComplete}
              defaultOpen={chIdx === 0}
            />
          );
        })}
      </div>
    </div>
  );
}

function ChapterAccordion({
  chapter, chIdx, chCompleted, chTotal, chDone, completed, toggleComplete, defaultOpen,
}: {
  chapter: Chapter; chIdx: number; chCompleted: number; chTotal: number; chDone: boolean;
  completed: Set<string>; toggleComplete: (id: string) => void; defaultOpen: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);

  return (
    <div className="rounded-xl border overflow-hidden bg-card">
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-secondary/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-2xl">{chapter.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">Chapter {chIdx + 1}</span>
            {chDone && <CheckCircle2 className="h-4 w-4 text-primary" />}
          </div>
          <div className="text-base font-semibold mt-0.5">{chapter.title}</div>
          <div className="text-xs text-muted-foreground mt-1">{chapter.description}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-sm font-semibold" style={{ color: chapter.color }}>
            {chCompleted}/{chTotal}
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground mt-1" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground mt-1" />
          )}
        </div>
      </button>

      {isOpen && (
        <div className="border-t">
          {chapter.lessons.map((lesson, lIdx) => {
            const isLessonOpen = expandedLesson === lesson.id;
            const isDone = completed.has(lesson.id);

            return (
              <div key={lesson.id} className="border-b last:border-b-0">
                <div
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors cursor-pointer"
                  onClick={() => setExpandedLesson(isLessonOpen ? null : lesson.id)}
                >
                  <div
                    className="shrink-0 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); toggleComplete(lesson.id); }}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-5 w-5 text-primary" />
                    ) : (
                      <Circle className="h-5 w-5 text-muted-foreground/40" />
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground font-mono w-6">{lIdx + 1}.</span>
                  <span className={`flex-1 text-sm font-medium ${isDone ? "text-muted-foreground line-through" : ""}`}>
                    {lesson.title}
                  </span>
                  {isLessonOpen ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>

                {isLessonOpen && (
                  <div className="px-4 pb-5 pt-2 ml-14">
                    <div className="space-y-3">
                      {lesson.paragraphs.map((p, pIdx) => (
                        <p key={pIdx} className="text-sm leading-relaxed text-foreground/90">{p}</p>
                      ))}
                    </div>

                    {lesson.chartImage && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                          See it on the chart
                        </p>
                        <img
                          src={getImageUrl(lesson.chartImage)}
                          alt={`${lesson.title} chart example`}
                          className="w-full rounded-lg border cursor-zoom-in"
                          style={{ maxHeight: "360px", objectFit: "contain" }}
                          onClick={(e) => {
                            const el = e.currentTarget;
                            if (el.style.maxHeight === "none") {
                              el.style.maxHeight = "360px";
                            } else {
                              el.style.maxHeight = "none";
                            }
                          }}
                        />
                        <p className="text-[10px] text-muted-foreground/50 text-center mt-1">Tap image to enlarge</p>
                      </div>
                    )}

                    {lesson.videoFile && (
                      <div className="mt-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                          <Play className="h-3.5 w-3.5" />
                          Watch it in action
                        </p>
                        <video
                          src={getImageUrl(lesson.videoFile)}
                          className="w-full rounded-lg border"
                          style={{ maxHeight: "360px", objectFit: "contain" }}
                          controls
                          muted
                          playsInline
                        />
                      </div>
                    )}

                    <div
                      className="mt-4 rounded-lg p-4 border-l-[3px]"
                      style={{ borderLeftColor: chapter.color, backgroundColor: chapter.color + "10" }}
                    >
                      <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: chapter.color }}>
                        Key Takeaway
                      </p>
                      <p className="text-sm leading-relaxed font-medium">{lesson.takeaway}</p>
                    </div>

                    {!isDone && (
                      <button
                        className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                        onClick={() => toggleComplete(lesson.id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Mark as Complete
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GlossaryView() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-1">ICT Concepts</h2>
      <p className="text-sm text-muted-foreground mb-6">Click any term for the full definition + trader tip</p>
      <div className="grid gap-3">
        {GLOSSARY.map((item) => {
          const isOpen = expanded === item.term;
          return (
            <div
              key={item.term}
              className="rounded-xl border overflow-hidden transition-colors cursor-pointer bg-card"
              style={{ borderColor: isOpen ? item.color : undefined }}
              onClick={() => setExpanded(isOpen ? null : item.term)}
            >
              <div className="flex items-center gap-3 p-4">
                <span
                  className="px-3 py-1 rounded-lg text-sm font-bold"
                  style={{ backgroundColor: item.color + "22", color: item.color }}
                >
                  {item.term}
                </span>
                <span className="flex-1 text-sm text-muted-foreground font-medium">{item.full}</span>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              {isOpen && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-sm leading-relaxed">{item.definition}</p>
                  {item.image && (
                    <img
                      src={getImageUrl(item.image)}
                      alt={`${item.term} chart`}
                      className="w-full rounded-lg"
                      style={{ maxHeight: "320px", objectFit: "contain" }}
                    />
                  )}
                  <div
                    className="border-l-[3px] pl-3 py-1"
                    style={{ borderLeftColor: item.color }}
                  >
                    <p className="text-xs font-bold mb-1" style={{ color: item.color }}>NQ Tip</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.tip}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function QuizView() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [answered, setAnswered] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [diffScore, setDiffScore] = useState(0);
  const [done, setDone] = useState(false);
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());
  const [activeQuestion, setActiveQuestion] = useState<{ q: QuizQuestion; idx: number } | null>(
    () => pickQuestion("medium", new Set())
  );

  const q = activeQuestion?.q ?? null;
  const isCorrect = q ? selected === q.answer : false;

  function diffPoints(d: Difficulty): number {
    return d === "easy" ? 1 : d === "medium" ? 2 : 3;
  }

  function handleSelect(idx: number) {
    if (selected !== null || !q || !activeQuestion) return;
    setSelected(idx);
    const pts = diffPoints(q.difficulty);
    setMaxScore((s) => s + pts);
    const correct = idx === q.answer;
    if (correct) {
      setScore((s) => s + pts);
      setDiffScore((s) => s + 1);
    } else {
      setDiffScore((s) => Math.max(0, s - 1));
    }
  }

  function handleNext() {
    if (!activeQuestion) return;
    const newUsed = new Set(usedIndices);
    newUsed.add(activeQuestion.idx);
    setUsedIndices(newUsed);

    if (answered + 1 >= TOTAL_QUIZ_QUESTIONS) {
      setDone(true);
      const finalScore = isCorrect ? score + diffPoints(activeQuestion.q.difficulty) : score;
      const finalMax = maxScore + diffPoints(activeQuestion.q.difficulty);
      const finalPct = finalMax > 0 ? Math.round((finalScore / finalMax) * 100) : 0;
      if (finalPct >= 70) {
        localStorage.setItem("ict-quiz-passed", "true");
        checkAndUnlock();
      }
      return;
    }
    let nextDiff = difficulty;
    if (isCorrect) {
      if (diffScore >= 2 && difficulty !== "hard") {
        nextDiff = difficulty === "easy" ? "medium" : "hard";
        setDiffScore(0);
      }
    } else {
      if (difficulty !== "easy") {
        nextDiff = difficulty === "hard" ? "medium" : "easy";
        setDiffScore(0);
      }
    }
    setDifficulty(nextDiff);
    setAnswered((a) => a + 1);
    setSelected(null);
    setActiveQuestion(pickQuestion(nextDiff, newUsed));
  }

  function handleReset() {
    setDifficulty("medium");
    setAnswered(0);
    setSelected(null);
    setScore(0);
    setMaxScore(0);
    setDiffScore(0);
    setDone(false);
    const emptySet = new Set<number>();
    setUsedIndices(emptySet);
    setActiveQuestion(pickQuestion("medium", emptySet));
  }

  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  if (done) {
    return (
      <div className="p-6 max-w-2xl mx-auto flex justify-center">
        <div className="bg-card rounded-2xl border p-8 text-center w-full max-w-md">
          <div className="text-5xl mb-4">{pct >= 70 ? "\u{1F3C6}" : pct >= 40 ? "\u{1F4C8}" : "\u{1F4DA}"}</div>
          <div className="text-5xl font-bold">{score}/{maxScore}</div>
          <div className="text-xl font-semibold text-primary mt-1 mb-3">{pct}%</div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            {pct >= 70 ? "ICT Concept Master! You dominated the adaptive quiz." : pct >= 40 ? "Good progress \u2014 the quiz adjusted to your level. Review and retry!" : "Keep studying \u2014 review the glossary and plan, then try again!"}
          </p>
          {pct >= 70 && localStorage.getItem("ict-academy-unlocked") === "true" && (
            <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 mb-4 mt-3">
              <p className="text-sm font-bold text-primary mb-1">All Features Unlocked!</p>
              <p className="text-xs text-muted-foreground">
                You've completed all lessons and passed the quiz. Daily Planner, Risk Shield, Smart Journal, and Analytics are now available in the sidebar.
              </p>
            </div>
          )}
          <p className="text-xs text-muted-foreground/60 mb-6">Scoring: Easy = 1pt, Medium = 2pts, Hard = 3pts</p>
          <button
            className="bg-primary text-primary-foreground font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
            onClick={handleReset}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!q) {
    return (
      <div className="p-6 max-w-2xl mx-auto text-center">
        <p className="mb-4">No more questions available!</p>
        <button
          className="bg-primary text-primary-foreground font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
          onClick={handleReset}
        >
          Start Over
        </button>
      </div>
    );
  }

  const diffColor = DIFFICULTY_COLORS[q.difficulty];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-muted-foreground">Question {answered + 1} of {TOTAL_QUIZ_QUESTIONS}</span>
        <span className="text-sm font-semibold text-primary">Score: {score}</span>
      </div>
      <div className="h-1 bg-border rounded-full mb-4 overflow-hidden">
        <div
          className="h-1 bg-primary rounded-full transition-all duration-300"
          style={{ width: `${(answered / TOTAL_QUIZ_QUESTIONS) * 100}%` }}
        />
      </div>

      <div className="mb-3">
        <span
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border"
          style={{ backgroundColor: diffColor + "20", borderColor: diffColor, color: diffColor }}
        >
          {DIFFICULTY_ICONS[q.difficulty]} {DIFFICULTY_LABELS[q.difficulty]}
        </span>
      </div>

      <div className="bg-card rounded-xl border p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-primary uppercase tracking-wider">NQ Scenario</span>
        </div>
        <p className="text-[15px] leading-relaxed font-medium">{q.scenario}</p>
      </div>

      <div className="space-y-2">
        {q.options.map((opt, idx) => {
          let bg = "hsl(var(--card))";
          let border = "hsl(var(--border))";
          let textColor = "hsl(var(--foreground))";
          if (selected !== null) {
            if (idx === q.answer) { bg = "rgba(0,200,150,0.12)"; border = "#00C896"; textColor = "#00C896"; }
            else if (idx === selected && selected !== q.answer) { bg = "rgba(255,68,68,0.1)"; border = "#FF4444"; textColor = "#FF4444"; }
          }
          return (
            <button
              key={idx}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border-[1.5px] text-left transition-all"
              style={{ backgroundColor: bg, borderColor: border }}
              onClick={() => handleSelect(idx)}
            >
              <span
                className="w-7 h-7 rounded-full border-[1.5px] flex items-center justify-center text-sm font-bold shrink-0"
                style={{ borderColor: border, color: textColor }}
              >
                {String.fromCharCode(65 + idx)}
              </span>
              <span className="text-sm leading-relaxed" style={{ color: textColor }}>{opt}</span>
            </button>
          );
        })}
      </div>

      {selected !== null && (
        <div
          className="rounded-xl border-[1.5px] p-5 mt-4"
          style={{ borderColor: isCorrect ? "#00C896" : "#FF4444" }}
        >
          <p className="text-base font-bold mb-2" style={{ color: isCorrect ? "#00C896" : "#FF4444" }}>
            {isCorrect ? "\u2713 Correct!" : "\u2717 Not quite..."}
          </p>
          <p className="text-sm leading-relaxed mb-4">{q.explanation}</p>
          <button
            className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground hover:opacity-90 transition-opacity"
            style={{ backgroundColor: isCorrect ? "#00C896" : "#F59E0B" }}
            onClick={handleNext}
          >
            {answered + 1 < TOTAL_QUIZ_QUESTIONS ? "Next Question \u2192" : "See Results"}
          </button>
        </div>
      )}
    </div>
  );
}

async function streamMessageWeb(
  conversationId: number,
  content: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  const res = await fetch(
    `${getApiUrl()}gemini/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ content }),
    }
  );

  if (!res.ok) {
    onError("Failed to get response");
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onError("No response body");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let doneSignaled = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) onChunk(parsed.content);
          if (parsed.done) { doneSignaled = true; onDone(); }
          if (parsed.error) onError(parsed.error);
        } catch {}
      }
    }

    if (buffer.trim()) {
      const remaining = buffer.trim();
      if (remaining.startsWith("data: ")) {
        try {
          const parsed = JSON.parse(remaining.slice(6));
          if (parsed.content) onChunk(parsed.content);
          if (parsed.done) { doneSignaled = true; onDone(); }
          if (parsed.error) onError(parsed.error);
        } catch {}
      }
    }

    if (!doneSignaled) onDone();
  } catch {
    onError("Stream interrupted");
  }
}

function MentorView() {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function fetchConversations() {
    setLoadingConversations(true);
    try {
      const res = await fetch(`${getApiUrl()}gemini/conversations`);
      if (res.ok) {
        const data: Conversation[] = await res.json();
        setConversations(data || []);
      }
    } catch {}
    setLoadingConversations(false);
  }

  async function startConversation() {
    try {
      const res = await fetch(`${getApiUrl()}gemini/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "NQ Session" }),
      });
      if (res.ok) {
        const data: Conversation = await res.json();
        setConversationId(data.id);
        setMessages([{ role: "assistant", content: "I'm your ICT Trading Mentor. Ask me about FVGs, Liquidity Sweeps, Silver Bullet setups, or NQ Futures strategy." }]);
        fetchConversations();
      }
    } catch {}
  }

  async function loadConversation(id: number) {
    setConversationId(id);
    try {
      const res = await fetch(`${getApiUrl()}gemini/conversations/${id}`);
      if (res.ok) {
        const data: { messages?: { role: string; content: string }[] } = await res.json();
        setMessages(
          (data.messages || []).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
        );
      }
    } catch {}
  }

  async function sendMessage() {
    if (!input.trim() || !conversationId || isStreaming) return;
    const userMsg = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsStreaming(true);

    let assistantMsg = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      await streamMessageWeb(
        conversationId,
        userMsg,
        (chunk) => {
          assistantMsg += chunk;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: assistantMsg };
            return updated;
          });
        },
        () => { setIsStreaming(false); },
        () => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = { role: "assistant", content: "Connection error. Please try again." };
            return updated;
          });
          setIsStreaming(false);
        }
      );
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Connection error. Please try again." };
        return updated;
      });
      setIsStreaming(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  if (!conversationId) {
    return (
      <div className="flex h-full max-w-4xl mx-auto">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <MessageSquare className="h-10 w-10 text-primary" />
          <h3 className="text-xl font-bold mt-4 mb-2">ICT Mentor AI</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed mb-6">
            Ask anything about ICT concepts, NQ setups, or trading psychology
          </p>
          <button
            className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
            onClick={startConversation}
          >
            <Plus className="h-4 w-4" />
            New Conversation
          </button>
        </div>
        <div className="w-72 border-l p-4 overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Previous Sessions</p>
          {loadingConversations ? (
            <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground/60">No previous sessions</p>
          ) : (
            <div className="space-y-2">
              {[...conversations].reverse().slice(0, 10).map((c) => (
                <button
                  key={c.id}
                  className="w-full flex items-center gap-2 bg-card rounded-xl p-3 border text-left hover:bg-secondary transition-colors"
                  onClick={() => loadConversation(c.id)}
                >
                  <span className="flex-1 text-sm truncate">{c.title}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 -rotate-90" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="p-3 border-b">
        <button
          className="flex items-center gap-1.5 text-primary text-sm hover:opacity-80 transition-opacity"
          onClick={() => { setConversationId(null); fetchConversations(); }}
        >
          <ArrowLeft className="h-4 w-4" />
          Sessions
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start gap-2"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                <span className="text-[10px] font-bold text-primary">ICT</span>
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-card border rounded-bl-sm"
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
                {isStreaming && i === messages.length - 1 && msg.role === "assistant" ? "\u258B" : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t flex items-end gap-2">
        <textarea
          className="flex-1 bg-card border rounded-2xl px-4 py-2.5 text-sm placeholder-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring max-h-24"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your ICT mentor..."
          disabled={isStreaming}
          rows={1}
        />
        <button
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity disabled:opacity-40"
          onClick={sendMessage}
          disabled={!input.trim() || isStreaming}
        >
          {isStreaming ? <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" /> : <Send className="h-4 w-4 text-primary-foreground" />}
        </button>
      </div>
    </div>
  );
}

function PlanView() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-1">NQ Futures: ICT Trading Plan</h2>
      <p className="text-sm text-muted-foreground mb-6">Your mechanical, top-down trading framework</p>
      <div className="grid gap-4 md:grid-cols-2">
        {PLAN_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="bg-card rounded-xl border overflow-hidden"
            style={section.title === "Conservative Entry" || section.title === "Prop Firm Survival Rules" ? { gridColumn: "1 / -1" } : undefined}
          >
            <div
              className="flex items-center gap-2.5 px-4 py-3 border-b"
              style={{ backgroundColor: section.color + "15" }}
            >
              <span className="text-sm font-bold" style={{ color: section.color }}>{section.title}</span>
            </div>
            <div className="p-1">
              {section.items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 px-4 py-2.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-2 shrink-0"
                    style={{ backgroundColor: section.color }}
                  />
                  <div>
                    <span className="text-sm font-semibold">{item.label}</span>
                    <span className="text-sm text-muted-foreground ml-1.5">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            {section.image && (
              <img
                src={getImageUrl(section.image)}
                alt={`${section.title} chart`}
                className="w-full"
                style={{ maxHeight: "320px", objectFit: "contain" }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const TAB_CONFIG: { key: Tab; label: string }[] = [
  { key: "learn", label: "Learn" },
  { key: "glossary", label: "Glossary" },
  { key: "quiz", label: "Quiz" },
  { key: "mentor", label: "AI Mentor" },
  { key: "plan", label: "Plan" },
];

const UNLOCK_KEY = "ict-academy-unlocked";
const QUIZ_PASSED_KEY = "ict-quiz-passed";

function checkAndUnlock() {
  try {
    const progress = getProgress();
    const totalLessons = COURSE_CHAPTERS.reduce((sum, ch) => sum + ch.lessons.length, 0);
    const allDone = progress.size >= totalLessons;
    const quizPassed = localStorage.getItem(QUIZ_PASSED_KEY) === "true";
    if (allDone && quizPassed) {
      localStorage.setItem(UNLOCK_KEY, "true");
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export default function IctAcademy() {
  const [tab, setTab] = useState<Tab>("learn");
  const { user } = useAuth();
  const { showCelebration, closeCelebration } = useGraduationCheck();

  useEffect(() => {
    const interval = setInterval(checkAndUnlock, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {showCelebration && (
        <GraduationCelebration
          userName={user?.name || "Graduate"}
          onClose={closeCelebration}
        />
      )}
      <header className="sticky top-0 z-30 bg-background px-6 pt-5 pb-3 border-b">
        <div className="flex items-center gap-3 mb-4">
          <GraduationCap className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">ICT Academy</h1>
          <span className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5 text-[10px] font-semibold text-primary">
            <Sparkles className="h-2.5 w-2.5" />
            AI
          </span>
        </div>
        <div className="flex bg-secondary rounded-xl p-1 max-w-lg">
          {TAB_CONFIG.map((t) => (
            <button
              key={t.key}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-primary text-primary-foreground font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">
        {tab === "learn" && <LearnView />}
        {tab === "glossary" && <GlossaryView />}
        {tab === "quiz" && <QuizView />}
        {tab === "mentor" && <MentorView />}
        {tab === "plan" && <PlanView />}
      </main>
    </div>
  );
}
