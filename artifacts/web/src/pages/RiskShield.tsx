import { useState, useCallback, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
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
  Eye,
  EyeOff,
  RefreshCw,
  Shield,
  Settings,
  TrendingDown,
  Calculator,
  CircleDot,
  OctagonAlert,
  CheckSquare,
  Square,
  ClipboardCheck,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useGetPropAccount,
  useCreatePropAccount,
  useAddDailyLoss,
  useResetDailyLoss,
} from "@workspace/api-client-react";

const NQ_POINT_VALUE = 20;
const MNQ_POINT_VALUE = 2;

const CHECKLIST_STORAGE_KEY = "ict-pretrade-checklist";
const CHECKLIST_TTL_HOURS = 4;

const CHECKLIST_ITEMS = [
  { id: "htf_bias", label: "HTF Bias confirmed on Daily chart", desc: "The Daily chart is clearly bullish or bearish — no choppy indecision." },
  { id: "kill_zone", label: "In a Kill Zone right now", desc: "You are trading during London Open (2-5 AM EST) or Silver Bullet (10-11 AM EST)." },
  { id: "sweep_idm", label: "Liquidity sweep or IDM confirmed", desc: "A liquidity sweep (stop hunt) or IDM (Inducement) has occurred on your entry timeframe." },
  { id: "displacement_fvg", label: "Displacement with FVG or MSS present", desc: "Big displacement candles created an FVG or MSS — Smart Money is behind this move." },
];

function getChecklistState(): { checked: Record<string, boolean>; timestamp: number } {
  try {
    const raw = localStorage.getItem(CHECKLIST_STORAGE_KEY);
    if (!raw) return { checked: {}, timestamp: 0 };
    const data = JSON.parse(raw);
    const ageMs = Date.now() - (data.timestamp || 0);
    if (ageMs > CHECKLIST_TTL_HOURS * 60 * 60 * 1000) {
      localStorage.removeItem(CHECKLIST_STORAGE_KEY);
      return { checked: {}, timestamp: 0 };
    }
    return data;
  } catch { return { checked: {}, timestamp: 0 }; }
}

function saveChecklistState(checked: Record<string, boolean>) {
  localStorage.setItem(CHECKLIST_STORAGE_KEY, JSON.stringify({ checked, timestamp: Date.now() }));
}

function MechanicalChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>(() => getChecklistState().checked);
  const [ttlAnchor, setTtlAnchor] = useState(() => getChecklistState().timestamp);
  const allChecked = CHECKLIST_ITEMS.every((item) => checked[item.id]);

  useEffect(() => {
    if (ttlAnchor <= 0) return;
    const expiresAt = ttlAnchor + CHECKLIST_TTL_HOURS * 60 * 60 * 1000;
    const msLeft = expiresAt - Date.now();
    if (msLeft <= 0) {
      setChecked({});
      setTtlAnchor(0);
      localStorage.removeItem(CHECKLIST_STORAGE_KEY);
      return;
    }
    const timer = setTimeout(() => {
      setChecked({});
      setTtlAnchor(0);
      localStorage.removeItem(CHECKLIST_STORAGE_KEY);
    }, msLeft);
    return () => clearTimeout(timer);
  }, [ttlAnchor]);

  function toggle(id: string) {
    const next = { ...checked, [id]: !checked[id] };
    setChecked(next);
    saveChecklistState(next);
    if (ttlAnchor <= 0) {
      setTtlAnchor(Date.now());
    }
  }

  function reset() {
    setChecked({});
    setTtlAnchor(0);
    localStorage.removeItem(CHECKLIST_STORAGE_KEY);
  }

  return (
    <Card className="mb-6 border-emerald-500/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-emerald-500" />
            <div>
              <CardTitle className="text-base font-bold">Mechanical Pre-Trade Checklist</CardTitle>
              <CardDescription className="text-xs mt-0.5">Complete all 4 criteria before the position calculator activates</CardDescription>
            </div>
          </div>
          <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Reset
          </button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-500 font-medium">
          Buy in Discount (below 50% of range) · Sell in Premium (above 50% of range)
        </div>
        {CHECKLIST_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => toggle(item.id)}
            className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
              checked[item.id]
                ? "bg-emerald-500/10 border-emerald-500/30"
                : "bg-secondary/30 border-border hover:border-emerald-500/30"
            }`}
          >
            {checked[item.id]
              ? <CheckSquare className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              : <Square className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />}
            <div>
              <div className={`text-sm font-semibold ${checked[item.id] ? "text-emerald-400" : "text-foreground"}`}>
                {item.label}
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
            </div>
          </button>
        ))}
        <div className={`rounded-xl border p-3 text-center text-sm font-bold transition-all ${
          allChecked
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-secondary/30 border-border text-muted-foreground"
        }`}>
          {allChecked ? "✓ Checklist Complete — Position Calculator Active" : `${Object.values(checked).filter(Boolean).length} / ${CHECKLIST_ITEMS.length} criteria met — complete all to unlock calculator`}
        </div>
      </CardContent>
    </Card>
  );
}

const STOP_TRADING_RULES = [
  "You hit your max daily loss — you are DONE for today",
  "Close ALL open trades right now",
  "No revenge trading — write down what happened in your journal",
  "Step away from the screen and clear your head",
  "Come back tomorrow with a fresh start",
];

const EXIT_RULES = [
  "Keep your stop loss where you set it — no exceptions",
  "Don't move your stop to breakeven too early",
  "Wait for price to reach your target — don't exit early",
  "Get out right away if the market turns against you (MSS — Market Structure Shift)",
  "Only have one trade open at a time — don't add to a losing trade",
];

function DrawdownGauge({
  value,
  max,
  label,
  size = 180,
}: {
  value: number;
  max: number;
  label: string;
  size?: number;
}) {
  const pct = Math.min(value / max, 1);
  const color = pct >= 1 ? "#EF4444" : pct >= 0.75 ? "#F59E0B" : "#00C896";
  const trackColor = "rgba(255,255,255,0.06)";

  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2 - 4;
  const startAngle = 135;
  const endAngle = 405;
  const totalAngle = endAngle - startAngle;
  const filledAngle = startAngle + totalAngle * pct;

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
    <div className="flex flex-col items-center">
      <svg
        width={size}
        height={size * 0.8}
        viewBox={`0 0 ${size} ${size * 0.85}`}
      >
        <path
          d={describeArc(startAngle, endAngle)}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        {pct > 0 && (
          <path
            d={describeArc(startAngle, filledAngle)}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 0 6px ${color}66)`,
              transition: "all 0.5s ease",
            }}
          />
        )}
        <text
          x={cx}
          y={cy - 8}
          textAnchor="middle"
          fill={color}
          fontSize="28"
          fontWeight="700"
          fontFamily="Inter, sans-serif"
        >
          {value.toFixed(1)}%
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fill="rgba(255,255,255,0.5)"
          fontSize="11"
          fontFamily="Inter, sans-serif"
        >
          of {max}% limit
        </text>
      </svg>
      <span className="text-xs text-muted-foreground mt-1 tracking-wide uppercase font-semibold">
        {label}
      </span>
    </div>
  );
}

