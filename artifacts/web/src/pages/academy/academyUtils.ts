export const PROGRESS_KEY = "ict-academy-progress";
export const STREAK_KEY = "ict-academy-streak";
export const XP_KEY = "ict-academy-xp";

export function getProgress(): Set<string> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch {}
  return new Set();
}

export function setProgress(completed: Set<string>) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify([...completed]));
}

export function getStreak(): number {
  return parseInt(localStorage.getItem(STREAK_KEY) || "0", 10);
}

export function getXP(): number {
  return parseInt(localStorage.getItem(XP_KEY) || "0", 10);
}

export async function syncProgressFromApi(): Promise<Set<string> | null> {
  try {
    const res = await fetch("/api/academy/progress", { credentials: "include" });
    if (!res.ok) return null;
    const json = await res.json();
    if (json.lessonIds && Array.isArray(json.lessonIds)) {
      return new Set(json.lessonIds as string[]);
    }
  } catch {}
  return null;
}

export async function saveProgressToApi(completed: Set<string>): Promise<void> {
  try {
    await fetch("/api/academy/progress", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ lessonIds: [...completed] }),
    });
  } catch {}
}

const IMAGE_DIMENSIONS: Record<string, { width: number; height: number }> = {
  "chart-idm-inducement.webp": { width: 1408, height: 768 },
  "lesson-why-lose.webp": { width: 1408, height: 768 },
};

export function getImageDimensions(filename: string): { width: number; height: number } {
  return IMAGE_DIMENSIONS[filename] ?? { width: 1280, height: 896 };
}

export function getImageUrl(filename: string): string {
  const base = import.meta.env.BASE_URL;
  return `${base}images/${filename}`;
}
