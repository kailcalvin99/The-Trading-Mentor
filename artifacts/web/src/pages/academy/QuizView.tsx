import { useState } from "react";
import {
  TOTAL_QUIZ_QUESTIONS,
  COURSE_CHAPTERS,
  pickQuestion,
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
  DIFFICULTY_ICONS,
  type Difficulty,
  type QuizQuestion,
} from "../../data/academy-data";
import { dispatchAITrigger, incrementQuizFailCount, resetQuizFailCount } from "@/hooks/useAITrigger";
import { getProgress } from "./academyUtils";

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

export function QuizView() {
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
          <div className="text-5xl mb-4">{pct >= 70 ? "🏆" : pct >= 40 ? "📈" : "📚"}</div>
          <div className="text-5xl font-bold">{score}/{maxScore}</div>
          <div className="text-xl font-semibold text-primary mt-1 mb-3">{pct}%</div>
          <p className="text-sm text-muted-foreground leading-relaxed mb-2">
            {pct >= 70 ? "ICT Concept Master! You dominated the adaptive quiz." : pct >= 40 ? "Good progress — the quiz adjusted to your level. Review and retry!" : "Keep studying — review the glossary and plan, then try again!"}
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
            {isCorrect ? "✓ Correct!" : "✗ Not quite..."}
          </p>
          <p className="text-sm leading-relaxed mb-4">{q.explanation}</p>
          <button
            className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground hover:opacity-90 transition-opacity"
            style={{ backgroundColor: isCorrect ? "#00C896" : "#F59E0B" }}
            onClick={handleNext}
          >
            {answered + 1 < TOTAL_QUIZ_QUESTIONS ? "Next Question →" : "See Results"}
          </button>
        </div>
      )}
    </div>
  );
}
