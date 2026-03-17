import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getListTradesQueryKey, useGetPropAccount } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanner } from "@/contexts/PlannerContext";
import { useAITrigger, type AITrigger } from "@/hooks/useAITrigger";
import {
  Bot,
  Send,
  Loader2,
  X,
  Plus,
  Trash2,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Calculator,
  Navigation,
  BookOpen,
  Sparkles,
  TrendingUp,
  Clock,
  Target,
  Wind,
  Waves,
  Brain,
} from "lucide-react";

const CAPABILITY_TIPS = [
  { headline: "Run the 5-step trade review", examples: ["Review my last trade (5-step)", "Did my setup have a valid sweep?"] },
  { headline: "Check your kill zone timing", examples: ["Am I in a kill zone right now?", "When is the next NY kill zone?"] },
  { headline: "Understand your emotional leaks", examples: ["What are my emotional leaks?", "Show me my psychology report"] },
  { headline: "Learn ICT concepts simply", examples: ["Explain FVG like I'm in 6th grade", "What is OTE?"] },
  { headline: "Reset when you're emotional", examples: ["Give me a cool-down exercise", "Help me stop revenge trading"] },
  { headline: "Calculate position sizing", examples: ["I have a 12 point stop, how many NQ contracts?"] },
  { headline: "Log trades effortlessly", examples: ["Log a win on NQ with 0.5% risk", "Record a loss on MNQ"] },
  { headline: "Complete your morning routine", examples: ["Mark my morning routine complete", "What's in my routine?"] },
];

const WELCOME_SUGGESTIONS = [
  "Review my last trade (5-step)",
  "Am I in a kill zone right now?",
  "What are my emotional leaks?",
  "Explain FVG like I'm in 6th grade",
  "Give me a cool-down exercise",
];

const TIP_INTERVAL_MS = 2 * 60 * 60 * 1000;

const API_BASE = import.meta.env.VITE_API_URL || "/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallResult[];
}

interface ToolCallResult {
  name: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

interface Conversation {
  id: number;
  title: string;
}

function parseConfidenceBadge(content: string): { score: number | null; cleanContent: string } {
  const match = content.match(/^Confidence:\s*(\d+)\/10[^\n]*\n?/i);
  if (!match) return { score: null, cleanContent: content };
  const score = parseInt(match[1], 10);
  if (score < 1 || score > 10) return { score: null, cleanContent: content };
  return { score, cleanContent: content.slice(match[0].length).trimStart() };
}

const FIVE_STEP_DEFS = [
  { label: "HTF Bias", icon: TrendingUp, re: /\bHTF\s+Bias\b/i },
  { label: "Timing", icon: Clock, re: /\bTiming\b/i },
  { label: "The Sweep", icon: Waves, re: /\bSweep\b/i },
  { label: "The Displacement", icon: Target, re: /\bDisplacement\b/i },
  { label: "Risk Math", icon: Calculator, re: /\bRisk\s+Math\b/i },
];

function parseFiveStepReview(content: string): Array<{ label: string; Icon: typeof TrendingUp; body: string }> {
  const lines = content.split("\n");
  const found: Array<{ label: string; Icon: typeof TrendingUp; lineIndex: number }> = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length > 120) continue;
    for (const def of FIVE_STEP_DEFS) {
      if (def.re.test(line)) {
        if (!found.some(f => f.label === def.label)) {
          found.push({ label: def.label, Icon: def.icon, lineIndex: i });
        }
        break;
      }
    }
  }
  if (found.length < 3) return [];
  return found.map((step, idx) => {
    const start = step.lineIndex + 1;
    const end = idx + 1 < found.length ? found[idx + 1].lineIndex : lines.length;
    const body = lines.slice(start, end).join("\n").replace(/\*\*/g, "").trim();
    return { label: step.label, Icon: step.Icon, body };
  });
}

const COOLDOWN_RES = [/COOL[\s-]DOWN/i, /take\s+a\s+(deep\s+)?breath/i, /step\s+away/i, /🧘/];

