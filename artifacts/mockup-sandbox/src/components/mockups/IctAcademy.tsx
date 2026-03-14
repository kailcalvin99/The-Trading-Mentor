import { useState, useRef, useEffect, type ReactNode } from "react";

type Tab = "glossary" | "quiz" | "mentor" | "plan";
type Difficulty = "easy" | "medium" | "hard";

interface QuizQuestion {
  difficulty: Difficulty;
  scenario: string;
  options: string[];
  answer: number;
  explanation: string;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: number;
  title: string;
}

const GLOSSARY = [
  {
    term: "FVG",
    full: "Fair Value Gap",
    color: "#00C896",
    image: "chart-fvg.png",
    definition:
      "A 3-candle imbalance where the wicks of the 1st and 3rd candle do not overlap. Price typically returns to fill this gap. In ICT, you look for bullish FVGs below price to enter longs, or bearish FVGs above price to enter shorts.",
    tip: "On NQ, a 15-minute FVG after a liquidity sweep is your highest-probability entry.",
  },
  {
    term: "MSS",
    full: "Market Structure Shift",
    color: "#818CF8",
    image: "chart-mss.png",
    definition:
      "When price breaks a recent swing high/low with a full candle close, signaling that the dominant trend has reversed. A bearish MSS after sweeping buy-side liquidity confirms a short setup.",
    tip: "Wait for the MSS candle to fully close — don't anticipate it.",
  },
  {
    term: "Liquidity Sweep",
    full: "Stop Hunt / Liquidity Grab",
    color: "#F59E0B",
    image: "chart-liquidity-sweep.png",
    definition:
      "When price briefly pierces beyond a swing high/low to grab the stop-loss orders clustered there, then reverses sharply. This is ICT's 'seek and destroy' concept — smart money hunts liquidity before moving in the opposite direction.",
    tip: "A sweep of the London Low followed by bullish MSS on NQ = high-probability long setup.",
  },
  {
    term: "OTE",
    full: "Optimal Trade Entry",
    color: "#EC4899",
    image: "chart-ote.png",
    definition:
      "A Fibonacci retracement zone between 62% and 79% of a swing move. After a sweep and MSS, ICT traders look to enter in this zone for the best risk:reward. It aligns with the 'discount' area in a bullish move.",
    tip: "Combine OTE with a FVG in the same zone for a confluence entry.",
  },
  {
    term: "Kill Zone",
    full: "High-Probability Trading Session",
    color: "#06B6D4",
    image: "chart-killzone.png",
    definition:
      "Specific time windows when ICT setups are most reliable: London Open (2–5 AM EST), NY Open (7–9:30 AM EST), and Silver Bullet (10–11 AM EST). These windows align with institutional order flow and liquidity events.",
    tip: "The Silver Bullet (10–11 AM) is the most consistent window for NQ Futures.",
  },
];

