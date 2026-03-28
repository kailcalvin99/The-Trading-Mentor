import fs from "fs";
import path from "path";
import { db } from "@workspace/db";
import { adminSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  DEFAULT_ICT_SYSTEM_PROMPT,
  CODE_EDITOR_SYSTEM_PROMPT,
  ADMIN_CODEBASE_KNOWLEDGE,
} from "./systemPrompts";

export const WORKSPACE_ROOT = path.resolve(process.cwd(), "../..");
export const ARTIFACTS_ROOT = path.resolve(WORKSPACE_ROOT, "artifacts");

export function resolveRealPath(absPath: string): string {
  try {
    return fs.realpathSync(absPath);
  } catch {
    const parentDir = path.dirname(absPath);
    try {
      return path.join(fs.realpathSync(parentDir), path.basename(absPath));
    } catch {
      return absPath;
    }
  }
}

export function isInsideArtifacts(absPath: string): boolean {
  const realPath = resolveRealPath(absPath);
  return realPath === ARTIFACTS_ROOT || realPath.startsWith(ARTIFACTS_ROOT + path.sep);
}


export async function getSystemPrompt(isAdmin = false): Promise<string> {
  let basePrompt: string;
  try {
    const [row] = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "ai_mentor_system_prompt"));
    if (row && row.value && row.value.trim().length > 0) {
      basePrompt = row.value;
    } else {
      basePrompt = DEFAULT_ICT_SYSTEM_PROMPT;
    }
  } catch {
    basePrompt = DEFAULT_ICT_SYSTEM_PROMPT;
  }
  if (isAdmin) {
    basePrompt += "\n\n" + ADMIN_CODEBASE_KNOWLEDGE;
  }
  return basePrompt;
}

export interface KillZone {
  name: string;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  description: string;
  tip: string;
}

export const ICT_KILL_ZONES: KillZone[] = [
  { name: "Asian Session / Accumulation", startHour: 20, startMin: 0, endHour: 0, endMin: 0, description: "Price sets the overnight range. No trades — watch for the levels being built.", tip: "Mark the Asian session high and low. These will be the liquidity targets for London and NY." },
  { name: "London Open Kill Zone", startHour: 2, startMin: 0, endHour: 5, endMin: 0, description: "First major liquidity hunt of the day. London often creates the Judas Swing (fake direction).", tip: "Watch for a sweep of the Asian range high or low, followed by a CHoCH. That's your London entry signal." },
  { name: "New York AM Kill Zone", startHour: 7, startMin: 0, endHour: 10, endMin: 0, description: "Highest volume session. The real daily direction is established here. Best setups of the day.", tip: "Combine with the 5-step process: confirm HTF bias, then look for a sweep + FVG inside this window." },
  { name: "Silver Bullet", startHour: 10, startMin: 0, endHour: 11, endMin: 0, description: "ICT's most precise 1-hour entry window. 1-min and 5-min FVG entries with the cleanest risk-reward.", tip: "Only take FVG entries aligned with the NY AM bias. Stop loss beyond the manipulation wick." },
  { name: "London Close", startHour: 10, startMin: 0, endHour: 12, endMin: 0, description: "London closes, often reversing the AM move. Good for counter-trend scalps — experienced traders only.", tip: "If the AM move was very extended, watch for a partial retrace during this window." },
  { name: "New York PM Session", startHour: 13, startMin: 30, endHour: 16, endMin: 0, description: "Lower volume afternoon session. Can continue or partially retrace the AM move.", tip: "Lower probability than the AM session. If you are not premium/experienced, this window is best avoided." },
];

export function getNyTime(): { hour: number; minute: number; totalMinutes: number; label: string } {
  const now = new Date();
  const nyString = now.toLocaleString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: false });
  const [hStr, mStr] = nyString.split(":");
  const hour = parseInt(hStr, 10);
  const minute = parseInt(mStr, 10);
  const label = now.toLocaleString("en-US", { timeZone: "America/New_York", hour: "numeric", minute: "2-digit", hour12: true, weekday: "short" });
  return { hour, minute, totalMinutes: hour * 60 + minute, label };
}

export function isInZone(zone: KillZone, totalMinutes: number): boolean {
  const start = zone.startHour * 60 + zone.startMin;
  let end = zone.endHour * 60 + zone.endMin;
  if (end === 0) end = 24 * 60;
  if (start <= end) return totalMinutes >= start && totalMinutes < end;
  return totalMinutes >= start || totalMinutes < end;
}

export function minutesUntilZone(zone: KillZone, totalMinutes: number): number {
  const start = zone.startHour * 60 + zone.startMin;
  if (start > totalMinutes) return start - totalMinutes;
  return (24 * 60 - totalMinutes) + start;
}

