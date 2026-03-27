import { useState } from "react";
import { ChevronRight, CheckCircle2, GraduationCap, AlertCircle } from "lucide-react";
import { COURSE_CHAPTERS } from "@/data/academy-data";
import { useAuth } from "@/contexts/AuthContext";

export type SkillLevel = "beginner" | "intermediate" | "advanced";

const SKILL_LEVEL_KEY = "ict-skill-level";
const QUIZ_DONE_KEY = "ict-quiz-done";
const PROGRESS_KEY = "ict-academy-progress";

export function getSkillLevel(): SkillLevel | null {
  return localStorage.getItem(SKILL_LEVEL_KEY) as SkillLevel | null;
}

export function hasCompletedQuiz(): boolean {
  return localStorage.getItem(QUIZ_DONE_KEY) === "true";
}

export function hasExistingAcademyProgress(): boolean {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch {
    return false;
  }
}

export function clearQuizData() {
  localStorage.removeItem(SKILL_LEVEL_KEY);
  localStorage.removeItem(QUIZ_DONE_KEY);
  localStorage.removeItem(PROGRESS_KEY);
}

interface Question {
  id: string;
  text: string;
  options: { label: string; value: number }[];
}

const QUESTIONS: Question[] = [
  {
    id: "q1",
    text: "Have you traded any financial instruments before (stocks, forex, futures, crypto)?",
    options: [
      { label: "No, I'm completely new to trading", value: 0 },
      { label: "I've done a little paper trading or demo trading", value: 1 },
      { label: "Yes, I've placed real trades before", value: 2 },
    ],
  },
  {
    id: "q2",
    text: "Do you know what a candlestick chart is and how to read one?",
    options: [
      { label: "No, I've never seen one", value: 0 },
      { label: "I know the basics (green = up, red = down)", value: 1 },
      { label: "Yes, I can read candlesticks confidently", value: 2 },
    ],
  },
  {
    id: "q3",
    text: "Have you heard of ICT concepts like Fair Value Gaps, Market Structure Shifts, or Liquidity Sweeps?",
    options: [
      { label: "No, these terms are new to me", value: 0 },
      { label: "I've heard of them but don't fully understand them", value: 1 },
      { label: "Yes, I understand and can identify them on a chart", value: 2 },
    ],
  },
  {
    id: "q4",
    text: "Do you currently use a trading journal to track your trades?",
    options: [
      { label: "No, I've never journaled my trades", value: 0 },
      { label: "I've tried journaling but don't do it consistently", value: 1 },
      { label: "Yes, I journal every trade I take", value: 2 },
    ],
  },
  {
    id: "q5",
    text: "How comfortable are you with risk management concepts like position sizing and stop losses?",
    options: [
      { label: "Not comfortable — I don't really know what these are", value: 0 },
      { label: "I understand the basics but don't apply them consistently", value: 1 },
      { label: "Very comfortable — I calculate position size before every trade", value: 2 },
    ],
  },
];

function calculateSkillLevel(scores: number[]): SkillLevel {
  const total = scores.reduce((sum, s) => sum + s, 0);
  const max = QUESTIONS.length * 2;
  const pct = total / max;
  if (pct >= 0.7) return "advanced";
  if (pct >= 0.35) return "intermediate";
  return "beginner";
}

function getLessonIdsToMark(level: SkillLevel): string[] {
  if (level === "beginner") return [];

  const allLessonIds: string[] = [];
  for (const chapter of COURSE_CHAPTERS) {
    for (const lesson of chapter.lessons) {
      allLessonIds.push(lesson.id);
    }
  }

  if (level === "intermediate") {
    const beginnerChapters = ["ch1", "ch2"];
    return allLessonIds.filter((id) => beginnerChapters.some((ch) => id.startsWith(ch)));
  }

  if (level === "advanced") {
    const skippedChapters = ["ch1", "ch2", "ch3", "ch4"];
    return allLessonIds.filter((id) => skippedChapters.some((ch) => id.startsWith(ch)));
  }

  return [];
}

function applyLevelToAcademy(level: SkillLevel) {
  const lessonIds = getLessonIdsToMark(level);
  if (lessonIds.length === 0) return;
  try {
    const existing = localStorage.getItem(PROGRESS_KEY);
    const existingSet = existing ? new Set<string>(JSON.parse(existing)) : new Set<string>();
    for (const id of lessonIds) {
      existingSet.add(id);
    }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify([...existingSet]));
  } catch {}
}

