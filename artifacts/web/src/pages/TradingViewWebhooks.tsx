import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LockedFeatureOverlay } from "@/components/CasinoElements";
import {
  Copy,
  Check,
  ExternalLink,
  Webhook,
  Info,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertTriangle,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const ALERT_EXAMPLES = [
  {
    label: "Long Entry (Buy)",
    payload: `{
  "ticker": "NQ1!",
  "side": "BUY",
  "price": "{{close}}"
}`,
  },
  {
    label: "Short Entry (Sell)",
    payload: `{
  "ticker": "NQ1!",
  "side": "SELL",
  "price": "{{close}}"
}`,
  },
  {
    label: "MNQ Long",
    payload: `{
  "ticker": "MNQ1!",
  "side": "BUY",
  "price": "{{close}}"
}`,
  },
];

const SETUP_STEPS = [
  {
    step: 1,
    title: "Copy your Webhook URL",
    desc: "Copy the unique URL shown above — this is your personal webhook endpoint.",
  },
  {
    step: 2,
    title: "Open TradingView",
    desc: "Go to TradingView and open your NQ/MNQ chart. Click the Alert button (clock icon) to create a new alert.",
  },
  {
    step: 3,
    title: "Set the webhook URL",
    desc: 'In the Alert settings, switch to the "Notifications" tab. Enable "Webhook URL" and paste your URL.',
  },
  {
    step: 4,
    title: "Configure the alert message",
    desc: 'In the "Alert message" field, paste one of the example payloads below. TradingView will send this JSON when the alert fires.',
  },
  {
    step: 5,
    title: "Fire the alert",
    desc: "When TradingView fires the alert, a draft trade is automatically created in your Smart Journal — ready for you to review and confirm.",
  },
];

export default function TradingViewWebhooks() {
  const { tierLevel } = useAuth();
  const navigate = useNavigate();
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [copiedExample, setCopiedExample] = useState<number | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(1);

  useEffect(() => {
    if (tierLevel < 2) return;
    setLoading(true);
    fetch(`${API_BASE}/webhook/tradingview/info`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.webhookUrl) {
          setWebhookUrl(data.webhookUrl);
        } else {
          setError(data.error || "Failed to load webhook info");
        }
      })
      .catch(() => setError("Failed to load webhook info"))
      .finally(() => setLoading(false));
  }, [tierLevel]);

  if (tierLevel < 2) {
    return (
      <div className="relative min-h-[60vh] flex items-center justify-center">
        <LockedFeatureOverlay featureName="TradingView Webhooks" tierRequired="Premium" />
      </div>
    );
  }

  function copyUrl() {
    if (!webhookUrl) return;
    navigator.clipboard.writeText(webhookUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function copyExample(idx: number, payload: string) {
    navigator.clipboard.writeText(payload).then(() => {
      setCopiedExample(idx);
      setTimeout(() => setCopiedExample(null), 2000);
    });
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <Webhook className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">TradingView Webhooks</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Auto-create draft trades from TradingView alerts
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Your Webhook URL</h2>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <div className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            Loading webhook info...
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 text-sm text-red-500">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        ) : webhookUrl ? (
          <>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-secondary/50 border border-border rounded-xl px-4 py-3 font-mono text-xs text-foreground/80 truncate">
                {webhookUrl}
              </div>
              <button
                onClick={copyUrl}
                className="shrink-0 flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-4 py-3 rounded-xl hover:opacity-90 transition-all"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Keep this URL private. Anyone with access to this URL can create draft trades in your journal.
              </p>
            </div>
          </>
        ) : null}
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <Info className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Setup Guide</h2>
        </div>

        <div className="space-y-2">
          {SETUP_STEPS.map((s) => (
            <div key={s.step} className="border border-border rounded-xl overflow-hidden">
              <button
                onClick={() => setExpandedStep(expandedStep === s.step ? null : s.step)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/30 transition-colors"
              >
                <div className="shrink-0 w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                  {s.step}
                </div>
                <span className="flex-1 text-sm font-medium">{s.title}</span>
                {expandedStep === s.step ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </button>
              {expandedStep === s.step && (
                <div className="px-4 pb-4 pt-1 ml-9">
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ExternalLink className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Alert Message Examples</h2>
        </div>
        <p className="text-xs text-muted-foreground">
          Paste one of these into the TradingView alert message field. The{" "}
          <code className="bg-secondary px-1 rounded text-[11px]">{"{{close}}"}</code> variable will be replaced with the current price automatically.
        </p>

        <div className="space-y-3">
          {ALERT_EXAMPLES.map((ex, i) => (
            <div key={i} className="border border-border rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-secondary/30 border-b border-border">
                <span className="text-xs font-bold text-foreground">{ex.label}</span>
                <button
                  onClick={() => copyExample(i, ex.payload)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedExample === i ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-primary" />
                      <span className="text-primary font-medium">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="px-4 py-3 text-xs text-foreground/80 font-mono whitespace-pre overflow-x-auto">
                {ex.payload}
              </pre>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5">
        <h2 className="text-sm font-bold text-foreground mb-3">How it works</h2>
        <div className="space-y-3">
          {[
            "When TradingView fires an alert with your webhook URL, our server receives the payload",
            "A draft trade is automatically created in your Smart Journal with the ticker, side (BUY/SELL), and price",
            "You'll see the draft in your Smart Journal — review it, add your notes and behavior tag, then confirm to save it",
            "This keeps your journal accurate while letting TradingView do the heavy lifting",
          ].map((point, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="shrink-0 w-5 h-5 bg-primary/10 rounded-full flex items-center justify-center text-[10px] font-bold text-primary mt-0.5">
                {i + 1}
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{point}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
