export const PRETRADE_FVG_KEY = "ict-fvg-checklist";
export const PRETRADE_FVG_TTL_HOURS = 4;

export const PRETRADE_FVG_ITEMS = [
  {
    id: "fvg_identified",
    label: "FVG identified on entry TF (1m/2m/5m)",
    desc: "Two non-overlapping candles with a visible gap — that's your FVG.",
  },
  {
    id: "fvg_direction",
    label: "FVG aligns with HTF bias direction",
    desc: "A bullish FVG in a bearish market is a trap. Bias must match.",
  },
  {
    id: "fvg_fresh",
    label: "FVG has NOT been filled yet",
    desc: "Price must not have retraced into the gap — it must still be open.",
  },
  {
    id: "fvg_zone",
    label: "FVG sits in Premium or Discount zone",
    desc: "Buys at discount FVGs, sells at premium FVGs (50% equilibrium rule).",
  },
] as const;

export type FvgChecklistId = typeof PRETRADE_FVG_ITEMS[number]["id"];

export function getFvgChecklistState(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(PRETRADE_FVG_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    const ageMs = Date.now() - (data.timestamp || 0);
    if (ageMs > PRETRADE_FVG_TTL_HOURS * 60 * 60 * 1000) {
      localStorage.removeItem(PRETRADE_FVG_KEY);
      return {};
    }
    return data.checked || {};
  } catch {
    return {};
  }
}

export function saveFvgChecklistState(checked: Record<string, boolean>) {
  localStorage.setItem(
    PRETRADE_FVG_KEY,
    JSON.stringify({ checked, timestamp: Date.now() })
  );
}

export function resetFvgChecklistState() {
  localStorage.removeItem(PRETRADE_FVG_KEY);
}