const LEVEL_INFO: Record<SkillLevel, { label: string; color: string; description: string; emoji: string }> = {
  beginner: {
    label: "Beginner",
    color: "text-emerald-400",
    description: "We'll start you from the very basics — what trading is, how charts work, and how to build a solid foundation before touching real money.",
    emoji: "📘",
  },
  intermediate: {
    label: "Intermediate",
    color: "text-blue-400",
    description: "You know the basics. We'll skip ahead and focus on ICT concepts, entries, and building consistency with your trading plan.",
    emoji: "📊",
  },
  advanced: {
    label: "Advanced",
    color: "text-purple-400",
    description: "You've got solid experience. We'll focus on advanced ICT techniques, psychology, and fine-tuning your edge.",
    emoji: "🧠",
  },
};

interface Props {
  onComplete: () => void;
}

export default function OnboardingQuiz({ onComplete }: Props) {
  const { setAppMode, isAdmin } = useAuth();
  const [step, setStep] = useState<"intro" | "questions" | "result">("intro");
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [skillLevel, setSkillLevel] = useState<SkillLevel | null>(null);
  const [modeError, setModeError] = useState<string | null>(null);

  async function handleAnswer(value: number) {
    const newAnswers = [...answers, value];
    setAnswers(newAnswers);

    if (currentQ + 1 < QUESTIONS.length) {
      setCurrentQ(currentQ + 1);
    } else {
      const level = calculateSkillLevel(newAnswers);
      setSkillLevel(level);
      localStorage.setItem(SKILL_LEVEL_KEY, level);
      localStorage.setItem(QUIZ_DONE_KEY, "true");
      applyLevelToAcademy(level);
      if (level === "beginner" && !isAdmin) {
        const result = await setAppMode("lite");
        if (!result.success) {
          setModeError(result.error || "Could not activate Learning Mode. You can switch modes manually from the menu.");
        }
      }
      setStep("result");
    }
  }

  function handleStart() {
    setStep("questions");
    setCurrentQ(0);
    setAnswers([]);
  }

  function handleDone() {
    onComplete();
  }

  const progress = ((currentQ) / QUESTIONS.length) * 100;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {step === "intro" && (
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <GraduationCap className="h-10 w-10 text-primary" />
              </div>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to The Trading Mentor</h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Before we get started, let's figure out where you are in your trading journey. Answer 5 quick questions and we'll personalise the platform to match your experience level.
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">What happens next</p>
              <ul className="space-y-1.5">
                {[
                  "We'll set your skill level (Beginner, Intermediate, or Advanced)",
                  "Academy lessons you already know will be pre-marked as complete",
                  "Your sidebar will show the features most relevant to your level",
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <button
              onClick={handleStart}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors text-sm"
            >
              Let's Go
              <ChevronRight className="h-4 w-4" />
            </button>
            <p className="text-xs text-muted-foreground">Takes about 1 minute. You can retake this any time from Settings.</p>
          </div>
        )}

        {step === "questions" && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground font-medium">Question {currentQ + 1} of {QUESTIONS.length}</span>
                <span className="text-xs text-muted-foreground">{Math.round(progress)}% complete</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-5 space-y-4">
              <p className="text-base font-semibold text-foreground leading-snug">
                {QUESTIONS[currentQ].text}
              </p>
              <div className="space-y-2">
                {QUESTIONS[currentQ].options.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleAnswer(option.value)}
                    className="w-full text-left px-4 py-3 rounded-lg border border-border bg-background hover:bg-secondary hover:border-primary/40 transition-colors text-sm text-foreground"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === "result" && skillLevel && (
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-4xl">
                {LEVEL_INFO[skillLevel].emoji}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Your skill level</p>
              <h2 className={`text-3xl font-bold ${LEVEL_INFO[skillLevel].color}`}>
                {LEVEL_INFO[skillLevel].label}
              </h2>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-left">
              <p className="text-sm text-foreground leading-relaxed">{LEVEL_INFO[skillLevel].description}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4 text-left space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your personalised experience</p>
              {skillLevel === "beginner" && (
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    Learning Mode activated — simplified interface with Dashboard, Academy, Risk Shield, and Journal
                  </li>
                  <li className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    Academy starts from Chapter 1: Trading Basics
                  </li>
                  <li className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    Switch to Full Mode anytime from Settings when you're ready
                  </li>
                </ul>
              )}
              {skillLevel === "intermediate" && (
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    Sidebar includes Journal and Analytics in addition to core features
                  </li>
                  <li className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    Beginner Academy chapters marked as complete — jump straight to ICT concepts
                  </li>
                </ul>
              )}
              {skillLevel === "advanced" && (
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    Full sidebar access — all features visible
                  </li>
                  <li className="flex items-start gap-2 text-sm text-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    Foundational Academy chapters marked complete — focus on advanced material
                  </li>
                </ul>
              )}
            </div>
            {modeError && (
              <div className="flex items-start gap-2 bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3 text-left">
                <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-destructive leading-relaxed">{modeError}</p>
              </div>
            )}
            <button
              onClick={handleDone}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:bg-primary/90 transition-colors text-sm"
            >
              Enter the Platform
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
