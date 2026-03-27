import { useState, useRef, useEffect } from "react";
import { Bot, X, Sparkles, MessageSquare, Plus, Loader2, ChevronDown, ArrowLeft, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getApiUrl, streamMessageWeb } from "./academyHooks";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Conversation {
  id: number;
  title: string;
}

export function MentorView() {
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
        const data: Conversation[] = await res.json();
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
        const data: Conversation = await res.json();
        setConversationId(data.id);
        setMessages([{ role: "assistant", content: "I'm your Trading Mentor. Ask me about FVGs, Liquidity Sweeps, Silver Bullet setups, or NQ Futures strategy." }]);
        fetchConversations();
      }
    } catch {}
  }

  async function loadConversation(id: number) {
    setConversationId(id);
    try {
      const res = await fetch(`${getApiUrl()}gemini/conversations/${id}`);
      if (res.ok) {
        const data: { messages?: { role: string; content: string }[] } = await res.json();
        setMessages(
          (data.messages || []).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
        );
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
          <MessageSquare className="h-10 w-10 text-primary" />
          <h3 className="text-xl font-bold mt-4 mb-2">ICT Mentor AI</h3>
          <p className="text-sm text-muted-foreground text-center max-w-sm leading-relaxed mb-6">
            Ask anything about ICT concepts, NQ setups, or trading psychology
          </p>
          <button
            className="flex items-center gap-2 bg-primary text-primary-foreground font-bold px-6 py-3 rounded-xl hover:opacity-90 transition-opacity"
            onClick={startConversation}
          >
            <Plus className="h-4 w-4" />
            New Conversation
          </button>
        </div>
        <div className="w-72 border-l p-4 overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Previous Sessions</p>
          {loadingConversations ? (
            <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
          ) : conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground/60">No previous sessions</p>
          ) : (
            <div className="space-y-2">
              {[...conversations].reverse().slice(0, 10).map((c) => (
                <button
                  key={c.id}
                  className="w-full flex items-center gap-2 bg-card rounded-xl p-3 border text-left hover:bg-secondary transition-colors"
                  onClick={() => loadConversation(c.id)}
                >
                  <span className="flex-1 text-sm truncate">{c.title}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0 -rotate-90" />
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
      <div className="p-3 border-b">
        <button
          className="flex items-center gap-1.5 text-primary text-sm hover:opacity-80 transition-opacity"
          onClick={() => { setConversationId(null); fetchConversations(); }}
        >
          <ArrowLeft className="h-4 w-4" />
          Sessions
        </button>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start gap-2"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                <span className="text-[10px] font-bold text-primary">ICT</span>
              </div>
            )}
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-card border rounded-bl-sm"
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {msg.content}
                {isStreaming && i === messages.length - 1 && msg.role === "assistant" ? "\u258B" : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t flex items-end gap-2">
        <textarea
          className="flex-1 bg-card border rounded-2xl px-4 py-2.5 text-sm placeholder-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring max-h-24"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your ICT mentor..."
          disabled={isStreaming}
          rows={1}
        />
        <button
          className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity disabled:opacity-40"
          onClick={sendMessage}
          disabled={!input.trim() || isStreaming}
        >
          {isStreaming ? <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" /> : <Send className="h-4 w-4 text-primary-foreground" />}
        </button>
      </div>
    </div>
  );
}

