export const PRETRADE_CHECKLIST_KEY = "ict-pretrade-checklist";
export const PRETRADE_CHECKLIST_TTL_HOURS = 4;

export const PRETRADE_CHECKLIST_ITEMS = [
  {
    id: "htf_bias",
    label: "HTF Bias confirmed on Daily chart",
    desc: "The Daily chart is clearly bullish or bearish — no choppy indecision.",
  },
  {
    id: "kill_zone",
    label: "In a Kill Zone right now",
    desc: "You are trading during London Open (2-5 AM EST) or Silver Bullet (10-11 AM EST).",
  },
  {
    id: "sweep_idm",
    label: "Liquidity sweep or IDM confirmed",
    desc: "A liquidity sweep (stop hunt) or IDM (Inducement) has occurred on your entry timeframe.",
  },
  {
    id: "displacement_fvg",
    label: "Displacement with FVG or MSS present",
    desc: "Big displacement candles created an FVG or MSS — Smart Money is behind this move.",
  },
] as const;

export type PretradeChecklistId = typeof PRETRADE_CHECKLIST_ITEMS[number]["id"];

export function getPretradeChecklistState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(PRETRADE_CHECKLIST_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    const ageMs = Date.now() - (data.timestamp || 0);
    if (ageMs > PRETRADE_CHECKLIST_TTL_HOURS * 60 * 60 * 1000) {
      localStorage.removeItem(PRETRADE_CHECKLIST_KEY);
      return {};
    }
    return data.checked || {};
  } catch {
    return {};
  }
}

export function savePretradeChecklistState(checked: Record<string, boolean>) {
  localStorage.setItem(
    PRETRADE_CHECKLIST_KEY,
    JSON.stringify({ checked, timestamp: Date.now() })
  );
}

export function resetPretradeChecklistState() {
  localStorage.removeItem(PRETRADE_CHECKLIST_KEY);
}
