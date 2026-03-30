import { useState, useEffect, useCallback } from "react";
import { FlaskConical, RefreshCw, Copy, Check, UserCheck, Clock, AlertCircle, Loader2, MessageSquare, Star, ChevronDown, ChevronUp, Send } from "lucide-react";
import { API_BASE, authHeaders } from "./adminUtils";

interface BetaCode {
  id: number;
  code: string;
  usedByUserId: number | null;
  usedAt: string | null;
  createdAt: string;
  usedByEmail: string | null;
  usedByName: string | null;
}

interface BetaLog {
  id: number;
  userId: number | null;
  submitterRole: string;
  category: string;
  description: string;
  rating: number;
  pageContext: string | null;
  createdAt: string;
  submitterName: string | null;
  submitterEmail: string | null;
}

const CATEGORIES = ["Bug", "Suggestion", "Usability Issue", "General Feedback"];

function StarDisplay({ rating }: { rating: number }) {
  return (
    <span className="text-amber-400 text-sm tracking-tight">
      {"★".repeat(rating)}{"☆".repeat(5 - rating)}
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const isAdmin = role === "admin";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
      isAdmin ? "bg-violet-500/15 text-violet-400 border border-violet-500/30" : "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
    }`}>
      {isAdmin ? "Admin" : "Beta Tester"}
    </span>
  );
}

function BetaLogsTab() {
  const [logs, setLogs] = useState<BetaLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);

  const fetchOpts: RequestInit = { credentials: "include" };
  const headers = { "Content-Type": "application/json", ...authHeaders() };

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/beta/logs`, { ...fetchOpts, headers });
      if (!res.ok) throw new Error("Failed to load beta logs");
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { setSubmitError("Please select a rating."); return; }
    if (!description.trim()) { setSubmitError("Please enter a description."); return; }
    setSubmitting(true);
    setSubmitError(null);
    setSubmitMsg(null);
    try {
      const res = await fetch(`${API_BASE}/beta/feedback`, {
        method: "POST",
        ...fetchOpts,
        headers,
        body: JSON.stringify({ category, description: description.trim(), rating, pageContext: "Admin Panel" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Submission failed");
      setSubmitMsg("Feedback submitted successfully.");
      setDescription("");
      setRating(0);
      setCategory(CATEGORIES[0]);
      setShowForm(false);
      await loadLogs();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            Beta Feedback Logs
          </h2>
          {logs.length > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">{logs.length} submission{logs.length !== 1 ? "s" : ""} total</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setSubmitError(null); setSubmitMsg(null); }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:brightness-110 transition-all"
          >
            <Send className="h-3.5 w-3.5" />
            Submit Log
          </button>
        </div>
      </div>

      {submitMsg && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-2.5 text-sm text-primary">{submitMsg}</div>
      )}

      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-4">
          <p className="text-sm font-semibold text-foreground">Submit a log as Admin</p>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="What did you see? What did you expect?"
              className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Rating</label>
            <div className="flex gap-1">
              {[1,2,3,4,5].map((s) => (
                <button key={s} type="button" onClick={() => setRating(s)} className="text-xl focus:outline-none">
                  <span className={s <= rating ? "text-amber-400" : "text-muted-foreground/30"}>★</span>
                </button>
              ))}
            </div>
          </div>
          {submitError && (
            <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">{submitError}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setSubmitError(null); }}
              className="flex-1 py-2 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />Loading logs...
        </div>
      )}

      {!loading && logs.length === 0 && !error && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <MessageSquare className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No feedback submitted yet.</p>
        </div>
      )}

      {!loading && logs.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
          {logs.map((log) => {
            const isExp = expanded === log.id;
            const date = new Date(log.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
            const snippet = log.description.length > 120 ? log.description.slice(0, 120) + "…" : log.description;
            return (
              <div key={log.id} className="px-4 py-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground">{date}</span>
                      <RoleBadge role={log.submitterRole} />
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{log.category}</span>
                      <StarDisplay rating={log.rating} />
                    </div>
                    <p className="text-xs font-medium text-foreground mb-0.5">
                      {log.submitterName || "Unknown"}{log.submitterEmail ? ` · ${log.submitterEmail}` : ""}
                    </p>
                    {log.pageContext && (
                      <p className="text-[11px] text-muted-foreground mb-1">Page: {log.pageContext}</p>
                    )}
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {isExp ? log.description : snippet}
                    </p>
                  </div>
                  {log.description.length > 120 && (
                    <button
                      onClick={() => setExpanded(isExp ? null : log.id)}
                      className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {isExp ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BetaCodesTab() {
  const [codes, setCodes] = useState<BetaCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const fetchOpts: RequestInit = { credentials: "include" };
  const headers = { "Content-Type": "application/json", ...authHeaders() };

  const loadCodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/admin/beta-codes`, { ...fetchOpts, headers });
      if (!res.ok) throw new Error("Failed to load beta codes");
      const data = await res.json();
      setCodes(data.codes || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load beta codes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadCodes(); }, [loadCodes]);

  async function handleGenerate() {
    setGenerating(true);
    setMsg(null);
    try {
      const res = await fetch(`${API_BASE}/admin/beta-codes/generate`, {
        method: "POST",
        ...fetchOpts,
        headers,
      });
      if (!res.ok) throw new Error("Failed to generate codes");
      const data = await res.json();
      if (data.generated === 0) {
        setMsg("Already have 20 invite codes. No new codes generated.");
      } else {
        setMsg(`Generated ${data.generated} new invite code${data.generated !== 1 ? "s" : ""}.`);
      }
      await loadCodes();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate codes");
    } finally {
      setGenerating(false);
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {}
  }

  const available = codes.filter(c => c.usedByUserId === null).length;
  const used = codes.filter(c => c.usedByUserId !== null).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Beta Tester Invite Codes
          </h2>
          {codes.length > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {available} available · {used} used · {codes.length} total
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCodes}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || codes.length >= 20}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FlaskConical className="h-3.5 w-3.5" />
            )}
            Generate Codes
          </button>
        </div>
      </div>

      {msg && (
        <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-2.5 text-sm text-primary">
          {msg}
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-4 py-2.5 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {codes.length === 0 && !loading && !error && (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <FlaskConical className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">No invite codes yet.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Click "Generate Codes" to create up to 20 beta invite codes.
          </p>
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading codes...
        </div>
      )}

      {!loading && codes.length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_1fr_auto] text-xs font-medium text-muted-foreground border-b border-border px-4 py-2.5 bg-muted/40">
            <span className="w-8">#</span>
            <span>Code</span>
            <span>Status</span>
            <span className="w-8" />
          </div>
          <div className="divide-y divide-border">
            {codes.map((code, i) => (
              <div
                key={code.id}
                className={`grid grid-cols-[auto_1fr_1fr_auto] items-center px-4 py-3 gap-3 text-sm ${
                  code.usedByUserId ? "opacity-60" : ""
                }`}
              >
                <span className="w-8 text-xs text-muted-foreground">{i + 1}</span>
                <div className="flex items-center gap-2 min-w-0">
                  <code className="font-mono text-xs bg-muted px-2 py-0.5 rounded tracking-wider">
                    {code.code}
                  </code>
                </div>
                <div className="min-w-0">
                  {code.usedByUserId ? (
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">
                          {code.usedByName || "Unknown"}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {code.usedByEmail || ""}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-primary">
                      <Clock className="h-3.5 w-3.5" />
                      <span className="text-xs font-medium">Available</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => copyCode(code.code)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Copy code"
                >
                  {copiedCode === code.code ? (
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-muted/40 border border-border rounded-xl p-4 text-xs text-muted-foreground space-y-1.5">
        <p className="font-medium text-foreground text-sm">How it works</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Generate up to 20 unique invite codes for beta testers.</li>
          <li>Share a code manually with a user — they enter it during registration.</li>
          <li>Beta testers get full top-tier access free for 30 days.</li>
          <li>After 30 days, they must subscribe or delete their account.</li>
          <li>Beta testers are completely separate from the Founder program.</li>
        </ul>
      </div>
    </div>
  );
}

export function AdminBetaTab() {
  const [activeSubTab, setActiveSubTab] = useState<"codes" | "logs">("codes");

  return (
    <div className="space-y-5">
      <div className="flex gap-1 bg-muted/40 border border-border rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveSubTab("codes")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeSubTab === "codes"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <FlaskConical className="h-3.5 w-3.5" />
          Invite Codes
        </button>
        <button
          onClick={() => setActiveSubTab("logs")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
            activeSubTab === "logs"
              ? "bg-card text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          Beta Logs
        </button>
      </div>

      {activeSubTab === "codes" ? <BetaCodesTab /> : <BetaLogsTab />}
    </div>
  );
}