const QUIZ_BANK: QuizQuestion[] = [
  { difficulty: "easy", scenario: "What does FVG stand for in ICT trading?", options: ["Fast Volume Gain", "Fair Value Gap", "Forward Volatility Gauge", "Fibonacci Value Grid"], answer: 1, explanation: "FVG = Fair Value Gap. It's a 3-candle imbalance where the wicks of candles 1 and 3 don't overlap. Price tends to come back and fill this gap — that's where you enter!" },
  { difficulty: "easy", scenario: "What is the Silver Bullet time window in EST?", options: ["8:00–9:00 AM", "10:00–11:00 AM", "2:00–3:00 PM", "12:00–1:00 PM"], answer: 1, explanation: "The Silver Bullet window is 10:00–11:00 AM EST. This is the prime ICT trading window for NQ — most consistent setups happen here!" },
  { difficulty: "easy", scenario: "What does MSS mean?", options: ["Moving Stop Strategy", "Market Structure Shift", "Margin Safety System", "Multiple Swing Setup"], answer: 1, explanation: "MSS = Market Structure Shift. It's when price breaks a recent swing high/low with a full candle close, signaling a trend reversal." },
  { difficulty: "easy", scenario: "In ICT, what is 'Premium' vs 'Discount'?", options: ["Price above/below the 50% level of a range", "High/low volume zones", "Pre-market/post-market sessions", "Bid/ask spread zones"], answer: 0, explanation: "Premium = above the 50% level (expensive zone — look to sell). Discount = below 50% (cheap zone — look to buy). Think of it like shopping — you buy on sale and sell when it's overpriced!" },
  { difficulty: "easy", scenario: "What is the max daily loss rule for prop firms in this plan?", options: ["1%", "2%", "5%", "10%"], answer: 1, explanation: "Max daily loss is 2%. If you hit it, the app locks you out for 24 hours. This is how you survive prop firm evaluations — protect your capital!" },
  { difficulty: "medium", scenario: "NQ sweeps the 9:00 AM candle low, then immediately breaks back above the 9:00 AM high with a full candle close. What should you do next?", options: ["Enter long immediately at market price", "Wait for a 15-minute FVG to form, then buy into the gap", "Short because the low was already swept", "Skip — no valid setup here"], answer: 1, explanation: "The market faked everyone out by going down first (sweep), then slammed back up (MSS). Now you wait for it to come back down a little to a 'price gap' (FVG) and that's your entry! Entering at market after MSS gives bad risk:reward." },
  { difficulty: "medium", scenario: "NQ is clearly above the daily 50% level — it's in Premium. Price creates a bearish FVG on the 15-minute chart. What do you do?", options: ["Buy — the FVG is bullish", "Wait for price to fill the FVG from below, then look for a short", "Ignore FVGs in premium — they don't matter", "Only trade if it's a Monday"], answer: 1, explanation: "When prices are expensive (Premium), you want to SELL, not buy. The FVG is like a ceiling — when price comes back up to touch it, that's your chance to short." },
  { difficulty: "medium", scenario: "ForexFactory shows NFP (Non-Farm Payrolls) news at 8:30 AM with a red folder icon. When should you trade NQ today?", options: ["Right at 8:30 AM — biggest moves happen then", "At 9:00 AM before the NY open", "Wait until 10:00 AM after volatility settles", "Don't trade at all — red folder = no trading ever"], answer: 2, explanation: "Red folder news is like a tornado warning — you don't go outside! Wait until the storm passes. By 10 AM, the dust has settled and you can see the real direction." },
  { difficulty: "medium", scenario: "NQ is in a clear downtrend. Price sweeps above yesterday's high, then breaks a recent swing low. Where's your entry?", options: ["Short as soon as the high is swept", "Short after the swing low break, ideally inside the bearish FVG", "Long because price went up first", "Wait for 3 more confirmations"], answer: 1, explanation: "The market tricked the buyers (swept their stops above the high), then showed it really wants to go DOWN (MSS). Short inside the FVG it left behind." },
  { difficulty: "medium", scenario: "You enter a long trade on NQ and TP1 is hit. What should you do with your stop loss?", options: ["Keep it where it is", "Move it to breakeven", "Remove it entirely", "Widen it by 50%"], answer: 1, explanation: "Once TP1 is hit, you move your stop loss to breakeven. This way you're in a risk-free trade while letting the remaining position run to TP2 (external liquidity)." },
  { difficulty: "medium", scenario: "You're about to enter a trade. Your Entry Criteria checklist shows 4/6 items checked. Can you log this trade?", options: ["Yes — 4 out of 6 is good enough", "No — all 6 criteria must be checked", "Only if it's during the Silver Bullet window", "Yes, but only as a draft"], answer: 1, explanation: "ALL entry criteria must be checked before logging a trade. The app enforces this to keep your trading mechanical and disciplined. No shortcuts!" },
  { difficulty: "hard", scenario: "It's 10:22 AM EST. NQ sweeps above the 9:30 AM opening high, then drops back through it and forms a bearish FVG on the 1-minute chart. What setup is this?", options: ["A failed breakout — avoid trading", "A perfect Silver Bullet short setup", "A buy signal because price went up first", "Too late in the day to trade"], answer: 1, explanation: "It's the Silver Bullet window (10–11 AM)! NQ went up to steal the stops above the opening high (sweep), then came back down (MSS) and left a 1-minute FVG. This is the aggressive Silver Bullet short entry!" },
  { difficulty: "hard", scenario: "NQ shows a bullish MSS on the 5-minute chart, but the 1-Hour is in a bearish trend. The Fibonacci shows the entry is at the 55% retracement level. Should you take this trade?", options: ["Yes — the 5-minute MSS is enough confirmation", "No — the entry is NOT in the OTE zone (62%–79%)", "Yes — but only with half size", "No — because 5-minute and 1-hour disagree, AND it's not at OTE"], answer: 3, explanation: "Two problems here: 1) The 5-minute is bullish but 1-Hour is bearish — timeframes disagree (Top-Down rule violated). 2) The 55% level is NOT in the OTE zone (62%–79%). Both conditions fail." },
  { difficulty: "hard", scenario: "NQ sweeps sell-side liquidity at 10:05 AM, creates a bullish MSS on the 5-minute with displacement, and leaves a FVG. The FVG is at the 71% Fibonacci retracement. The 1-Hour shows a bullish bias. How many Conservative Entry criteria does this meet?", options: ["3 out of 6", "4 out of 6", "5 out of 6", "All 6 — it's a textbook setup"], answer: 2, explanation: "Let's check: 1) Bias Check ✓ (1H bullish). 2) The Sweep ✓ (sell-side liquidity swept). 3) The Shift ✓ (5-min MSS with displacement). 4) The Gap ✓ (FVG identified). 5) The Fib ✓ (71% is in the OTE zone). That's 5/6 — you still need to place the limit order at the FVG (The Trigger)." },
  { difficulty: "hard", scenario: "You're in a long trade on NQ. Price hits TP1 (internal liquidity) at a 1:2 ratio. You move SL to breakeven. Price then pulls back, touches your breakeven SL, and reverses to hit TP2. What happened?", options: ["You were stopped out at breakeven — no loss but missed TP2", "You still got TP2 because the SL is only mental", "You lost money because the pullback went below entry", "The trailing stop automatically moved to TP1"], answer: 0, explanation: "Once the SL is at breakeven and price touches it, you're out — zero loss, but you missed the run to TP2. This is why trailing stops are a double-edged sword. The plan says to move to BE after TP1, and sometimes the market shakes you out." },
  { difficulty: "hard", scenario: "NQ is in a clear downtrend on the Daily. Price retraces to the 75% Fibonacci level and creates a bearish FVG on the 15-minute chart during the London Kill Zone (3:00 AM EST). The 5-minute shows a bearish MSS. Is this a valid Conservative short entry?", options: ["No — London Kill Zone doesn't count for NQ", "No — Conservative entries require the Silver Bullet window", "Yes — all 6 Conservative Entry criteria are met", "Yes — but with only half position size"], answer: 2, explanation: "Let's verify: 1) Bias ✓ (Daily bearish). 2) Sweep — implied by the retrace to 75% (premium). 3) Shift ✓ (5-min bearish MSS). 4) Gap ✓ (15-min bearish FVG). 5) Fib ✓ (75% is in OTE zone, Premium for sells). 6) Trigger = place limit at FVG. London Kill Zone is valid for Conservative entries — the Silver Bullet window is only required for Aggressive entries." },
];

