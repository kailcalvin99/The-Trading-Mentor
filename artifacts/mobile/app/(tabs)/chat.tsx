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
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiClient } from "@workspace/api-client-react";
import { streamChat } from "@/lib/api";
import Colors from "@/constants/colors";

const C = Colors.dark;

// ─── Glossary Data ───────────────────────────────────────────────────────────

const GLOSSARY = [
  {
    term: "FVG",
    full: "Fair Value Gap",
    color: "#00C896",
    icon: "git-merge-outline",
    definition:
      "A 3-candle imbalance where the wicks of the 1st and 3rd candle do not overlap. Price typically returns to fill this gap. In ICT, you look for bullish FVGs below price to enter longs, or bearish FVGs above price to enter shorts.",
    tip: "On NQ, a 15-minute FVG after a liquidity sweep is your highest-probability entry.",
  },
  {
    term: "MSS",
    full: "Market Structure Shift",
    color: "#818CF8",
    icon: "git-branch-outline",
    definition:
      "When price breaks a recent swing high/low with a full candle close, signaling that the dominant trend has reversed. A bearish MSS after sweeping buy-side liquidity confirms a short setup.",
    tip: "Wait for the MSS candle to fully close — don't anticipate it.",
  },
  {
    term: "Liquidity Sweep",
    full: "Stop Hunt / Liquidity Grab",
    color: "#F59E0B",
    icon: "flash-outline",
    definition:
      "When price briefly pierces beyond a swing high/low to grab the stop-loss orders clustered there, then reverses sharply. This is ICT's 'seek and destroy' concept — smart money hunts liquidity before moving in the opposite direction.",
    tip: "A sweep of the London Low followed by bullish MSS on NQ = high-probability long setup.",
  },
  {
    term: "OTE",
    full: "Optimal Trade Entry",
    color: "#EC4899",
    icon: "locate-outline",
    definition:
      "A Fibonacci retracement zone between 62% and 79% of a swing move. After a sweep and MSS, ICT traders look to enter in this zone for the best risk:reward. It aligns with the 'discount' area in a bullish move.",
    tip: "Combine OTE with a FVG in the same zone for a confluence entry.",
  },
  {
    term: "Kill Zone",
    full: "High-Probability Trading Session",
    color: "#06B6D4",
    icon: "time-outline",
    definition:
      "Specific time windows when ICT setups are most reliable: London Open (2–5 AM EST), NY Open (7–9:30 AM EST), and Silver Bullet (10–11 AM EST). These windows align with institutional order flow and liquidity events.",
    tip: "The Silver Bullet (10–11 AM) is the most consistent window for NQ Futures.",
  },
];

// ─── Quiz Data ────────────────────────────────────────────────────────────────

