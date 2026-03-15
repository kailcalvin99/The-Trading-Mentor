import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { getListTradesQueryKey } from "@workspace/api-client-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanner } from "@/contexts/PlannerContext";
import {
  Bot,
  Send,
  Loader2,
  X,
  Plus,
  ChevronDown,
  Trash2,
  MessageSquare,
  ArrowRight,
  CheckCircle2,
  Calculator,
  Navigation,
  BookOpen,
  Sparkles,
} from "lucide-react";

const CAPABILITY_TIPS = [
  { headline: "Navigate the app hands-free", examples: ["Take me to the Daily Planner", "Open my Smart Journal"] },
  { headline: "Log trades with your voice", examples: ["Log a win on NQ with 0.5% risk", "Record a loss on MNQ"] },
  { headline: "Check your performance instantly", examples: ["What's our win rate?", "Show me the team's recent trades"] },
  { headline: "Calculate position sizing", examples: ["I have a 12 point stop, how many NQ contracts?"] },
  { headline: "Learn ICT concepts simply", examples: ["Explain FVG in simple terms", "What is OTE?"] },
  { headline: "Complete your morning routine", examples: ["Mark my morning routine complete", "What's in my routine?"] },
  { headline: "Review your trading rules", examples: ["Remind me the 5 rules before I trade"] },
  { headline: "Get personalized coaching", examples: ["Review my trading discipline", "Am I following the rules?"] },
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
        {result.navigateTo && (
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

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const location = useLocation();
  const { user, tierLevel, isAdmin } = useAuth();
  const { routineConfig, toggleItem, isRoutineComplete, routineItems } = usePlanner();
  const qc = useQueryClient();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
    if (isOpen && isNewUser && chatMessages.length === 0 && !conversationId) {
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
          ? `Hey ${name}! 👋 I'm your ICT AI Trading Mentor. Here's what I can do for you:\n\n📚 **Teach ICT Concepts** — Ask me about FVGs, OTE, Kill Zones, MSS, liquidity sweeps, and more. I explain everything in simple language.\n\n🗺️ **Navigate the App** — Say "take me to the Daily Planner" or "open my journal" and I'll go there instantly.\n\n📝 **Log Trades** — Tell me "log a win on NQ" and I'll record it in your Smart Journal with all the details.\n\n📊 **Analyze Performance** — Ask "how's the team doing?" or "what's our win rate?" for an instant analytics summary.\n\n📐 **Calculate Position Size** — Say "I have a 10 point stop, how many contracts?" and I'll calculate NQ/MNQ sizing.\n\n✅ **Complete Your Morning Routine** — Tell me "mark my morning routine done" and I'll check off your planner items.\n\n💡 **Coach You on Rules** — I'll remind you of the 5 trading rules whenever relevant and give feedback on discipline.\n\nWhat would you like to start with?`
          : `Hey ${name}! I'm your trading assistant. Ask me anything about ICT concepts, or tell me to log a trade, check your analytics, calculate position sizes, or navigate the app. What can I help with?`;
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

  async function sendMessage() {
    if (!input.trim() || isStreaming) return;
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
      <div className="hidden md:flex items-center gap-2 h-10 px-3 bg-card/50 border border-border rounded-xl cursor-pointer hover:bg-card transition-colors flex-1 max-w-md relative"
        onClick={() => { setIsOpen(true); }}
      >
        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
        <span className="text-sm text-muted-foreground truncate">Ask AI anything...</span>
        <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground ml-auto shrink-0">
          AI
        </kbd>
        {isNewUser && (
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
          </span>
        )}
      </div>

      <div className="md:hidden fixed bottom-20 right-4 z-50" style={{ marginBottom: "env(safe-area-inset-bottom, 0px)" }}>
        {showTip && !isOpen && (
          <div className="absolute bottom-14 right-0 w-64 bg-card border border-border rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
        <button
          className="w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-xl flex items-center justify-center hover:opacity-90 transition-opacity relative"
          onClick={() => setIsOpen(true)}
        >
          <Bot className="h-5 w-5" />
          {isNewUser && (
            <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-primary" />
            </span>
          )}
        </button>
      </div>

      {showTip && !isOpen && (
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
                      <h3 className="text-lg font-bold mb-1">AI Trading Assistant</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Ask me anything about ICT concepts, log trades, check analytics, or navigate the app.
                      </p>
                      <div className="grid gap-2 w-full max-w-xs">
                        {[
                          "How did I do this week?",
                          "Calculate my position size for 10 tick stop",
                          "Mark my morning routine done",
                          "What is a Fair Value Gap?",
                        ].map(suggestion => (
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

                  {chatMessages.map((msg, i) => (
                    <div key={i}>
                      <div className={`flex ${msg.role === "user" ? "justify-end" : "justify-start gap-2"}`}>
                        {msg.role === "assistant" && (
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                            <Sparkles className="h-3 w-3 text-primary" />
                          </div>
                        )}
                        <div
                          className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-card border rounded-bl-sm"
                          }`}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {msg.content}
                            {isStreaming && i === chatMessages.length - 1 && msg.role === "assistant" ? "\u258B" : ""}
                          </p>
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
                  ))}
                </div>

                <div className="p-3 border-t border-border shrink-0">
                  <div className="flex items-center gap-2">
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
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