const PLAN_SECTIONS = [
  {
    title: "The Tools",
    color: "#00C896",
    icon: "wrench",
    items: [
      { label: "MSS", desc: "Market Structure Shift — our signal that the trend has changed." },
      { label: "FVG", desc: "Fair Value Gap — our entry zone." },
      { label: "Liquidity", desc: "Internal/External — our targets (Old Highs/Lows)." },
      { label: "Premium vs. Discount", desc: "Fibonacci — we only buy in Discount and sell in Premium." },
      { label: "Kill Zones", desc: "London (2–5 AM EST) and NY Silver Bullet (10–11 AM EST)." },
    ],
  },
  {
    title: "Timeframe Alignment",
    color: "#818CF8",
    icon: "layers",
    items: [
      { label: "HTF: Daily & 1-Hour", desc: "Find the Draw on Liquidity — where is price going?" },
      { label: "LTF: 15-Min & 5-Min", desc: "Find the MSS and the FVG entry." },
    ],
  },
  {
    title: "Conservative Entry",
    color: "#00C896",
    icon: "shield",
    image: "chart-conservative-entry.png",
    items: [
      { label: "1. Bias Check", desc: "Is the 1-Hour chart Bullish or Bearish?" },
      { label: "2. The Sweep", desc: "Wait for price to take out a 15-min High or Low." },
      { label: "3. The Shift", desc: "Wait for a 5-min MSS with Displacement (a fast move)." },
      { label: "4. The Gap", desc: "Identify the Fair Value Gap (FVG) left behind." },
      { label: "5. The Fib", desc: "Ensure entry is in Discount (buys) or Premium (sells)." },
      { label: "6. The Trigger", desc: "Place a Limit Order at the start of the FVG." },
    ],
  },
  {
    title: "Aggressive Entry (Silver Bullet)",
    color: "#F59E0B",
    icon: "zap",
    image: "chart-silver-bullet.png",
    items: [
      { label: "Time Check", desc: "Must be between 10:00 AM and 11:00 AM EST." },
      { label: "Identify POI", desc: "Price must be heading toward a clear High or Low." },
      { label: "The Gap", desc: "Enter at the first 1-min FVG after a liquidity grab." },
      { label: "Risk", desc: "Max 1% risk per trade." },
    ],
  },
  {
    title: "Exit Criteria",
    color: "#06B6D4",
    icon: "log-out",
    image: "chart-exit-criteria.png",
    items: [
      { label: "Stop Loss", desc: "Placed at the high/low of the candle that created the MSS." },
      { label: "TP1", desc: "Next Internal High or Low (1:1 or 1:2 ratio)." },
      { label: "TP2", desc: "External Liquidity — the main target." },
      { label: "Trailing", desc: "Move SL to Breakeven once TP1 is hit." },
    ],
  },
  {
    title: "Prop Firm Survival Rules",
    color: "#EF4444",
    icon: "alert-triangle",
    items: [
      { label: "Max Daily Loss", desc: "2% — if hit, app locks for 24 hours." },
      { label: "Max Weekly Loss", desc: "4%." },
      { label: "News Rule", desc: "No trading 5 min before or after Red Folder news." },
    ],
  },
  {
    title: "Key Takeaways",
    color: "#EC4899",
    icon: "lightbulb",
    items: [
      { label: "Top-Down", desc: "Always start with Daily. If Daily is going down, don't buy on 1-min." },
      { label: "Patience", desc: "If the market doesn't hit your FVG, there is no trade." },
      { label: "Discipline", desc: "Following this plan is how you get funded. Breaking it is how you stay a student." },
    ],
  },
];

