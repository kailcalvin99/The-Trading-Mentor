import { useEffect, useCallback, useRef } from "react";

export interface AITrigger {
  message: string;
  autoOpen?: boolean;
  prefillPrompt?: string;
}

interface UseAITriggerOptions {
  dailyLossPct?: number;
  maxDailyLoss?: number;
  onTrigger: (trigger: AITrigger) => void;
}

const KILL_ZONES = [
  { label: "London Kill Zone", startHour: 2, endHour: 5 },
  { label: "New York Kill Zone", startHour: 10, endHour: 11 },
];

function getNewYorkHour(): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(new Date());
    const h = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
    const m = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
    return h + m / 60;
  } catch {
    const now = new Date();
    const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
    return ((utcHour - 5) % 24 + 24) % 24;
  }
}

function isInKillZone(): { active: boolean; label: string } {
  const estHour = getNewYorkHour();
  for (const kz of KILL_ZONES) {
    if (estHour >= kz.startHour && estHour < kz.endHour) {
      return { active: true, label: kz.label };
    }
  }
  return { active: false, label: "" };
}

const QUIZ_FAIL_KEY = "ict-ai-quiz-fail-count";
const KILL_ZONE_NUDGE_KEY = "ict-ai-kz-nudge-last";
const KILL_ZONE_NUDGE_COOLDOWN = 60 * 60 * 1000;

export function getQuizFailCount(): number {
  try {
    return parseInt(localStorage.getItem(QUIZ_FAIL_KEY) || "0", 10) || 0;
  } catch {
    return 0;
  }
}

export function incrementQuizFailCount(): number {
  const next = getQuizFailCount() + 1;
  try {
    localStorage.setItem(QUIZ_FAIL_KEY, String(next));
  } catch {}
  return next;
}

export function resetQuizFailCount() {
  try {
    localStorage.removeItem(QUIZ_FAIL_KEY);
  } catch {}
}

export const AI_TRIGGER_EVENT = "ai-coach-trigger";

export function dispatchAITrigger(trigger: AITrigger) {
  window.dispatchEvent(new CustomEvent(AI_TRIGGER_EVENT, { detail: trigger }));
}

export function useAITrigger({ dailyLossPct = 0, maxDailyLoss = 2, onTrigger }: UseAITriggerOptions) {
  const drawdownNudgedRef = useRef(false);
  const killZoneNudgedRef = useRef(false);

  const fireTrigger = useCallback((trigger: AITrigger) => {
    onTrigger(trigger);
  }, [onTrigger]);

  useEffect(() => {
    function handleCustomEvent(e: Event) {
      const trigger = (e as CustomEvent<AITrigger>).detail;
      if (trigger) fireTrigger(trigger);
    }
    window.addEventListener(AI_TRIGGER_EVENT, handleCustomEvent);
    return () => window.removeEventListener(AI_TRIGGER_EVENT, handleCustomEvent);
  }, [fireTrigger]);

  useEffect(() => {
    if (dailyLossPct <= 0 || maxDailyLoss <= 0) return;
    const ratio = dailyLossPct / maxDailyLoss;

    if (ratio >= 0.75 && !drawdownNudgedRef.current) {
      drawdownNudgedRef.current = true;
      fireTrigger({
        message: "Your drawdown is near the limit — want advice?",
        autoOpen: true,
        prefillPrompt: "My drawdown is getting close to the limit. What should I do?",
      });
    } else if (ratio < 0.5) {
      drawdownNudgedRef.current = false;
    }
  }, [dailyLossPct, maxDailyLoss, fireTrigger]);

  useEffect(() => {
    function checkKillZone() {
      if (killZoneNudgedRef.current) return;
      const kz = isInKillZone();
      if (!kz.active) return;

      let lastNudge = 0;
      try {
        lastNudge = parseInt(localStorage.getItem(KILL_ZONE_NUDGE_KEY) || "0", 10) || 0;
      } catch {}
      if (Date.now() - lastNudge < KILL_ZONE_NUDGE_COOLDOWN) return;

      killZoneNudgedRef.current = true;
      try {
        localStorage.setItem(KILL_ZONE_NUDGE_KEY, String(Date.now()));
      } catch {}
      fireTrigger({ message: `Kill zone is open — ready to trade? (${kz.label})` });
    }

    checkKillZone();
    const interval = setInterval(() => {
      killZoneNudgedRef.current = false;
      checkKillZone();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fireTrigger]);
}