const QUIZ = [
  {
    scenario: "NQ sweeps the 9:00 AM candle low, then immediately breaks back above the 9:00 AM high with a full candle close. What should you do next?",
    options: [
      "Enter long immediately at market price",
      "Wait for a 15-minute FVG to form, then buy into the gap",
      "Short because the low was already swept",
      "Skip — no valid setup here",
    ],
    answer: 1,
    explanation: "5th-grade version: Imagine the market faked everyone out by going down first (sweep), then slammed back up (MSS). Now you wait for it to come back down a little to a 'price gap' (FVG) and that's your ride! Entering at market after the MSS gives you bad risk:reward.",
  },
  {
    scenario: "NQ is clearly above the daily 50% level — it's in Premium. Price creates a bearish FVG on the 15-minute chart. What do you do?",
    options: [
      "Buy — the FVG is bullish",
      "Wait for price to fill the FVG from below, then look for a short",
      "Ignore FVGs in premium — they don't matter",
      "Only trade if it's a Monday",
    ],
    answer: 1,
    explanation: "5th-grade version: When prices are expensive (Premium), you want to SELL, not buy. The FVG is like a ceiling — when price comes back up to touch it, that's your chance to short. Think of it as a sale sign — you sell when things are overpriced!",
  },
  {
    scenario: "It's 10:22 AM EST. NQ sweeps above the 9:30 AM opening high, then drops back through it and forms a bearish FVG. What is this called?",
    options: [
      "A failed breakout — avoid trading",
      "A perfect Silver Bullet short setup",
      "A buy signal because price went up first",
      "Too late in the day to trade",
    ],
    answer: 1,
    explanation: "5th-grade version: It's the Silver Bullet window (10–11 AM)! NQ went up to steal the stops above the opening high (sweep), then came back down (MSS) and left a price gap (FVG). This is exactly what ICT teaches — short into that gap! Cha-ching!",
  },
  {
    scenario: "ForexFactory shows NFP (Non-Farm Payrolls) news at 8:30 AM with a red folder icon. When should you trade NQ today?",
    options: [
      "Right at 8:30 AM — biggest moves happen then",
      "At 9:00 AM before the NY open",
      "Wait until 10:00 AM after volatility settles",
      "Don't trade at all — red folder = no trading ever",
    ],
    answer: 2,
    explanation: "5th-grade version: Red folder news is like a tornado warning — you don't go outside! Wait until the storm (news spike) passes. By 10 AM, the dust has settled and you can see the real direction. Trading right at 8:30 AM is gambling, not trading.",
  },
  {
    scenario: "NQ is in a clear downtrend. Price sweeps above yesterday's high (grabbing buy-side liquidity), then breaks a recent swing low. Where's your entry?",
    options: [
      "Short as soon as the high is swept",
      "Short after the swing low break, ideally inside the bearish FVG",
      "Long because price went up first",
      "Wait for 3 more confirmations",
    ],
    answer: 1,
    explanation: "5th-grade version: The market just tricked the buyers (swept their stops above the high), then showed it really wants to go DOWN (broke the swing low = MSS). Now you short inside the gap it left behind (FVG). It's like a trap — price went up to fool people, now it dives down!",
  },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = "glossary" | "quiz" | "mentor";

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

function QuizView() {
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const q = QUIZ[current];
  const isCorrect = selected === q.answer;

  function handleSelect(idx: number) {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === q.answer) setScore((s) => s + 1);
  }

  function handleNext() {
    if (current < QUIZ.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
    } else {
      setDone(true);
    }
  }

  function handleReset() {
    setCurrent(0);
    setSelected(null);
    setScore(0);
    setDone(false);
  }

  if (done) {
    const pct = Math.round((score / QUIZ.length) * 100);
    return (
      <ScrollView contentContainerStyle={{ padding: 16, alignItems: "center", paddingBottom: 100 }}>
        <View style={quizStyles.resultCard}>
          <Text style={quizStyles.resultEmoji}>{pct >= 80 ? "🏆" : pct >= 60 ? "📈" : "📚"}</Text>
          <Text style={quizStyles.resultScore}>{score}/{QUIZ.length}</Text>
          <Text style={quizStyles.resultPct}>{pct}%</Text>
          <Text style={quizStyles.resultMsg}>
            {pct >= 80 ? "ICT Concept Master! You're ready to execute." : pct >= 60 ? "Good progress — review the glossary for weak spots." : "Keep studying — re-read the glossary then retry!"}
          </Text>
          <TouchableOpacity style={quizStyles.retryBtn} onPress={handleReset}>
            <Text style={quizStyles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <View style={quizStyles.progressRow}>
        <Text style={quizStyles.progressText}>Question {current + 1} of {QUIZ.length}</Text>
        <Text style={quizStyles.scoreText}>Score: {score}</Text>
      </View>
      <View style={quizStyles.progressBar}>
        <View style={[quizStyles.progressFill, { width: `${((current) / QUIZ.length) * 100}%` as any }]} />
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
            <Text style={quizStyles.nextBtnText}>{current < QUIZ.length - 1 ? "Next Question →" : "See Results"}</Text>
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

  const { data: conversations, refetch } = apiClient.useQuery("get", "/gemini/conversations");

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  async function startConversation() {
    try {
      const res = await apiClient.POST("/gemini/conversations", { body: { title: "NQ Session" } });
      if (res.data) {
        setConversationId(res.data.id);
        setMessages([{ role: "assistant", content: "I'm your ICT Trading Mentor. Ask me about FVGs, Liquidity Sweeps, Silver Bullet setups, or NQ Futures strategy." }]);
        refetch();
      }
    } catch {}
  }

  async function loadConversation(id: number) {
    setConversationId(id);
    try {
      const res = await apiClient.GET("/gemini/conversations/{id}", { params: { path: { id } } });
      if (res.data) {
        setMessages(res.data.messages.map((m: any) => ({ role: m.role, content: m.content })));
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
      await streamChat(conversationId, userMsg, (chunk) => {
        assistantMsg += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: assistantMsg };
          return updated;
        });
      });
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Connection error. Please try again." };
        return updated;
      });
    } finally {
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

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function AcademyScreen() {
  const [tab, setTab] = useState<Tab>("glossary");

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>ICT Academy</Text>
        <View style={styles.tabBar}>
          {(["glossary", "quiz", "mentor"] as Tab[]).map((t) => (
            <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
                {t === "glossary" ? "Glossary" : t === "quiz" ? "Quiz" : "Mentor"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={{ flex: 1 }}>
        {tab === "glossary" && <GlossaryView />}
        {tab === "quiz" && <QuizView />}
        {tab === "mentor" && <MentorView />}
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
  tipBox: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4 },
  tipLabel: { fontSize: 11, fontFamily: "Inter_700Bold", marginBottom: 4 },
  tipText: { fontSize: 13, color: C.textSecondary, lineHeight: 20 },
});

const quizStyles = StyleSheet.create({
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressText: { fontSize: 13, color: C.textSecondary },
  scoreText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.accent },
  progressBar: { height: 4, backgroundColor: C.cardBorder, borderRadius: 2, marginBottom: 16, overflow: "hidden" },
  progressFill: { height: "100%" as any, backgroundColor: C.accent, borderRadius: 2 },
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