const DIFFICULTY_COLORS: Record<Difficulty, string> = { easy: "#00C896", medium: "#F59E0B", hard: "#EF4444" };
const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: "Beginner", medium: "Intermediate", hard: "Advanced" };
const DIFFICULTY_ICONS: Record<Difficulty, string> = { easy: "🌱", medium: "⚡", hard: "💀" };
const TOTAL_QUIZ_QUESTIONS = 10;
const TIER_ORDER: Difficulty[] = ["easy", "medium", "hard"];

function getImageUrl(filename: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base}images/${filename}`;
}

function getApiUrl(): string {
  return "/api/";
}

function pickQuestion(diff: Difficulty, used: Set<number>): { q: QuizQuestion; idx: number } | null {
  const tierQuestions = QUIZ_BANK
    .map((q, idx) => ({ q, idx }))
    .filter(({ q, idx }) => q.difficulty === diff && !used.has(idx));
  if (tierQuestions.length > 0) {
    return tierQuestions[Math.floor(Math.random() * tierQuestions.length)];
  }
  const diffIdx = TIER_ORDER.indexOf(diff);
  for (let i = diffIdx + 1; i < TIER_ORDER.length; i++) {
    const harder = QUIZ_BANK
      .map((q, idx) => ({ q, idx }))
      .filter(({ q, idx }) => q.difficulty === TIER_ORDER[i] && !used.has(idx));
    if (harder.length > 0) return harder[Math.floor(Math.random() * harder.length)];
  }
  for (let i = diffIdx - 1; i >= 0; i--) {
    const easier = QUIZ_BANK
      .map((q, idx) => ({ q, idx }))
      .filter(({ q, idx }) => q.difficulty === TIER_ORDER[i] && !used.has(idx));
    if (easier.length > 0) return easier[Math.floor(Math.random() * easier.length)];
  }
  return null;
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ChevronUp({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
      <path d="m21.854 2.147-10.94 10.939" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function MessageSquareIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function LoaderIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function GlossaryView() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-white mb-1">ICT Concepts</h2>
      <p className="text-sm text-[#8B8BA0] mb-6">Click any term for the full definition + trader tip</p>
      <div className="grid gap-3">
        {GLOSSARY.map((item) => {
          const isOpen = expanded === item.term;
          return (
            <div
              key={item.term}
              className="rounded-xl border overflow-hidden transition-colors cursor-pointer"
              style={{
                backgroundColor: "#12121A",
                borderColor: isOpen ? item.color : "#1E1E2E",
              }}
              onClick={() => setExpanded(isOpen ? null : item.term)}
            >
              <div className="flex items-center gap-3 p-4">
                <span
                  className="px-3 py-1 rounded-lg text-sm font-bold"
                  style={{ backgroundColor: item.color + "22", color: item.color }}
                >
                  {item.term}
                </span>
                <span className="flex-1 text-sm text-[#8B8BA0] font-medium">{item.full}</span>
                {isOpen ? <ChevronUp className="text-[#8B8BA0]" /> : <ChevronDown className="text-[#8B8BA0]" />}
              </div>
              {isOpen && (
                <div className="px-4 pb-4 space-y-3">
                  <p className="text-sm text-white leading-relaxed">{item.definition}</p>
                  <img
                    src={getImageUrl(item.image)}
                    alt={`${item.term} chart`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <div
                    className="border-l-3 pl-3 py-1"
                    style={{ borderLeftColor: item.color }}
                  >
                    <p className="text-xs font-bold mb-1" style={{ color: item.color }}>NQ Tip</p>
                    <p className="text-sm text-[#8B8BA0] leading-relaxed">{item.tip}</p>
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
        <div className="bg-[#12121A] rounded-2xl border border-[#1E1E2E] p-8 text-center w-full max-w-md">
          <div className="text-5xl mb-4">{pct >= 70 ? "🏆" : pct >= 40 ? "📈" : "📚"}</div>
          <div className="text-5xl font-bold text-white">{score}/{maxScore}</div>
          <div className="text-xl font-semibold text-[#00C896] mt-1 mb-3">{pct}%</div>
          <p className="text-sm text-[#8B8BA0] leading-relaxed mb-2">
            {pct >= 70 ? "ICT Concept Master! You dominated the adaptive quiz." : pct >= 40 ? "Good progress — the quiz adjusted to your level. Review and retry!" : "Keep studying — review the glossary and plan, then try again!"}
          </p>
          <p className="text-xs text-[#55556A] mb-6">Scoring: Easy = 1pt, Medium = 2pts, Hard = 3pts</p>
          <button
            className="bg-[#00C896] text-[#0A0A0F] font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
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
        <p className="text-white mb-4">No more questions available!</p>
        <button
          className="bg-[#00C896] text-[#0A0A0F] font-bold px-8 py-3 rounded-xl hover:opacity-90 transition-opacity"
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
        <span className="text-sm text-[#8B8BA0]">Question {answered + 1} of {TOTAL_QUIZ_QUESTIONS}</span>
        <span className="text-sm font-semibold text-[#00C896]">Score: {score}</span>
      </div>
      <div className="h-1 bg-[#1E1E2E] rounded-full mb-4 overflow-hidden">
        <div
          className="h-1 bg-[#00C896] rounded-full transition-all duration-300"
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

      <div className="bg-[#12121A] rounded-xl border border-[#1E1E2E] p-5 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-semibold text-[#00C896] uppercase tracking-wider">NQ Scenario</span>
        </div>
        <p className="text-[15px] text-white leading-relaxed font-medium">{q.scenario}</p>
      </div>

      <div className="space-y-2">
        {q.options.map((opt, idx) => {
          let bg = "#12121A";
          let border = "#1E1E2E";
          let textColor = "#FFFFFF";
          if (selected !== null) {
            if (idx === q.answer) { bg = "rgba(0,200,150,0.12)"; border = "#00C896"; textColor = "#00C896"; }
            else if (idx === selected && selected !== q.answer) { bg = "rgba(255,68,68,0.1)"; border = "#FF4444"; textColor = "#FF4444"; }
          }
          return (
            <button
              key={idx}
              className="w-full flex items-center gap-3 p-3.5 rounded-xl border-[1.5px] text-left transition-all hover:border-[#2E2E3E]"
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
          <p className="text-sm text-white leading-relaxed mb-4">{q.explanation}</p>
          <button
            className="w-full py-3 rounded-xl font-bold text-sm text-[#0A0A0F] hover:opacity-90 transition-opacity"
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
  const [messages, setMessages] = useState<Message[]>([]);
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
        const data = await res.json();
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
        const data = await res.json();
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
        const data = await res.json();
        setMessages((data.messages || []).map((m: any) => ({ role: m.role, content: m.content })));
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
          <div className="text-[#00C896]">
            <MessageSquareIcon />
          </div>
          <h3 className="text-xl font-bold text-white mt-4 mb-2">ICT Mentor AI</h3>
          <p className="text-sm text-[#8B8BA0] text-center max-w-sm leading-relaxed mb-6">
            Ask anything about ICT concepts, NQ setups, or trading psychology
          </p>
          <button
            className="flex items-center gap-2 bg-[#00C896] text-[#0A0A0F] font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
            onClick={startConversation}
          >
            <PlusIcon />
            New Conversation
          </button>
        </div>
        <div className="w-72 border-l border-[#1E1E2E] p-4 overflow-y-auto">
          <p className="text-xs font-semibold text-[#8B8BA0] uppercase tracking-wider mb-3">Previous Sessions</p>
          {loadingConversations ? (
            <div className="flex justify-center py-4"><LoaderIcon /></div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-[#55556A]">No previous sessions</p>
          ) : (
            <div className="space-y-2">
              {[...conversations].reverse().slice(0, 10).map((c) => (
                <button
                  key={c.id}
                  className="w-full flex items-center gap-2 bg-[#12121A] rounded-xl p-3 border border-[#1E1E2E] text-left hover:border-[#2E2E3E] transition-colors"
                  onClick={() => loadConversation(c.id)}
                >
                  <span className="flex-1 text-sm text-white truncate">{c.title}</span>
                  <ChevronDown className="text-[#55556A] shrink-0 -rotate-90" />
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
      <div className="p-3 border-b border-[#1E1E2E]">
        <button
          className="flex items-center gap-1.5 text-[#00C896] text-sm hover:opacity-80 transition-opacity"
          onClick={() => { setConversationId(null); fetchConversations(); }}
        >
          <ArrowLeftIcon />
          Sessions
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start gap-2"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-[#00C89633] flex items-center justify-center shrink-0 mt-1">
                <span className="text-[10px] font-bold text-[#00C896]">ICT</span>
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-[#00C896] text-[#0A0A0F] rounded-br-sm"
                  : "bg-[#12121A] border border-[#1E1E2E] text-white rounded-bl-sm"
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
                {isStreaming && i === messages.length - 1 && msg.role === "assistant" ? "▋" : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-[#1E1E2E] flex items-end gap-2">
        <textarea
          className="flex-1 bg-[#12121A] border border-[#1E1E2E] rounded-2xl px-4 py-2.5 text-sm text-white placeholder-[#8B8BA0] resize-none focus:outline-none focus:border-[#2E2E3E] max-h-24"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your ICT mentor..."
          disabled={isStreaming}
          rows={1}
        />
        <button
          className="w-10 h-10 rounded-full bg-[#00C896] flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity disabled:opacity-40"
          onClick={sendMessage}
          disabled={!input.trim() || isStreaming}
        >
          {isStreaming ? <LoaderIcon /> : <SendIcon />}
        </button>
      </div>
    </div>
  );
}

function PlanView() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold text-white mb-1">NQ Futures: ICT Trading Plan</h2>
      <p className="text-sm text-[#8B8BA0] mb-6">Your mechanical, top-down trading framework</p>
      <div className="grid gap-4 md:grid-cols-2">
        {PLAN_SECTIONS.map((section) => (
          <div
            key={section.title}
            className="bg-[#12121A] rounded-xl border border-[#1E1E2E] overflow-hidden"
            style={section.title === "Conservative Entry" || section.title === "Prop Firm Survival Rules" ? { gridColumn: "1 / -1" } : undefined}
          >
            <div
              className="flex items-center gap-2.5 px-4 py-3 border-b border-[#1E1E2E]"
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
                    <span className="text-sm font-semibold text-white">{item.label}</span>
                    <span className="text-sm text-[#8B8BA0] ml-1.5">{item.desc}</span>
                  </div>
                </div>
              ))}
            </div>
            {"image" in section && section.image && (
              <img
                src={getImageUrl(section.image)}
                alt={`${section.title} chart`}
                className="w-full h-44 object-cover"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const TAB_CONFIG: { key: Tab; label: string }[] = [
  { key: "glossary", label: "Glossary" },
  { key: "quiz", label: "Quiz" },
  { key: "mentor", label: "Mentor" },
  { key: "plan", label: "Plan" },
];

export default function IctAcademy() {
  const [tab, setTab] = useState<Tab>("glossary");

  return (
    <div className="dark min-h-screen bg-[#0A0A0F] flex flex-col">
      <header className="px-6 pt-5 pb-0">
        <h1 className="text-2xl font-bold text-white mb-4">ICT Academy</h1>
        <div className="flex bg-[#12121A] rounded-xl p-1 border border-[#1E1E2E] max-w-md">
          {TAB_CONFIG.map((t) => (
            <button
              key={t.key}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-[#00C896] text-[#0A0A0F] font-bold"
                  : "text-[#8B8BA0] hover:text-white"
              }`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </header>
      <main className="flex-1 overflow-y-auto mt-2">
        {tab === "glossary" && <GlossaryView />}
        {tab === "quiz" && <QuizView />}
        {tab === "mentor" && <MentorView />}
        {tab === "plan" && <PlanView />}
      </main>
    </div>
  );
}
