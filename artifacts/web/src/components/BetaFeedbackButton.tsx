import { useState, useRef, useEffect } from "react";
import { FlaskConical, X, Star, Send, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

function getToken(): string | null {
  try { return localStorage.getItem("ICT_TRADING_MENTOR_TOKEN"); } catch { return null; }
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const CATEGORIES = ["Bug", "Suggestion", "Usability Issue", "General Feedback"];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="focus:outline-none transition-transform hover:scale-110"
        >
          <Star
            className={`h-6 w-6 ${
              star <= (hovered || value)
                ? "fill-amber-400 text-amber-400"
                : "text-muted-foreground/40"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function BetaFeedbackButton() {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [rating, setRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const isBetaTester = user?.isBetaTester === true;
  const visible = isAdmin || isBetaTester;

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!visible) return null;

  function handleClose() {
    setOpen(false);
    setSubmitted(false);
    setError(null);
    setCategory(CATEGORIES[0]);
    setDescription("");
    setRating(0);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rating) { setError("Please select a star rating."); return; }
    if (!description.trim()) { setError("Please enter a description."); return; }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/beta/feedback`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          category,
          description: description.trim(),
          rating,
          pageContext: location.pathname,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as { error?: string }).error || "Submission failed");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-lg hover:brightness-110 transition-all text-sm font-semibold"
        title="Send Beta Feedback"
      >
        <FlaskConical className="h-4 w-4" />
        Beta Feedback
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-start sm:justify-end pointer-events-none">
          <div
            ref={panelRef}
            className="pointer-events-auto w-full sm:w-[420px] sm:m-4 sm:mt-16 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm text-foreground">Beta Feedback</span>
              </div>
              <button
                onClick={handleClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {submitted ? (
                <div className="flex flex-col items-center justify-center gap-4 p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" />
                  <div>
                    <p className="font-semibold text-foreground text-base mb-1">Thank you!</p>
                    <p className="text-sm text-muted-foreground">
                      Your feedback has been sent to the team and saved for review.
                    </p>
                  </div>
                  <button
                    onClick={handleClose}
                    className="mt-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:brightness-110 transition-all"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-5 space-y-5">
                  <div className="bg-primary/5 border border-primary/15 rounded-lg p-3.5 space-y-1.5 text-xs text-muted-foreground leading-relaxed">
                    <p className="font-semibold text-foreground text-sm">Help us improve</p>
                    <p>You&apos;re helping shape the product as a beta tester. When reporting, please describe:</p>
                    <ul className="list-disc list-inside space-y-0.5 pl-1">
                      <li>What you saw or experienced</li>
                      <li>What you expected to happen</li>
                      <li>How severe the issue is for you</li>
                    </ul>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what happened, what you expected, and how severe this is…"
                      rows={5}
                      className="w-full bg-muted border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground uppercase tracking-wide">Overall Experience</label>
                    <StarRating value={rating} onChange={setRating} />
                    <p className="text-[11px] text-muted-foreground">1 = very poor · 5 = excellent</p>
                  </div>

                  {error && (
                    <p className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2.5">
                      {error}
                    </p>
                  )}

                  <div className="flex gap-2.5">
                    <button
                      type="button"
                      onClick={handleClose}
                      className="flex-1 py-2.5 rounded-lg border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                    >
                      {submitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          Submit
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
