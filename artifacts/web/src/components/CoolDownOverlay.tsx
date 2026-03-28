import { useState, useEffect } from "react";
import { Shield, Clock, BookOpen, AlertTriangle, Flame } from "lucide-react";
import { useAppConfig } from "@/contexts/AppConfigContext";

const COOLDOWN_KEY = "ict-cooldown-timer";
const CONSECUTIVE_LOSSES_KEY = "ict-consecutive-losses";
const DEFAULT_COOLDOWN_HOURS = 4;
const DEFAULT_THRESHOLD = 2;

interface CoolDownData {
  timestamp: number;
  reason: string;
  durationHours?: number;
}

export function getConsecutiveLosses(): number {
  try {
    return parseInt(localStorage.getItem(CONSECUTIVE_LOSSES_KEY) || "0", 10);
  } catch { return 0; }
}

export function recordTradeResult(won: boolean, threshold = DEFAULT_THRESHOLD) {
  if (won) {
    localStorage.setItem(CONSECUTIVE_LOSSES_KEY, "0");
  } else {
    const current = getConsecutiveLosses();
    const newCount = current + 1;
    localStorage.setItem(CONSECUTIVE_LOSSES_KEY, String(newCount));

    if (newCount >= threshold) {
      activateCoolDown(`Max Daily Loss reached — ${threshold} consecutive losses. Take a break to prevent revenge trading.`);
      localStorage.setItem(CONSECUTIVE_LOSSES_KEY, "0");
    }
  }
}

export function activateCoolDown(reason: string, durationHours = DEFAULT_COOLDOWN_HOURS) {
  const data: CoolDownData = { timestamp: Date.now(), reason, durationHours };
  localStorage.setItem(COOLDOWN_KEY, JSON.stringify(data));
}

export function getCoolDownStatus(fallbackDurationHours = DEFAULT_COOLDOWN_HOURS): { active: boolean; remainingMs: number; reason: string } {
  try {
    const raw = localStorage.getItem(COOLDOWN_KEY);
    if (!raw) return { active: false, remainingMs: 0, reason: "" };
    const data: CoolDownData = JSON.parse(raw);
    const hours = data.durationHours ?? fallbackDurationHours;
    const durationMs = hours * 60 * 60 * 1000;
    const elapsed = Date.now() - data.timestamp;
    if (elapsed >= durationMs) {
      localStorage.removeItem(COOLDOWN_KEY);
      return { active: false, remainingMs: 0, reason: "" };
    }
    return { active: true, remainingMs: durationMs - elapsed, reason: data.reason };
  } catch { return { active: false, remainingMs: 0, reason: "" }; }
}

function formatTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  const secs = Math.floor((ms % 60000) / 1000);
  return `${hours}h ${mins.toString().padStart(2, "0")}m ${secs.toString().padStart(2, "0")}s`;
}

export default function CoolDownOverlay() {
  const { getNumber, isFeatureEnabled } = useAppConfig();
  const cooldownHours = getNumber("cooldown_duration_hours", DEFAULT_COOLDOWN_HOURS);
  const [status, setStatus] = useState(() => getCoolDownStatus(cooldownHours));

  useEffect(() => {
    if (!status.active) return;
    const interval = setInterval(() => {
      const s = getCoolDownStatus(cooldownHours);
      setStatus(s);
      if (!s.active) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [status.active, cooldownHours]);

  if (!isFeatureEnabled("feature_cooldown_timer")) return null;
  if (!status.active) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-card border border-destructive/30 rounded-2xl p-8 max-w-md text-center mx-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
          <Shield className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold mb-2">Cool Down Active</h2>
        <p className="text-sm text-muted-foreground mb-4">{status.reason}</p>

        <div className="bg-destructive/10 rounded-xl p-6 mb-6">
          <Clock className="h-6 w-6 text-destructive mx-auto mb-2" />
          <p className="text-3xl font-bold text-destructive font-mono">{formatTime(status.remainingMs)}</p>
          <p className="text-xs text-muted-foreground mt-2">until trading resumes</p>
        </div>

        <div className="bg-secondary/50 rounded-xl p-4 text-left space-y-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-semibold">Use this time wisely:</span>
          </div>
          <ul className="text-xs text-muted-foreground space-y-2 ml-6">
            <li className="flex items-start gap-2">
              <span className="text-primary">1.</span>
              <span>Review your losing trades — what went wrong?</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">2.</span>
              <span>Did you follow your trade plan or deviate?</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">3.</span>
              <span>Go for a walk, meditate, or do something non-trading</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">4.</span>
              <span>Study a lesson in the ICT Academy</span>
            </li>
          </ul>
        </div>

        <div className="mt-4 flex items-center gap-2 justify-center text-xs text-muted-foreground">
          <AlertTriangle className="h-3.5 w-3.5" />
          <span>Discipline protects your capital</span>
        </div>
      </div>
    </div>
  );
}

export function FailureAnalysis() {
  const { getNumber, isFeatureEnabled } = useAppConfig();
  const threshold = getNumber("consecutive_loss_threshold", DEFAULT_THRESHOLD);
  const cooldownHours = getNumber("cooldown_duration_hours", DEFAULT_COOLDOWN_HOURS);

  if (!isFeatureEnabled("feature_cooldown_timer")) return null;

  const losses = getConsecutiveLosses();
  if (losses < 1) return null;

  return (
    <div className={`rounded-xl border p-4 mb-4 ${losses >= threshold ? "border-destructive/30 bg-destructive/5" : "border-amber-500/30 bg-amber-500/5"}`}>
      <div className="flex items-center gap-2 mb-2">
        <Flame className={`h-4 w-4 ${losses >= threshold ? "text-destructive" : "text-amber-500"}`} />
        <span className={`text-sm font-bold ${losses >= threshold ? "text-destructive" : "text-amber-500"}`}>
          {losses >= threshold ? `Warning: ${threshold} Consecutive Losses` : `${losses} Loss in a Row`}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {losses >= threshold
          ? `You've hit your max daily loss limit. A ${cooldownHours}-hour cool-down will activate to protect your capital from revenge trading.`
          : "Stay disciplined. Review your last trade before entering another. Does your next setup meet ALL your rules?"
        }
      </p>
    </div>
  );
}
