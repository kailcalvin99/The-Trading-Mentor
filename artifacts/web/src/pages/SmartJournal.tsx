import { useState, useCallback, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
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
  CheckCircle2,
  X,
  Sparkles,
  Loader2,
} from "lucide-react";

import type { Trade, CreateTradeBody } from "@workspace/api-client-react";
import { recordTradeResult } from "@/components/CoolDownOverlay";

type BehaviorTag = "FOMO" | "Chased" | "Disciplined" | "Greedy" | "Revenge";
type OutcomeType = "win" | "loss" | "breakeven" | "";
type EntryMode = "conservative" | "aggressive";

interface ExtendedTrade extends Trade {
  behaviorTag?: string | null;
  stressLevel?: number | null;
  isDraft?: boolean | null;
  sideDirection?: string | null;
  followedTimeRule?: boolean | null;
  hasFvgConfirmation?: boolean | null;
  ticker?: string | null;
  setupScore?: number | null;
}


const CONSERVATIVE_CRITERIA = [
  { key: "bias", label: "Bias Check", desc: "Is the 1-Hour chart clearly going up (Bullish) or down (Bearish)?" },
  { key: "sweep", label: "The Sweep", desc: "Did price take out a 15-min high or low?" },
  { key: "shift", label: "The Shift (MSS)", desc: "Is there a 5-min MSS (Market Structure Shift) with a fast move?" },
  { key: "gap", label: "The Gap (FVG)", desc: "Can you see a FVG (Fair Value Gap) on the chart?" },
  { key: "fib", label: "The Fib — OTE (Optimal Trade Entry)", desc: "Is your entry in Discount (for buys) or Premium (for sells)?" },
  { key: "trigger", label: "The Trigger", desc: "Did you place your Limit Order at the start of the FVG?" },
];

const AGGRESSIVE_CRITERIA = [
  { key: "time", label: "Time Check", desc: "Is it between 10:00 AM and 11:00 AM EST?" },
  { key: "poi", label: "POI Identified", desc: "Is price heading toward a clear high or low?" },
  { key: "fvg1m", label: "1m FVG Entry", desc: "Is this the first 1-min FVG (Fair Value Gap) after a liquidity grab?" },
  { key: "risk", label: "Risk ≤ 1%", desc: "Are you risking 1% or less on this trade?" },
];

const BEHAVIOR_TAGS: { tag: BehaviorTag; label: string; color: string; icon: typeof Zap }[] = [
  { tag: "Disciplined", label: "I followed my plan", color: "text-emerald-400", icon: Shield },
  { tag: "FOMO", label: "I jumped in too fast", color: "text-amber-400", icon: Zap },
  { tag: "Chased", label: "I entered late", color: "text-indigo-400", icon: TrendingUp },
  { tag: "Revenge", label: "I traded to get back losses", color: "text-orange-400", icon: AlertTriangle },
  { tag: "Greedy", label: "I held too long", color: "text-red-400", icon: Flame },
];

const NQ_PAIRS = ["NQ1!", "MNQ1!", "ES1!", "MES1!", "RTY1!", "YM1!"];

const SETUP_TYPES = ["FVG", "Order Block", "Liquidity Sweep", "Turtle Soup", "BOS/CHoCH"] as const;

interface TradeFormData {
  pair: string;
  entryTime: string;
  riskPct: string;
  sideDirection: string;
  liquiditySweep: boolean;
  outcome: OutcomeType;
  notes: string;
  behaviorTag: BehaviorTag | "";
  stressLevel: number;
  setupTypes: string[];
}

const DEFAULT_FORM: TradeFormData = {
  pair: "NQ1!",
  entryTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
  riskPct: "0.5",
  sideDirection: "BUY",
  liquiditySweep: false,
  outcome: "",
  notes: "",
  behaviorTag: "",
  stressLevel: 5,
  setupTypes: [],
};