function splitCoolDownContent(content: string): { before: string; coolDown: string | null } {
  for (const re of COOLDOWN_RES) {
    const match = content.match(re);
    if (match && match.index !== undefined) {
      const splitIdx = match.index;
      const lineStart = content.lastIndexOf("\n", splitIdx - 1);
      const actualSplit = lineStart === -1 ? splitIdx : lineStart;
      const before = content.slice(0, actualSplit).trim();
      const coolDown = content.slice(actualSplit).trim();
      if (coolDown.length > 20) return { before, coolDown };
    }
  }
  return { before: content, coolDown: null };
}

function getQuickReplies(lastMessage: string): string[] {
  const msg = lastMessage.toLowerCase();
  const steps = parseFiveStepReview(lastMessage);
  if (steps.length >= 3) return ["Log this trade", "Run 5-step again", "What's my risk math?"];
  if (msg.includes("kill zone") || msg.includes("killzone") || msg.includes("session"))
    return ["When's the next kill zone?", "What's the bias today?", "Review my last trade"];
  if (msg.includes("fomo") || msg.includes("emotional leak") || msg.includes("psychology") || msg.includes("behavior tag"))
    return ["Show full psychology report", "Give me a cool-down", "What was my best week?"];
  if (COOLDOWN_RES.some(r => r.test(lastMessage)))
    return ["I'm feeling better now", "What's my trading plan?", "Review my journal"];
  if (msg.includes("position size") || (msg.includes("contract") && msg.includes("risk")))
    return ["Recalculate with 2% risk", "Go to Risk Shield", "Log this trade"];
  if (msg.includes("fvg") || msg.includes("order block") || msg.includes("ote") || msg.includes("liquidity"))
    return ["Explain OTE", "What are kill zones?", "Show me a setup example"];
  return ["Review my last trade (5-step)", "Am I in a kill zone?", "What are my emotional leaks?"];
}

