import { useState, useEffect, useCallback } from "react";
import { Shield, Lock, CheckCircle2, XCircle, Clock, BookOpen, AlertTriangle } from "lucide-react";
import { useAppConfig } from "@/contexts/AppConfigContext";

const GATE_PASS_KEY = "ict-discipline-gate";
const GATE_LOCKOUT_KEY = "ict-discipline-lockout";
const DEFAULT_LOCKOUT_MINUTES = 60;

interface DisciplineQuestion {
  category: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  lessonSuggestion: string;
}

const QUESTION_POOLS: Record<string, DisciplineQuestion[]> = {
  narrative: [
    {
      category: "Daily Bias / Liquidity",
      question: "Before entering a trade, you notice price swept below the previous day's low and reversed sharply. What is this called in ICT methodology?",
      options: ["Fair Value Gap", "Liquidity Sweep", "Order Block", "Breaker Block"],
      answer: 1,
      explanation: "A Liquidity Sweep occurs when price takes out a key level (like the previous day's low) to grab stop-loss orders before reversing. This is a classic ICT setup signal.",
      lessonSuggestion: "Review Chapter 3: Liquidity Concepts"
    },
    {
      category: "Daily Bias / Liquidity",
      question: "The Daily chart shows higher highs and higher lows. The 1H chart just swept a short-term low. What is your bias?",
      options: ["Bearish — price swept a low", "Bullish — the higher timeframe trend is up", "Neutral — conflicting signals", "No trade — too risky"],
      answer: 1,
      explanation: "Always defer to the higher timeframe bias. The Daily shows bullish structure, and the 1H sweep of a low is actually a buying opportunity (liquidity grab) in a bullish market.",
      lessonSuggestion: "Review Chapter 2: Market Structure"
    },
    {
      category: "Daily Bias / Liquidity",
      question: "You see a large Fair Value Gap on the 15-minute chart. Price is currently above it. What should you expect?",
      options: ["Price will never return to it", "Price will likely retrace to fill the gap", "The gap means the trend is over", "You should immediately enter a trade"],
      answer: 1,
      explanation: "FVGs act as magnets. Price tends to retrace to fill these gaps before continuing the move. Patience is key — wait for price to come to your level.",
      lessonSuggestion: "Review Chapter 4: Fair Value Gaps"
    },
  ],
  math: [
    {
      category: "Risk Management Math",
      question: "Your account is $10,000. Following the 0.5% max risk rule, what is the maximum dollar amount you should risk on a single trade?",
      options: ["$100", "$50", "$500", "$25"],
      answer: 1,
      explanation: "0.5% of $10,000 = $50. Never risk more than 0.5% of your account on any single trade. This protects you from emotional decisions and account blowups.",
      lessonSuggestion: "Review Chapter 6: Risk Management"
    },
    {
      category: "Risk Management Math",
      question: "You have a $25,000 account and want to risk 0.5%. Your stop loss is 20 points on NQ ($20/point). How many contracts can you trade?",
      options: ["1 contract", "3 contracts", "5 contracts", "Cannot determine"],
      answer: 0,
      explanation: "$25,000 × 0.5% = $125 max risk. With a 20-point stop at $20/point = $400 risk per contract. $125/$400 = 0.3125, so you can only trade a fraction — meaning you need a tighter stop or should skip this trade.",
      lessonSuggestion: "Review Chapter 6: Position Sizing"
    },
    {
      category: "Risk Management Math",
      question: "Your risk per trade is $50 and your target is 3R. What is your expected profit if the trade hits target?",
      options: ["$50", "$100", "$150", "$200"],
      answer: 2,
      explanation: "3R means 3 times your risk. If you risk $50, your reward target is $50 × 3 = $150. Always aim for at least 2R or higher reward-to-risk ratios.",
      lessonSuggestion: "Review Chapter 6: Risk-Reward Ratios"
    },
  ],
  awareness: [
    {
      category: "News & Event Awareness",
      question: "It's NFP (Non-Farm Payrolls) Friday. When should you trade?",
      options: ["Trade as normal — news doesn't matter", "Only trade BEFORE the news release", "Wait until AFTER the news volatility settles (30-60 min)", "Double your position size for the big move"],
      answer: 2,
      explanation: "Red Folder news events like NFP cause extreme volatility and unpredictable price spikes. Smart Money traders wait for the chaos to settle before entering. Never trade INTO major news.",
      lessonSuggestion: "Review Chapter 1: News Events"
    },
    {
      category: "News & Event Awareness",
      question: "Which of these is a 'Red Folder' high-impact news event you should AVOID trading around?",
      options: ["Consumer Confidence Index", "FOMC Interest Rate Decision", "Retail Sales (minor)", "Housing Starts"],
      answer: 1,
      explanation: "FOMC (Federal Open Market Committee) rate decisions are among the highest-impact events. They can move markets hundreds of points in seconds. Always check the economic calendar before trading.",
      lessonSuggestion: "Review Chapter 1: Economic Calendar"
    },
    {
      category: "News & Event Awareness",
      question: "You woke up late and missed your morning analysis. The market has already moved 200 points. What should you do?",
      options: ["Chase the move — you're missing out!", "Enter a trade based on gut feeling", "Sit out today and review the charts", "Increase position size to make up for lost time"],
      answer: 2,
      explanation: "Discipline is everything. If you missed your preparation, sit out. There will ALWAYS be another trade tomorrow. Chasing moves and trading without preparation leads to losses.",
      lessonSuggestion: "Review Chapter 7: Trading Psychology"
    },
  ],
};

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function hasPassedToday(): boolean {
  try {
    const data = localStorage.getItem(GATE_PASS_KEY);
    if (!data) return false;
    const parsed = JSON.parse(data);
    return parsed.date === getTodayKey() && parsed.passed === true;
  } catch { return false; }
}

