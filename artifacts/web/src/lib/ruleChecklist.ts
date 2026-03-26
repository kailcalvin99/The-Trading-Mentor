export const RULES_CHECKLIST_KEY = "ict-rules-checklist";
export const RULES_CHECKLIST_TTL_HOURS = 4;

export const RULES_CHECKLIST_ITEMS = [
  {
    id: "not_revenge",
    label: "I am NOT revenge trading",
    desc: "If you took a loss in the last 30 min, close the platform and walk away.",
  },
  {
    id: "emotional_state",
    label: "I am calm, focused, and not emotional",
    desc: "FOMO, anger, or euphoria are disqualifiers. Check yourself.",
  },
  {
    id: "bias_reviewed",
    label: "I reviewed my HTF bias this session",
    desc: "You looked at the Daily/4H chart today before trading.",
  },
  {
    id: "no_red_news",
    label: "No red-folder news event in next 30 min",
    desc: "Check ForexFactory. Avoid entries within 30 min of a red event.",
  },
  {
    id: "max_trades",
    label: "Max daily trades limit NOT exceeded",
    desc: "If you've already hit your daily max, do not take this trade.",
  },
  {
    id: "risk_defined",
    label: "Stop loss is pre-defined before entry",
    desc: "Never enter without knowing exactly where you're wrong.",
  },
] as const;

export type RulesChecklistId = typeof RULES_CHECKLIST_ITEMS[number]["id"];

export function getRulesChecklistState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(RULES_CHECKLIST_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    const ageMs = Date.now() - (data.timestamp || 0);
    if (ageMs > RULES_CHECKLIST_TTL_HOURS * 60 * 60 * 1000) {
      localStorage.removeItem(RULES_CHECKLIST_KEY);
      return {};
    }
    return data.checked || {};
  } catch {
    return {};
  }
}

export function saveRulesChecklistState(checked: Record<string, boolean>) {
  localStorage.setItem(
    RULES_CHECKLIST_KEY,
    JSON.stringify({ checked, timestamp: Date.now() })
  );
}

export function resetRulesChecklistState() {
  localStorage.removeItem(RULES_CHECKLIST_KEY);
}
