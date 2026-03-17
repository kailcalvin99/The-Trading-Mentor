import { useState } from "react";
import { CheckCircle2, ChevronRight, Sparkles } from "lucide-react";

const QUIZ_STORAGE_KEY = "ict-skill-level";
const QUIZ_DONE_KEY = "ict-quiz-done";
const ACADEMY_PROGRESS_KEY = "ict-academy-progress";

export type SkillLevel = "beginner" | "intermediate" | "advanced";

export function getSkillLevel(): SkillLevel | null {
  const val = localStorage.getItem(QUIZ_STORAGE_KEY);
  if (val === "beginner" || val === "intermediate" || val === "advanced") return val;
  return null;
}

export function hasCompletedQuiz(): boolean {
  return localStorage.getItem(QUIZ_DONE_KEY) === "true";
}

export function clearQuiz() {
  localStorage.removeItem(QUIZ_STORAGE_KEY);
  localStorage.removeItem(QUIZ_DONE_KEY);
  localStorage.removeItem(ACADEMY_PROGRESS_KEY);
}

const BEGINNER_LESSONS: string[] = [];

const INTERMEDIATE_LESSONS: string[] = [
  "ch1-1", "ch1-2", "ch1-3", "ch1-4", "ch1-5", "ch1-6",
];

const ADVANCED_LESSONS: string[] = [
  "ch1-1", "ch1-2", "ch1-3", "ch1-4", "ch1-5", "ch1-6",
  "ch2-1", "ch2-2", "ch2-3", "ch2-4", "ch2-5",
];

interface Question {
  id: string;
  text: string;
  options: { label: string; score: number }[];
}

const QUESTIONS: Question[] = [
  {
    id: "q1",
    text: "Have you ever placed a real trade before? (stocks, crypto, forex, futures)",
    options: [
      { label: "No — I'm completely new to trading", score: 0 },
      { label: "Yes — I've made a few trades", score: 1 },
    ],
  },
  {
    id: "q2",
    text: "Can you read a candlestick chart?",
    options: [
      { label: "Not yet — candlesticks are new to me", score: 0 },
      { label: "Yes — I understand candles and price action", score: 1 },
    ],
  },
  {
    id: "q3",
    text: "How familiar are you with ICT concepts like Fair Value Gaps, Order Blocks, or Liquidity?",
    options: [
      { label: "These are new to me", score: 0 },
      { label: "I've heard of them but I'm still learning", score: 1 },
      { label: "I understand them and use them in my trading", score: 2 },
    ],
  },
  {
    id: "q4",
    text: "Do you know how to calculate a position size or manage risk per trade?",
    options: [
      { label: "No — I haven't learned risk management yet", score: 0 },
      { label: "Yes — I calculate position sizes and set risk limits", score: 1 },
    ],
  },
  {
    id: "q5",
    text: "Have you ever tracked or reviewed your trades in a journal?",
    options: [
      { label: "No — I haven't journaled my trades", score: 0 },
      { label: "Yes — I review my trades regularly", score: 1 },
    ],
  },
];

function scoreToLevel(score: number): SkillLevel {
  if (score <= 1) return "beginner";
  if (score <= 3) return "intermediate";
  return "advanced";
}

const LEVEL_INFO: Record<SkillLevel, { label: string; emoji: string; desc: string; color: string }> = {
  beginner: {
    label: "Beginner Trader",
    emoji: "🌱",
    desc: "We'll start you from the ground up — no experience needed. The Academy is set up perfectly for where you are right now.",
    color: "text-green-400",
  },
  intermediate: {
    label: "Intermediate Trader",
    emoji: "📈",
    desc: "You know the basics — so we'll skip the fundamentals and get straight to the ICT tools and strategies that will level you up.",
    color: "text-amber-400",
  },
  advanced: {
    label: "Advanced Trader",
    emoji: "🏆",
    desc: "You've got experience under your belt. We'll focus on the advanced ICT strategies and skip the material you already know.",
    color: "text-primary",
  },
};