function calculateSetupScore(
  criteriaChecked: number,
  totalCriteria: number,
  hasFvgConfirmation: boolean,
  liquiditySweep: boolean,
  followedTimeRule: boolean,
  stressLevel: number,
  riskPct: number
): number {
  let score = 0;
  score += Math.round((criteriaChecked / totalCriteria) * 40);
  if (hasFvgConfirmation) score += 15;
  if (liquiditySweep) score += 15;
  if (followedTimeRule) score += 10;
  if (stressLevel <= 5) score += 10;
  if (riskPct <= 1) score += 10;
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
  const { isRoutineComplete } = usePlanner();
  const { getNumber } = useAppConfig();
  const qc = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState<number | null>(null);
  const [form, setForm] = useState<TradeFormData>({ ...DEFAULT_FORM });
  const [entryMode, setEntryMode] = useState<EntryMode>("conservative");
  const [entryCriteria, setEntryCriteria] = useState<Record<string, boolean>>({});
  const [expandedTradeId, setExpandedTradeId] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [coachLoading, setCoachLoading] = useState<Record<number, boolean>>({});
  const [coachFeedback, setCoachFeedback] = useState<Record<number, string>>({});
  const [showSitOutWarning, setShowSitOutWarning] = useState(false);

  const { data: tradesRaw } = useListTrades();
  const trades = (tradesRaw ?? []) as ExtendedTrade[];
  const { mutateAsync: createTradeMut, isPending: isCreating } = useCreateTrade();
  const { mutateAsync: deleteTradeMut } = useDeleteTrade();

  const draftTrades = trades.filter((t) => t.isDraft);
  const completedTrades = trades.filter((t) => !t.isDraft);

  const stats = useMemo(() => {
    const wins = completedTrades.filter((t) => t.outcome === "win").length;
    const losses = completedTrades.filter((t) => t.outcome === "loss").length;
    const total = wins + losses;
    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
    const fomoCount = completedTrades.filter((t) => t.behaviorTag === "FOMO").length;
    const disciplinedCount = completedTrades.filter((t) => t.behaviorTag === "Disciplined").length;
    return { total: completedTrades.length, wins, winRate, fomoCount, disciplinedCount };
  }, [completedTrades]);

  const activeCriteria = entryMode === "conservative" ? CONSERVATIVE_CRITERIA : AGGRESSIVE_CRITERIA;
  const criteriaChecked = activeCriteria.filter((c) => entryCriteria[c.key]).length;
  const allCriteriaMet = criteriaChecked === activeCriteria.length;

  const liveSetupScore = useMemo(() => {
    const parsedRisk = parseFloat(form.riskPct) || 0;
    const hasFvg = entryMode === "conservative" ? !!entryCriteria["gap"] : !!entryCriteria["fvg1m"];
    const followedTime = entryMode === "aggressive" ? !!entryCriteria["time"] : true;
    return calculateSetupScore(
      criteriaChecked,
      activeCriteria.length,
      hasFvg,
      form.liquiditySweep,
      followedTime,
      form.stressLevel,
      parsedRisk
    );
  }, [criteriaChecked, activeCriteria.length, entryCriteria, form.liquiditySweep, form.stressLevel, form.riskPct, entryMode]);

  const shouldSitOut = useMemo(() => {
    const sorted = [...completedTrades].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    if (sorted.length === 0) return false;
    if ((sorted[0].stressLevel ?? 0) >= 7) return true;
    if (sorted.length >= 2 && sorted[0].outcome === "loss" && sorted[1].outcome === "loss") return true;
    return false;
  }, [completedTrades]);

  const API_BASE = import.meta.env.VITE_API_URL || "/api";

  const [coachError, setCoachError] = useState<Record<number, boolean>>({});

  async function fetchCoachFeedback(tradeId: number) {
    if (coachFeedback[tradeId] || coachLoading[tradeId]) return;
    setCoachLoading((prev) => ({ ...prev, [tradeId]: true }));
    setCoachError((prev) => ({ ...prev, [tradeId]: false }));
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

  function toggleCriterion(key: string) {
    setEntryCriteria((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function proceedToNewForm() {
    setEditingDraftId(null);
    setEntryMode("conservative");
    setEntryCriteria({});
    setForm({
      ...DEFAULT_FORM,
      entryTime: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
    });
    setShowForm(true);
  }

  function openNewForm() {
    if (!isRoutineComplete) {
      toast({
        title: "Morning Routine Required",
        description: "Complete your morning routine on the Planner tab before logging a trade.",
        variant: "destructive",
      });
      return;
    }
    if (shouldSitOut) {
      setShowSitOutWarning(true);
      return;
    }
    proceedToNewForm();
  }

  function openDraftForm(draft: ExtendedTrade) {
    if (!isRoutineComplete) {
      toast({
        title: "Morning Routine Required",
        description: "Complete your morning routine on the Planner tab before editing drafts.",
        variant: "destructive",
      });
      return;
    }
    setEditingDraftId(draft.id);
    const draftNotes = draft.notes || "";
    const inferredMode: EntryMode = draftNotes.startsWith("[Silver Bullet]") ? "aggressive" : "conservative";
    setEntryMode(inferredMode);
    setEntryCriteria({});
    const cleanNotes = draftNotes.replace(/^\[(Conservative|Silver Bullet)\]\s*/, "");
    setForm({
      pair: draft.pair || "NQ1!",
      entryTime: draft.entryTime || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }),
      riskPct: draft.riskPct?.toString() || "0.5",
      sideDirection: draft.sideDirection || "BUY",
      liquiditySweep: draft.liquiditySweep || false,
      outcome: draft.outcome || "",
      notes: cleanNotes,
      behaviorTag: draft.behaviorTag || "",
      stressLevel: draft.stressLevel || 5,
    });
    setShowForm(true);
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
    if (!allCriteriaMet) {
      toast({ title: "Entry Criteria Required", description: "Check off all entry criteria before saving.", variant: "destructive" });
      return;
    }
    try {
      const modeTag = entryMode === "conservative" ? "[Conservative]" : "[Silver Bullet]";
      const notesWithMode = form.notes ? `${modeTag} ${form.notes}` : modeTag;
      const payload: CreateTradeBody = {
        pair: form.pair,
        entryTime: form.entryTime,
        riskPct: parsedRisk,
        liquiditySweep: form.liquiditySweep,
        outcome: form.outcome || undefined,
        notes: notesWithMode,
        behaviorTag: form.behaviorTag || undefined,
        stressLevel: form.stressLevel,
        isDraft: false,
        sideDirection: form.sideDirection,
        setupScore: liveSetupScore,
        setupType: form.setupTypes.length > 0 ? form.setupTypes.join(", ") : undefined,
      };
      const result = await createTradeMut({ data: payload });
      if (editingDraftId) {
        await deleteTradeMut({ id: editingDraftId });
      }
      if (form.outcome === "win" || form.outcome === "loss") {
        recordTradeResult(form.outcome === "win", getNumber("consecutive_loss_threshold", 2));
      }
      qc.invalidateQueries({ queryKey: getListTradesQueryKey() });
      setShowForm(false);
      setEditingDraftId(null);
      toast({ title: "Trade saved", description: `${form.pair} trade logged successfully.` });
      if (result && result.id) {
        setExpandedTradeId(result.id);
        fetchCoachFeedback(result.id);
      }
    } catch {
      toast({ title: "Error", description: "Could not save trade.", variant: "destructive" });
    }
  }, [form, editingDraftId, entryMode, allCriteriaMet, createTradeMut, deleteTradeMut, qc]);

  const handleDelete = useCallback(async (id: number) => {
    try {
      await deleteTradeMut({ id });
      qc.invalidateQueries({ queryKey: getListTradesQueryKey() });
      setDeleteConfirmId(null);
      toast({ title: "Trade deleted" });
    } catch {
      toast({ title: "Error", description: "Could not delete trade.", variant: "destructive" });
    }
  }, [deleteTradeMut, qc]);

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
                const sorted = [...completedTrades].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

          {/* Routine Lockout */}
          {!isRoutineComplete && (
            <div className="flex items-center gap-3 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400 text-sm">
              <Lock className="h-4 w-4 shrink-0" />
              <span>Complete your Morning Routine on the Planner tab to unlock trade logging</span>
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
            <button
              onClick={openNewForm}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-colors ${
                isRoutineComplete
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-amber-500/10 text-amber-400 border border-amber-500/40 cursor-not-allowed"
              }`}
              disabled={!isRoutineComplete}
            >
              {isRoutineComplete ? <Plus className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {isRoutineComplete ? "Log New Trade" : "Routine Required"}
            </button>
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

                {/* Entry Mode Toggle */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Entry Mode</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => { setEntryMode("conservative"); setEntryCriteria({}); }}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                        entryMode === "conservative"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Shield className="h-3.5 w-3.5" />
                      Conservative
                    </button>
                    <button
                      onClick={() => { setEntryMode("aggressive"); setEntryCriteria({}); }}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold border transition-colors ${
                        entryMode === "aggressive"
                          ? "bg-amber-500 text-black border-amber-500"
                          : "bg-card border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Silver Bullet
                    </button>
                  </div>
                </div>

                {/* Entry Criteria Checklist */}
                <div className="rounded-lg border border-primary/20 bg-card p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-3.5 w-3.5 ${allCriteriaMet ? "text-primary" : "text-amber-400"}`} />
                      <span className={`text-xs font-bold uppercase tracking-wider ${allCriteriaMet ? "text-primary" : "text-amber-400"}`}>
                        Entry Criteria
                      </span>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${allCriteriaMet ? "text-primary border-primary/30" : "text-amber-400 border-amber-400/30"}`}>
                      {criteriaChecked}/{activeCriteria.length}
                    </Badge>
                  </div>
                  <div className="w-full bg-border rounded-full h-1">
                    <div
                      className={`h-1 rounded-full transition-all ${allCriteriaMet ? "bg-primary" : "bg-amber-400"}`}
                      style={{ width: `${(criteriaChecked / activeCriteria.length) * 100}%` }}
                    />
                  </div>
                  {activeCriteria.map((c) => (
                    <label key={c.key} className="flex items-start gap-3 cursor-pointer group">
                      <Checkbox
                        checked={!!entryCriteria[c.key]}
                        onCheckedChange={() => toggleCriterion(c.key)}
                        className="mt-0.5"
                      />
                      <div>
                        <div className={`text-sm font-medium ${entryCriteria[c.key] ? "text-primary" : "text-foreground"}`}>{c.label}</div>
                        <div className="text-xs text-muted-foreground">{c.desc}</div>
                      </div>
                    </label>
                  ))}
                  {!allCriteriaMet && (
                    <p className="text-[11px] text-amber-400 text-center">All criteria must be checked to save this trade</p>
                  )}
                </div>

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

                {/* Entry Time & Risk */}
                <div className="grid grid-cols-2 gap-3">
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

                {/* Side */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Side</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setField("sideDirection", "BUY")}
                      className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                        form.sideDirection === "BUY"
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                          : "bg-card border-border text-muted-foreground"
                      }`}
                    >
                      Long
                    </button>
                    <button
                      onClick={() => setField("sideDirection", "SELL")}
                      className={`py-2 rounded-lg text-sm font-semibold border transition-colors ${
                        form.sideDirection === "SELL"
                          ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : "bg-card border-border text-muted-foreground"
                      }`}
                    >
                      Short
                    </button>
                  </div>
                </div>

                {/* Liquidity Sweep */}
                <div className="flex items-center justify-between p-3 bg-card border border-border rounded-lg">
                  <div>
                    <div className="text-sm font-medium">Liquidity Sweep</div>
                    <div className="text-xs text-muted-foreground">Did price take out a swing high or low before your entry?</div>
                  </div>
                  <Switch
                    checked={form.liquiditySweep}
                    onCheckedChange={(v) => setField("liquiditySweep", v)}
                  />
                </div>

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

                {/* Setup Types */}
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Setup Type (Confluence)</label>
                  <div className="flex flex-wrap gap-2">
                    {SETUP_TYPES.map((st) => (
                      <button
                        key={st}
                        onClick={() => {
                          const current = form.setupTypes;
                          setField(
                            "setupTypes",
                            current.includes(st) ? current.filter((s) => s !== st) : [...current, st]
                          );
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                          form.setupTypes.includes(st)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {st}
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

                {/* Setup Score Badge */}
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
                  disabled={!allCriteriaMet || isCreating || !isRoutineComplete}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-colors ${
                    allCriteriaMet && isRoutineComplete
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : "bg-border text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {isCreating
                    ? "Saving..."
                    : !isRoutineComplete
                    ? "Routine Required"
                    : !allCriteriaMet
                    ? `${criteriaChecked}/${activeCriteria.length} Criteria Met`
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
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Trade History
          </h2>

          {completedTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <BookOpen className="h-10 w-10 mb-3 opacity-40" />
              <p className="font-semibold text-lg">No trades yet</p>
              <p className="text-sm mt-1">Complete your morning routine and log your first trade</p>
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

                          {/* Coach Feedback */}
                          {(coachFeedback[trade.id] || coachLoading[trade.id] || coachError[trade.id] || trade.coachFeedback) && (
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
    </>
  );
}
