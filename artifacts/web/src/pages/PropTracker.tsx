import { useState, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  RefreshCw,
  Settings,
  TrendingDown,
  Trophy,
  Target,
  OctagonAlert,
  CheckCircle2,
  Plus,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  useGetPropAccount,
  useCreatePropAccount,
  useAddDailyLoss,
  useResetDailyLoss,
} from "@workspace/api-client-react";

const PROP_FIRM_PRESETS = [
  { name: "FTMO", dailyLoss: 5, totalDrawdown: 10 },
  { name: "MyFundedFutures", dailyLoss: 3, totalDrawdown: 6 },
  { name: "Topstep", dailyLoss: 4, totalDrawdown: 8 },
  { name: "Apex Trader", dailyLoss: 3, totalDrawdown: 6 },
  { name: "Custom", dailyLoss: 2, totalDrawdown: 5 },
];

function CircleGauge({
  pct,
  label,
  used,
  limit,
  size = 160,
}: {
  pct: number;
  label: string;
  used: number;
  limit: number;
  size?: number;
}) {
  const clampedPct = Math.min(pct, 1);
  const isBreached = pct >= 1;
  const isWarning = pct >= 0.75;
  const color = isBreached ? "#EF4444" : isWarning ? "#F59E0B" : "#00C896";
  const trackColor = "rgba(255,255,255,0.06)";

  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2 - 4;
  const startAngle = 135;
  const endAngle = 405;
  const totalAngle = endAngle - startAngle;
  const filledAngle = startAngle + totalAngle * clampedPct;

  const polarToCartesian = (angle: number) => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    };
  };

  const describeArc = (start: number, end: number) => {
    const s = polarToCartesian(start);
    const e = polarToCartesian(end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <svg
          width={size}
          height={size * 0.82}
          viewBox={`0 0 ${size} ${size * 0.86}`}
        >
          <path
            d={describeArc(startAngle, endAngle)}
            fill="none"
            stroke={trackColor}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {clampedPct > 0 && (
            <path
              d={describeArc(startAngle, filledAngle)}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              style={{
                filter: `drop-shadow(0 0 8px ${color}88)`,
                transition: "all 0.6s ease",
              }}
            />
          )}
          <text
            x={cx}
            y={cy - 10}
            textAnchor="middle"
            fill={color}
            fontSize="26"
            fontWeight="700"
            fontFamily="Inter, sans-serif"
          >
            {(pct * 100).toFixed(1)}%
          </text>
          <text
            x={cx}
            y={cy + 12}
            textAnchor="middle"
            fill="rgba(255,255,255,0.45)"
            fontSize="10"
            fontFamily="Inter, sans-serif"
          >
            of {limit}% limit
          </text>
        </svg>
        {isBreached && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="absolute inset-0 rounded-full opacity-10 animate-pulse"
              style={{ backgroundColor: color }}
            />
          </div>
        )}
      </div>
      <div className="text-center">
        <p
          className="text-xs font-bold tracking-wider uppercase"
          style={{ color }}
        >
          {label}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          ${used.toFixed(2)} used
        </p>
      </div>
    </div>
  );
}

function StatusBar({ pct }: { pct: number }) {
  const clampedPct = Math.min(pct, 1);
  const color =
    pct >= 1 ? "#EF4444" : pct >= 0.75 ? "#F59E0B" : "#00C896";
  return (
    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{
          width: `${clampedPct * 100}%`,
          backgroundColor: color,
          boxShadow: pct >= 1 ? `0 0 10px ${color}` : "none",
        }}
      />
    </div>
  );
}