interface OnboardingQuizProps {
  onComplete: (level: SkillLevel) => void;
}

export default function OnboardingQuiz({ onComplete }: OnboardingQuizProps) {
  const [step, setStep] = useState<number>(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<SkillLevel | null>(null);

  const isIntro = step === 0;
  const isResult = result !== null;
  const questionIdx = step - 1;
  const currentQuestion = QUESTIONS[questionIdx];

  function handleAnswer(score: number) {
    const newAnswers = { ...answers, [currentQuestion.id]: score };
    setAnswers(newAnswers);
    if (questionIdx < QUESTIONS.length - 1) {
      setStep(step + 1);
    } else {
      const total = Object.values(newAnswers).reduce((a, b) => a + b, 0);
      const level = scoreToLevel(total);
      setResult(level);
    }
  }

  function handleComplete() {
    if (!result) return;
    const lessonIds =
      result === "advanced"
        ? ADVANCED_LESSONS
        : result === "intermediate"
        ? INTERMEDIATE_LESSONS
        : BEGINNER_LESSONS;
    localStorage.setItem(ACADEMY_PROGRESS_KEY, JSON.stringify(lessonIds));
    localStorage.setItem(QUIZ_STORAGE_KEY, result);
    localStorage.setItem(QUIZ_DONE_KEY, "true");
    onComplete(result);
  }

  if (isResult && result) {
    const info = LEVEL_INFO[result];
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-8 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="text-5xl mb-4">{info.emoji}</div>
          <h2 className={`text-2xl font-bold mb-2 ${info.color}`}>{info.label}</h2>
          <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{info.desc}</p>

          {result !== "beginner" && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 mb-6 text-left">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs font-bold text-foreground">Lessons auto-skipped for you</p>
              </div>
              <p className="text-xs text-muted-foreground">
                {result === "advanced"
                  ? "Chapters 1 & 2 (11 lessons) have been marked complete. You'll start in Chapter 3."
                  : "Chapter 1 (6 lessons) has been marked complete. You'll start in Chapter 2."}
              </p>
            </div>
          )}

          <button
            onClick={handleComplete}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            <Sparkles className="h-4 w-4" />
            Let's Get Started
          </button>
        </div>
      </div>
    );
  }

  if (isIntro) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-300">
          <div className="text-center mb-6">
            <div
              className="text-5xl mb-4 select-none"
              style={{ filter: "drop-shadow(0 0 20px hsl(165 100% 39% / 0.5))" }}
            >
              🤖
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Welcome to ICT AI Trading Mentor</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Before we dive in, let me ask you 5 quick questions so I can personalise your experience and skip the lessons you already know.
            </p>
          </div>

          <div className="flex gap-1 mb-6">
            {QUESTIONS.map((_, i) => (
              <div key={i} className="h-1 flex-1 rounded-full bg-muted" />
            ))}
          </div>

          <button
            onClick={() => setStep(1)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-primary text-primary-foreground font-bold rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            Start Quick Quiz
            <ChevronRight className="h-4 w-4" />
          </button>
          <p className="text-center text-xs text-muted-foreground mt-3">Takes about 30 seconds</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex gap-1 mb-6">
          {QUESTIONS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                i < questionIdx ? "bg-primary" : i === questionIdx ? "bg-primary/50" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2">
          Question {questionIdx + 1} of {QUESTIONS.length}
        </p>
        <h3 className="text-lg font-bold text-foreground mb-6 leading-snug">{currentQuestion.text}</h3>

        <div className="space-y-3">
          {currentQuestion.options.map((opt) => (
            <button
              key={opt.label}
              onClick={() => handleAnswer(opt.score)}
              className="w-full text-left px-4 py-3.5 rounded-xl border border-border bg-secondary/30 hover:border-primary/50 hover:bg-primary/5 transition-all text-sm font-medium text-foreground"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
