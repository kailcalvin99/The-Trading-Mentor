import { useState, useCallback, useMemo, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import FrostedGateOverlay from "@/components/FrostedGateOverlay";
import { JournalDemoSnapshot } from "@/components/DemoSnapshots";
import {
  useListTrades,
  useCreateTrade,
  useDeleteTrade,
  getListTradesQueryKey,
} from "@workspace/api-client-react";
import { usePlanner } from "@/contexts/PlannerContext";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  BookOpen,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Shield,
  Flame,
  AlertTriangle,
  Lock,
  Trash2,
  ChevronDown,
  ChevronUp,
  Radio,
  Plus,
  X,
  Sparkles,
  Loader2,
  Download,
  Angry,
  Repeat,
} from "lucide-react";

import type { Trade, CreateTradeBody } from "@workspace/api-client-react";
import { recordTradeResult } from "@/components/CoolDownOverlay";
import { dispatchAITrigger } from "@/hooks/useAITrigger";

type BehaviorTag = "FOMO" | "Chased" | "Disciplined" | "Greedy" | "Revenge" | "Angry" | "Overtrading";
type OutcomeType = "win" | "loss" | "breakeven" | "";
interface ExtendedTrade extends Trade {
  behaviorTag?: string | null;
  stressLevel?: number | null;
  isDraft?: boolean;
  sideDirection?: string | null;
  followedTimeRule?: boolean | null;
  hasFvgConfirmation?: boolean | null;
  ticker?: string | null;
  setupScore?: number | null;
  tradingSession?: string | null;
  entryPrice?: string | null;
}

const BEHAVIOR_TAGS: { tag: BehaviorTag; label: string; color: string; icon: typeof Zap }[] = [
  { tag: "Disciplined", label: "I followed my plan", color: "text-emerald-400", icon: Shield },
  { tag: "FOMO", label: "I jumped in too fast", color: "text-amber-400", icon: Zap },
  { tag: "Chased", label: "I entered late", color: "text-indigo-400", icon: TrendingUp },
  { tag: "Revenge", label: "I traded to get back losses", color: "text-orange-400", icon: AlertTriangle },
  { tag: "Greedy", label: "I held too long", color: "text-red-400", icon: Flame },
  { tag: "Angry", label: "I traded while upset", color: "text-rose-400", icon: Angry },
  { tag: "Overtrading", label: "I took too many trades", color: "text-purple-400", icon: Repeat },
];

const NQ_PAIRS = ["NQ1!", "MNQ1!", "ES1!", "MES1!", "RTY1!", "YM1!"];

interface TradeFormData {
  pair: string;
  entryTime: string;
  riskPct: string;
  outcome: OutcomeType;
  notes: string;
  behaviorTag: BehaviorTag | "";
  stressLevel: number;
  sideDirection: "BUY" | "SELL" | "";
  tradingSession: string;
  entryPrice: string;
}

const DEFAULT_FORM: TradeFormData = {
  pair: "NQ1!",
  entryTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
  riskPct: "0.5",
  outcome: "",
  notes: "",
  behaviorTag: "",
  stressLevel: 5,
  sideDirection: "",
  tradingSession: "",
  entryPrice: "",
};

function calculateSetupScore(stressLevel: number, riskPct: number): number {
  let score = 40;
  if (stressLevel <= 5) score += 30;
  else if (stressLevel <= 7) score += 15;
  if (riskPct <= 1) score += 30;
  else if (riskPct <= 2) score += 15;
  return Math.min(100, Math.max(0, score));
}

function scoreColor(score: number): string {
  if (score >= 70) return "text-emerald-400";
  if (score >= 50) return "text-amber-400";
  return "text-red-400";
}

function scoreBorderColor(score: number): string {
  if (score >= 70) return "border-emerald-400/30";
  if (score >= 50) return "border-amber-400/30";
  return "border-red-400/30";
}

function scoreBgColor(score: number): string {
  if (score >= 70) return "bg-emerald-400/10";
  if (score >= 50) return "bg-amber-400/10";
  return "bg-red-400/10";
}

function StressSliderControl({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const color = value <= 3 ? "text-emerald-400" : value <= 6 ? "text-amber-400" : "text-red-400";
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Stress Level</span>
        <span className={`text-sm font-bold ${color}`}>{value}/10</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={1}
        max={10}
        step={1}
      />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Calm</span>
        <span>Stressed</span>
      </div>
    </div>
  );
}