function GaugeBar({
  value,
  max,
  label,
  isStopTrading,
}: {
  value: number;
  max: number;
  label: string;
  isStopTrading?: boolean;
}) {
  const pct = Math.min(value / max, 1);
  const color = pct >= 1 ? "#EF4444" : pct >= 0.75 ? "#F59E0B" : "#00C896";

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-bold" style={{ color }}>
          {value.toFixed(2)}%
        </span>
      </div>
      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct * 100}%`,
            backgroundColor: color,
            boxShadow: isStopTrading ? `0 0 12px ${color}88` : "none",
          }}
        />
      </div>
      <div className="text-right">
        <span className="text-[10px] text-muted-foreground">
          Limit: {max}%
        </span>
      </div>
    </div>
  );
}

export default function RiskShield() {
  const [showAccountSetup, setShowAccountSetup] = useState(false);
  const [showFocusMode, setShowFocusMode] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [lossInput, setLossInput] = useState("");
  const [pointsAtRisk, setPointsAtRisk] = useState("");
  const [customBalance, setCustomBalance] = useState("");
  const [checklistAllDone, setChecklistAllDone] = useState(() =>
    CHECKLIST_ITEMS.every((item) => getChecklistState().checked[item.id])
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const state = getChecklistState();
      setChecklistAllDone(CHECKLIST_ITEMS.every((item) => state.checked[item.id]));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const [setupForm, setSetupForm] = useState({
    startingBalance: "",
    maxDailyLossPct: "",
    maxTotalDrawdownPct: "",
  });

  const { data: account, refetch } = useGetPropAccount();
  const { mutateAsync: createAccount } = useCreatePropAccount();
  const { mutateAsync: addLoss } = useAddDailyLoss();
  const { mutateAsync: resetLoss } = useResetDailyLoss();

  const balance = account?.currentBalance ?? 50000;
  const startingBalance = account?.startingBalance ?? 50000;
  const dailyLoss = account?.dailyLoss ?? 0;
  const maxDailyLoss = account?.maxDailyLossPct ?? 2;
  const maxTotalLoss = account?.maxTotalDrawdownPct ?? 10;

  const dailyLossPct = useMemo(
    () => (startingBalance > 0 ? (dailyLoss / startingBalance) * 100 : 0),
    [dailyLoss, startingBalance],
  );
  const totalLossPct = useMemo(
    () =>
      startingBalance > 0
        ? ((startingBalance - balance) / startingBalance) * 100
        : 0,
    [startingBalance, balance],
  );
  const isStopTrading = dailyLossPct >= maxDailyLoss;

  const parsedCustomBalance = parseFloat(customBalance);
  const calcBalance =
    customBalance && !isNaN(parsedCustomBalance) && parsedCustomBalance > 0
      ? parsedCustomBalance
      : balance;
  const riskAmount = calcBalance * 0.005;
  const pts = parseFloat(pointsAtRisk) || 0;
  const nqContracts = pts > 0 ? riskAmount / (pts * NQ_POINT_VALUE) : 0;
  const mnqContracts = pts > 0 ? riskAmount / (pts * MNQ_POINT_VALUE) : 0;

  function handleUpgradeError(err: unknown, action: string) {
    const status = (err as { status?: number })?.status;
    if (status === 403) {
      toast({
        title: "Upgrade required",
        description: `${action} requires a Standard plan or higher. Visit the Pricing page to upgrade.`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Error",
        description: `Could not ${action.toLowerCase()}. Please try again.`,
        variant: "destructive",
      });
    }
  }

  const handleAddLoss = useCallback(async () => {
    const amount = parseFloat(lossInput);
    if (isNaN(amount) || amount <= 0) return;
    try {
      await addLoss({ data: { amount } });
      setLossInput("");
      refetch();
    } catch (err) {
      handleUpgradeError(err, "Logging losses");
    }
  }, [lossInput, addLoss, refetch]);

  const handleResetDaily = useCallback(async () => {
    try {
      await resetLoss();
      refetch();
    } catch (err) {
      handleUpgradeError(err, "Resetting daily loss");
    }
    setShowResetConfirm(false);
  }, [resetLoss, refetch]);

  const openAccountSetup = useCallback(() => {
    setSetupForm({
      startingBalance: startingBalance.toString(),
      maxDailyLossPct: maxDailyLoss.toString(),
      maxTotalDrawdownPct: maxTotalLoss.toString(),
    });
    setShowAccountSetup(true);
  }, [startingBalance, maxDailyLoss, maxTotalLoss]);

  const handleSaveAccount = useCallback(async () => {
    const sb = parseFloat(setupForm.startingBalance);
    const mdl = parseFloat(setupForm.maxDailyLossPct);
    const mtd = parseFloat(setupForm.maxTotalDrawdownPct);
    if (isNaN(sb) || sb <= 0) return;
    try {
      await createAccount({
        data: {
          startingBalance: sb,
          maxDailyLossPct: isNaN(mdl) || mdl <= 0 ? 2 : mdl,
          maxTotalDrawdownPct: isNaN(mtd) || mtd <= 0 ? 10 : mtd,
        },
      });
      refetch();
      setShowAccountSetup(false);
    } catch (err) {
      handleUpgradeError(err, "Saving account settings");
    }
  }, [setupForm, createAccount, refetch]);

  return (
    <div
      className={cn(
        "min-h-full transition-colors duration-300",
        isStopTrading && "bg-red-950/20",
      )}
    >
      {isStopTrading && (
        <div className="sticky top-0 z-40 flex items-center justify-center gap-3 bg-red-500/10 border-b border-red-500/30 px-4 py-3 backdrop-blur-sm">
          <OctagonAlert className="h-5 w-5 text-red-500 animate-pulse" />
          <span className="text-sm font-bold text-red-400 tracking-widest uppercase">
            STOP TRADING — DAILY LIMIT HIT
          </span>
          <OctagonAlert className="h-5 w-5 text-red-500 animate-pulse" />
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <MechanicalChecklist />

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Shield
              className={cn(
                "h-8 w-8",
                isStopTrading ? "text-red-500" : "text-emerald-500",
              )}
            />
            <div>
              <h1
                className={cn(
                  "text-2xl font-bold tracking-tight",
                  isStopTrading && "text-red-400",
                )}
              >
                Risk Shield
              </h1>
              <p className="text-sm text-muted-foreground">
                Protect your funded account and figure out how much to trade
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={openAccountSetup}
            >
              <Settings className="h-4 w-4 mr-1.5" />
              Account
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFocusMode(true)}
              className="border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-500"
            >
              <EyeOff className="h-4 w-4 mr-1.5" />
              Focus Mode
            </Button>
          </div>
        </div>

        {isStopTrading && (
          <Card className="mb-6 border-red-500/40 bg-red-500/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-red-400 flex items-center gap-2 text-xl">
                <OctagonAlert className="h-6 w-6" />
                STOP TRADING
              </CardTitle>
              <CardDescription className="text-red-300/70">
                You lost the most you're allowed to lose today. Follow the rules below.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {STOP_TRADING_RULES.map((rule, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="text-red-400 font-bold text-sm min-w-[20px]">
                    {i + 1}.
                  </span>
                  <span className="text-red-200/80 text-sm leading-relaxed">
                    {rule}
                  </span>
                </div>
              ))}
              <div className="pt-3">
                <Button
                  variant="outline"
                  onClick={() => setShowResetConfirm(true)}
                  className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300 w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Daily Loss Counter
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card
              className={cn(isStopTrading && "border-red-500/30 bg-red-500/[0.03]")}
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Account Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    "text-4xl font-bold tracking-tight",
                    isStopTrading ? "text-red-400" : "text-emerald-500",
                  )}
                >
                  $
                  {balance.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                  })}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Starting: ${startingBalance.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card
              className={cn(isStopTrading && "border-red-500/30 bg-red-500/[0.03]")}
            >
              <CardHeader className="pb-4">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <TrendingDown className="h-4 w-4" />
                  Drawdown Gauges (How Much You've Lost)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <DrawdownGauge
                    value={dailyLossPct}
                    max={maxDailyLoss}
                    label="Daily Drawdown (Lost Today)"
                  />
                  <DrawdownGauge
                    value={totalLossPct}
                    max={maxTotalLoss}
                    label="Total Drawdown (Lost Overall)"
                  />
                </div>
                <div className="mt-6 space-y-4">
                  <GaugeBar
                    value={dailyLossPct}
                    max={maxDailyLoss}
                    label="Daily Drawdown (Lost Today)"
                    isStopTrading={isStopTrading}
                  />
                  <GaugeBar
                    value={totalLossPct}
                    max={maxTotalLoss}
                    label="Total Drawdown (Lost Overall)"
                  />
                </div>
              </CardContent>
            </Card>

            {!isStopTrading && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <TrendingDown className="h-4 w-4 text-red-400" />
                    Log a Loss
                  </CardTitle>
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
                      />
                    </div>
                    <Button
                      onClick={handleAddLoss}
                      className="bg-emerald-500 text-black hover:bg-emerald-500/90 font-bold"
                    >
                      Log
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!isStopTrading && (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mx-auto"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reset Daily Loss
              </button>
            )}
          </div>

          <div className="space-y-6">
            <Card className={cn(!checklistAllDone && "opacity-60")}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Calculator className={cn("h-5 w-5", !checklistAllDone ? "text-muted-foreground" : "text-emerald-500")} />
                  <div>
                    <CardTitle className="text-base font-bold">
                      Position Size Calculator
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {!checklistAllDone
                        ? "Complete the Pre-Trade Checklist above first"
                        : "Figure out how many contracts to trade so you only risk 0.5%"}
                    </CardDescription>
                  </div>
                  {!checklistAllDone && (
                    <Lock className="h-4 w-4 text-muted-foreground ml-auto" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!checklistAllDone && (
                  <div className="flex flex-col items-center justify-center gap-3 py-6 text-center">
                    <Lock className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm font-semibold text-muted-foreground">Complete checklist first</p>
                    <p className="text-xs text-muted-foreground/70 max-w-xs">Check off all 4 pre-trade criteria above to unlock the position size calculator.</p>
                  </div>
                )}
                {checklistAllDone && (
                <>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <label className="text-sm text-muted-foreground whitespace-nowrap">
                      Account Balance
                    </label>
                    <div className="relative w-[180px]">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        $
                      </span>
                      <Input
                        type="number"
                        value={customBalance}
                        onChange={(e) =>
                          setCustomBalance(e.target.value)
                        }
                        placeholder={balance.toFixed(0)}
                        className="pl-7 text-sm h-9"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4">
                    <label className="text-sm text-muted-foreground whitespace-nowrap">
                      Points at Risk (Stop Loss Distance)
                    </label>
                    <div className="relative w-[180px]">
                      <Input
                        type="number"
                        value={pointsAtRisk}
                        onChange={(e) =>
                          setPointsAtRisk(e.target.value)
                        }
                        placeholder="e.g. 10"
                        className="pr-10 text-sm h-9"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                        pts
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 bg-emerald-500/10 rounded-lg px-3 py-2.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  <span className="text-xs text-emerald-500 font-medium">
                    Max Risk: ${riskAmount.toFixed(2)} (0.5% of $
                    {calcBalance.toLocaleString()})
                  </span>
                </div>

                {pts > 0 ? (
                  <div className="rounded-xl border overflow-hidden">
                    <div className="flex items-center justify-between p-4">
                      <div>
                        <div className="text-sm font-semibold">
                          NQ Full Contract
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${NQ_POINT_VALUE}/point
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-emerald-500">
                          {nqContracts.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          contracts
                        </div>
                      </div>
                    </div>
                    <div className="h-px bg-border" />
                    <div className="flex items-center justify-between p-4">
                      <div>
                        <div className="text-sm font-semibold">
                          MNQ Micro Contract
                        </div>
                        <div className="text-xs text-muted-foreground">
                          ${MNQ_POINT_VALUE}/point
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-amber-400">
                          {Math.round(mnqContracts)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          contracts
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border p-6 text-center">
                    <CircleDot className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Enter points at risk to calculate position size
                    </p>
                  </div>
                )}
                </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showAccountSetup} onOpenChange={setShowAccountSetup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Prop Firm Account Setup (Your Funded Account)</DialogTitle>
            <DialogDescription>
              Set up your starting balance and the most you're allowed to lose.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
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
                  placeholder="50000"
                  className="pl-7"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Max Daily Loss % (Most you can lose in a day)
                </label>
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
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Max Total Drawdown % (Most you can lose overall)
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
                    placeholder="10"
                    className="pr-7"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    %
                  </span>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAccountSetup(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveAccount}
              className="bg-emerald-500 text-black hover:bg-emerald-500/90 font-bold"
            >
              Save Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Daily Loss?</DialogTitle>
            <DialogDescription>
              This will set today's loss back to zero. Your total
              losses overall will stay the same.
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
              Reset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showFocusMode && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col items-center overflow-y-auto p-6">
          <div className="max-w-lg w-full space-y-8 my-auto">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">FOCUS MODE</h2>
              <p className="text-muted-foreground">
                Your profit and loss is hidden — stay focused on the process
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6">
              <h3 className="text-xs font-bold text-emerald-500 tracking-[0.15em] uppercase mb-5">
                EXIT RULES
              </h3>
              <div className="space-y-3.5">
                {EXIT_RULES.map((rule, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                    <span className="text-[15px] text-foreground/90 leading-relaxed">
                      {rule}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border p-5">
              <h3 className="text-[10px] font-bold text-muted-foreground tracking-[0.15em] uppercase mb-3">
                MINDSET ANCHOR
              </h3>
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                "I follow my plan, not my emotions. My job is to take the
                right setup. If I do that, the results will come."
              </p>
            </div>

            <Button
              onClick={() => setShowFocusMode(false)}
              className="w-full bg-emerald-500 text-black hover:bg-emerald-500/90 font-bold h-12 text-base rounded-xl"
            >
              <Eye className="h-5 w-5 mr-2" />
              Exit Focus Mode
            </Button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 pb-6">
        <p className="text-center text-[11px] text-muted-foreground/60 border-t border-border pt-4">
          ⚠️ For educational purposes only. Not financial advice. Trading futures and forex involves substantial risk of loss.{" "}
          <Link to="/risk-disclosure" className="underline hover:text-muted-foreground transition-colors">Full Risk Disclosure</Link>
        </p>
      </div>
    </div>
  );
}
