import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  useListGeminiConversations,
  createGeminiConversation,
  getGeminiConversation,
} from "@workspace/api-client-react";
import { streamMessage } from "@/lib/api";
import Colors from "@/constants/colors";

const C = Colors.dark;

// ─── Glossary Data ───────────────────────────────────────────────────────────

const GLOSSARY_IMAGES: Record<string, number> = {
  FVG: require("@/assets/images/chart-fvg.png"),
  MSS: require("@/assets/images/chart-mss.png"),
  "Liquidity Sweep": require("@/assets/images/chart-liquidity-sweep.png"),
  OTE: require("@/assets/images/chart-ote.png"),
  "Kill Zone": require("@/assets/images/chart-killzone.png"),
};

const GLOSSARY = [
  {
    term: "FVG",
    full: "Fair Value Gap",
    color: "#00C896",
    icon: "git-merge-outline",
    definition:
      "A gap left on the chart when price moves really fast. Picture three candles in a row — if there's a space between candle 1 and candle 3 that doesn't overlap, that's the gap. Price usually comes back to fill it, and that's where you enter your trade.",
    tip: "On NQ, a 15-minute FVG (Fair Value Gap) after a liquidity sweep is your best entry.",
  },
  {
    term: "MSS",
    full: "Market Structure Shift",
    color: "#818CF8",
    icon: "git-branch-outline",
    definition:
      "When price breaks past a recent high or low and closes beyond it, telling you the trend just flipped direction. Think of it like a U-turn sign — the market was going one way and now it's going the other.",
    tip: "Wait for the MSS (Market Structure Shift) candle to fully close — don't jump in early.",
  },
  {
    term: "Liquidity Sweep",
    full: "Stop Hunt / Liquidity Grab",
    color: "#F59E0B",
    icon: "flash-outline",
    definition:
      "When price quickly pokes above a high or below a low to grab everyone's stop-loss orders, then snaps back the other way. It's like a broom sweeping up money before the real move starts.",
    tip: "A sweep of the London session low followed by a bullish MSS (Market Structure Shift) on NQ is a great long setup.",
  },
  {
    term: "OTE",
    full: "Optimal Trade Entry",
    color: "#EC4899",
    icon: "locate-outline",
    definition:
      "The sweet spot to enter a trade — between 62% and 79% of a price swing. After a sweep and MSS (Market Structure Shift), you want to enter in this zone for the best risk-to-reward. For buys, this lines up with the 'discount' (cheap) area.",
    tip: "Combine OTE (Optimal Trade Entry) with a FVG (Fair Value Gap) in the same zone for an even stronger entry.",
  },
  {
    term: "Kill Zone",
    full: "High-Probability Trading Session",
    color: "#06B6D4",
    icon: "time-outline",
    definition:
      "The best times of day to trade, when setups work most often: London Open (2–5 AM EST) and the Silver Bullet window (10–11 AM EST). These are when the big players are most active and the market moves the cleanest.",
    tip: "The Silver Bullet window (10–11 AM) is the most reliable time for NQ Futures.",
  },
];

// ─── Adaptive Quiz Data ──────────────────────────────────────────────────────

type Difficulty = "easy" | "medium" | "hard";

interface QuizQuestion {
  difficulty: Difficulty;
  scenario: string;
  options: string[];
  answer: number;
  explanation: string;
}

