import { useState, useEffect, useCallback } from "react";
import {
  Newspaper,
  TrendingUp,
  Layers,
  Clock,
  Shield,
  CheckSquare,
  Square,
  X,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { usePlanner } from "@/contexts/PlannerContext";
import { SMART_MONEY_SECTIONS } from "@/hooks/useTodaySchedule";

function getESTNow(): Date {
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

const KILL_ZONES = [
  { id: "london", label: "London Open", startH: 2, startM: 0, endH: 5, endM: 0, color: "#F59E0B" },
  { id: "ny_open", label: "NY Open / AM", startH: 7, startM: 0, endH: 10, endM: 0, color: "#00C896" },
  { id: "silver_bullet", label: "Silver Bullet", startH: 10, startM: 0, endH: 11, endM: 0, color: "#EF4444" },
  { id: "london_close", label: "London Close", startH: 11, startM: 0, endH: 12, endM: 0, color: "#818CF8" },
];

function detectKillZone(): string {
  const est = getESTNow();
  const totalMin = est.getHours() * 60 + est.getMinutes();
  const kz = KILL_ZONES.find(
    (k) => totalMin >= k.startH * 60 + k.startM && totalMin < k.endH * 60 + k.endM
  );
  return kz ? kz.label : "";
}

const ZONE_KEYS: Record<string, string> = {
  markFVG: "FVG",
  markPrevDayHL: "PDH/PDL",
  markOrderBlocks: "OB",
};

const SECTION_ICONS = [Newspaper, TrendingUp, Layers, Clock, Shield];
const SECTION_LABELS = ["Check the News", "Find the Big Trend", "Mark Your Zones", "Check the Clock", "Risk and Mindset"];

const SM_DATA_KEY = "smart_money_data_";

function getTodaySmKey() {
  return SM_DATA_KEY + new Date().toISOString().split("T")[0];
}

interface SmartMoneyData {
  marketBias: string;
  drawOnLiquidity: string;
  zoneNotes: string;
  riskPct: string;
}

function loadSmData(): SmartMoneyData {
  try {
    const raw = localStorage.getItem(getTodaySmKey());
    if (raw) return JSON.parse(raw);
  } catch {}
  return { marketBias: "", drawOnLiquidity: "", zoneNotes: "", riskPct: "" };
}

function saveSmData(data: SmartMoneyData) {
  localStorage.setItem(getTodaySmKey(), JSON.stringify(data));
}

export default function SmartMoneyChecklist({ compact = false }: { compact?: boolean }) {
  const { routineItems, toggleItem, setTradePlanDefault } = usePlanner();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});
  const [smData, setSmData] = useState<SmartMoneyData>(loadSmData);
  const [detectedKZ, setDetectedKZ] = useState<string>(() => detectKillZone());

  useEffect(() => {
    const id = setInterval(() => {
      const kz = detectKillZone();
      setDetectedKZ(kz);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  const updateSmData = useCallback((updates: Partial<SmartMoneyData>) => {
    setSmData((prev) => {
      const next = { ...prev, ...updates };
      saveSmData(next);
      if (updates.marketBias !== undefined) setTradePlanDefault("marketBias", updates.marketBias);
      if (updates.drawOnLiquidity !== undefined) setTradePlanDefault("drawOnLiquidity", updates.drawOnLiquidity);
      if (updates.zoneNotes !== undefined) setTradePlanDefault("zoneNotes", updates.zoneNotes);
      if (updates.riskPct !== undefined) setTradePlanDefault("riskPct", updates.riskPct);
      return next;
    });
  }, [setTradePlanDefault]);

  useEffect(() => {
    if (detectedKZ) {
      setTradePlanDefault("detectedKillZone", detectedKZ);
    }
  }, [detectedKZ, setTradePlanDefault]);

  function toggleSection(sectionId: number) {
    setCollapsedSections((prev) => ({ ...prev, [sectionId]: !prev[sectionId] }));
  }

  function handleCheckItem(key: string, sectionId: number) {
    const willBeChecked = !routineItems[key];
    toggleItem(key);
    if (key === "checkNews" && willBeChecked) {
      setCalendarOpen(true);
    }
    if (key === "checkKillZone") {
      const kz = detectKillZone();
      setDetectedKZ(kz);
      setTradePlanDefault("detectedKillZone", kz || "");
    }
    if (key in ZONE_KEYS) {
      const zoneItems = Object.entries(ZONE_KEYS).reduce((acc, [k, label]) => {
        const isCurrentKey = k === key;
        const isChecked = isCurrentKey ? willBeChecked : !!routineItems[k];
        if (isChecked) acc.push(label);
        return acc;
      }, [] as string[]);
      if (zoneItems.length > 0) {
        setTradePlanDefault("zoneNotes", `Marked: ${zoneItems.join(", ")}`);
      }
    }
  }

  const totalItems = SMART_MONEY_SECTIONS.flatMap((s) => s.items).length;
  const checkedCount = SMART_MONEY_SECTIONS.flatMap((s) => s.items).filter((i) => routineItems[i.key]).length;
  const allDone = checkedCount === totalItems;

  return (
    <>
      {/* Economic Calendar Modal */}
      {calendarOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={() => setCalendarOpen(false)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
          <div
            className="relative bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
              <Newspaper className="h-5 w-5 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-foreground">Economic Calendar</h2>
                <p className="text-xs text-amber-400 mt-0.5 font-medium">
                  Red folder rule — stay out for 15 minutes before and after high-impact events
                </p>
              </div>
              <a
                href="https://www.investing.com/economic-calendar/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:text-primary/80 font-semibold flex items-center gap-1 shrink-0"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Open Full Site
              </a>
              <button
                onClick={() => setCalendarOpen(false)}
                className="ml-1 p-1.5 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden rounded-b-2xl min-h-0">
              <iframe
                src="https://sslecal2.investing.com?columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&features=datepicker,timezone&countries=5,22,25,34,32,6&calType=week&timeZone=8&lang=1"
                title="Economic Calendar"
                className="w-full h-full border-0"
                style={{ minHeight: "500px" }}
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            </div>
            <div className="px-5 py-3 border-t border-border shrink-0 bg-card rounded-b-2xl">
              <p className="text-xs text-muted-foreground">
                <span className="text-red-400 font-bold">Red</span> = high impact ·{" "}
                <span className="text-amber-400 font-bold">Orange</span> = medium ·{" "}
                <span className="text-muted-foreground font-bold">Gray</span> = low impact
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Progress bar header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-bold text-foreground">The Smart Money Daily Standards</span>
          </div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${allDone ? "bg-emerald-500/20 text-emerald-400" : "bg-secondary text-muted-foreground"}`}>
            {checkedCount}/{totalItems}
          </span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%`,
              backgroundColor: allDone ? "#10b981" : "hsl(var(--primary))",
            }}
          />
        </div>
        {allDone && (
          <p className="text-xs text-emerald-400 font-semibold mt-1.5 text-center animate-pulse">
            ✓ Standards Complete — You're cleared to trade
          </p>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {SMART_MONEY_SECTIONS.map((section, sIdx) => {
          const SectionIcon = SECTION_ICONS[sIdx];
          const sectionItems = section.items;
          const sectionDone = sectionItems.every((i) => routineItems[i.key]);
          const sectionChecked = sectionItems.filter((i) => routineItems[i.key]).length;
          const isCollapsed = collapsedSections[section.id] ?? false;

          return (
            <div
              key={section.id}
              className={`rounded-xl border transition-all overflow-hidden ${
                sectionDone
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "border-border bg-card"
              }`}
            >
              <button
                className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-left"
                onClick={() => toggleSection(section.id)}
              >
                <span
                  className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold shrink-0 text-white"
                  style={{ backgroundColor: sectionDone ? "#10b981" : section.color }}
                >
                  {sectionDone ? "✓" : section.id}
                </span>
                <SectionIcon className="h-3.5 w-3.5 shrink-0" style={{ color: sectionDone ? "#10b981" : section.color }} />
                <span className={`text-xs font-bold flex-1 ${sectionDone ? "text-emerald-400" : "text-foreground"}`}>
                  {section.title}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium mr-1">
                  {sectionChecked}/{sectionItems.length}
                </span>
                {isCollapsed
                  ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                }
              </button>

              {!isCollapsed && (
                <div className="px-3.5 pb-3 space-y-2 border-t border-border/50">
                  {sectionItems.map((item) => {
                    const checked = !!routineItems[item.key];
                    return (
                      <div key={item.key} className="pt-2">
                        <button
                          onClick={() => handleCheckItem(item.key, section.id)}
                          className={`w-full flex items-start gap-3 text-left group rounded-lg p-2 transition-colors ${
                            checked ? "bg-emerald-500/10" : "hover:bg-secondary/40"
                          }`}
                        >
                          <div className="shrink-0 mt-0.5">
                            {checked
                              ? <CheckSquare className="h-4 w-4 text-emerald-400" />
                              : <Square className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-semibold leading-tight ${checked ? "text-emerald-400 line-through opacity-70" : "text-foreground"}`}>
                              {item.label}
                              {item.key === "checkNews" && (
                                <span className="ml-1.5 text-amber-400 font-normal not-sr-only no-underline" style={{ textDecoration: "none" }}>
                                  — tap to open calendar
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{item.desc}</p>
                          </div>
                        </button>

                        {/* Section 1: open calendar button when checking the calendar item */}
                        {item.key === "markNewsTime" && (
                          <div className="mt-1 ml-9 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <p className="text-[11px] text-amber-400 font-semibold">
                              Red Folder Rule: Avoid trading 15 min before and after high-impact events
                            </p>
                          </div>
                        )}

                        {/* Section 2: bias input when checking findHTFBias */}
                        {item.key === "findHTFBias" && (
                          <div className="mt-1.5 ml-7 space-y-1.5">
                            <div className="flex gap-1.5 flex-wrap">
                              {["Bullish", "Bearish", "Neutral"].map((bias) => (
                                <button
                                  key={bias}
                                  onClick={() => updateSmData({ marketBias: smData.marketBias === bias ? "" : bias })}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                    smData.marketBias === bias
                                      ? bias === "Bullish"
                                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                                        : bias === "Bearish"
                                        ? "bg-red-500/20 border-red-500 text-red-400"
                                        : "bg-secondary border-foreground/30 text-foreground"
                                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:border-foreground/30"
                                  }`}
                                >
                                  {bias}
                                </button>
                              ))}
                            </div>
                            {smData.marketBias && (
                              <p className="text-[10px] text-muted-foreground ml-0.5">
                                Bias saved → auto-fills journal
                              </p>
                            )}
                          </div>
                        )}

                        {/* Section 2: DOL input */}
                        {item.key === "markDOL" && (
                          <div className="mt-1.5 ml-7">
                            <input
                              type="text"
                              value={smData.drawOnLiquidity}
                              onChange={(e) => updateSmData({ drawOnLiquidity: e.target.value })}
                              placeholder="e.g. Previous week high at 21,500..."
                              className="w-full bg-secondary/40 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            {smData.drawOnLiquidity && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 ml-0.5">
                                DOL saved → auto-fills journal notes
                              </p>
                            )}
                          </div>
                        )}

                        {/* Section 3: zone notes */}
                        {item.key === "markOrderBlocks" && (
                          <div className="mt-1.5 ml-7">
                            <input
                              type="text"
                              value={smData.zoneNotes}
                              onChange={(e) => updateSmData({ zoneNotes: e.target.value })}
                              placeholder="FVG @ 21,450, PDH @ 21,600, OB @ 21,380..."
                              className="w-full bg-secondary/40 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                            {smData.zoneNotes && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 ml-0.5">
                                Zone data saved → auto-fills journal notes
                              </p>
                            )}
                          </div>
                        )}

                        {/* Section 4: kill zone auto-detect */}
                        {item.key === "checkKillZone" && (
                          <div className="mt-1.5 ml-7">
                            {detectedKZ ? (
                              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-primary/10 border border-primary/20">
                                <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                                <div>
                                  <p className="text-xs font-bold text-primary">{detectedKZ} is active</p>
                                  <p className="text-[10px] text-muted-foreground">Auto-detected from your local time (EST)</p>
                                </div>
                              </div>
                            ) : (
                              <div className="px-2.5 py-1.5 rounded-lg bg-secondary/40 border border-border">
                                <p className="text-xs text-muted-foreground">
                                  No kill zone active right now · London 2–5 AM, NY 7–10 AM, Silver Bullet 10–11 AM (EST)
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Section 5: risk input */}
                        {item.key === "setRisk" && (
                          <div className="mt-1.5 ml-7">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                value={smData.riskPct}
                                onChange={(e) => updateSmData({ riskPct: e.target.value })}
                                placeholder="1"
                                min="0"
                                max="5"
                                step="0.1"
                                className="w-24 bg-secondary/40 border border-border rounded-lg px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                              <span className="text-xs text-muted-foreground">% risk per trade</span>
                            </div>
                            {smData.riskPct && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 ml-0.5">
                                Risk saved → auto-fills journal position calculator
                              </p>
                            )}
                          </div>
                        )}

                        {/* Section 5: mindset note */}
                        {item.key === "checkMindset" && (
                          <div className="mt-1 ml-7 px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
                            <p className="text-[11px] text-red-400 font-semibold">
                              If you're not calm → sit out. Protecting capital IS trading.
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