export default function PropTracker() {
  const [showSetup, setShowSetup] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [lossInput, setLossInput] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);

  const [setupForm, setSetupForm] = useState({
    startingBalance: "",
    maxDailyLossPct: "2",
    maxTotalDrawdownPct: "5",
  });

  const { toast } = useToast();

  const { data: account, isLoading, refetch } = useGetPropAccount();
  const { mutateAsync: createAccount, isPending: isSaving } =
    useCreatePropAccount();
  const { mutateAsync: addLoss, isPending: isLogging } = useAddDailyLoss();
  const { mutateAsync: resetLoss } = useResetDailyLoss();

  const hasAccount = !!account;
  const startingBalance = account?.startingBalance ?? 0;
  const currentBalance = account?.currentBalance ?? 0;
  const dailyLoss = account?.dailyLoss ?? 0;
  const totalDrawdown = account?.totalDrawdown ?? 0;
  const maxDailyLossPct = account?.maxDailyLossPct ?? 2;
  const maxTotalDrawdownPct = account?.maxTotalDrawdownPct ?? 5;

  const maxDailyLossAmount = useMemo(
    () => (startingBalance * maxDailyLossPct) / 100,
    [startingBalance, maxDailyLossPct],
  );
  const maxTotalDrawdownAmount = useMemo(
    () => (startingBalance * maxTotalDrawdownPct) / 100,
    [startingBalance, maxTotalDrawdownPct],
  );

  const dailyLossPct = useMemo(
    () =>
      maxDailyLossAmount > 0 ? dailyLoss / maxDailyLossAmount : 0,
    [dailyLoss, maxDailyLossAmount],
  );
  const totalDrawdownPct = useMemo(
    () =>
      maxTotalDrawdownAmount > 0 ? totalDrawdown / maxTotalDrawdownAmount : 0,
    [totalDrawdown, maxTotalDrawdownAmount],
  );

  const isDailyBreached = dailyLossPct >= 1;
  const isTotalBreached = totalDrawdownPct >= 1;
  const isAnyBreached = isDailyBreached || isTotalBreached;

  const dailyRemaining = Math.max(0, maxDailyLossAmount - dailyLoss);
  const totalRemaining = Math.max(0, maxTotalDrawdownAmount - totalDrawdown);

  const handleAddLoss = useCallback(async () => {
    const amount = parseFloat(lossInput);
    if (isNaN(amount) || amount <= 0) return;
    try {
      await addLoss({ data: { amount } });
      setLossInput("");
      refetch();
    } catch {
      toast({
        title: "Failed to log loss",
        description: "Could not save the loss. Please try again.",
        variant: "destructive",
      });
    }
  }, [lossInput, addLoss, refetch, toast]);

  const handleResetDaily = useCallback(async () => {
    try {
      await resetLoss();
      refetch();
    } catch {
      toast({
        title: "Failed to reset daily loss",
        description: "Could not reset. Please try again.",
        variant: "destructive",
      });
    }
    setShowResetConfirm(false);
  }, [resetLoss, refetch, toast]);

  const openSetup = useCallback(() => {
    setSetupForm({
      startingBalance: hasAccount ? startingBalance.toString() : "",
      maxDailyLossPct: hasAccount ? maxDailyLossPct.toString() : "2",
      maxTotalDrawdownPct: hasAccount ? maxTotalDrawdownPct.toString() : "5",
    });
    setSelectedPreset(null);
    setShowSetup(true);
  }, [hasAccount, startingBalance, maxDailyLossPct, maxTotalDrawdownPct]);

  const applyPreset = useCallback(
    (preset: (typeof PROP_FIRM_PRESETS)[0]) => {
      setSelectedPreset(preset.name);
      setSetupForm((f) => ({
        ...f,
        maxDailyLossPct: preset.dailyLoss.toString(),
        maxTotalDrawdownPct: preset.totalDrawdown.toString(),
      }));
    },
    [],
  );

  const handleSave = useCallback(async () => {
    const sb = parseFloat(setupForm.startingBalance);
    const mdl = parseFloat(setupForm.maxDailyLossPct);
    const mtd = parseFloat(setupForm.maxTotalDrawdownPct);
    if (isNaN(sb) || sb <= 0) return;
    try {
      await createAccount({
        data: {
          startingBalance: sb,
          maxDailyLossPct: isNaN(mdl) || mdl <= 0 ? 2 : mdl,
          maxTotalDrawdownPct: isNaN(mtd) || mtd <= 0 ? 5 : mtd,
        },
      });
      refetch();
      setShowSetup(false);
    } catch {
      toast({
        title: "Failed to save account",
        description: "Could not save your account details. Please try again.",
        variant: "destructive",
      });
    }
  }, [setupForm, createAccount, refetch, toast]);

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-11 w-11 rounded-xl bg-secondary animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-32 rounded bg-secondary animate-pulse" />
            <div className="h-4 w-56 rounded bg-secondary animate-pulse" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border p-5 space-y-3">
              <div className="h-3 w-24 rounded bg-secondary animate-pulse" />
              <div className="h-8 w-36 rounded bg-secondary animate-pulse" />
              <div className="h-3 w-28 rounded bg-secondary animate-pulse" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border p-6 space-y-4">
          <div className="h-4 w-40 rounded bg-secondary animate-pulse" />
          <div className="grid grid-cols-2 gap-8">
            <div className="h-36 rounded-full bg-secondary animate-pulse mx-auto w-36" />
            <div className="h-36 rounded-full bg-secondary animate-pulse mx-auto w-36" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "min-h-full transition-colors duration-500",
        isAnyBreached && "bg-red-950/20",
      )}
    >
      {isAnyBreached && (
        <div className="sticky top-0 z-40 flex items-center justify-center gap-3 bg-red-500/10 border-b border-red-500/30 px-4 py-3 backdrop-blur-sm">
          <OctagonAlert className="h-5 w-5 text-red-500 animate-pulse" />
          <span className="text-sm font-bold text-red-400 tracking-widest uppercase">
            {isDailyBreached && isTotalBreached
              ? "CHALLENGE FAILED — BOTH LIMITS BREACHED"
              : isDailyBreached
                ? "DAILY LIMIT HIT — STOP TRADING TODAY"
                : "TOTAL DRAWDOWN LIMIT HIT — CHALLENGE OVER"}
          </span>
          <OctagonAlert className="h-5 w-5 text-red-500 animate-pulse" />
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2 rounded-xl",
                isAnyBreached
                  ? "bg-red-500/10"
                  : "bg-emerald-500/10",
              )}
            >
              <Trophy
                className={cn(
                  "h-7 w-7",
                  isAnyBreached ? "text-red-500" : "text-emerald-500",
                )}
              />
            </div>
            <div>
              <h1
                className={cn(
                  "text-2xl font-bold tracking-tight",
                  isAnyBreached && "text-red-400",
                )}
              >
                Prop Tracker
              </h1>
              <p className="text-sm text-muted-foreground">
                Track your prop firm challenge — daily loss &amp; total drawdown
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={openSetup}>
              <Settings className="h-4 w-4 mr-1.5" />
              {hasAccount ? "Edit Account" : "Setup Account"}
            </Button>
          </div>
        </div>

        {!hasAccount ? (
          <Card className="border-dashed border-2 border-border/50">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <div className="p-4 rounded-2xl bg-emerald-500/10 mb-4">
                <Trophy className="h-10 w-10 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold mb-2">Set Up Your Challenge</h2>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Enter your prop firm account details to start tracking your
                daily loss and total drawdown limits in real time.
              </p>
              <Button
                onClick={openSetup}
                className="bg-emerald-500 text-black hover:bg-emerald-500/90 font-bold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Set Up Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {isAnyBreached && (
              <Card className="border-red-500/40 bg-red-500/5">
                <CardHeader className="pb-3">
                  <CardTitle className="text-red-400 flex items-center gap-2">
                    <OctagonAlert className="h-5 w-5" />
                    Challenge Limit Breached
                  </CardTitle>
                  <CardDescription className="text-red-300/70">
                    {isDailyBreached && isTotalBreached
                      ? "Both your daily loss and total drawdown limits have been breached. Your challenge may be failed."
                      : isDailyBreached
                        ? "You have hit your daily loss limit. Stop trading for today — do not risk failing your challenge."
                        : "You have hit your total drawdown limit. Your prop firm challenge may be over."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-start gap-2 text-sm text-red-200/80">
                    <ChevronRight className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                    Close all open trades immediately
                  </div>
                  <div className="flex items-start gap-2 text-sm text-red-200/80">
                    <ChevronRight className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                    No revenge trading — step away from the screen
                  </div>
                  <div className="flex items-start gap-2 text-sm text-red-200/80">
                    <ChevronRight className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                    Review your trades and write in your journal
                  </div>
                  {isDailyBreached && !isTotalBreached && (
                    <div className="pt-3">
                      <Button
                        variant="outline"
                        onClick={() => setShowResetConfirm(true)}
                        className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 w-full"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reset Daily Loss (New Trading Day)
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Account Balance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={cn(
                      "text-3xl font-bold tracking-tight",
                      isAnyBreached ? "text-red-400" : "text-emerald-500",
                    )}
                  >
                    $
                    {currentBalance.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Starting: ${startingBalance.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card
                className={cn(
                  isDailyBreached &&
                    "border-red-500/40 bg-red-500/5",
                )}
              >
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Daily Loss Remaining
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={cn(
                      "text-3xl font-bold tracking-tight",
                      isDailyBreached
                        ? "text-red-400"
                        : dailyLossPct >= 0.75
                          ? "text-amber-400"
                          : "text-foreground",
                    )}
                  >
                    ${dailyRemaining.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Limit: ${maxDailyLossAmount.toFixed(2)} ({maxDailyLossPct}%)
                  </p>
                  <StatusBar pct={dailyLossPct} />
                </CardContent>
              </Card>

              <Card
                className={cn(
                  isTotalBreached &&
                    "border-red-500/40 bg-red-500/5",
                )}
              >
                <CardHeader className="pb-1">
                  <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Total Drawdown Remaining
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={cn(
                      "text-3xl font-bold tracking-tight",
                      isTotalBreached
                        ? "text-red-400"
                        : totalDrawdownPct >= 0.75
                          ? "text-amber-400"
                          : "text-foreground",
                    )}
                  >
                    ${totalRemaining.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Limit: ${maxTotalDrawdownAmount.toFixed(2)} ({maxTotalDrawdownPct}%)
                  </p>
                  <StatusBar pct={totalDrawdownPct} />
                </CardContent>
              </Card>
            </div>

            <Card
              className={cn(isAnyBreached && "border-red-500/20")}
            >
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Live Drawdown Gauges
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-8 justify-items-center">
                  <CircleGauge
                    pct={dailyLossPct}
                    label="Daily Loss Used"
                    used={dailyLoss}
                    limit={maxDailyLossPct}
                  />
                  <CircleGauge
                    pct={totalDrawdownPct}
                    label="Total Drawdown Used"
                    used={totalDrawdown}
                    limit={maxTotalDrawdownPct}
                  />
                </div>

                <div className="mt-6 grid grid-cols-2 gap-4 text-center border-t border-border pt-5">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Daily Loss
                    </p>
                    <p
                      className={cn(
                        "text-lg font-bold",
                        isDailyBreached
                          ? "text-red-400"
                          : dailyLossPct >= 0.75
                            ? "text-amber-400"
                            : "text-foreground",
                      )}
                    >
                      ${dailyLoss.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      / ${maxDailyLossAmount.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                      Total Drawdown
                    </p>
                    <p
                      className={cn(
                        "text-lg font-bold",
                        isTotalBreached
                          ? "text-red-400"
                          : totalDrawdownPct >= 0.75
                            ? "text-amber-400"
                            : "text-foreground",
                      )}
                    >
                      ${totalDrawdown.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      / ${maxTotalDrawdownAmount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {!isAnyBreached && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-400" />
                    Log a Loss
                  </CardTitle>
                  <CardDescription>
                    Manually add a trade loss to update your daily and total
                    drawdown.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        $
                      </span>
                      <Input
                        type="number"
                        value={lossInput}
                        onChange={(e) => setLossInput(e.target.value)}
                        placeholder="Amount lost on this trade"
                        className="pl-7"
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleAddLoss()
                        }
                        min="0"
                      />
                    </div>
                    <Button
                      onClick={handleAddLoss}
                      disabled={isLogging || !lossInput}
                      className="bg-emerald-500 text-black hover:bg-emerald-500/90 font-bold"
                    >
                      {isLogging ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        "Log Loss"
                      )}
                    </Button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span className="text-muted-foreground">
                        Daily remaining:{" "}
                        <span className="font-bold text-foreground">
                          ${dailyRemaining.toFixed(2)}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                      <span className="text-muted-foreground">
                        Total remaining:{" "}
                        <span className="font-bold text-foreground">
                          ${totalRemaining.toFixed(2)}
                        </span>
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isAnyBreached && (
              <div className="flex justify-center">
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reset Daily Loss Counter (New Day)
                </button>
              </div>
            )}

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Challenge Rules to Pass
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {[
                    {
                      label: "Daily Loss Limit",
                      value: `${maxDailyLossPct}% ($${maxDailyLossAmount.toFixed(2)})`,
                      ok: !isDailyBreached,
                    },
                    {
                      label: "Total Drawdown Limit",
                      value: `${maxTotalDrawdownPct}% ($${maxTotalDrawdownAmount.toFixed(2)})`,
                      ok: !isTotalBreached,
                    },
                    {
                      label: "Starting Balance",
                      value: `$${startingBalance.toLocaleString()}`,
                      ok: true,
                    },
                    {
                      label: "Current Balance",
                      value: `$${currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
                      ok: currentBalance >= startingBalance * (1 - maxTotalDrawdownPct / 100),
                    },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center justify-between rounded-lg border px-3 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            item.ok ? "bg-emerald-500" : "bg-red-500",
                          )}
                        />
                        <span className="text-muted-foreground text-xs">
                          {item.label}
                        </span>
                      </div>
                      <span
                        className={cn(
                          "font-bold text-xs",
                          item.ok ? "text-foreground" : "text-red-400",
                        )}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <Dialog open={showSetup} onOpenChange={setShowSetup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Prop Firm Account Setup</DialogTitle>
            <DialogDescription>
              Enter your challenge account details. Pick a preset or enter
              custom limits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Prop Firm Presets</label>
              <div className="grid grid-cols-3 gap-2">
                {PROP_FIRM_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => applyPreset(preset)}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-xs font-medium transition-colors text-center",
                      selectedPreset === preset.name
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                        : "border-border text-muted-foreground hover:text-foreground hover:border-border/80",
                    )}
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Starting Balance</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  value={setupForm.startingBalance}
                  onChange={(e) =>
                    setSetupForm((f) => ({
                      ...f,
                      startingBalance: e.target.value,
                    }))
                  }
                  placeholder="e.g. 100000"
                  className="pl-7"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Daily Loss %</label>
                <div className="relative">
                  <Input
                    type="number"
                    value={setupForm.maxDailyLossPct}
                    onChange={(e) =>
                      setSetupForm((f) => ({
                        ...f,
                        maxDailyLossPct: e.target.value,
                      }))
                    }
                    placeholder="2"
                    className="pr-7"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    %
                  </span>
                </div>
                {setupForm.startingBalance && setupForm.maxDailyLossPct && (
                  <p className="text-[11px] text-muted-foreground">
                    = $
                    {(
                      (parseFloat(setupForm.startingBalance) *
                        parseFloat(setupForm.maxDailyLossPct)) /
                      100
                    ).toFixed(2)}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Max Total Drawdown %
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    value={setupForm.maxTotalDrawdownPct}
                    onChange={(e) =>
                      setSetupForm((f) => ({
                        ...f,
                        maxTotalDrawdownPct: e.target.value,
                      }))
                    }
                    placeholder="5"
                    className="pr-7"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    %
                  </span>
                </div>
                {setupForm.startingBalance && setupForm.maxTotalDrawdownPct && (
                  <p className="text-[11px] text-muted-foreground">
                    = $
                    {(
                      (parseFloat(setupForm.startingBalance) *
                        parseFloat(setupForm.maxTotalDrawdownPct)) /
                      100
                    ).toFixed(2)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSetup(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !setupForm.startingBalance}
              className="bg-emerald-500 text-black hover:bg-emerald-500/90 font-bold"
            >
              {isSaving ? "Saving..." : "Save Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Daily Loss?</DialogTitle>
            <DialogDescription>
              This resets today's daily loss counter to zero — use this at the
              start of a new trading day. Your total drawdown will remain
              unchanged.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleResetDaily}
              className="bg-emerald-500 text-black hover:bg-emerald-500/90 font-bold"
            >
              Reset Daily Loss
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
