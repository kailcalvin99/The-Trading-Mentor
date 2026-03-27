export function getESTNow(): Date {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(new Date()).map((p) => [p.type, p.value])
  );
  return new Date(
    Number(parts.year), Number(parts.month) - 1, Number(parts.day),
    Number(parts.hour), Number(parts.minute), Number(parts.second)
  );
}

export const SESSIONS = [
  { name: "London Open", emoji: "🌍", startH: 2, startM: 0, endH: 5, endM: 0, color: "#F59E0B", time: "2:00–5:00 AM EST" },
  { name: "NY Open", emoji: "📈", startH: 9, startM: 30, endH: 10, endM: 0, color: "#00C896", time: "9:30–10:00 AM EST" },
  { name: "Silver Bullet", emoji: "🎯", startH: 10, startM: 0, endH: 11, endM: 0, color: "#EF4444", time: "10:00–11:00 AM EST" },
  { name: "London Close", emoji: "🔔", startH: 11, startM: 0, endH: 12, endM: 0, color: "#818CF8", time: "11:00 AM–12:00 PM EST" },
] as const;

export type Session = typeof SESSIONS[number];

export function getActiveSession(nowMins: number): Session | undefined {
  return SESSIONS.find(
    (s) => nowMins >= s.startH * 60 + s.startM && nowMins < s.endH * 60 + s.endM
  );
}

export function getNextKillZone(): string {
  const est = getESTNow();
  const nowMins = est.getHours() * 60 + est.getMinutes();
  for (const session of SESSIONS) {
    const sessionMins = session.startH * 60 + session.startM;
    if (sessionMins > nowMins) {
      const diff = sessionMins - nowMins;
      const h = Math.floor(diff / 60);
      const m = diff % 60;
      if (h > 0) return `${session.name} in ${h}h ${m}m`;
      return `${session.name} in ${m}m`;
    }
  }
  return "London Open at 2:00 AM EST (tomorrow)";
}

export const KILL_ZONES = [
  { id: "london", label: "London Open", startH: 2, startM: 0, endH: 5, endM: 0, color: "#F59E0B" },
  { id: "ny_open", label: "NY Open / AM", startH: 7, startM: 0, endH: 10, endM: 0, color: "#00C896" },
  { id: "silver_bullet", label: "Silver Bullet", startH: 10, startM: 0, endH: 11, endM: 0, color: "#EF4444" },
  { id: "london_close", label: "London Close", startH: 11, startM: 0, endH: 12, endM: 0, color: "#818CF8" },
] as const;

export type KillZone = typeof KILL_ZONES[number];

export function getActiveKillZone(): KillZone | undefined {
  const est = getESTNow();
  const totalMin = est.getHours() * 60 + est.getMinutes();
  return KILL_ZONES.find(
    (k) => totalMin >= k.startH * 60 + k.startM && totalMin < k.endH * 60 + k.endM
  );
}