export default function SmartJournal() {
  const { tierLevel, appMode } = useAuth();
  const { isRoutineComplete, routineCompletedToday, routineItems, routineConfig, plannerLoaded, tradePlanDefaults } = usePlanner();
  const { getNumber } = useAppConfig();
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const [userSettings, setUserSettings] = useState<{ defaultPairs?: string; defaultRiskPct?: string } | null>(null);
  const [draftCount, setDraftCount] = useState(0);

  const [showForm, setShowForm] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [form, setForm] = useState<TradeFormData>({ ...DEFAULT_FORM });
  const [expandedTradeId, setExpandedTradeId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [coachLoading, setCoachLoading] = useState<Record<number, boolean>>({});
  const [coachFeedback, setCoachFeedback] = useState<Record<number, string>>({});
  type TradeReflection = { criteria: string; setup: string; notes: string };
  const [reflections, setReflections] = useState<Record<number, TradeReflection>>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem("web_trade_reflections_v1") || "{}");
      const migrated: Record<number, TradeReflection> = {};
      for (const key of Object.keys(parsed)) {
        const val = parsed[key];
        if (typeof val === "string") {
          migrated[Number(key)] = { criteria: "", setup: "", notes: val };
        } else {
          migrated[Number(key)] = val;
        }
      }
      return migrated;
    } catch { return {}; }
  });
  const [reflectionEditing, setReflectionEditing] = useState<number | null>(null);
  const [reflectionDraft, setReflectionDraft] = useState<TradeReflection>({ criteria: "", setup: "", notes: "" });
  const [showSitOutWarning, setShowSitOutWarning] = useState(false);
  const [showTiltCooldown, setShowTiltCooldown] = useState(() => {
    const stored = localStorage.getItem("ict-tilt-cooldown-end");
    if (stored) {
      const end = parseInt(stored, 10);
      if (end > Date.now()) return true;
      localStorage.removeItem("ict-tilt-cooldown-end");
    }
    return false;
  });
  const [tiltCooldownEnd, setTiltCooldownEnd] = useState<number>(() => {
    const stored = localStorage.getItem("ict-tilt-cooldown-end");
    return stored ? parseInt(stored, 10) : 0;
  });

  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [filterOutcome, setFilterOutcome] = useState<OutcomeType | "">("");

  const { data: tradesRaw } = useListTrades();
  const trades = (tradesRaw ?? []) as ExtendedTrade[];
  const { mutateAsync: createTradeMut, isPending: isCreating } = useCreateTrade();
  const { mutateAsync: deleteTradeMut } = useDeleteTrade();

  const draftTrades = trades.filter((t) => t.isDraft);
  const allCompletedTrades = trades.filter((t) => !t.isDraft);
  const completedTrades = useMemo(() => {
    return allCompletedTrades.filter((t) => {
      if (filterOutcome && t.outcome !== filterOutcome) return false;
      if (filterDateFrom) {
        const tradeDate = t.createdAt ? new Date(t.createdAt).toISOString().split("T")[0] : "";
        if (tradeDate < filterDateFrom) return false;
      }
      if (filterDateTo) {
        const tradeDate = t.createdAt ? new Date(t.createdAt).toISOString().split("T")[0] : "";
        if (tradeDate > filterDateTo) return false;
      }
      return true;
    });
  }, [allCompletedTrades, filterOutcome, filterDateFrom, filterDateTo]);

  const stats = useMemo(() => {
    const wins = completedTrades.filter((t) => t.outcome === "win").length;
    const losses = completedTrades.filter((t) => t.outcome === "loss").length;
    const total = wins + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const fomoCount = completedTrades.filter((t) => t.behaviorTag === "FOMO").length;
    const disciplinedCount = completedTrades.filter((t) => t.behaviorTag === "Disciplined").length;
    return { total: completedTrades.length, wins, winRate, fomoCount, disciplinedCount };
  }, [completedTrades]);

  const liveSetupScore = useMemo(() => {
    const parsedRisk = parseFloat(form.riskPct) || 0;
    return calculateSetupScore(form.stressLevel, parsedRisk);
  }, [form.stressLevel, form.riskPct]);

  const shouldSitOut = useMemo(() => {
    const sorted = [...allCompletedTrades].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (sorted.length === 0) return false;
    if ((sorted[0].stressLevel ?? 0) >= 7) return true;
    if (sorted.length >= 2 && sorted[0].outcome === "loss" && sorted[1].outcome === "loss") return true;
    return false;
  }, [allCompletedTrades]);

  const API_BASE = import.meta.env.VITE_API_URL || "/api";

  const [coachError, setCoachError] = useState<Record<number, boolean>>({});

  useEffect(() => {
    fetch(`${API_BASE}/user/settings`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.tradingDefaults) {
          const defaultPair = data.tradingDefaults.defaultPairs?.split(",")?.[0]?.trim() || "";
          const defaultRisk = data.tradingDefaults.defaultRiskPct || "0.5";
          setUserSettings({ defaultPairs: defaultPair, defaultRiskPct: defaultRisk });
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const prevCount = draftCount;
    if (draftTrades.length > prevCount && prevCount >= 0) {
      const newCount = draftTrades.length - prevCount;
      if (newCount > 0) {
        toast({
          title: `${newCount} new draft trade${newCount > 1 ? "s" : ""} from TradingView`,
          description: "Click to review and complete your trade entries.",
        });
      }
    }
    setDraftCount(draftTrades.length);
  }, [draftTrades.length]);

  useEffect(() => {
    const raw = localStorage.getItem("planner_journal_draft");
    if (!raw) return;
    try {
      const draft = JSON.parse(raw);
      localStorage.removeItem("planner_journal_draft");
      setForm((prev) => ({
        ...prev,
        pair: draft.pair || prev.pair,
        notes: draft.notes || prev.notes,
        sideDirection: draft.bias === "bullish" ? "BUY" : draft.bias === "bearish" ? "SELL" : prev.sideDirection,
      }));
      setShowForm(true);
      toast({ title: "Plan loaded", description: "Your pre-trade plan has been loaded into the journal form." });
    } catch {}
  }, []);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setSearchParams({}, { replace: true });
      setShowForm(true);
    }
  }, [searchParams, setSearchParams]);
  const [coachUpgrade, setCoachUpgrade] = useState<Record<number, boolean>>({});

  async function fetchCoachFeedback(tradeId: number) {
    if (coachFeedback[tradeId] || coachLoading[tradeId]) return;
    setCoachLoading((prev) => ({ ...prev, [tradeId]: true }));
    setCoachError((prev) => ({ ...prev, [tradeId]: false }));
    setCoachUpgrade((prev) => ({ ...prev, [tradeId]: false }));
    try {
      const res = await fetch(`${API_BASE}/trades/${tradeId}/coach`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.feedback) {
          setCoachFeedback((prev) => ({ ...prev, [tradeId]: data.feedback }));
        }
      } else if (res.status === 403) {
        setCoachUpgrade((prev) => ({ ...prev, [tradeId]: true }));
      } else {
        setCoachError((prev) => ({ ...prev, [tradeId]: true }));
      }
    } catch {
      setCoachError((prev) => ({ ...prev, [tradeId]: true }));
    }
    setCoachLoading((prev) => ({ ...prev, [tradeId]: false }));
  }

  useEffect(() => {
    if (expandedTradeId) {
      const trade = completedTrades.find((t) => t.id === expandedTradeId);
      if (trade && !trade.isDraft) {
        const existing = trade.coachFeedback;
        if (existing) {
          setCoachFeedback((prev) => ({ ...prev, [expandedTradeId]: existing }));
        } else {
          fetchCoachFeedback(expandedTradeId);
        }
      }
    }
  }, [expandedTradeId]);

  function setField<K extends keyof TradeFormData>(key: K, val: TradeFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  function saveReflection(tradeId: number, draft: TradeReflection) {
    const next = { ...reflections, [tradeId]: draft };
    setReflections(next);
    localStorage.setItem("web_trade_reflections_v1", JSON.stringify(next));
    setReflectionEditing(null);
    setReflectionDraft({ criteria: "", setup: "", notes: "" });
  }

  function proceedToNewForm() {
    setEditingDraftId(null);
    const sessionFromDefaults = tradePlanDefaults.detectedKillZone || tradePlanDefaults.targetSession || "";
    const riskFromDefaults = tradePlanDefaults.riskPct || userSettings?.defaultRiskPct || DEFAULT_FORM.riskPct;
    const biasFromDefaults = tradePlanDefaults.marketBias;
    const dolFromDefaults = tradePlanDefaults.drawOnLiquidity;
    const zoneFromDefaults = tradePlanDefaults.zoneNotes;

    let notesFromDefaults = "";
    if (biasFromDefaults) notesFromDefaults += `Bias: ${biasFromDefaults}`;
    if (dolFromDefaults) notesFromDefaults += (notesFromDefaults ? " | " : "") + `DOL: ${dolFromDefaults}`;
    if (zoneFromDefaults) notesFromDefaults += (notesFromDefaults ? "\nZones: " : "Zones: ") + zoneFromDefaults;

    setForm({
      ...DEFAULT_FORM,
      entryTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
      pair: userSettings?.defaultPairs || DEFAULT_FORM.pair,
      riskPct: riskFromDefaults,
      sideDirection: biasFromDefaults === "Bullish" ? "BUY" : biasFromDefaults === "Bearish" ? "SELL" : "",
      tradingSession: sessionFromDefaults,
      entryPrice: "",
      notes: notesFromDefaults,
    });
    setShowForm(true);
    dispatchAITrigger({ message: "Ready to log a trade? I can coach you on this setup!" });
  }

  function openNewForm() {
    if (shouldSitOut) {
      setShowSitOutWarning(true);
      return;
    }
    proceedToNewForm();
  }

  function openDraftForm(draft: ExtendedTrade) {
    setEditingDraftId(draft.id);
    const draftNotes = draft.notes || "";
    const cleanNotes = draftNotes.replace(/^\[(Conservative|Silver Bullet)\]\s*/, "");
    setForm({
      pair: draft.pair || "NQ1!",
      entryTime: draft.entryTime || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
      riskPct: draft.riskPct?.toString() || "0.5",
      outcome: (draft.outcome || "") as OutcomeType,
      notes: cleanNotes,
      behaviorTag: (draft.behaviorTag || "") as BehaviorTag | "",
      stressLevel: draft.stressLevel || 5,
      sideDirection: (draft.sideDirection as "BUY" | "SELL" | "") || "",
      tradingSession: draft.tradingSession || "",
      entryPrice: draft.entryPrice || "",
    });
    setShowForm(true);
    dispatchAITrigger({ message: "Ready to log a trade? I can coach you on this setup!" });
  }

  const handleSubmit = useCallback(async () => {
    if (!form.pair || !form.riskPct) {
      toast({ title: "Missing fields", description: "Pair and Risk % are required.", variant: "destructive" });
      return;
    }
    const parsedRisk = parseFloat(form.riskPct);
    if (isNaN(parsedRisk) || parsedRisk <= 0) {
      toast({ title: "Invalid Risk %", description: "Enter a valid positive number for risk percentage.", variant: "destructive" });
      return;
    }
    try {
      const notesWithMode = form.notes || "";
      const payload: CreateTradeBody = {
        pair: form.pair,
        entryTime: form.entryTime,
        riskPct: parsedRisk,
        outcome: form.outcome || undefined,
        notes: notesWithMode,
        behaviorTag: form.behaviorTag || undefined,
        stressLevel: form.stressLevel,
        isDraft: false,
        setupScore: liveSetupScore,
        sideDirection: form.sideDirection || undefined,
        entryPrice: form.entryPrice || undefined,
        tradingSession: form.tradingSession || undefined,
      };
      const result = await createTradeMut({ data: payload });
      qc.setQueryData(getListTradesQueryKey(), (old: unknown) => {
        if (!Array.isArray(old)) return [result];
        return [result, ...old];
      });
      if (editingDraftId) {
        await deleteTradeMut({ id: editingDraftId });
      }
      if (form.outcome === "win" || form.outcome === "loss") {
        recordTradeResult(form.outcome === "win", getNumber("consecutive_loss_threshold", 2));
      }
      if (appMode === "full") {
        const NEGATIVE_TAGS = ["FOMO", "Chased", "Revenge", "Greedy", "Angry", "Overtrading"];
        const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
        const recentNegativeCount = allCompletedTrades.filter(
          (t) =>
            NEGATIVE_TAGS.includes(t.behaviorTag ?? "") &&
            t.createdAt != null &&
            new Date(t.createdAt).getTime() > twoHoursAgo
        ).length;
        const currentIsNegative = NEGATIVE_TAGS.includes(form.behaviorTag) ? 1 : 0;
        if (recentNegativeCount + currentIsNegative >= 2) {
          const cooldownMs = 5 * 60 * 1000;
          const endTime = Date.now() + cooldownMs;
          localStorage.setItem("ict-tilt-cooldown-end", String(endTime));
          setTiltCooldownEnd(endTime);
          setShowTiltCooldown(true);
          fetch(`${API_BASE}/user/settings/cooldown-event`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ eventType: "tilt_cooldown", triggerTags: form.behaviorTag, durationSeconds: 300 }),
          }).catch(() => {});
        }
      }
      await qc.invalidateQueries({ queryKey: getListTradesQueryKey() });
      setShowForm(false);
      setEditingDraftId(null);
      toast({ title: "Trade saved", description: `${form.pair} trade logged successfully.` });
      dispatchAITrigger({ message: "Trade saved! Want a post-trade coaching review?" });
      if (result && result.id) {
        setExpandedTradeId(result.id);
        fetchCoachFeedback(result.id);
      }
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 403) {
        toast({
          title: "Upgrade required",
          description: "Journal writes require a Standard or Premium plan. Visit the Pricing page to upgrade.",
          variant: "destructive",
        });
      } else {
        toast({ title: "Error", description: "Could not save trade.", variant: "destructive" });
      }
    }
  }, [form, editingDraftId, createTradeMut, deleteTradeMut, qc, appMode]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteTradeMut({ id });
      await qc.invalidateQueries({ queryKey: getListTradesQueryKey() });
      setDeleteConfirmId(null);
      toast({ title: "Trade deleted" });
    } catch (err: unknown) {
      const status = (err as { status?: number })?.status;
      if (status === 403) {
        toast({ title: "Upgrade required", description: "Deleting trades requires a Premium plan.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Could not delete trade.", variant: "destructive" });
      }
    }
  }, [deleteTradeMut, qc]);

  async function handleExportCsv() {
    const params = new URLSearchParams();
    if (filterDateFrom) params.set("dateFrom", filterDateFrom);
    if (filterDateTo) params.set("dateTo", filterDateTo);
    if (filterOutcome) params.set("outcome", filterOutcome);
    const qs = params.toString();
    const url = `${API_BASE}/trades/export/csv${qs ? `?${qs}` : ""}`;
    try {
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 403) {
        toast({ title: "Upgrade required", description: "CSV export requires a Premium plan. Visit the Pricing page to upgrade.", variant: "destructive" });
        return;
      }
      if (!res.ok) {
        toast({ title: "Export failed", description: "Could not export trades. Please try again.", variant: "destructive" });
        return;
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `trades-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {
      toast({ title: "Export failed", description: "Could not export trades. Please try again.", variant: "destructive" });
    }
  }

  const tagInfo = (tag: string | null | undefined) => tag ? BEHAVIOR_TAGS.find((b) => b.tag === tag) : undefined;

  const getEntryMode = (notes: string | null | undefined) => {
    if (!notes) return null;
    if (notes.startsWith("[Silver Bullet]")) return "Silver Bullet";
    if (notes.startsWith("[Conservative]")) return "Conservative";
    return null;
  };

  const cleanNotes = (notes: string | null | undefined) => {
    if (!notes) return "";
    return notes.replace(/^\[(Conservative|Silver Bullet)\]\s*/, "").trim();
  };

  if (tierLevel < 1) {
    return (
      <FrostedGateOverlay mode="standard">
        <JournalDemoSnapshot />
      </FrostedGateOverlay>
    );
  }

  if (!plannerLoaded) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!routineCompletedToday) {
    const coreKeys = routineConfig.map((r) => r.key);
    const doneCount = coreKeys.filter((k) => routineItems[k]).length;
    const totalCount = coreKeys.length;
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-8 text-center">
        <div className="p-5 rounded-full bg-amber-500/10 border border-amber-500/20">
          <Lock className="h-10 w-10 text-amber-400" />
        </div>
        <div className="max-w-sm">
          <h2 className="text-2xl font-bold mb-3">Complete Your Routine First</h2>
          <p className="text-muted-foreground leading-relaxed">
            The Smart Journal is locked until you finish your morning routine. Build the discipline habit — routine first, then trade, then log.
          </p>
        </div>
        <div className="flex flex-col items-center gap-3">
          <span className="text-amber-400 font-bold text-lg">
            {doneCount} of {totalCount} done
          </span>
          <div className="flex flex-col items-start gap-2 text-sm">
            {routineConfig.map((item) => (
              <div key={item.key} className="flex items-center gap-2">
                {routineItems[item.key] ? (
                  <span className="text-green-400">✓</span>
                ) : (
                  <span className="text-muted-foreground">○</span>
                )}
                <span className={routineItems[item.key] ? "text-green-400" : "text-muted-foreground"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
        <Link
          to="/planner"
          className="px-6 py-3 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Go to Morning Routine
        </Link>
      </div>
    );
  }

  return (
    <>
    {showSitOutWarning && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <Card className="max-w-md w-full mx-4 border-amber-500/30">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-amber-500/10">
                <AlertTriangle className="h-6 w-6 text-amber-400" />
              </div>
              <h3 className="text-lg font-bold">Consider Sitting Out</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {(() => {
                const sorted = [...allCompletedTrades].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                return sorted.length >= 2 && sorted[0]?.outcome === "loss" && sorted[1]?.outcome === "loss"
                  ? "You've had 2 consecutive losses. Trading while on a losing streak often leads to revenge trades that make things worse."
                  : "Your last trade had a high stress level. Trading under emotional pressure reduces decision quality and increases risk of impulsive entries.";
              })()}
            </p>
            <p className="text-sm text-muted-foreground">
              Stepping away protects your account and lets you come back with a clear head.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowSitOutWarning(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm bg-primary text-primary-foreground hover:bg-primary/90"
              >
                I'll Sit Out
              </button>
              <button
                onClick={() => { setShowSitOutWarning(false); proceedToNewForm(); }}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm border border-border text-muted-foreground hover:text-foreground"
              >
                Continue Anyway
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    )}
    <div className="flex flex-col lg:flex-row h-full">
      {/* Left Panel — Form */}
      <div className="lg:w-[480px] xl:w-[520px] lg:border-r border-border lg:shrink-0 overflow-auto">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Smart Journal</h1>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="p-3 text-center">
              <div className="text-xl font-bold">{stats.total}</div>
              <div className="text-[11px] text-muted-foreground">Trades</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-xl font-bold text-primary">{stats.winRate}%</div>
              <div className="text-[11px] text-muted-foreground">Win Rate</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-xl font-bold text-amber-400">{stats.fomoCount}</div>
              <div className="text-[11px] text-muted-foreground">FOMO</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="text-xl font-bold text-emerald-400">{stats.disciplinedCount}</div>
              <div className="text-[11px] text-muted-foreground">Disciplined</div>
            </Card>
          </div>

          {/* Routine info banner — manual bypass available */}
          {!isRoutineComplete && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>Morning routine incomplete — you can still log trades in manual mode.</span>
            </div>
          )}

          {/* Drafts from TradingView */}
          {draftTrades.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-semibold">
                <Radio className="h-3.5 w-3.5" />
                <span>{draftTrades.length} Draft{draftTrades.length > 1 ? "s" : ""} from TradingView</span>
              </div>
              {draftTrades.map((draft) => (
                <Card
                  key={draft.id}
                  className="p-3 cursor-pointer border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors"
                  onClick={() => openDraftForm(draft)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold">{draft.pair}</span>
                    {draft.sideDirection && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${draft.sideDirection === "BUY" ? "text-emerald-400 border-emerald-400/30" : "text-red-400 border-red-400/30"}`}
                      >
                        {draft.sideDirection}
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">{draft.notes || "Tap to complete this trade entry"}</div>
                  <div className="text-xs text-amber-400 font-semibold mt-1">Complete Entry &rarr;</div>
                </Card>
              ))}
            </div>
          )}


          {/* Add Trade / Form Toggle */}
          {!showForm ? (
            <div className="space-y-2">
              {!isRoutineComplete && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span><strong>Manual Mode</strong> — Morning routine incomplete. Log carefully.</span>
                </div>
              )}
              <button
                onClick={openNewForm}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-colors bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" />
                Log New Trade
              </button>
            </div>
          ) : (
            /* Trade Entry Form */
            <Card className="border-primary/20">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm">{editingDraftId ? "Complete Draft Trade" : "Log Trade"}</h3>
                  <button onClick={() => { setShowForm(false); setEditingDraftId(null); }} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Manual Mode Banner */}
                {!isRoutineComplete && (
                  <div className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs font-semibold">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    Manual Mode — morning routine incomplete
                  </div>
                )}

                {/* Pair/Ticker */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Pair / Ticker</label>
                  <div className="flex flex-wrap gap-1.5">
                    {NQ_PAIRS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setField("pair", p)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          form.pair === p
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Side Direction */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Side</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["BUY", "SELL"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setField("sideDirection", form.sideDirection === s ? "" : s)}
                        className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                          form.sideDirection === s
                            ? s === "BUY"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : "bg-red-500/20 text-red-400 border-red-500/30"
                            : "bg-card border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {s === "BUY" ? "Long (Buy)" : "Short (Sell)"}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Entry Price, Entry Time & Risk */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Entry Price</label>
                    <input
                      type="text"
                      value={form.entryPrice}
                      onChange={(e) => setField("entryPrice", e.target.value)}
                      placeholder="21450.25"
                      className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Risk %</label>
                    <input
                      type="text"
                      value={form.riskPct}
                      onChange={(e) => setField("riskPct", e.target.value)}
                      placeholder="0.5"
                      className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Entry Time</label>
                  <input
                    type="text"
                    value={form.entryTime}
                    onChange={(e) => setField("entryTime", e.target.value)}
                    placeholder="10:15 AM"
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Session — auto-detected from draft */}
                {form.tradingSession && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20 text-xs">
                    <Zap className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-primary font-semibold">Session detected: {form.tradingSession}</span>
                  </div>
                )}

                {/* Outcome */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Outcome</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["win", "loss", "breakeven"] as OutcomeType[]).map((o) => (
                      <button
                        key={o}
                        onClick={() => setField("outcome", form.outcome === o ? "" : o)}
                        className={`py-2 rounded-lg text-sm font-semibold border transition-colors capitalize ${
                          form.outcome === o
                            ? o === "win"
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                              : o === "loss"
                              ? "bg-red-500/20 text-red-400 border-red-500/30"
                              : "bg-muted text-muted-foreground border-border"
                            : "bg-card border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stress Slider */}
                <StressSliderControl value={form.stressLevel} onChange={(v) => setField("stressLevel", v)} />

                {/* Behavior Tags */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Behavior Tag</label>
                  <div className="flex flex-wrap gap-2">
                    {BEHAVIOR_TAGS.map(({ tag, label, color, icon: Icon }) => (
                      <button
                        key={tag}
                        onClick={() => setField("behaviorTag", form.behaviorTag === tag ? "" : tag)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          form.behaviorTag === tag
                            ? `${color} border-current bg-current/10`
                            : "bg-card border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        {tag} — {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setField("notes", e.target.value)}
                    placeholder="What was your reasoning? What did you learn?"
                    rows={3}
                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div className={`flex items-center justify-between p-3 rounded-lg border ${scoreBorderColor(liveSetupScore)} ${scoreBgColor(liveSetupScore)}`}>
                  <div className="flex items-center gap-2">
                    <Target className={`h-4 w-4 ${scoreColor(liveSetupScore)}`} />
                    <span className="text-sm font-semibold">Setup Score</span>
                  </div>
                  <span className={`text-lg font-bold ${scoreColor(liveSetupScore)}`}>{liveSetupScore}/100</span>
                </div>

                {/* Save */}
                <button
                  onClick={handleSubmit}
                  disabled={isCreating || !isRoutineComplete}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                    isRoutineComplete
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-border text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {isCreating
                    ? "Saving..."
                    : !isRoutineComplete
                    ? "Routine Required"
                    : editingDraftId
                    ? "Complete Trade Entry"
                    : "Save Trade"}
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Right Panel — Trade History */}
      <div className="flex-1 overflow-auto">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Trade History
            </h2>
            {allCompletedTrades.length > 0 && (
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            )}
          </div>

          {/* Filters */}
          {allCompletedTrades.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center">
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                title="From date"
              />
              <span className="text-xs text-muted-foreground">–</span>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
                title="To date"
              />
              <select
                value={filterOutcome}
                onChange={(e) => setFilterOutcome(e.target.value as OutcomeType | "")}
                className="bg-card border border-border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary text-foreground"
              >
                <option value="">All outcomes</option>
                <option value="win">Win</option>
                <option value="loss">Loss</option>
                <option value="breakeven">Breakeven</option>
              </select>
              {(filterDateFrom || filterDateTo || filterOutcome) && (
                <button
                  onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); setFilterOutcome(""); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors underline"
                >
                  Clear
                </button>
              )}
            </div>
          )}

          {completedTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <BookOpen className="h-10 w-10 mb-3 opacity-40" />
              {allCompletedTrades.length > 0 ? (
                <>
                  <p className="font-semibold text-lg">No trades match your filters</p>
                  <p className="text-sm mt-1">Try clearing the date or outcome filter</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-lg mb-1">No trades yet</p>
                  <p className="text-sm mb-4">Log your first trade to start tracking your performance</p>
                  <button
                    onClick={() => { setShowForm(false); setTimeout(openNewForm, 50); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Log Your First Trade &rarr;
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {completedTrades.map((trade) => {
                const tag = tagInfo(trade.behaviorTag);
                const isWin = trade.outcome === "win";
                const isLoss = trade.outcome === "loss";
                const mode = getEntryMode(trade.notes);
                const notes = cleanNotes(trade.notes);
                const expanded = expandedTradeId === trade.id;

                return (
                  <Card
                    key={trade.id}
                    className={`transition-colors ${isWin ? "border-emerald-500/10" : isLoss ? "border-red-500/10" : ""}`}
                  >
                    <CardContent className="p-4">
                      {/* Trade Header */}
                      <div
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => setExpandedTradeId(expanded ? null : trade.id)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-base">{trade.pair}</span>
                          {trade.sideDirection && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${trade.sideDirection === "BUY" ? "text-emerald-400 border-emerald-400/30" : "text-red-400 border-red-400/30"}`}
                            >
                              {trade.sideDirection === "BUY" ? "LONG" : "SHORT"}
                            </Badge>
                          )}
                          {mode && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${mode === "Silver Bullet" ? "text-amber-400 border-amber-400/30" : "text-primary border-primary/30"}`}
                            >
                              {mode === "Silver Bullet" ? <><Zap className="h-2.5 w-2.5 mr-0.5" />{mode}</> : <><Shield className="h-2.5 w-2.5 mr-0.5" />{mode}</>}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {trade.setupScore != null && (
                            <Badge variant="outline" className={`text-[10px] ${scoreColor(trade.setupScore)} ${scoreBorderColor(trade.setupScore)}`}>
                              {trade.setupScore}
                            </Badge>
                          )}
                          {tag && (
                            <Badge variant="outline" className={`text-[10px] ${tag.color} border-current/30`}>
                              {tag.tag}
                            </Badge>
                          )}
                          {trade.outcome && (
                            <Badge
                              className={`text-[10px] ${
                                isWin
                                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                  : isLoss
                                  ? "bg-red-500/20 text-red-400 border-red-500/30"
                                  : "bg-muted text-muted-foreground"
                              }`}
                              variant="outline"
                            >
                              {trade.outcome.toUpperCase()}
                            </Badge>
                          )}
                          {expanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {/* Trade Summary */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        <span>{trade.entryTime}</span>
                        <span>{trade.riskPct}% risk</span>
                        {trade.liquiditySweep && <span className="text-primary">Sweep</span>}
                        {trade.stressLevel != null && <span>Stress: {trade.stressLevel}/10</span>}
                      </div>

                      {/* Expanded Details */}
                      {expanded && (
                        <div className="mt-3 pt-3 border-t border-border space-y-2">
                          {notes && (
                            <p className="text-sm text-muted-foreground italic">{notes}</p>
                          )}

                          {(coachFeedback[trade.id] || coachLoading[trade.id] || coachError[trade.id] || coachUpgrade[trade.id] || trade.coachFeedback) && (
                            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mt-2">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <Sparkles className="h-3.5 w-3.5 text-primary" />
                                <span className="text-xs font-bold text-primary">Coach Says</span>
                              </div>
                              {coachLoading[trade.id] ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  Analyzing your trade...
                                </div>
                              ) : coachUpgrade[trade.id] ? (
                                <div className="flex items-center gap-2 text-xs text-yellow-500">
                                  <span>AI coaching requires a Premium plan.</span>
                                  <a href="/pricing" className="underline hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>Upgrade</a>
                                </div>
                              ) : coachError[trade.id] ? (
                                <div className="flex items-center gap-2 text-xs text-red-400">
                                  <span>Failed to load feedback.</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setCoachError((prev) => ({ ...prev, [trade.id]: false })); fetchCoachFeedback(trade.id); }}
                                    className="underline hover:text-primary transition-colors"
                                  >
                                    Retry
                                  </button>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {coachFeedback[trade.id] || trade.coachFeedback}
                                </p>
                              )}
                            </div>
                          )}

                          {/* Reflection section */}
                          <div className="rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3">
                            <div className="flex items-center gap-1.5 mb-2">
                              <BookOpen className="h-3.5 w-3.5 text-indigo-400" />
                              <span className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Reflection</span>
                            </div>
                            {reflectionEditing === trade.id ? (
                              <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                                <div>
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Entry Criteria Review</label>
                                  <textarea
                                    value={reflectionDraft.criteria}
                                    onChange={(e) => setReflectionDraft((d) => ({ ...d, criteria: e.target.value }))}
                                    placeholder="Were your entry criteria met? Any misses?"
                                    rows={2}
                                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Setup Type / Confluence</label>
                                  <textarea
                                    value={reflectionDraft.setup}
                                    onChange={(e) => setReflectionDraft((d) => ({ ...d, setup: e.target.value }))}
                                    placeholder="e.g. Silver Bullet, FVG + MSS, Kill Zone sweep..."
                                    rows={2}
                                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide block mb-1">Lessons / Notes</label>
                                  <textarea
                                    value={reflectionDraft.notes}
                                    onChange={(e) => setReflectionDraft((d) => ({ ...d, notes: e.target.value }))}
                                    placeholder="What would you do differently next time?"
                                    rows={2}
                                    autoFocus
                                    className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); saveReflection(trade.id, reflectionDraft); }}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setReflectionEditing(null); setReflectionDraft({ criteria: "", setup: "", notes: "" }); }}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div
                                className="cursor-pointer space-y-2"
                                onClick={(e) => { e.stopPropagation(); setReflectionEditing(trade.id); setReflectionDraft(reflections[trade.id] || { criteria: "", setup: "", notes: "" }); }}
                              >
                                {reflections[trade.id] && (reflections[trade.id].criteria || reflections[trade.id].setup || reflections[trade.id].notes) ? (
                                  <>
                                    {reflections[trade.id].criteria && (
                                      <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Entry Criteria</p>
                                        <p className="text-sm text-foreground leading-relaxed">{reflections[trade.id].criteria}</p>
                                      </div>
                                    )}
                                    {reflections[trade.id].setup && (
                                      <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Setup / Confluence</p>
                                        <p className="text-sm text-foreground leading-relaxed">{reflections[trade.id].setup}</p>
                                      </div>
                                    )}
                                    {reflections[trade.id].notes && (
                                      <div>
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide mb-0.5">Lessons</p>
                                        <p className="text-sm text-foreground leading-relaxed">{reflections[trade.id].notes}</p>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-xs text-muted-foreground italic">Click to add reflection...</p>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {trade.createdAt && new Date(trade.createdAt).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                          <div className="flex justify-end">
                            {deleteConfirmId === trade.id ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-red-400">Delete this trade?</span>
                                <button
                                  onClick={() => handleDelete(trade.id)}
                                  className="text-xs text-red-400 font-semibold hover:text-red-300"
                                >
                                  Yes, delete
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(null)}
                                  className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirmId(trade.id)}
                                className="text-muted-foreground hover:text-red-400 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
    <div className="px-4 pb-4 max-w-5xl mx-auto w-full">
      <p className="text-center text-[11px] text-muted-foreground/60 border-t border-border pt-3">
        ⚠️ For educational purposes only. Not financial advice. Trading involves substantial risk of loss.{" "}
        <Link to="/risk-disclosure" className="underline hover:text-muted-foreground transition-colors">Full Risk Disclosure</Link>
      </p>
    </div>
    {showTiltCooldown && (
      <TiltCooldownModal
        endTime={tiltCooldownEnd}
        onDismiss={() => {
          setShowTiltCooldown(false);
          localStorage.removeItem("ict-tilt-cooldown-end");
        }}
      />
    )}
    </>
  );
}

function TiltCooldownModal({ endTime, onDismiss }: { endTime: number; onDismiss: () => void }) {
  const [remaining, setRemaining] = useState(Math.max(0, Math.ceil((endTime - Date.now()) / 1000)));

  useEffect(() => {
    const interval = setInterval(() => {
      const left = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const canDismiss = remaining <= 0;

  return (
    <div className="fixed inset-0 z-[200] bg-background/95 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex items-center justify-center">
          <div className="h-24 w-24 rounded-full bg-orange-500/10 flex items-center justify-center">
            <AlertTriangle className="h-12 w-12 text-orange-500" />
          </div>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Tilt Detected</h2>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You've logged 2 or more emotional trades (FOMO, Chased, Revenge, or Greedy) in the last 2 hours.
            Take a 5-minute break to reset before trading again.
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3 font-semibold">Cooldown Timer</p>
          <div className="text-5xl font-mono font-bold text-orange-500">
            {minutes}:{seconds.toString().padStart(2, "0")}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-left space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Reset Suggestions</p>
          <ul className="space-y-1.5 text-sm text-foreground">
            <li className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              Step away from the screen completely
            </li>
            <li className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              Take 10 deep breaths (4 seconds in, 6 seconds out)
            </li>
            <li className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              Splash cold water on your face
            </li>
            <li className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              Review your trading plan before re-entering
            </li>
          </ul>
        </div>
        <button
          onClick={canDismiss ? onDismiss : undefined}
          disabled={!canDismiss}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
            canDismiss
              ? "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
              : "bg-muted text-muted-foreground cursor-not-allowed"
          }`}
        >
          {canDismiss ? "I'm Ready — Back to Trading" : "Cooling down..."}
        </button>
      </div>
    </div>
  );
}
