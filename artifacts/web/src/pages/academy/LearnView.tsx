import { useState, useEffect } from "react";
import { GraduationCap, Lock, Play, Flame, Zap, Trophy, CheckCircle2, ChevronUp, ChevronDown, Circle } from "lucide-react";
import { Maximize2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getSkillLevel } from "@/components/OnboardingQuiz";
import {
  COURSE_CHAPTERS,
  type Chapter,
  type Lesson,
} from "../../data/academy-data";
import {
  ChartLightbox, chartImageToConceptKey,
  FVGDiagram, OTEDiagram, MSSDiagram, LiquiditySweepDiagram,
  KillZoneDiagram, SilverBulletDiagram, ConservativeEntryDiagram, ExitCriteriaDiagram,
} from "@/components/IctChartDiagrams";
import { ALL_VIDEOS, type Video as VideoItem } from "../../data/video-data";
import { VideoPlayerModal } from "../VideoLibrary";
import { getProgress, setProgress, syncProgressFromApi, saveProgressToApi, PROGRESS_KEY, STREAK_KEY, XP_KEY, getStreak, getXP, getImageUrl, getImageDimensions } from "./academyUtils";
import { useAcademyWatchedVideos, ADVANCED_LESSON_IDS } from "./academyHooks";

export const LESSON_VIDEO_MAP: Record<string, string[]> = {
  "ch1-3": ["v-ch1-2"],
  "ch1-4": ["v-ch1-3"],
  "ch2-2": ["v-ch2-2"],
  "ch2-3": ["v-ch2-3"],
  "ch2-4": ["v-ch2-1"],
  "ch3-1": [],
  "ch3-2": ["v-ch3-4"],
  "ch3-3": ["v-ch3-1", "v-ch3-2", "v-ch3-3"],
  "ch3-4": ["v-ch3-5"],
  "ch3-4c": [],
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

function VideoPlayer({ src }: { src: string }) {
  const [error, setError] = useState(false);
  useEffect(() => { setError(false); }, [src]);
  if (error) {
    return (
      <div className="w-full rounded-lg border bg-muted flex items-center justify-center" style={{ minHeight: "120px" }}>
        <p className="text-sm text-muted-foreground text-center px-4">Video unavailable — check back soon</p>
      </div>
    );
  }
  return (
    <video key={src} className="w-full rounded-lg border" style={{ maxHeight: "360px", objectFit: "contain" }} controls muted playsInline preload="metadata" onError={() => setError(true)}>
      <source src={src} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  );
}

export const FREE_LESSON_CAP = 5;
export const ADVANCED_CHAPTER_IDS = ["ch3", "ch5", "ch7"];
export const BEGINNER_PREREQUISITES: Record<string, string[]> = {
  ch3: ["ch1", "ch2"],
  ch5: ["ch4"],
  ch7: ["ch6"],
};

export function isChapterFullyComplete(chapterId: string, completed: Set<string>): boolean {
  const chapter = COURSE_CHAPTERS.find((c) => c.id === chapterId);
  if (!chapter || chapter.lessons.length === 0) return false;
  return chapter.lessons.every((l) => completed.has(l.id));
}

export function LearnView() {
  const { tierLevel } = useAuth();
  const isFree = tierLevel === 0;
  const isBeginner = getSkillLevel() === "beginner";
  const [searchParams, setSearchParams] = useSearchParams();
  const [completed, setCompleted] = useState<Set<string>>(getProgress);

  useEffect(() => {
    syncProgressFromApi().then((apiProgress) => {
      if (apiProgress) {
        if (apiProgress.size === 0) {
          localStorage.removeItem(PROGRESS_KEY);
          localStorage.removeItem(STREAK_KEY);
          localStorage.removeItem(XP_KEY);
          localStorage.removeItem("ict-quiz-passed");
          localStorage.removeItem("ict-academy-unlocked");
          setCompleted(new Set());
          return;
        }
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
            const isBeginnerLocked =
              isBeginner &&
              ADVANCED_CHAPTER_IDS.includes(chapter.id) &&
              !(BEGINNER_PREREQUISITES[chapter.id] ?? []).every((prereqId) =>
                isChapterFullyComplete(prereqId, completed)
              );
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

export function ChapterAccordion({
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
                              loading="lazy"
                              width={getImageDimensions(lesson.chartImage).width}
                              height={getImageDimensions(lesson.chartImage).height}
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
                        <VideoPlayer src={getImageUrl(lesson.videoFile)} />
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

