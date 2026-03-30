import { useState, useEffect, useCallback } from "react";
import { FlaskConical, RefreshCw, Copy, Check, UserCheck, Clock, AlertCircle, Loader2 } from "lucide-react";
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

export function AdminBetaTab() {
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