function isLockedOut(lockoutMinutes = DEFAULT_LOCKOUT_MINUTES): { locked: boolean; remainingMs: number } {
  try {
    const data = localStorage.getItem(GATE_LOCKOUT_KEY);
    if (!data) return { locked: false, remainingMs: 0 };
    const parsed = JSON.parse(data);
    const durationMs = lockoutMinutes * 60 * 1000;
    const elapsed = Date.now() - parsed.timestamp;
    if (elapsed >= durationMs) {
      localStorage.removeItem(GATE_LOCKOUT_KEY);
      return { locked: false, remainingMs: 0 };
    }
    return { locked: true, remainingMs: durationMs - elapsed };
  } catch { return { locked: false, remainingMs: 0 }; }
}

function setPassedToday() {
  localStorage.setItem(GATE_PASS_KEY, JSON.stringify({ date: getTodayKey(), passed: true }));
}

function setLockout() {
  localStorage.setItem(GATE_LOCKOUT_KEY, JSON.stringify({ timestamp: Date.now() }));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function formatTime(ms: number): string {
  const mins = Math.floor(ms / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${mins}m ${secs.toString().padStart(2, "0")}s`;
}

interface Props {
  children: React.ReactNode;
}

export default function DisciplineGate({ children }: Props) {
  const { getNumber, isFeatureEnabled } = useAppConfig();
  const lockoutMinutes = getNumber("gate_lockout_minutes", DEFAULT_LOCKOUT_MINUTES);
  const [passed, setPassed] = useState(hasPassedToday);
  const [lockout, setLockoutState] = useState(() => isLockedOut(lockoutMinutes));
  const [phase, setPhase] = useState<"intro" | "quiz" | "result">("intro");
  const [questions, setQuestions] = useState<DisciplineQuestion[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<(number | null)[]>([]);
  const [score, setScore] = useState(0);
  const gateEnabled = isFeatureEnabled("feature_discipline_gate");

  useEffect(() => {
    if (lockout.locked) {
      const interval = setInterval(() => {
        const check = isLockedOut(lockoutMinutes);
        setLockoutState(check);
        if (!check.locked) clearInterval(interval);
      }, 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [lockout.locked, lockoutMinutes]);

  const startQuiz = useCallback(() => {
    const qs = [
      pickRandom(QUESTION_POOLS.narrative),
      pickRandom(QUESTION_POOLS.math),
      pickRandom(QUESTION_POOLS.awareness),
    ];
    setQuestions(qs);
    setCurrentQ(0);
    setSelected(null);
    setAnswers([]);
    setScore(0);
    setPhase("quiz");
  }, []);

  function handleSelect(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
  }

  function handleNext() {
    if (selected === null) return;
    const correct = selected === questions[currentQ].answer;
    const newAnswers = [...answers, selected];
    const newScore = correct ? score + 1 : score;
    setAnswers(newAnswers);
    setScore(newScore);

    if (currentQ + 1 >= questions.length) {
      if (newScore >= 3) {
        setPassedToday();
        setPassed(true);
      } else {
        setLockout();
        setLockoutState(isLockedOut());
      }
      setPhase("result");
    } else {
      setCurrentQ(currentQ + 1);
      setSelected(null);
    }
  }

  if (!gateEnabled || passed) return <>{children}</>;

  if (lockout.locked) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="bg-card border border-destructive/30 rounded-2xl p-8 max-w-md text-center">
          <Lock className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Sessions Locked</h2>
          <p className="text-sm text-muted-foreground mb-4">
            You didn't pass the Discipline Check. Take this time to review your lessons and come back stronger.
          </p>
          <div className="bg-destructive/10 rounded-xl p-4 mb-4">
            <Clock className="h-5 w-5 text-destructive mx-auto mb-2" />
            <p className="text-2xl font-bold text-destructive">{formatTime(lockout.remainingMs)}</p>
            <p className="text-xs text-muted-foreground mt-1">until unlock</p>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-left">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">While you wait:</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>- Review the ICT Academy lessons</li>
              <li>- Study the Glossary concepts</li>
              <li>- Practice with the Quiz</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className="bg-card border rounded-2xl p-8 max-w-md text-center">
          <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Daily Discipline Check</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Before you trade, prove you're mentally prepared. Answer 3 questions covering market narrative, risk math, and news awareness.
          </p>
          <div className="space-y-2 mb-6 text-left">
            {[
              { num: 1, label: "Market Narrative", desc: "Daily bias & liquidity concepts" },
              { num: 2, label: "Risk Math", desc: "Position sizing & risk calculations" },
              { num: 3, label: "News Awareness", desc: "High-impact event identification" },
            ].map((item) => (
              <div key={item.num} className="flex items-center gap-3 bg-secondary/50 rounded-lg p-3">
                <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center">{item.num}</span>
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-6">
            <div className="flex items-center gap-2 text-amber-500 text-xs font-medium">
              <AlertTriangle className="h-3.5 w-3.5" />
              You must get all 3 correct. Failure locks sessions for {lockoutMinutes >= 60 ? `${Math.round(lockoutMinutes / 60)} hour${lockoutMinutes >= 120 ? "s" : ""}` : `${lockoutMinutes} minutes`}.
            </div>
          </div>
          <button onClick={startQuiz} className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:brightness-110 transition-all">
            Begin Check
          </button>
        </div>
      </div>
    );
  }

  if (phase === "result") {
    const passed = score >= 3;
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <div className={`bg-card border rounded-2xl p-8 max-w-md text-center ${passed ? "border-primary/30" : "border-destructive/30"}`}>
          {passed ? (
            <>
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Discipline Check Passed!</h2>
              <p className="text-sm text-muted-foreground mb-4">
                You're mentally prepared to trade today. Stay disciplined and follow your plan.
              </p>
              <div className="text-4xl font-bold text-primary mb-4">{score}/3</div>
              <button onClick={() => setPassed(true)} className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:brightness-110 transition-all">
                Enter Trading Session
              </button>
            </>
          ) : (
            <>
              <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Not Ready Yet</h2>
              <p className="text-sm text-muted-foreground mb-4">
                You got {score}/3 correct. Sessions are locked for 1 hour. Use this time to study.
              </p>
              <div className="space-y-2 mb-4">
                {questions.map((q, i) => {
                  const userAnswer = answers[i];
                  const correct = userAnswer === q.answer;
                  return (
                    <div key={i} className={`rounded-lg p-3 text-left text-xs ${correct ? "bg-primary/10" : "bg-destructive/10"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        {correct ? <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> : <XCircle className="h-3.5 w-3.5 text-destructive" />}
                        <span className="font-semibold">{q.category}</span>
                      </div>
                      {!correct && <p className="text-muted-foreground">{q.lessonSuggestion}</p>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const q = questions[currentQ];
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="bg-card border rounded-2xl p-6 max-w-lg w-full">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-semibold text-muted-foreground">Question {currentQ + 1} of 3</span>
          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">{q.category}</span>
        </div>
        <div className="h-1 bg-border rounded-full mb-6 overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((currentQ + (selected !== null ? 1 : 0)) / 3) * 100}%` }} />
        </div>
        <p className="text-sm font-medium mb-4 leading-relaxed">{q.question}</p>
        <div className="space-y-2 mb-4">
          {q.options.map((opt, i) => {
            const isSelected = selected === i;
            const isAnswer = i === q.answer;
            const showResult = selected !== null;
            let style = "border-border hover:border-primary/50 hover:bg-primary/5";
            if (showResult && isAnswer) style = "border-primary bg-primary/10";
            else if (showResult && isSelected && !isAnswer) style = "border-destructive bg-destructive/10";
            else if (isSelected) style = "border-primary bg-primary/10";

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={selected !== null}
                className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${style}`}
              >
                <span className="font-medium">{opt}</span>
              </button>
            );
          })}
        </div>
        {selected !== null && (
          <div className={`rounded-lg p-3 mb-4 text-xs ${selected === q.answer ? "bg-primary/10 border border-primary/20" : "bg-destructive/10 border border-destructive/20"}`}>
            <p className="font-semibold mb-1">{selected === q.answer ? "Correct!" : "Incorrect"}</p>
            <p className="text-muted-foreground leading-relaxed">{q.explanation}</p>
          </div>
        )}
        {selected !== null && (
          <button onClick={handleNext} className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:brightness-110 transition-all">
            {currentQ + 1 >= questions.length ? "See Results" : "Next Question"}
          </button>
        )}
      </div>
    </div>
  );
}

export function useDisciplineStatus() {
  return {
    passedToday: hasPassedToday(),
    lockout: isLockedOut(),
  };
}
