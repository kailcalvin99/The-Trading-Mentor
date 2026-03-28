import { useState, useRef, useEffect } from "react";
import {
  Loader2, Send, Brain, BarChart3, Copy, Target, Filter, FileText,
  Sparkles, Save, RefreshCw, Clock, Check,
} from "lucide-react";
import { API_BASE, authHeaders } from "./adminUtils";

export function AdminAIPanel({ settings, updateSetting, saveSettings, saving }: {
  settings: Record<string, string>;
  updateSetting: (key: string, value: string) => void;
  saveSettings: () => Promise<void>;
  saving: boolean;
}) {
  const [adminMessages, setAdminMessages] = useState<{ role: string; content: string }[]>([]);
  const [adminInput, setAdminInput] = useState("");
  const [adminStreaming, setAdminStreaming] = useState(false);
  const [adminConvId, setAdminConvId] = useState<number | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryText, setSummaryText] = useState("");
  const [draftPromptLoading, setDraftPromptLoading] = useState(false);
  const [draftPrompt, setDraftPrompt] = useState("");
  const [psychData, setPsychData] = useState<{
    allTime: { counts: Record<string, number>; total: number };
    week: { counts: Record<string, number>; total: number };
    killZoneCompliance: { allTime: number | null; week: number | null; allTimeParsed: number; weekParsed: number };
    topWeekLeak: { tag: string; count: number } | null;
  } | null>(null);
  const [psychLoading, setPsychLoading] = useState(false);
  const [psychView, setPsychView] = useState<"week" | "alltime">("week");
  const [reengageLoading, setReengageLoading] = useState(false);
  const [reengageDraft, setReengageDraft] = useState("");
  const [reengageCopied, setReengageCopied] = useState(false);
  const [aiLeakInsight, setAiLeakInsight] = useState<string | null>(null);
  const [leakInsightLoading, setLeakInsightLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fetchOpts: RequestInit = { credentials: "include" };
  const headers = { "Content-Type": "application/json", ...authHeaders() };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [adminMessages]);

  async function ensureConversation(): Promise<number> {
    if (adminConvId) return adminConvId;
    const res = await fetch(`${API_BASE}/gemini/conversations`, {
      method: "POST", ...fetchOpts, headers,
      body: JSON.stringify({ title: "Admin AI Session" }),
    });
    const data = await res.json();
    setAdminConvId(data.id);
    return data.id;
  }

  async function streamAdminMessageSilent(msg: string, convId: number): Promise<string> {
    const response = await fetch(`${API_BASE}/gemini/conversations/${convId}/messages`, {
      method: "POST", ...fetchOpts, headers,
      body: JSON.stringify({
        content: msg,
        pageContext: { currentPage: "Admin Dashboard", route: "/admin", isAdmin: true },
      }),
    });
    const reader = response.body?.getReader();
    if (!reader) return "";
    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";
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
          if (parsed.content) fullText += parsed.content;
          if (parsed.done) break;
        } catch {}
      }
    }
    return fullText;
  }

  async function streamAdminMessage(msg: string, convId: number) {
    const response = await fetch(`${API_BASE}/gemini/conversations/${convId}/messages`, {
      method: "POST", ...fetchOpts, headers,
      body: JSON.stringify({
        content: msg,
        pageContext: { currentPage: "Admin Dashboard", route: "/admin", isAdmin: true },
      }),
    });
    const reader = response.body?.getReader();
    if (!reader) return "";

    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

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
            fullText += parsed.content;
            setAdminMessages(prev => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: fullText };
              return updated;
            });
          }
          if (parsed.done) break;
        } catch {}
      }
    }
    return fullText;
  }

  async function sendAdminMessage() {
    if (!adminInput.trim() || adminStreaming) return;
    const msg = adminInput.trim();
    setAdminInput("");
    setAdminMessages(prev => [...prev, { role: "user", content: msg }]);
    setAdminStreaming(true);
    setAdminMessages(prev => [...prev, { role: "assistant", content: "" }]);

    try {
      const convId = await ensureConversation();
      await streamAdminMessage(msg, convId);
    } catch {
      setAdminMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Error getting response." };
        return updated;
      });
    }
    setAdminStreaming(false);
  }

  async function generateSummary() {
    setSummaryLoading(true);
    setSummaryText("");
    try {
      const convId = await ensureConversation();
      setAdminMessages(prev => [...prev,
        { role: "user", content: "Generate a comprehensive platform health summary. Include user growth, subscription distribution, trading activity, win rates, and any concerns." },
        { role: "assistant", content: "" },
      ]);
      const result = await streamAdminMessage(
        "Generate a comprehensive platform health summary. Include user growth, subscription distribution, trading activity, win rates, and any concerns. Use the get_platform_stats and list_users_summary tools to gather real data.",
        convId,
      );
      setSummaryText(result);
    } catch {
      setSummaryText("Failed to generate summary.");
    }
    setSummaryLoading(false);
  }

  async function generatePromptDraft() {
    setDraftPromptLoading(true);
    setDraftPrompt("");
    try {
      const convId = await ensureConversation();
      setAdminMessages(prev => [...prev,
        { role: "user", content: "Draft an improved AI mentor system prompt based on current platform usage patterns." },
        { role: "assistant", content: "" },
      ]);
      const result = await streamAdminMessage(
        "Draft an improved AI mentor system prompt for this trading platform. Use the suggest_system_prompt tool to get the current prompt, then create an enhanced version. Output ONLY the new system prompt text, no other commentary.",
        convId,
      );
      setDraftPrompt(result);
    } catch {
      setDraftPrompt("Failed to generate prompt draft.");
    }
    setDraftPromptLoading(false);
  }

  function applyDraftPrompt() {
    if (draftPrompt) {
      updateSetting("ai_mentor_system_prompt", draftPrompt);
      saveSettings();
    }
  }

  async function loadPsychData() {
    setPsychLoading(true);
    setAiLeakInsight(null);
    try {
      const res = await fetch(`${API_BASE}/admin/psychology-analytics`, { ...fetchOpts, headers });
      if (res.ok) {
        const data = await res.json();
        setPsychData(data);
        if (data.topWeekLeak) {
          generateLeakInsight(data);
        }
      }
    } catch {}
    setPsychLoading(false);
  }

  async function generateLeakInsight(data: NonNullable<typeof psychData>) {
    if (!data.topWeekLeak) return;
    setLeakInsightLoading(true);
    try {
      const convId = await ensureConversation();
      const { tag, count } = data.topWeekLeak;
      const kzPct = data.killZoneCompliance.week;
      const weekTotal = data.week.total;
      const prompt = `You are an ICT trading psychology coach. Based on platform-wide data this week: top emotional leak = "${tag}" (${count} out of ${weekTotal} trades), kill zone compliance = ${kzPct !== null ? `${kzPct}%` : "unknown"}. Write a concise coaching insight (2-3 sentences, no bullet points) that: 1) names the specific emotional leak pattern, 2) explains the root cause from an ICT perspective, 3) gives one actionable fix. Output ONLY the coaching insight text, no labels or headers.`;
      const insight = await streamAdminMessageSilent(prompt, convId);
      setAiLeakInsight(insight.trim());
    } catch {
      setAiLeakInsight(null);
    }
    setLeakInsightLoading(false);
  }

  async function generateReengage() {
    if (!psychData) return;
    setReengageLoading(true);
    setReengageDraft("");
    try {
      const topLeak = psychData.topWeekLeak;
      const kzPct = psychData.killZoneCompliance.week;
      const convId = await ensureConversation();
      const prompt = `You are an admin assistant. Use the get_inactive_users tool to find traders who haven't logged a trade in 7+ days. Then write a short, friendly re-engagement message (max 4 sentences) tailored to those inactive users. This week's platform data: top emotional leak = ${topLeak ? `${topLeak.tag} (${topLeak.count} trades)` : "none detected"}, kill zone compliance = ${kzPct !== null ? `${kzPct}%` : "unknown"}. The message should acknowledge the top emotional pattern, encourage them to trade during ICT kill zones, and invite them back to journal their next trade. Output ONLY the re-engagement message text, no extra commentary.`;
      setAdminMessages(prev => [...prev,
        { role: "user", content: "Draft a re-engagement message for inactive users based on this week's psychology data." },
        { role: "assistant", content: "" },
      ]);
      const result = await streamAdminMessage(prompt, convId);
      setReengageDraft(result);
    } catch {}
    setReengageLoading(false);
  }

  function copyReengage() {
    navigator.clipboard.writeText(reengageDraft).then(() => {
      setReengageCopied(true);
      setTimeout(() => setReengageCopied(false), 2000);
    });
  }

  const BEHAVIOUR_COLOURS: Record<string, string> = {
    Disciplined: "bg-emerald-500",
    FOMO: "bg-amber-500",
    Chased: "bg-orange-500",
    Greedy: "bg-red-500",
    Untagged: "bg-slate-500",
  };
  const BEHAVIOUR_TEXT: Record<string, string> = {
    Disciplined: "text-emerald-500",
    FOMO: "text-amber-500",
    Chased: "text-orange-500",
    Greedy: "text-red-500",
    Untagged: "text-slate-500",
  };
  const activePsychCounts = psychView === "week" ? psychData?.week.counts : psychData?.allTime.counts;
  const activePsychTotal = psychView === "week" ? (psychData?.week.total ?? 0) : (psychData?.allTime.total ?? 0);
  const psychBars = ["Disciplined", "FOMO", "Chased", "Greedy", "Untagged"].map(tag => ({
    tag,
    count: activePsychCounts?.[tag] ?? 0,
    pct: activePsychTotal > 0 ? Math.round(((activePsychCounts?.[tag] ?? 0) / activePsychTotal) * 100) : 0,
  }));

  return (
    <div className="space-y-6">
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Admin AI Chat</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Ask about platform activity, user engagement, or anything else. The AI has access to admin tools.
        </p>

        <div className="bg-card border border-border rounded-xl overflow-hidden h-[400px] flex flex-col">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
            {adminMessages.length === 0 && (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <Sparkles className="h-8 w-8 text-primary/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Ask the AI about your platform</p>
                </div>
              </div>
            )}
            {adminMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}{adminStreaming && i === adminMessages.length - 1 && msg.role === "assistant" ? "\u258B" : ""}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-2 border-t border-border flex gap-2">
            <input
              type="text"
              value={adminInput}
              onChange={(e) => setAdminInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendAdminMessage()}
              placeholder="Ask about users, stats, activity..."
              disabled={adminStreaming}
              className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={sendAdminMessage}
              disabled={!adminInput.trim() || adminStreaming}
              className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shrink-0 disabled:opacity-40"
            >
              {adminStreaming ? <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" /> : <Send className="h-4 w-4 text-primary-foreground" />}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="h-5 w-5 text-emerald-500" />
            <h3 className="text-sm font-bold">Platform Health Summary</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            AI-generated overview of platform usage, user activity, and trading statistics.
          </p>
          <button
            onClick={generateSummary}
            disabled={summaryLoading}
            className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-500/20 disabled:opacity-40"
          >
            {summaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            Generate Summary
          </button>
          {summaryText && (
            <div className="mt-3 bg-muted/50 rounded-lg p-3 text-sm whitespace-pre-wrap max-h-48 overflow-y-auto">
              {summaryText}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <FileText className="h-5 w-5 text-blue-500" />
            <h3 className="text-sm font-bold">AI-Draft System Prompt</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Generate an improved mentor system prompt. Review before applying.
          </p>
          <button
            onClick={generatePromptDraft}
            disabled={draftPromptLoading}
            className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 text-blue-500 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-500/20 disabled:opacity-40"
          >
            {draftPromptLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Draft New Prompt
          </button>
          {draftPrompt && (
            <div className="mt-3 space-y-2">
              <div className="bg-muted/50 rounded-lg p-3 text-xs whitespace-pre-wrap max-h-48 overflow-y-auto font-mono">
                {draftPrompt}
              </div>
              <button
                onClick={applyDraftPrompt}
                disabled={saving}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-40"
              >
                <Save className="h-4 w-4" />
                Apply & Save
              </button>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Psychology & Behaviour Analytics */}
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-500" />
          <h3 className="text-sm font-bold">Psychology & Behaviour Analytics</h3>
        </div>
        <button
          onClick={loadPsychData}
          disabled={psychLoading}
          className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/30 text-purple-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-purple-500/20 disabled:opacity-40"
        >
          {psychLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          {psychData ? "Refresh" : "Load Data"}
        </button>
      </div>

      {!psychData && !psychLoading && (
        <p className="text-xs text-muted-foreground text-center py-6">
          Click "Load Data" to see platform-wide behaviour tag distribution and kill zone compliance.
        </p>
      )}
      {psychLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-purple-400" />
        </div>
      )}

      {psychData && (
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Behaviour Tag Bar Chart */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Behaviour Tag Distribution</p>
              <div className="flex rounded-lg overflow-hidden border border-border text-[10px] font-bold">
                <button
                  onClick={() => setPsychView("week")}
                  className={`px-2.5 py-1 transition-colors ${psychView === "week" ? "bg-purple-500/20 text-purple-400" : "text-muted-foreground hover:bg-secondary"}`}
                >This Week</button>
                <button
                  onClick={() => setPsychView("alltime")}
                  className={`px-2.5 py-1 transition-colors ${psychView === "alltime" ? "bg-purple-500/20 text-purple-400" : "text-muted-foreground hover:bg-secondary"}`}
                >All Time</button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">{activePsychTotal} trade{activePsychTotal !== 1 ? "s" : ""} recorded</p>
            <div className="space-y-2">
              {psychBars.map(bar => (
                <div key={bar.tag} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-medium ${BEHAVIOUR_TEXT[bar.tag]}`}>{bar.tag}</span>
                    <span className="text-muted-foreground">{bar.count} ({bar.pct}%)</span>
                  </div>
                  <div className="h-2 bg-secondary rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${BEHAVIOUR_COLOURS[bar.tag]}`}
                      style={{ width: `${bar.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Kill Zone Compliance + Top Leak */}
          <div className="space-y-3">
            {/* Kill Zone Compliance */}
            <div className="bg-muted/30 rounded-xl p-3 border border-border">
              <div className="flex items-center gap-1.5 mb-2">
                <Clock className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Kill Zone Compliance</p>
              </div>
              {psychData.killZoneCompliance.week !== null ? (
                <>
                  <p className={`text-2xl font-black ${
                    (psychData.killZoneCompliance.week ?? 0) >= 70 ? "text-emerald-400"
                    : (psychData.killZoneCompliance.week ?? 0) >= 40 ? "text-amber-400"
                    : "text-red-400"
                  }`}>
                    {psychData.killZoneCompliance.week}%
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    this week ({psychData.killZoneCompliance.weekParsed} trades w/ time data)
                  </p>
                  {psychData.killZoneCompliance.allTime !== null && (
                    <p className="text-[10px] text-muted-foreground">
                      all time: {psychData.killZoneCompliance.allTime}%
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No entry time data available yet.</p>
              )}
            </div>

            {/* Top Leak Insight */}
            <div className="bg-muted/30 rounded-xl p-3 border border-border">
              <div className="flex items-center gap-1.5 mb-2">
                <Target className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">Top Leak This Week</p>
              </div>
              {psychData.topWeekLeak ? (
                <>
                  <p className={`text-lg font-black mb-1 ${BEHAVIOUR_TEXT[psychData.topWeekLeak.tag]}`}>
                    {psychData.topWeekLeak.tag}
                  </p>
                  <p className="text-[10px] text-muted-foreground mb-2">
                    {psychData.topWeekLeak.count} trade{psychData.topWeekLeak.count !== 1 ? "s" : ""} this week
                  </p>
                  {leakInsightLoading && (
                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mt-1">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Generating coaching insight…
                    </div>
                  )}
                  {!leakInsightLoading && aiLeakInsight && (
                    <p className="text-[10px] text-foreground/70 leading-relaxed italic border-l-2 border-amber-500/40 pl-2">
                      {aiLeakInsight}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No emotional leaks detected this week.</p>
              )}
            </div>

            {/* Re-engage Button */}
            <button
              onClick={generateReengage}
              disabled={reengageLoading || !psychData}
              className="w-full flex items-center justify-center gap-2 bg-purple-500/10 border border-purple-500/30 text-purple-400 px-3 py-2.5 rounded-lg text-xs font-bold hover:bg-purple-500/20 disabled:opacity-40 transition-colors"
            >
              {reengageLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Draft Re-engagement Message
            </button>

            {reengageDraft && (
              <div className="bg-muted/30 rounded-xl p-3 border border-border space-y-2">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Re-engagement Draft</p>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{reengageDraft}</p>
                <button
                  onClick={copyReengage}
                  className="flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline"
                >
                  {reengageCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  {reengageCopied ? "Copied!" : "Copy to clipboard"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
    </div>
  );
}