const QUIZ_BANK: QuizQuestion[] = [
  { difficulty: "easy", scenario: "What does FVG stand for in ICT trading?", options: ["Fast Volume Gain", "Fair Value Gap", "Forward Volatility Gauge", "Fibonacci Value Grid"], answer: 1, explanation: "FVG = Fair Value Gap. It's a gap left on the chart when price moves too fast. Price usually comes back to fill that gap — and that's where you enter your trade!" },
  { difficulty: "easy", scenario: "What is the Silver Bullet time window in EST?", options: ["8:00–9:00 AM", "10:00–11:00 AM", "2:00–3:00 PM", "12:00–1:00 PM"], answer: 1, explanation: "The Silver Bullet window is 10:00–11:00 AM EST. This is the prime ICT trading window for NQ — most consistent setups happen here!" },
  { difficulty: "easy", scenario: "What does MSS mean?", options: ["Moving Stop Strategy", "Market Structure Shift", "Margin Safety System", "Multiple Swing Setup"], answer: 1, explanation: "MSS = Market Structure Shift. It's when price breaks past a recent high or low, telling you the trend just changed direction — like a U-turn." },
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

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "glossary" | "quiz" | "mentor" | "plan";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function GlossaryView() {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <Text style={glossStyles.heading}>ICT Concepts</Text>
      <Text style={glossStyles.subheading}>Tap any term for the full definition + trader tip</Text>
      {GLOSSARY.map((item) => {
        const isOpen = expanded === item.term;
        return (
          <TouchableOpacity
            key={item.term}
            style={[glossStyles.card, isOpen && { borderColor: item.color }]}
            onPress={() => setExpanded(isOpen ? null : item.term)}
            activeOpacity={0.8}
          >
            <View style={glossStyles.cardHeader}>
              <View style={[glossStyles.badge, { backgroundColor: item.color + "22" }]}>
                <Text style={[glossStyles.badgeText, { color: item.color }]}>{item.term}</Text>
              </View>
              <Text style={glossStyles.fullName}>{item.full}</Text>
              <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={C.textSecondary} />
            </View>
            {isOpen && (
              <View style={glossStyles.cardBody}>
                <Text style={glossStyles.definition}>{item.definition}</Text>
                {GLOSSARY_IMAGES[item.term] && (
                  <Image
                    source={GLOSSARY_IMAGES[item.term]}
                    style={glossStyles.chartImage}
                    contentFit="cover"
                  />
                )}
                <View style={[glossStyles.tipBox, { borderLeftColor: item.color }]}>
                  <Text style={[glossStyles.tipLabel, { color: item.color }]}>NQ Tip</Text>
                  <Text style={glossStyles.tipText}>{item.tip}</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const DIFFICULTY_COLORS: Record<Difficulty, string> = { easy: "#00C896", medium: "#F59E0B", hard: "#EF4444" };
const DIFFICULTY_LABELS: Record<Difficulty, string> = { easy: "Beginner", medium: "Intermediate", hard: "Advanced" };
const TOTAL_QUIZ_QUESTIONS = 10;

const TIER_ORDER: Difficulty[] = ["easy", "medium", "hard"];

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
      <ScrollView contentContainerStyle={{ padding: 16, alignItems: "center", paddingBottom: 100 }}>
        <View style={quizStyles.resultCard}>
          <Text style={quizStyles.resultEmoji}>{pct >= 70 ? "🏆" : pct >= 40 ? "📈" : "📚"}</Text>
          <Text style={quizStyles.resultScore}>{score}/{maxScore}</Text>
          <Text style={quizStyles.resultPct}>{pct}%</Text>
          <Text style={quizStyles.resultMsg}>
            {pct >= 70 ? "ICT Concept Master! You dominated the adaptive quiz." : pct >= 40 ? "Good progress — the quiz adjusted to your level. Review and retry!" : "Keep studying — review the glossary and plan, then try again!"}
          </Text>
          <Text style={[quizStyles.resultMsg, { marginTop: 8, color: C.textSecondary }]}>
            Scoring: Easy = 1pt, Medium = 2pts, Hard = 3pts
          </Text>
          <TouchableOpacity style={quizStyles.retryBtn} onPress={handleReset}>
            <Text style={quizStyles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (!q) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, alignItems: "center", paddingBottom: 100 }}>
        <Text style={{ color: C.text, fontSize: 16 }}>No more questions available!</Text>
        <TouchableOpacity style={quizStyles.retryBtn} onPress={handleReset}>
          <Text style={quizStyles.retryText}>Start Over</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const diffColor = DIFFICULTY_COLORS[q.difficulty];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <View style={quizStyles.progressRow}>
        <Text style={quizStyles.progressText}>Question {answered + 1} of {TOTAL_QUIZ_QUESTIONS}</Text>
        <Text style={quizStyles.scoreText}>Score: {score}</Text>
      </View>
      <View style={quizStyles.progressBar}>
        <View style={[quizStyles.progressFill, { width: `${((answered) / TOTAL_QUIZ_QUESTIONS) * 100}%` }]} />
      </View>

      <View style={quizStyles.diffBadgeRow}>
        <View style={[quizStyles.diffBadge, { backgroundColor: diffColor + "20", borderColor: diffColor }]}>
          <Ionicons name={q.difficulty === "easy" ? "leaf-outline" : q.difficulty === "medium" ? "flash-outline" : "skull-outline"} size={12} color={diffColor} />
          <Text style={[quizStyles.diffBadgeText, { color: diffColor }]}>{DIFFICULTY_LABELS[q.difficulty]}</Text>
        </View>
      </View>

      <View style={quizStyles.scenarioCard}>
        <View style={quizStyles.scenarioBadge}>
          <Ionicons name="bar-chart-outline" size={14} color={C.accent} />
          <Text style={quizStyles.scenarioBadgeText}>NQ Scenario</Text>
        </View>
        <Text style={quizStyles.scenarioText}>{q.scenario}</Text>
      </View>

      {q.options.map((opt, idx) => {
        let bg = C.backgroundSecondary;
        let border = C.cardBorder;
        let textColor = C.text;
        if (selected !== null) {
          if (idx === q.answer) { bg = "rgba(0,200,150,0.12)"; border = C.accent; textColor = C.accent; }
          else if (idx === selected && selected !== q.answer) { bg = "rgba(255,68,68,0.1)"; border = "#FF4444"; textColor = "#FF4444"; }
        }
        return (
          <TouchableOpacity
            key={idx}
            style={[quizStyles.option, { backgroundColor: bg, borderColor: border }]}
            onPress={() => handleSelect(idx)}
            activeOpacity={0.8}
          >
            <View style={[quizStyles.optionLetter, { borderColor: border }]}>
              <Text style={[quizStyles.optionLetterText, { color: textColor }]}>{String.fromCharCode(65 + idx)}</Text>
            </View>
            <Text style={[quizStyles.optionText, { color: textColor }]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}

      {selected !== null && (
        <View style={[quizStyles.feedbackBox, { borderColor: isCorrect ? C.accent : "#FF4444" }]}>
          <Text style={[quizStyles.feedbackTitle, { color: isCorrect ? C.accent : "#FF4444" }]}>
            {isCorrect ? "✓ Correct!" : "✗ Not quite..."}
          </Text>
          <Text style={quizStyles.feedbackText}>{q.explanation}</Text>
          <TouchableOpacity style={[quizStyles.nextBtn, { backgroundColor: isCorrect ? C.accent : "#F59E0B" }]} onPress={handleNext}>
            <Text style={quizStyles.nextBtnText}>{answered + 1 < TOTAL_QUIZ_QUESTIONS ? "Next Question →" : "See Results"}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

function MentorView() {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const { data: conversations, refetch } = useListGeminiConversations();

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  async function startConversation() {
    try {
      const res = await createGeminiConversation({ title: "NQ Session" });
      if (res) {
        setConversationId(res.id);
        setMessages([{ role: "assistant", content: "I'm your ICT Trading Mentor. Ask me about FVGs, Liquidity Sweeps, Silver Bullet setups, or NQ Futures strategy." }]);
        refetch();
      }
    } catch {}
  }

  async function loadConversation(id: number) {
    setConversationId(id);
    try {
      const res = await getGeminiConversation(id);
      if (res) {
        setMessages((res as any).messages.map((m: any) => ({ role: m.role, content: m.content })));
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
      await streamMessage(
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

  if (!conversationId) {
    return (
      <View style={mentorStyles.container}>
        <View style={mentorStyles.newChatBox}>
          <Ionicons name="chatbubbles-outline" size={40} color={C.accent} />
          <Text style={mentorStyles.newChatTitle}>ICT Mentor AI</Text>
          <Text style={mentorStyles.newChatSub}>Ask anything about ICT concepts, NQ setups, or trading psychology</Text>
          <TouchableOpacity style={mentorStyles.startBtn} onPress={startConversation}>
            <Ionicons name="add" size={18} color="#0A0A0F" />
            <Text style={mentorStyles.startBtnText}>New Conversation</Text>
          </TouchableOpacity>
        </View>
        {conversations && conversations.length > 0 && (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            <Text style={mentorStyles.historyLabel}>Previous Sessions</Text>
            {[...conversations].reverse().slice(0, 5).map((c: any) => (
              <TouchableOpacity key={c.id} style={mentorStyles.historyItem} onPress={() => loadConversation(c.id)}>
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={C.textSecondary} />
                <Text style={mentorStyles.historyText} numberOfLines={1}>{c.title}</Text>
                <Ionicons name="chevron-forward" size={14} color={C.textSecondary} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={120}>
      <View style={{ flex: 1 }}>
        <TouchableOpacity style={mentorStyles.backBtn} onPress={() => setConversationId(null)}>
          <Ionicons name="arrow-back" size={16} color={C.accent} />
          <Text style={mentorStyles.backText}>Sessions</Text>
        </TouchableOpacity>
        <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 20 }}>
          {messages.map((msg, i) => (
            <View key={i} style={[mentorStyles.bubble, msg.role === "user" ? mentorStyles.userBubble : mentorStyles.aiBubble]}>
              {msg.role === "assistant" && (
                <View style={mentorStyles.aiAvatar}>
                  <Text style={{ fontSize: 10 }}>ICT</Text>
                </View>
              )}
              <View style={[mentorStyles.bubbleContent, msg.role === "user" ? mentorStyles.userContent : mentorStyles.aiContent]}>
                <Text style={[mentorStyles.bubbleText, msg.role === "user" && { color: "#0A0A0F" }]}>
                  {msg.content}{isStreaming && i === messages.length - 1 && msg.role === "assistant" ? "▋" : ""}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
        <View style={mentorStyles.inputRow}>
          <TextInput
            style={mentorStyles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your ICT mentor..."
            placeholderTextColor={C.textSecondary}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            editable={!isStreaming}
            multiline
          />
          <TouchableOpacity style={[mentorStyles.sendBtn, (!input.trim() || isStreaming) && { opacity: 0.4 }]} onPress={sendMessage} disabled={!input.trim() || isStreaming}>
            {isStreaming ? <ActivityIndicator size="small" color="#0A0A0F" /> : <Ionicons name="send" size={16} color="#0A0A0F" />}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

// ─── Trading Plan Data ────────────────────────────────────────────────────────

const PLAN_IMAGES: Record<string, number> = {
  "Conservative Entry": require("@/assets/images/chart-conservative-entry.png"),
  "Aggressive Entry (Silver Bullet)": require("@/assets/images/chart-silver-bullet.png"),
  "Exit Criteria": require("@/assets/images/chart-exit-criteria.png"),
};

const PLAN_SECTIONS = [
  {
    title: "The Tools",
    color: "#00C896",
    icon: "construct-outline",
    items: [
      { label: "MSS (Market Structure Shift)", desc: "Our signal that the trend has changed direction." },
      { label: "FVG (Fair Value Gap)", desc: "A price gap on the chart — this is where we enter trades." },
      { label: "Liquidity", desc: "Old highs and lows where stop losses are sitting — our targets." },
      { label: "Premium vs. Discount", desc: "Is price expensive (Premium = sell) or cheap (Discount = buy)?" },
      { label: "Kill Zones", desc: "The best times to trade: London (2–5 AM EST) and Silver Bullet (10–11 AM EST)." },
    ],
  },
  {
    title: "Timeframe Alignment (Matching Big and Small Charts)",
    color: "#818CF8",
    icon: "layers-outline",
    items: [
      { label: "HTF (Big Picture): Daily & 1-Hour", desc: "Find where price is heading — which direction is the market going?" },
      { label: "LTF (Close-Up): 15-Min & 5-Min", desc: "Find the MSS (Market Structure Shift) and the FVG (Fair Value Gap) entry." },
    ],
  },
  {
    title: "Conservative Entry",
    color: "#00C896",
    icon: "shield-checkmark-outline",
    items: [
      { label: "1. Bias Check", desc: "Is the 1-Hour chart going up (Bullish) or down (Bearish)?" },
      { label: "2. The Sweep", desc: "Wait for price to take out a 15-min high or low." },
      { label: "3. The Shift (MSS)", desc: "Wait for a 5-min MSS (Market Structure Shift) — a fast, strong move." },
      { label: "4. The Gap (FVG)", desc: "Find the FVG (Fair Value Gap) that was left behind." },
      { label: "5. The Fib — OTE (Optimal Trade Entry)", desc: "Make sure your entry is in the sweet spot — Discount (buys) or Premium (sells)." },
      { label: "6. The Trigger", desc: "Place a Limit Order at the start of the FVG." },
    ],
  },
  {
    title: "Aggressive Entry (Silver Bullet)",
    color: "#F59E0B",
    icon: "flash-outline",
    items: [
      { label: "Time Check", desc: "It must be between 10:00 AM and 11:00 AM EST." },
      { label: "Identify POI", desc: "Price must be heading toward a clear high or low." },
      { label: "The Gap (FVG)", desc: "Enter at the first 1-min FVG (Fair Value Gap) after a liquidity grab." },
      { label: "Risk", desc: "Don't risk more than 1% on this trade." },
    ],
  },
  {
    title: "Exit Criteria",
    color: "#06B6D4",
    icon: "exit-outline",
    items: [
      { label: "Stop Loss", desc: "Place it at the high/low of the candle that created the MSS (Market Structure Shift)." },
      { label: "TP1 (First Target)", desc: "The next nearby high or low (1:1 or 1:2 reward ratio)." },
      { label: "TP2 (Main Target)", desc: "External Liquidity — the big target where the move should end." },
      { label: "Trailing", desc: "Move your stop loss to breakeven once TP1 is hit — now it's a free trade!" },
    ],
  },
  {
    title: "Prop Firm Survival Rules",
    color: "#EF4444",
    icon: "warning-outline",
    items: [
      { label: "Max Daily Loss", desc: "2% — if you lose this much, the app stops you for 24 hours." },
      { label: "Max Weekly Loss", desc: "4% — your weekly safety limit." },
      { label: "News Rule", desc: "Don't trade within 5 minutes before or after Red Folder news events." },
    ],
  },
  {
    title: "Key Takeaways",
    color: "#EC4899",
    icon: "bulb-outline",
    items: [
      { label: "Top-Down", desc: "Always start with the big chart (Daily). If it's going down, don't try to buy on the small chart." },
      { label: "Patience", desc: "If price doesn't come to your FVG (Fair Value Gap), there is no trade. Wait." },
      { label: "Discipline", desc: "Following this plan is how you get funded. Breaking it keeps you stuck." },
    ],
  },
];

function PlanView() {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <Text style={planStyles.heading}>NQ Futures: ICT Trading Plan</Text>
      <Text style={planStyles.subheading}>Your mechanical, top-down trading framework</Text>
      {PLAN_SECTIONS.map((section) => (
        <View key={section.title} style={planStyles.card}>
          <View style={[planStyles.cardHeaderBar, { backgroundColor: section.color + "15" }]}>
            <Ionicons name={section.icon as any} size={16} color={section.color} />
            <Text style={[planStyles.cardTitle, { color: section.color }]}>{section.title}</Text>
          </View>
          {section.items.map((item, idx) => (
            <View key={idx} style={planStyles.itemRow}>
              <View style={[planStyles.itemDot, { backgroundColor: section.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={planStyles.itemLabel}>{item.label}</Text>
                <Text style={planStyles.itemDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
          {PLAN_IMAGES[section.title] && (
            <Image
              source={PLAN_IMAGES[section.title]}
              style={planStyles.chartImage}
              contentFit="cover"
            />
          )}
        </View>
      ))}
    </ScrollView>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

const TAB_LABELS: Record<Tab, string> = {
  glossary: "Glossary",
  quiz: "Quiz",
  mentor: "Mentor",
  plan: "Plan",
};

export default function AcademyScreen() {
  const [tab, setTab] = useState<Tab>("glossary");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>ICT Academy</Text>
        <View style={styles.tabBar}>
          {(["glossary", "quiz", "mentor", "plan"] as Tab[]).map((t) => (
            <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
                {TAB_LABELS[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={{ flex: 1 }}>
        {tab === "glossary" && <GlossaryView />}
        {tab === "quiz" && <QuizView />}
        {tab === "mentor" && <MentorView />}
        {tab === "plan" && <PlanView />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 0 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 14 },
  tabBar: { flexDirection: "row", backgroundColor: C.backgroundSecondary, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: "center" },
  tabBtnActive: { backgroundColor: C.accent },
  tabBtnText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.textSecondary },
  tabBtnTextActive: { color: "#0A0A0F", fontFamily: "Inter_700Bold" },
});

const glossStyles = StyleSheet.create({
  heading: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 4 },
  subheading: { fontSize: 13, color: C.textSecondary, marginBottom: 16 },
  card: { backgroundColor: C.backgroundSecondary, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 10, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  fullName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: C.textSecondary },
  cardBody: { paddingHorizontal: 14, paddingBottom: 14 },
  definition: { fontSize: 14, color: C.text, lineHeight: 22, marginBottom: 12 },
  chartImage: { width: "100%", height: 200, borderRadius: 10, marginBottom: 12 },
  tipBox: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4 },
  tipLabel: { fontSize: 11, fontFamily: "Inter_700Bold", marginBottom: 4 },
  tipText: { fontSize: 13, color: C.textSecondary, lineHeight: 20 },
});

const quizStyles = StyleSheet.create({
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressText: { fontSize: 13, color: C.textSecondary },
  scoreText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.accent },
  progressBar: { height: 4, backgroundColor: C.cardBorder, borderRadius: 2, marginBottom: 16, overflow: "hidden" },
  progressFill: { height: 4, backgroundColor: C.accent, borderRadius: 2 },
  diffBadgeRow: { marginBottom: 10 },
  diffBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  diffBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  scenarioCard: { backgroundColor: C.backgroundSecondary, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 14 },
  scenarioBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  scenarioBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.accent, textTransform: "uppercase" },
  scenarioText: { fontSize: 15, color: C.text, lineHeight: 24, fontFamily: "Inter_500Medium" },
  option: { borderRadius: 12, borderWidth: 1.5, padding: 14, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  optionLetter: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  optionLetterText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  optionText: { flex: 1, fontSize: 14, lineHeight: 20 },
  feedbackBox: { borderRadius: 14, borderWidth: 1.5, padding: 16, marginTop: 8 },
  feedbackTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 8 },
  feedbackText: { fontSize: 13, color: C.text, lineHeight: 21, marginBottom: 16 },
  nextBtn: { borderRadius: 10, padding: 14, alignItems: "center" },
  nextBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
  resultCard: { backgroundColor: C.backgroundSecondary, borderRadius: 20, padding: 30, alignItems: "center", borderWidth: 1, borderColor: C.cardBorder, width: "100%", marginTop: 20 },
  resultEmoji: { fontSize: 48, marginBottom: 16 },
  resultScore: { fontSize: 48, fontFamily: "Inter_700Bold", color: C.text },
  resultPct: { fontSize: 22, fontFamily: "Inter_600SemiBold", color: C.accent, marginBottom: 12 },
  resultMsg: { fontSize: 14, color: C.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  retryBtn: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 30, paddingVertical: 14 },
  retryText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
});

const mentorStyles = StyleSheet.create({
  container: { flex: 1 },
  newChatBox: { alignItems: "center", padding: 30, paddingTop: 40 },
  newChatTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: C.text, marginTop: 14, marginBottom: 8 },
  newChatSub: { fontSize: 14, color: C.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  startBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.accent, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  startBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
  historyLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 },
  historyItem: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: C.backgroundSecondary, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.cardBorder },
  historyText: { flex: 1, fontSize: 14, color: C.text },
  backBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 14 },
  backText: { fontSize: 14, color: C.accent },
  bubble: { flexDirection: "row", marginBottom: 12, alignItems: "flex-end" },
  userBubble: { justifyContent: "flex-end" },
  aiBubble: { justifyContent: "flex-start", gap: 8 },
  aiAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: C.accent + "33", alignItems: "center", justifyContent: "center", marginBottom: 2 },
  bubbleContent: { maxWidth: "80%", borderRadius: 16, padding: 12 },
  userContent: { backgroundColor: C.accent, borderBottomRightRadius: 4 },
  aiContent: { backgroundColor: C.backgroundSecondary, borderWidth: 1, borderColor: C.cardBorder, borderBottomLeftRadius: 4 },
  bubbleText: { fontSize: 14, color: C.text, lineHeight: 21 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", padding: 12, gap: 8, borderTopWidth: 1, borderTopColor: C.cardBorder },
  input: { flex: 1, backgroundColor: C.backgroundSecondary, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.cardBorder, maxHeight: 100 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.accent, alignItems: "center", justifyContent: "center" },
});

const planStyles = StyleSheet.create({
  heading: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 4 },
  subheading: { fontSize: 13, color: C.textSecondary, marginBottom: 16 },
  card: { backgroundColor: C.backgroundSecondary, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 12, overflow: "hidden" },
  cardHeaderBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  cardTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  chartImage: { width: "100%", height: 180, marginBottom: 4 },
  itemRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  itemDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  itemLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text, marginBottom: 2 },
  itemDesc: { fontSize: 13, color: C.textSecondary, lineHeight: 20 },
});