function ConfidenceBadge({ score }: { score: number }) {
  const colour =
    score >= 8
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : score >= 5
        ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
        : "bg-red-500/15 text-red-400 border-red-500/30";
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full border ${colour} mb-1.5 select-none`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
      Confidence {score}/10
    </span>
  );
}

function FiveStepReviewCard({ steps, streaming }: { steps: Array<{ label: string; Icon: typeof TrendingUp; body: string }>; streaming?: boolean }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden my-1">
      <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border-b border-border">
        <Brain className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-[11px] font-bold text-primary uppercase tracking-wider">5-Step Trade Review</span>
      </div>
      <div className="divide-y divide-border">
        {steps.map((step, i) => (
          <div key={i} className="flex gap-2.5 px-3 py-2.5">
            <div className="flex items-start gap-1.5 shrink-0 pt-0.5">
              <span className="text-[10px] font-bold text-muted-foreground w-3">{i + 1}.</span>
              <step.Icon className="h-3.5 w-3.5 text-primary shrink-0" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-foreground mb-0.5">{step.label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                {step.body || (streaming ? "…" : "—")}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CoolDownCard({ content }: { content: string }) {
  const cleaned = content.replace(/\*\*/g, "").replace(/^#+\s*/gm, "").trim();
  return (
    <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 overflow-hidden my-1">
      <div className="flex items-center gap-2 px-3 py-2 bg-teal-500/10 border-b border-teal-500/20">
        <Wind className="h-3.5 w-3.5 text-teal-400 shrink-0" />
        <span className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">Cool-Down Mode</span>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-xs text-teal-100/80 leading-relaxed whitespace-pre-wrap">{cleaned}</p>
      </div>
    </div>
  );
}

function getPageName(pathname: string): string {
  const map: Record<string, string> = {
    "/": "ICT Academy",
    "/planner": "Daily Planner",
    "/risk-shield": "Risk Shield",
    "/journal": "Smart Journal",
    "/analytics": "Analytics",
    "/pricing": "Pricing",
    "/admin": "Admin Dashboard",
    "/welcome": "Welcome",
    "/dashboard": "Dashboard",
    "/community": "Community",
  };
  return map[pathname] || "Unknown Page";
}

function ToolCallCard({ toolCall, onConfirm, onNavigate }: {
  toolCall: ToolCallResult;
  onConfirm?: (toolCall: ToolCallResult) => void;
  onNavigate?: (path: string) => void;
}) {
  const result = toolCall.result;

  if (result.action === "navigate") {
    return (
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 my-2">
        <div className="flex items-center gap-2 mb-2">
          <Navigation className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-primary uppercase">Navigate</span>
        </div>
        <p className="text-sm mb-2">Go to <strong>{result.page as string}</strong></p>
        <button
          onClick={() => onNavigate?.(result.path as string)}
          className="flex items-center gap-1.5 bg-primary text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
        >
          <ArrowRight className="h-3 w-3" />
          Go Now
        </button>
      </div>
    );
  }

  if (result.action === "log_trade" && result.requiresConfirmation) {
    const trade = result.tradeData as Record<string, unknown>;
    return (
      <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 my-2">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-4 w-4 text-amber-500" />
          <span className="text-xs font-bold text-amber-500 uppercase">Log Trade</span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs mb-2">
          <div><span className="text-muted-foreground">Pair:</span> <strong>{trade.pair as string}</strong></div>
          <div><span className="text-muted-foreground">Outcome:</span> <strong>{trade.outcome as string}</strong></div>
          <div><span className="text-muted-foreground">Risk:</span> <strong>{trade.riskPct as number}%</strong></div>
          <div><span className="text-muted-foreground">Side:</span> <strong>{trade.sideDirection as string}</strong></div>
        </div>
        <button
          onClick={() => onConfirm?.(toolCall)}
          className="flex items-center gap-1.5 bg-amber-500 text-black px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
        >
          <CheckCircle2 className="h-3 w-3" />
          Confirm & Submit
        </button>
      </div>
    );
  }

  if (result.action === "position_size") {
    const calc = result.calculation as Record<string, unknown>;
    return (
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 my-2">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="h-4 w-4 text-emerald-500" />
          <span className="text-xs font-bold text-emerald-500 uppercase">Position Size</span>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs mb-2">
          <div><span className="text-muted-foreground">Balance:</span> <strong>${(calc.accountBalance as number).toLocaleString()}</strong></div>
          <div><span className="text-muted-foreground">Risk:</span> <strong>${(calc.riskAmount as number).toFixed(2)}</strong></div>
          <div><span className="text-muted-foreground">NQ:</span> <strong>{calc.nqContractsRounded as number} contracts</strong></div>
          <div><span className="text-muted-foreground">MNQ:</span> <strong>{calc.mnqContractsRounded as number} contracts</strong></div>
        </div>
        {!!result.navigateTo && (
          <button
            onClick={() => onNavigate?.(result.navigateTo as string)}
            className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold hover:underline"
          >
            <ArrowRight className="h-3 w-3" />
            Go to Risk Shield
          </button>
        )}
      </div>
    );
  }

  if (result.action === "complete_planner" && result.requiresConfirmation) {
    return (
      <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 my-2">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-4 w-4 text-blue-500" />
          <span className="text-xs font-bold text-blue-500 uppercase">Complete Routine</span>
        </div>
        <p className="text-sm mb-2">{result.confirmMessage as string}</p>
        <button
          onClick={() => onConfirm?.(toolCall)}
          className="flex items-center gap-1.5 bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 transition-opacity"
        >
          <CheckCircle2 className="h-3 w-3" />
          Confirm
        </button>
      </div>
    );
  }

  return null;
}

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [isNewUser, setIsNewUser] = useState(() => !localStorage.getItem("ict-ai-welcomed"));
  const [showTip, setShowTip] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [nudge, setNudge] = useState<AITrigger | null>(null);
  const [nudgeExpanded, setNudgeExpanded] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAutoSendRef = useRef<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, tierLevel, isAdmin } = useAuth();
  const { routineConfig, toggleItem, isRoutineComplete, routineItems } = usePlanner();
  const qc = useQueryClient();

  const { data: propAccount } = useGetPropAccount();
  const startingBalance = propAccount?.startingBalance ?? 0;
  const dailyLoss = propAccount?.dailyLoss ?? 0;
  const maxDailyLoss = propAccount?.maxDailyLossPct ?? 2;
  const dailyLossPct = startingBalance > 0 ? (dailyLoss / startingBalance) * 100 : 0;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (isOpen && pendingAutoSendRef.current) {
      const msgToSend = pendingAutoSendRef.current;
      pendingAutoSendRef.current = null;
      (async () => {
        if (conversationId) {
          await sendMessageToConversation(msgToSend, conversationId);
        } else {
          const newId = await startConversation();
          if (newId) {
            await sendMessageToConversation(msgToSend, newId);
          }
        }
      })();
    } else if (isOpen && isNewUser && chatMessages.length === 0 && !conversationId) {
      startConversation();
    }
  }, [isOpen]);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/gemini/conversations`, { credentials: "include" });
      if (res.ok) {
        const data: Conversation[] = await res.json();
        setConversations(data || []);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (isOpen) fetchConversations();
  }, [isOpen, fetchConversations]);

  useEffect(() => {
    if (isNewUser) return;
    function checkTip() {
      setShowTip(prev => {
        if (prev) return prev;
        const lastTip = localStorage.getItem("ict-ai-tip-last");
        const parsed = lastTip ? parseInt(lastTip, 10) : 0;
        const ts = Number.isFinite(parsed) ? parsed : 0;
        const elapsed = Date.now() - ts;
        if (elapsed >= TIP_INTERVAL_MS) {
          setTipIndex(Math.floor(Math.random() * CAPABILITY_TIPS.length));
          return true;
        }
        return false;
      });
    }
    checkTip();
    const interval = setInterval(checkTip, 60_000);
    return () => clearInterval(interval);
  }, [isNewUser]);

  const autoOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleAITrigger = useCallback((trigger: AITrigger) => {
    if (isOpen) return;
    setNudge(trigger);
    setNudgeExpanded(true);
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = setTimeout(() => {
      setNudgeExpanded(false);
      nudgeTimerRef.current = setTimeout(() => setNudge(null), 400);
    }, 6000);
    if (trigger.autoOpen) {
      if (autoOpenTimerRef.current) clearTimeout(autoOpenTimerRef.current);
      autoOpenTimerRef.current = setTimeout(() => {
        setIsOpen(true);
        if (trigger.prefillPrompt) {
          if (trigger.autoSend) {
            pendingAutoSendRef.current = trigger.prefillPrompt;
          } else {
            setInput(trigger.prefillPrompt);
          }
        }
        setNudge(null);
        setNudgeExpanded(false);
      }, 800);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
      if (autoOpenTimerRef.current) clearTimeout(autoOpenTimerRef.current);
    };
  }, []);

  useAITrigger({ dailyLossPct, maxDailyLoss, onTrigger: handleAITrigger });

  function dismissNudge() {
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    if (autoOpenTimerRef.current) clearTimeout(autoOpenTimerRef.current);
    setNudgeExpanded(false);
    nudgeTimerRef.current = setTimeout(() => setNudge(null), 400);
  }

  function openFromNudge() {
    dismissNudge();
    if (nudge?.prefillPrompt) setInput(nudge.prefillPrompt);
    setIsOpen(true);
  }

  async function startConversation(): Promise<number | null> {
    try {
      const res = await fetch(`${API_BASE}/gemini/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: "AI Assistant" }),
      });
      if (res.ok) {
        const data: Conversation = await res.json();
        setConversationId(data.id);
        const name = user?.name || "there";
        const welcomeContent = isNewUser
          ? `Welcome to the Inner Circle, ${name}. 🔑 You've just gained access to something most traders never find — a private AI mentor built exclusively for ICT methodology.\n\nOnly a select few traders learn what you're about to discover. Here's what's now at your fingertips:\n\n📚 **Master ICT Concepts** — FVGs, OTE, Kill Zones, MSS, liquidity sweeps — I break down the strategies that separate the elite from the crowd.\n\n🗺️ **Instant Navigation** — Say "take me to the Daily Planner" or "open my journal" and I'll take you there immediately.\n\n📝 **Log Trades Effortlessly** — Tell me "log a win on NQ" and I'll capture every detail in your Smart Journal.\n\n📊 **Elite Performance Analytics** — Ask "how's the team doing?" or "what's our win rate?" for an insider-level breakdown.\n\n📐 **Precision Position Sizing** — Say "I have a 10 point stop, how many contracts?" and I'll calculate your exact NQ/MNQ sizing.\n\n✅ **Morning Routine Mastery** — Tell me "mark my morning routine done" and I'll keep your discipline on track.\n\n💡 **Personal Trading Coach** — I'll hold you accountable to the 5 trading rules and give you the kind of feedback most traders pay thousands for.\n\nYou're in. Let's get to work — what would you like to start with?`
          : `Welcome back to the circle, ${name}. 🔑 Your mentor is ready. Ask me anything about ICT concepts, log a trade, check your analytics, size a position, or navigate the app. What are we working on today?`;
        setChatMessages([{ role: "assistant", content: welcomeContent }]);
        if (isNewUser) {
          localStorage.setItem("ict-ai-welcomed", "1");
          localStorage.setItem("ict-ai-tip-last", String(Date.now()));
          setIsNewUser(false);
        }
        setShowHistory(false);
        fetchConversations();
        return data.id;
      }
    } catch {}
    return null;
  }

  async function loadConversation(id: number) {
    setConversationId(id);
    try {
      const res = await fetch(`${API_BASE}/gemini/conversations/${id}`, { credentials: "include" });
      if (res.ok) {
        const data: { messages?: { role: string; content: string }[] } = await res.json();
        setChatMessages(
          (data.messages || []).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
        );
      }
    } catch {}
    setShowHistory(false);
  }

  async function deleteConversation(id: number) {
    try {
      await fetch(`${API_BASE}/gemini/conversations/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (conversationId === id) {
        setConversationId(null);
        setChatMessages([]);
      }
      fetchConversations();
    } catch {}
  }

  async function handleConfirmToolCall(toolCall: ToolCallResult) {
    const result = toolCall.result;

    if (result.action === "log_trade") {
      const trade = result.tradeData as Record<string, string | number>;
      try {
        const res = await fetch(`${API_BASE}/trades/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            pair: trade.pair,
            outcome: trade.outcome,
            riskPct: trade.riskPct || 0.5,
            entryTime: trade.entryTime || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
            notes: trade.notes || `[Conservative]`,
            sideDirection: trade.sideDirection || "BUY",
            behaviorTag: trade.behaviorTag || "",
            liquiditySweep: false,
            isDraft: false,
          }),
        });
        if (res.ok) {
          qc.invalidateQueries({ queryKey: getListTradesQueryKey() });
          setChatMessages(prev => [...prev, {
            role: "assistant",
            content: `Trade logged successfully! ${trade.pair} ${trade.outcome} has been saved to your journal.`,
          }]);
        }
      } catch {
        setChatMessages(prev => [...prev, {
          role: "assistant",
          content: "Sorry, there was an error logging that trade. Please try again.",
        }]);
      }
    }

    if (result.action === "complete_planner") {
      if (result.markAll) {
        routineConfig.forEach(item => {
          if (!routineItems[item.key]) {
            toggleItem(item.key);
          }
        });
      } else {
        const items = result.items as string[];
        items.forEach(key => {
          if (!routineItems[key]) {
            toggleItem(key);
          }
        });
      }
      setChatMessages(prev => [...prev, {
        role: "assistant",
        content: "Done! Your morning routine items have been marked as complete.",
      }]);
    }
  }

  function handleNavigate(path: string) {
    navigate(path);
    setIsOpen(false);
  }

  const FREE_DAILY_QUESTION_LIMIT = 3;
  const AI_MENTOR_USAGE_KEY = "ict-ai-mentor-usage";

  function getDailyUsage(): { date: string; count: number } {
    try {
      const raw = localStorage.getItem(AI_MENTOR_USAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { date: "", count: 0 };
  }

  function incrementDailyUsage(): number {
    const today = new Date().toDateString();
    const usage = getDailyUsage();
    const newCount = usage.date === today ? usage.count + 1 : 1;
    localStorage.setItem(AI_MENTOR_USAGE_KEY, JSON.stringify({ date: today, count: newCount }));
    return newCount;
  }

  function getRemainingQuestions(): number {
    if (tierLevel >= 1) return Infinity;
    const today = new Date().toDateString();
    const usage = getDailyUsage();
    if (usage.date !== today) return FREE_DAILY_QUESTION_LIMIT;
    return Math.max(0, FREE_DAILY_QUESTION_LIMIT - usage.count);
  }

  async function sendMessage() {
    if (!input.trim() || isStreaming) return;

    if (tierLevel < 1) {
      const remaining = getRemainingQuestions();
      if (remaining <= 0) {
        setChatMessages(prev => [...prev, {
          role: "assistant",
          content: `You've reached your daily limit of ${FREE_DAILY_QUESTION_LIMIT} questions on the free plan. Upgrade to Standard or Premium for unlimited AI Mentor access! [Go to Pricing](/pricing)`,
          toolCalls: [],
        }]);
        return;
      }
      incrementDailyUsage();
    }

    const userMsg = input.trim();
    setInput("");

    if (!conversationId) {
      const newId = await startConversation();
      if (!newId) return;
      await sendMessageToConversation(userMsg, newId);
      return;
    }

    await sendMessageToConversation(userMsg);
  }

  async function sendMessageToConversation(userMsg: string, convId?: number) {
    const targetId = convId || conversationId;
    if (!targetId) return;

    setChatMessages(prev => [...prev, { role: "user", content: userMsg }]);
    setIsStreaming(true);
    setQuickReplies([]);

    let assistantMsg = "";
    let toolCalls: ToolCallResult[] = [];
    setChatMessages(prev => [...prev, { role: "assistant", content: "", toolCalls: [] }]);

    const pageData: Record<string, unknown> = {};
    const pagePath = location.pathname.replace(/^\/web/, "");
    if (pagePath.includes("journal") || pagePath.includes("analytics")) {
      pageData.hint = "User is on a trading-related page. Use get_journal_entries or get_analytics_summary tools to provide relevant data.";
    } else if (pagePath.includes("risk") || pagePath.includes("tracker")) {
      pageData.hint = "User is on the Risk Shield page. Use calculate_position_size if they ask about sizing.";
    } else if (pagePath.includes("planner") || pagePath === "/") {
      pageData.hint = "User is on the Daily Planner. Use complete_planner_items if they want to mark items done.";
      pageData.routineComplete = isRoutineComplete;
    }

    const pageContext = {
      currentPage: getPageName(location.pathname),
      route: location.pathname,
      userName: user?.name,
      tierLevel,
      isAdmin,
      isRoutineComplete,
      pageData,
    };

    try {
      const response = await fetch(`${API_BASE}/gemini/conversations/${targetId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ content: userMsg, pageContext }),
      });

      if (response.status === 429) {
        const errorData = await response.json().catch(() => ({}));
        const limitMsg = errorData.message || "Daily AI Mentor limit reached. Upgrade to remove limits.";
        setChatMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: `⚠️ ${limitMsg}`,
            toolCalls: [],
          };
          return updated;
        });
        setIsStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(trimmed.slice(6));
            if (parsed.content) {
              assistantMsg += parsed.content;
              setChatMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantMsg, toolCalls };
                return updated;
              });
            }
            if (parsed.toolCall) {
              toolCalls = [...toolCalls, parsed.toolCall];
              setChatMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantMsg, toolCalls };
                return updated;
              });
            }
            if (parsed.done) break;
            if (parsed.error) {
              assistantMsg = "Sorry, I encountered an error. Please try again.";
              setChatMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: assistantMsg };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch {
      setChatMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Connection error. Please try again." };
        return updated;
      });
    }

    if (assistantMsg) setQuickReplies(getQuickReplies(assistantMsg));
    setIsStreaming(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function dismissTip() {
    setShowTip(false);
    localStorage.setItem("ict-ai-tip-last", String(Date.now()));
  }

  function handleTryIt() {
    dismissTip();
    setIsOpen(true);
  }

  const currentTip = CAPABILITY_TIPS[tipIndex];

  return (
    <>
      <div
        className={`hidden md:flex items-center gap-2 h-9 px-3 border rounded-xl cursor-pointer transition-all duration-300 flex-1 max-w-md relative ${
          nudgeExpanded && nudge
            ? "bg-primary/10 border-primary/40 shadow-sm"
            : "bg-card/30 border-border/50 opacity-60 hover:opacity-100 hover:bg-card"
        }`}
        onClick={() => { setIsOpen(true); }}
      >
        <Sparkles className={`h-3.5 w-3.5 shrink-0 transition-colors ${nudgeExpanded && nudge ? "text-primary" : "text-muted-foreground"}`} />
        <span className="text-sm text-muted-foreground truncate">
          {nudgeExpanded && nudge ? nudge.message : "Ask AI anything..."}
        </span>
        {nudgeExpanded && nudge ? (
          <button
            onClick={(e) => { e.stopPropagation(); dismissNudge(); }}
            className="ml-auto text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : (
          <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground ml-auto shrink-0">
            AI
          </kbd>
        )}
        {isNewUser && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </span>
        )}
      </div>

      <div className="md:hidden fixed bottom-20 right-3 z-50" style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {nudge && !isOpen && (
          <div className={`absolute bottom-12 right-0 w-60 bg-card border border-primary/30 rounded-xl shadow-2xl p-3 transition-all duration-300 ${nudgeExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
            <button onClick={dismissNudge} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold text-primary">AI Coach</span>
            </div>
            <p className="text-xs text-foreground pr-4">{nudge.message}</p>
            <button onClick={openFromNudge} className="mt-2 text-xs text-primary font-bold hover:underline">
              Open AI →
            </button>
          </div>
        )}
        {showTip && !isOpen && !nudge && (
          <div className="absolute bottom-12 right-0 w-60 bg-card border border-border rounded-xl shadow-2xl p-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <button onClick={dismissTip} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-center gap-2 mb-1.5">
              <Bot className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold text-primary">Tip</span>
            </div>
            <p className="text-xs font-medium text-foreground mb-1.5">{currentTip.headline}</p>
            <button onClick={handleTryIt} className="w-full bg-primary text-primary-foreground text-xs font-bold py-1.5 rounded-lg hover:opacity-90 transition-opacity">
              Try it
            </button>
          </div>
        )}
        <button
          className={`flex items-center gap-1.5 rounded-full bg-primary/90 text-primary-foreground shadow-lg transition-all duration-300 hover:opacity-90 relative ${nudgeExpanded ? "px-3 py-2" : "w-8 h-8 justify-center"}`}
          onClick={() => setIsOpen(true)}
        >
          <Sparkles className="h-3.5 w-3.5 shrink-0" />
          {nudgeExpanded && <span className="text-xs font-semibold whitespace-nowrap">AI</span>}
          {isNewUser && (
            <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-foreground opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary-foreground" />
            </span>
          )}
        </button>
      </div>

      {nudge && !isOpen && (
        <div className={`hidden md:block fixed bottom-4 right-4 z-40 w-72 bg-card border border-primary/30 rounded-xl shadow-2xl p-4 transition-all duration-300 ${nudgeExpanded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"}`}>
          <button onClick={dismissNudge} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold text-primary">AI Coach</span>
          </div>
          <p className="text-sm text-foreground">{nudge.message}</p>
          <button onClick={openFromNudge} className="mt-2 text-xs text-primary font-bold hover:underline">
            Open AI →
          </button>
        </div>
      )}

      {showTip && !isOpen && !nudge && (
        <div className="hidden md:block fixed bottom-4 right-4 z-40 w-72 bg-card border border-border rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <button onClick={dismissTip} className="absolute top-2 right-2 text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
              <Bot className="h-3 w-3 text-primary" />
            </div>
            <span className="text-xs font-bold text-primary">💡 Did you know?</span>
          </div>
          <p className="text-sm font-medium text-foreground mb-2">{currentTip.headline}</p>
          <div className="space-y-1 mb-3">
            {currentTip.examples.map((ex, i) => (
              <p key={i} className="text-xs text-muted-foreground italic">"{ex}"</p>
            ))}
          </div>
          <button onClick={handleTryIt} className="w-full bg-primary text-primary-foreground text-xs font-bold py-1.5 rounded-lg hover:opacity-90 transition-opacity">
            Try it
          </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsOpen(false)} />

          <div className="relative ml-auto w-full max-w-md bg-background border-l border-border flex flex-col h-full animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                  <h3 className="text-sm font-bold">AI Assistant</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {getPageName(location.pathname)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                  title="Chat history"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { setConversationId(null); setChatMessages([]); startConversation(); }}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                  title="New conversation"
                >
                  <Plus className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {showHistory ? (
              <div className="flex-1 overflow-y-auto p-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">Previous Conversations</h4>
                {conversations.length === 0 ? (
                  <p className="text-xs text-muted-foreground/60 text-center py-8">No conversations yet</p>
                ) : (
                  <div className="space-y-1">
                    {[...conversations].reverse().slice(0, 20).map(c => (
                      <div
                        key={c.id}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors group ${
                          conversationId === c.id ? "bg-primary/10 text-primary" : "hover:bg-secondary"
                        }`}
                      >
                        <button
                          className="flex-1 text-left text-sm truncate"
                          onClick={() => loadConversation(c.id)}
                        >
                          {c.title}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }}
                          className="p-1 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                  {chatMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center px-6">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                        <Sparkles className="h-6 w-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-bold mb-1">ICT AI Trading Mentor</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Trade reviews, kill zones, emotional leaks, ICT concepts — ask me anything.
                      </p>
                      <div className="grid gap-2 w-full max-w-xs">
                        {WELCOME_SUGGESTIONS.map(suggestion => (
                          <button
                            key={suggestion}
                            onClick={() => { setInput(suggestion); }}
                            className="text-left text-xs bg-secondary hover:bg-secondary/80 rounded-lg px-3 py-2 text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {chatMessages.map((msg, i) => {
                    const isCurrentlyStreaming = isStreaming && i === chatMessages.length - 1 && msg.role === "assistant";
                    const isAssistant = msg.role === "assistant";

                    const { score: confScore, cleanContent } = isAssistant
                      ? parseConfidenceBadge(msg.content)
                      : { score: null, cleanContent: msg.content };

                    const stepsResolved = isAssistant && !isCurrentlyStreaming
                      ? parseFiveStepReview(cleanContent)
                      : [];
                    const is5Step = stepsResolved.length >= 3;

                    const { before: beforeCool, coolDown } = isAssistant && !isCurrentlyStreaming && !is5Step
                      ? splitCoolDownContent(cleanContent)
                      : { before: cleanContent, coolDown: null };

                    const displayText = is5Step ? "" : beforeCool;

                    return (
                      <div key={i}>
                        <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start gap-2"}`}>
                          {isAssistant && (
                            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                              <Sparkles className="h-3 w-3 text-primary" />
                            </div>
                          )}
                          <div
                            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                : "bg-card border rounded-bl-sm"
                            }`}
                          >
                            {confScore !== null && <ConfidenceBadge score={confScore} />}
                            {isCurrentlyStreaming ? (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {cleanContent}{"\u258B"}
                              </p>
                            ) : is5Step ? (
                              <FiveStepReviewCard steps={stepsResolved} />
                            ) : (
                              <>
                                {displayText.length > 0 && (
                                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayText}</p>
                                )}
                                {coolDown && <CoolDownCard content={coolDown} />}
                              </>
                            )}
                          </div>
                        </div>

                        {msg.toolCalls?.map((tc, j) => (
                          <div key={j} className="ml-8">
                            <ToolCallCard
                              toolCall={tc}
                              onConfirm={handleConfirmToolCall}
                              onNavigate={handleNavigate}
                            />
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-border shrink-0">
                  {quickReplies.length > 0 && !isStreaming && (
                    <div className="flex gap-1.5 px-3 pt-2 pb-0 overflow-x-auto scrollbar-none">
                      {quickReplies.map(chip => (
                        <button
                          key={chip}
                          onClick={() => {
                            setInput(chip);
                            setQuickReplies([]);
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                          className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors whitespace-nowrap"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2 p-3">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask anything..."
                      disabled={isStreaming}
                      className="flex-1 bg-card border border-border rounded-xl px-3.5 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!input.trim() || isStreaming}
                      className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                      {isStreaming ? (
                        <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
                      ) : (
                        <Send className="h-4 w-4 text-primary-foreground" />
                      )}
                    </button>
                  </div>
                  {quickReplies.length > 0 && !isStreaming && (
                    <div className="flex gap-1.5 px-3 pb-3 overflow-x-auto scrollbar-none">
                      {quickReplies.map(chip => (
                        <button
                          key={chip}
                          onClick={() => {
                            setInput(chip);
                            setQuickReplies([]);
                            setTimeout(() => inputRef.current?.focus(), 0);
                          }}
                          className="shrink-0 text-[11px] font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors whitespace-nowrap"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
