import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
  RECOMMENDED_INDICATORS,
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
  DIFFICULTY_ICONS,
  TOTAL_QUIZ_QUESTIONS,
  pickQuestion,
  type Difficulty,
  type QuizQuestion,
  type Chapter,
  type Lesson,
  type IndicatorItem,
} from "../data/academy-data";
import { dispatchAITrigger, incrementQuizFailCount, resetQuizFailCount } from "@/hooks/useAITrigger";
import { ChartLightbox, chartImageToConceptKey, FVGDiagram, OTEDiagram, MSSDiagram, LiquiditySweepDiagram, KillZoneDiagram, SilverBulletDiagram, ConservativeEntryDiagram, ExitCriteriaDiagram } from "@/components/IctChartDiagrams";
import { Maximize2 } from "lucide-react";
import { ALL_VIDEOS, type Video as VideoItem } from "../data/video-data";
import { VideoPlayerModal } from "./VideoLibrary";

import { getSkillLevel } from "@/components/OnboardingQuiz";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const ADVANCED_LESSON_IDS = new Set(["ch3-4", "ch3-4b"]);

function useAcademyWatchedVideos() {
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/videos/watched`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.watchedIds)) {
          setWatched(new Set(data.watchedIds));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markWatched = useCallback(async (videoId: string) => {
    setWatched((prev) => new Set([...prev, videoId]));
    try {
      await fetch(`${API_BASE}/videos/watched`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
    } catch {}
  }, []);

  const unmarkWatched = useCallback(async (videoId: string) => {
    setWatched((prev) => {
      const next = new Set(prev);
      next.delete(videoId);
      return next;
    });
    try {
      await fetch(`${API_BASE}/videos/watched/${videoId}`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch {}
  }, []);

  return { watched, loading, markWatched, unmarkWatched };
}

const LESSON_VIDEO_MAP: Record<string, string[]> = {
  "ch1-3": ["v-ch1-2"],
  "ch1-4": ["v-ch1-3"],
  "ch2-2": ["v-ch2-2"],
  "ch2-3": ["v-ch2-3"],
  "ch2-4": ["v-ch2-1"],
  "ch3-1": [],
  "ch3-2": ["v-ch3-4"],
  "ch3-3": ["v-ch3-1", "v-ch3-2", "v-ch3-3"],
  "ch3-4": ["v-ch3-5"],
  "ch3-5": ["v-ch3-6"],
  "ch4-1": ["v-ch4-1"],
  "ch4-2": ["v-ch4-2"],
  "ch5-1": ["v-ch5-1"],
  "ch5-2": ["v-ch5-2"],
  "ch5-3": ["v-ch5-3"],
  "ch5-4": ["v-ch5-4"],
  "ch6-1": ["v-ch6-1"],
  "ch6-2": ["v-ch6-2"],
  "ch6-3": ["v-ch6-3"],
  "ch7-1": ["v-ch7-1"],
  "ch7-2": ["v-ch7-2"],
  "ch7-4": ["v-ch7-4"],
};

type Tab = "learn" | "glossary" | "quiz" | "plan" | "tools";

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

async function syncProgressFromApi(): Promise<Set<string> | null> {
  try {
    const res = await fetch("/api/academy/progress", { credentials: "include" });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.lessonIds && Array.isArray(json.lessonIds)) {
      return new Set(json.lessonIds as string[]);
    }
  } catch {}
  return null;
}

async function saveProgressToApi(completed: Set<string>): Promise<void> {
  try {
    await fetch("/api/academy/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ lessonIds: [...completed] }),
    });
  } catch {}
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

function getStreak(): number {
  try { return parseInt(localStorage.getItem(STREAK_KEY) || "0", 10); } catch { return 0; }
}
function getXP(): number {
  try { return parseInt(localStorage.getItem(XP_KEY) || "0", 10); } catch { return 0; }
}

const FREE_LESSON_CAP = 5;

const ADVANCED_CHAPTER_IDS = ["ch3", "ch5", "ch7"];

function LearnView() {
  const { tierLevel } = useAuth();
  const isFree = tierLevel === 0;
  const isBeginner = getSkillLevel() === "beginner";
  const [searchParams, setSearchParams] = useSearchParams();
  const [completed, setCompleted] = useState<Set<string>>(getProgress);

  useEffect(() => {
    syncProgressFromApi().then((apiProgress) => {
      if (apiProgress) {
        const local = getProgress();
        const merged = new Set([...local, ...apiProgress]);
        setCompleted(merged);
        setProgress(merged);
        if (merged.size > apiProgress.size) {
          saveProgressToApi(merged);
        }
      }
    });
    const interval = setInterval(() => setCompleted(getProgress()), 500);
    return () => clearInterval(interval);
  }, []);

  const [pendingLessonId, setPendingLessonId] = useState<string | null>(() => searchParams.get("lesson"));

  useEffect(() => {
    const lessonParam = searchParams.get("lesson");
    if (lessonParam) {
      setPendingLessonId(lessonParam);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const totalLessons = COURSE_CHAPTERS.reduce((sum, ch) => sum + ch.lessons.length, 0);
  const completedCount = COURSE_CHAPTERS.reduce(
    (sum, ch) => sum + ch.lessons.filter((l) => completed.has(l.id)).length,
    0
  );
  const streak = getStreak();
  const xp = getXP();

  function toggleComplete(lessonId: string, globalIdx: number) {
    if (isFree && globalIdx >= FREE_LESSON_CAP) return;
    const next = new Set(completed);
    if (next.has(lessonId)) next.delete(lessonId);
    else next.add(lessonId);
    setCompleted(next);
    setProgress(next);
    saveProgressToApi(next);
  }

  const isAllDone = completedCount >= totalLessons;
  const quizPassed = (() => { try { return localStorage.getItem("ict-quiz-passed") === "true"; } catch { return false; } })();

  return (
    <div className="p-6 max-w-4xl mx-auto">
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

      <div className="h-2 bg-border rounded-full mb-8 overflow-hidden">
        <div
          className="h-2 bg-primary rounded-full transition-all duration-500"
          style={{ width: `${totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0}%` }}
        />
      </div>

      {isFree && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
          <Lock className="h-5 w-5 text-amber-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-500">Free Plan — 5 of {totalLessons} lessons unlocked</p>
            <p className="text-xs text-muted-foreground mt-0.5">Upgrade to Standard to access all {totalLessons} lessons.</p>
          </div>
          <Link to="/pricing" className="text-xs font-bold text-primary hover:underline shrink-0">Upgrade</Link>
        </div>
      )}

      <div className="space-y-4">
        {(() => {
          let globalIdx = 0;
          return COURSE_CHAPTERS.map((chapter, chIdx) => {
            const chStartIdx = globalIdx;
            globalIdx += chapter.lessons.length;
            const chCompleted = chapter.lessons.filter((l) => completed.has(l.id)).length;
            const chTotal = chapter.lessons.length;
            const chDone = chCompleted === chTotal && chTotal > 0;

            const hasTargetLesson = pendingLessonId
              ? chapter.lessons.some((l) => l.id === pendingLessonId)
              : false;
            const isBeginnerLocked = isBeginner && ADVANCED_CHAPTER_IDS.includes(chapter.id);
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
                defaultOpen={chIdx === 0 || hasTargetLesson}
                defaultExpandedLesson={hasTargetLesson ? pendingLessonId : null}
                isFree={isFree}
                chapterStartIdx={chStartIdx}
                isBeginner={isBeginner}
                isBeginnerLocked={isBeginnerLocked}
              />
            );
          });
        })()}
      </div>
    </div>
  );
}

function ChapterAccordion({
  chapter, chIdx, chCompleted, chTotal, chDone, completed, toggleComplete, defaultOpen, defaultExpandedLesson, isFree, chapterStartIdx, isBeginner, isBeginnerLocked,
}: {
  chapter: Chapter; chIdx: number; chCompleted: number; chTotal: number; chDone: boolean;
  completed: Set<string>; toggleComplete: (id: string, globalIdx: number) => void; defaultOpen: boolean;
  defaultExpandedLesson?: string | null;
  isFree?: boolean; chapterStartIdx?: number; isBeginner?: boolean; isBeginnerLocked?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [expandedLesson, setExpandedLesson] = useState<string | null>(defaultExpandedLesson ?? null);
  const [lightboxKey, setLightboxKey] = useState<string | null>(null);
  const [activeVideo, setActiveVideo] = useState<VideoItem | null>(null);
  const { watched: videoWatched, markWatched, unmarkWatched } = useAcademyWatchedVideos();

  return (
    <div className={`rounded-xl border overflow-hidden bg-card relative ${isBeginnerLocked ? "opacity-50 pointer-events-none" : ""}`}>
      {isBeginnerLocked && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/60 backdrop-blur-sm pointer-events-auto cursor-not-allowed" title="Complete beginner modules first">
          <Lock className="h-6 w-6 text-muted-foreground mb-2" />
          <span className="text-xs text-muted-foreground font-medium text-center px-4">Complete beginner modules first</span>
        </div>
      )}
      {lightboxKey && (
        <ChartLightbox conceptKey={lightboxKey} onClose={() => setLightboxKey(null)} />
      )}
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
            const globalIdx = (chapterStartIdx ?? 0) + lIdx;
            const isLocked = isFree && globalIdx >= FREE_LESSON_CAP;
            const isBeginnerGated = isBeginner && ADVANCED_LESSON_IDS.has(lesson.id);
            const isLessonOpen = !isLocked && !isBeginnerGated && expandedLesson === lesson.id;
            const isDone = completed.has(lesson.id);

            if (isLocked) {
              return (
                <div key={lesson.id} className="border-b last:border-b-0">
                  <div className="w-full flex items-center gap-3 px-4 py-3 opacity-50">
                    <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground font-mono w-6">{lIdx + 1}.</span>
                    <span className="flex-1 text-sm font-medium text-muted-foreground">{lesson.title}</span>
                    <Link
                      to="/pricing"
                      className="text-[11px] font-bold text-amber-500 hover:underline shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Upgrade
                    </Link>
                  </div>
                </div>
              );
            }

            if (isBeginnerGated) {
              return (
                <div key={lesson.id} className="border-b last:border-b-0 relative overflow-hidden">
                  <div
                    className="w-full flex items-center gap-3 px-4 py-3"
                    style={{ filter: "grayscale(1)", opacity: 0.5 }}
                  >
                    <Lock className="h-5 w-5 text-muted-foreground shrink-0" />
                    <span className="text-sm text-muted-foreground font-mono w-6">{lIdx + 1}.</span>
                    <span className="flex-1 text-sm font-medium text-muted-foreground">{lesson.title}</span>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-end pr-4 pointer-events-none">
                    <span className="inline-flex items-center gap-1 bg-amber-500/20 border border-amber-500/40 rounded-full px-2 py-0.5 text-[10px] font-bold text-amber-500">
                      <Lock className="h-2.5 w-2.5" />
                      Intermediate+
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div key={lesson.id} className="border-b last:border-b-0">
                <div
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-secondary/30 cursor-pointer"
                  onClick={() => setExpandedLesson(isLessonOpen ? null : lesson.id)}
                >
                  <div
                    className="shrink-0 cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); toggleComplete(lesson.id, globalIdx); }}
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

                    {lesson.chartImage && (() => {
                      const ck = chartImageToConceptKey(lesson.chartImage);
                      return (
                        <div className="mt-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                            See it on the chart
                          </p>
                          {ck ? (
                            <div className="relative cursor-pointer group" onClick={() => setLightboxKey(ck)}>
                              {ck === "fvg" && <FVGDiagram className="w-full rounded-lg border" />}
                              {ck === "ote" && <OTEDiagram className="w-full rounded-lg border" />}
                              {ck === "mss" && <MSSDiagram className="w-full rounded-lg border" />}
                              {ck === "liquidity-sweep" && <LiquiditySweepDiagram className="w-full rounded-lg border" />}
                              {ck === "kill-zone" && <KillZoneDiagram className="w-full rounded-lg border" />}
                              {ck === "silver-bullet" && <SilverBulletDiagram className="w-full rounded-lg border" />}
                              {ck === "conservative-entry" && <ConservativeEntryDiagram className="w-full rounded-lg border" />}
                              {ck === "exit-criteria" && <ExitCriteriaDiagram className="w-full rounded-lg border" />}
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-1.5">
                                <Maximize2 className="h-3.5 w-3.5 text-white" />
                              </div>
                            </div>
                          ) : (
                            <img
                              src={getImageUrl(lesson.chartImage)}
                              alt={`${lesson.title} chart example`}
                              className="w-full rounded-lg border cursor-zoom-in"
                              style={{ maxHeight: "360px", objectFit: "contain" }}
                            />
                          )}
                          <p className="text-[10px] text-muted-foreground/50 text-center mt-1">Tap to enlarge</p>
                        </div>
                      );
                    })()}

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

                    {(() => {
                      const videoIds = LESSON_VIDEO_MAP[lesson.id] ?? [];
                      const videos = videoIds.map((vid) => ALL_VIDEOS.find((v) => v.id === vid)).filter(Boolean) as VideoItem[];
                      if (videos.length === 0) return null;
                      return (
                        <div className="mt-4">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Play className="h-3.5 w-3.5 text-red-500" />
                            Related Videos
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {videos.map((v) => (
                              <button
                                key={v.id}
                                onClick={() => setActiveVideo(v)}
                                className="flex items-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-500 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors"
                              >
                                <Play className="h-3 w-3 fill-red-500" />
                                {v.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

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
                        onClick={() => toggleComplete(lesson.id, globalIdx)}
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

      {activeVideo && (
        <VideoPlayerModal
          video={activeVideo}
          isWatched={videoWatched.has(activeVideo.id)}
          onClose={() => setActiveVideo(null)}
          onWatched={markWatched}
          onUnwatched={unmarkWatched}
        />
      )}
    </div>
  );
}

function GlossaryView() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [completed] = useState<Set<string>>(getProgress);
  const [lightboxKey, setLightboxKey] = useState<string | null>(null);

  function hasUnlockedAdvanced(item: typeof GLOSSARY[0]): boolean {
    if (!item.requiredLessons || item.requiredLessons.length === 0) return false;
    return item.requiredLessons.every((id) => completed.has(id));
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {lightboxKey && (
        <ChartLightbox conceptKey={lightboxKey} onClose={() => setLightboxKey(null)} />
      )}
      <h2 className="text-xl font-bold mb-1">ICT Concepts</h2>
      <p className="text-sm text-muted-foreground mb-6">Click any term for the full definition + trader tip. Complete lessons to unlock advanced tiers.</p>
      <div className="grid gap-3">
        {GLOSSARY.map((item) => {
          const isOpen = expanded === item.term;
          const advancedUnlocked = hasUnlockedAdvanced(item);
          const hasAdvanced = !!item.advancedTerm;
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
                {hasAdvanced && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${advancedUnlocked ? "bg-amber-500/20 text-amber-500" : "bg-secondary text-muted-foreground"}`}>
                    {advancedUnlocked ? "ADV" : <Lock className="h-3 w-3 inline" />}
                  </span>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              {isOpen && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-sm leading-relaxed">{item.definition}</p>
                  {item.image && (() => {
                    const ck = chartImageToConceptKey(item.image);
                    return ck ? (
                      <div className="relative cursor-pointer group" onClick={(e) => { e.stopPropagation(); setLightboxKey(ck); }}>
                        {ck === "fvg" && <FVGDiagram className="w-full rounded-lg" />}
                        {ck === "ote" && <OTEDiagram className="w-full rounded-lg" />}
                        {ck === "mss" && <MSSDiagram className="w-full rounded-lg" />}
                        {ck === "liquidity-sweep" && <LiquiditySweepDiagram className="w-full rounded-lg" />}
                        {ck === "kill-zone" && <KillZoneDiagram className="w-full rounded-lg" />}
                        {ck === "silver-bullet" && <SilverBulletDiagram className="w-full rounded-lg" />}
                        {ck === "conservative-entry" && <ConservativeEntryDiagram className="w-full rounded-lg" />}
                        {ck === "exit-criteria" && <ExitCriteriaDiagram className="w-full rounded-lg" />}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-1.5">
                          <Maximize2 className="h-3.5 w-3.5 text-white" />
                        </div>
                        <p className="text-[10px] text-muted-foreground/50 text-center mt-1">Click to zoom in</p>
                      </div>
                    ) : (
                      <img
                        src={getImageUrl(item.image)}
                        alt={`${item.term} chart`}
                        className="w-full rounded-lg"
                        style={{ maxHeight: "320px", objectFit: "contain" }}
                      />
                    );
                  })()}
                  <div
                    className="border-l-[3px] pl-3 py-1"
                    style={{ borderLeftColor: item.color }}
                  >
                    <p className="text-xs font-bold mb-1" style={{ color: item.color }}>NQ Tip</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.tip}</p>
                  </div>
                  {hasAdvanced && (
                    <div className={`mt-3 rounded-xl border p-4 ${advancedUnlocked ? "border-amber-500/30 bg-amber-500/5" : "border-border bg-secondary/30"}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className={`h-4 w-4 ${advancedUnlocked ? "text-amber-500" : "text-muted-foreground"}`} />
                        <span className={`text-xs font-bold ${advancedUnlocked ? "text-amber-500" : "text-muted-foreground"}`}>
                          Advanced: {item.advancedTerm}
                        </span>
                      </div>
                      {advancedUnlocked ? (
                        <>
                          <p className="text-sm leading-relaxed mb-2">{item.advancedDefinition}</p>
                          <div className="border-l-[3px] border-amber-500 pl-3 py-1">
                            <p className="text-xs font-bold mb-1 text-amber-500">Pro Tip</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{item.advancedTip}</p>
                          </div>
                        </>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="text-xs text-muted-foreground">
                            Complete related lessons to unlock this advanced concept.
                          </p>
                        </div>
                      )}
                    </div>
                  )}
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
      resetQuizFailCount();
    } else {
      setDiffScore((s) => Math.max(0, s - 1));
      const failCount = incrementQuizFailCount();
      if (failCount >= 2) {
        resetQuizFailCount();
        dispatchAITrigger({
          message: "Need help with this concept?",
          autoOpen: true,
          autoSend: true,
          prefillPrompt: `I keep getting quiz questions wrong about "${q.scenario.slice(0, 60)}". Can you explain this concept?`,
        });
      }
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
    resetQuizFailCount();
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

const CATEGORY_META: Record<string, { label: string; description: string; color: string }> = {
  core: { label: "Core ICT Indicators", description: "Essential tools that directly map to ICT concepts. Start with these.", color: "#00C896" },
  supporting: { label: "Supporting Indicators", description: "Helpful additions that provide extra confluence and context.", color: "#3B82F6" },
  optional: { label: "Optional / Advanced", description: "Nice-to-have tools for specific ICT models and setups.", color: "#8B5CF6" },
};

function ToolsView() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "core" | "supporting" | "optional">("all");

  const filtered = filter === "all" ? RECOMMENDED_INDICATORS : RECOMMENDED_INDICATORS.filter((i) => i.category === filter);
  const categories = filter === "all" ? (["core", "supporting", "optional"] as const) : [filter] as const;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-1">TradingView Indicators</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Recommended indicators for ICT methodology on TradingView. Search each name in TradingView's indicator panel to add them to your chart.
      </p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(["all", "core", "supporting", "optional"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? "All" : f === "core" ? "Core" : f === "supporting" ? "Supporting" : "Optional"}
          </button>
        ))}
      </div>

      {categories.map((cat) => {
        const items = filtered.filter((i) => i.category === cat);
        if (items.length === 0) return null;
        const meta = CATEGORY_META[cat];
        return (
          <div key={cat} className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
              <h3 className="text-sm font-bold" style={{ color: meta.color }}>{meta.label}</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3 ml-4">{meta.description}</p>
            <div className="space-y-2">
              {items.map((indicator) => {
                const globalIdx = RECOMMENDED_INDICATORS.indexOf(indicator);
                const isExpanded = expandedIdx === globalIdx;
                return (
                  <div
                    key={indicator.name}
                    className="bg-card border rounded-xl overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setExpandedIdx(isExpanded ? null : globalIdx)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold"
                        style={{ backgroundColor: indicator.color }}
                      >
                        {indicator.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{indicator.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{indicator.ictConcept}</p>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t space-y-3">
                        <p className="text-sm text-foreground/90">{indicator.description}</p>
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-foreground mb-1">How to Set Up</p>
                          <p className="text-xs text-muted-foreground">{indicator.setup}</p>
                        </div>
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                          <p className="text-xs font-semibold text-primary mb-1">Search in TradingView</p>
                          <code className="text-xs text-primary/80 font-mono">{indicator.tradingViewSearch}</code>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="mt-6 bg-card border rounded-xl p-5">
        <h3 className="text-sm font-bold mb-2">Recommended Starter Setup</h3>
        <p className="text-xs text-muted-foreground mb-3">
          If you're just getting started, add these 3 indicators for maximum coverage with minimal chart clutter:
        </p>
        <ol className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div>
              <span className="text-xs font-semibold">Smart Money Concepts (LuxAlgo)</span>
              <span className="text-xs text-muted-foreground ml-1">— FVGs + Order Blocks + Market Structure in one</span>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <span className="text-xs font-semibold">ICT Kill Zones</span>
              <span className="text-xs text-muted-foreground ml-1">— Know exactly when to trade</span>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <div>
              <span className="text-xs font-semibold">Fibonacci Retracement</span>
              <span className="text-xs text-muted-foreground ml-1">— Mark OTE zones with custom 0.62 / 0.705 / 0.79 levels</span>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}

const TAB_CONFIG: { key: Tab; label: string }[] = [
  { key: "learn", label: "Learn" },
  { key: "glossary", label: "Glossary" },
  { key: "quiz", label: "Quiz" },
  { key: "plan", label: "Plan" },
  { key: "tools", label: "Tools" },
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
  const [titleVisible, setTitleVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(checkAndUnlock, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setTitleVisible(false), 2400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col h-full">
      {showCelebration && (
        <GraduationCelebration
          userName={user?.name || "Graduate"}
          onClose={closeCelebration}
        />
      )}
      <style>{`
        @keyframes ict-title-fade {
          0% { opacity: 0; transform: translateY(-4px); }
          15% { opacity: 1; transform: translateY(0); }
          75% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-4px); }
        }
        .ict-title-animate {
          animation: ict-title-fade 2.4s ease forwards;
        }
      `}</style>
      <header className="sticky top-0 z-30 bg-background px-6 pt-5 pb-3 border-b">
        <div className="flex items-center gap-3 mb-4">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="inline-flex items-center gap-1 bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5 text-[10px] font-semibold text-primary">
            <Sparkles className="h-2.5 w-2.5" />
            AI
          </span>
          {titleVisible && (
            <span className="ict-title-animate text-xl font-bold text-foreground pointer-events-none select-none">
              ICT Academy
            </span>
          )}
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
        {tab === "plan" && <PlanView />}
        {tab === "tools" && <ToolsView />}
      </main>
    </div>
  );
}
