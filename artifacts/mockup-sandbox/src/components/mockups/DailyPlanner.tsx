import React, { useState, useEffect } from "react";
import {
  Droplets, Wind, Newspaper, TrendingUp, Plus, Clock, Trash2,
  Check, Lock, Unlock, AlertTriangle, Zap, Globe,
  CirclePlus,
} from "lucide-react";
import { PlannerProvider, usePlanner } from "@/contexts/PlannerContext";
import type { RoutineKey } from "@/contexts/PlannerContext";
import { Switch } from "@/components/ui/switch";

function getESTNow(): Date {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
  return new Date(
    parseInt(get("year")),
    parseInt(get("month")) - 1,
    parseInt(get("day")),
    parseInt(get("hour")),
    parseInt(get("minute")),
    parseInt(get("second"))
  );
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "LIVE NOW";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

interface Session {
  name: string;
  subtitle: string;
  startH: number;
  startM: number;
  endH: number;
  endM: number;
  color: string;
}

const SESSIONS: Session[] = [
  { name: "NY Open", subtitle: "9:30 AM EST — Main session opens", startH: 9, startM: 30, endH: 10, endM: 0, color: "#00C896" },
  { name: "Silver Bullet", subtitle: "10:00–11:00 AM EST — Prime ICT window", startH: 10, startM: 0, endH: 11, endM: 0, color: "#F59E0B" },
  { name: "London Open", subtitle: "2:00–5:00 AM EST — European session", startH: 2, startM: 0, endH: 5, endM: 0, color: "#818CF8" },
];

const ROUTINE_ITEMS: { key: RoutineKey; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: "water", label: "Water & Physical Reset", icon: <Droplets className="w-[18px] h-[18px]" />, desc: "Hydrate, stretch, step outside 2 min" },
  { key: "breathing", label: "5-Min Box Breathing", icon: <Wind className="w-[18px] h-[18px]" />, desc: "Inhale 4s → Hold 4s → Exhale 4s → Hold 4s" },
  { key: "news", label: "ForexFactory News Check", icon: <Newspaper className="w-[18px] h-[18px]" />, desc: "Check for Red folder high-impact events" },
  { key: "bias", label: "HTF Bias Review", icon: <TrendingUp className="w-[18px] h-[18px]" />, desc: "Daily & 4H chart — Premium or Discount?" },
];

const TRADERS_CODE = [
  "Never risk more than 0.5% per trade on NQ",
  "No new trades outside the 10–11 AM Silver Bullet window",
  "Red folder news = you are a spectator, not a trader",
  "Complete Morning Routine before any trade entry",
  "Honor your stop loss — no exceptions",
];

function DailyPlannerInner() {
  const {
    routineItems, isRoutineComplete, hasRedNews, toggleItem, toggleRedNews,
    customItems, addCustomItem, removeCustomItem, toggleCustomItem, snoozeCustomItem,
  } = usePlanner();
  const [newItemText, setNewItemText] = useState("");
  const [, setTick] = useState(0);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const est = getESTNow();
  const timeStr = est.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
  const dateStr = est.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
  const completedCount = Object.values(routineItems).filter(Boolean).length;
  const todayDate = new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" });

  const handleAddItem = () => {
    if (newItemText.trim()) {
      addCustomItem(newItemText);
      setNewItemText("");
    }
  };

  const tradingUnlocked = isRoutineComplete && !hasRedNews;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="max-w-2xl mx-auto px-4 py-6 pb-24">

        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-[28px] font-bold text-white">Daily Planner</h1>
            <p className="text-[13px] text-[#8B8BA0] mt-0.5">{dateStr}</p>
          </div>
          <div className="bg-[#12121A] border border-[#1E1E2E] rounded-xl px-4 py-2.5 text-center">
            <p className="text-sm font-bold text-[#00C896]">{timeStr}</p>
            <p className="text-[10px] text-[#8B8BA0] mt-0.5">EST</p>
          </div>
        </div>

        {hasRedNews && (
          <div className="flex items-start gap-2.5 bg-[rgba(255,68,68,0.1)] border border-[rgba(255,68,68,0.35)] rounded-xl p-3.5 mb-3.5">
            <AlertTriangle className="w-[22px] h-[22px] text-[#FF4444] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-[13px] font-bold text-[#FF4444] mb-0.5">🔴 RED FOLDER ACTIVE</p>
              <p className="text-[13px] text-[#FF9999] leading-[18px]">You are a SPECTATOR — not a trader. Wait until volatility settles after the event.</p>
            </div>
          </div>
        )}

        <div
          className="rounded-[14px] p-3.5 mb-5 border-[1.5px]"
          style={{
            backgroundColor: "#12121A",
            borderColor: tradingUnlocked ? "#00C896" : "#F59E0B",
          }}
        >
          <div className="flex items-center gap-2">
            {tradingUnlocked ? (
              <Unlock className="w-[22px] h-[22px] text-[#00C896]" />
            ) : (
              <Lock className="w-[22px] h-[22px] text-[#F59E0B]" />
            )}
            <p
              className="text-sm font-semibold flex-1"
              style={{ color: tradingUnlocked ? "#00C896" : "#F59E0B" }}
            >
              {hasRedNews
                ? "SPECTATOR MODE — Red News Event"
                : isRoutineComplete
                ? "✓ TRADING UNLOCKED"
                : `Complete Routine (${completedCount}/4) to unlock trading`}
            </p>
          </div>
          {!isRoutineComplete && (
            <div className="h-1 bg-[#1E1E2E] rounded-sm mt-2.5 overflow-hidden">
              <div
                className="h-full bg-[#F59E0B] rounded-sm transition-all duration-300"
                style={{ width: `${(completedCount / 4) * 100}%` }}
              />
            </div>
          )}
        </div>

        <p className="text-[11px] font-semibold text-[#8B8BA0] uppercase tracking-[1.2px] mb-2.5 mt-0.5">Morning Routine</p>
        <div className="bg-[#12121A] rounded-2xl border border-[#1E1E2E] mb-5 overflow-hidden">
          {ROUTINE_ITEMS.map((item, idx) => (
            <div key={item.key}>
              {idx > 0 && <div className="h-px bg-[#1E1E2E]" />}
              <button
                className="flex items-center w-full p-3.5 hover:bg-[#1A1A24] transition-colors text-left"
                onClick={() => toggleItem(item.key)}
              >
                <div
                  className="w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center shrink-0 transition-colors"
                  style={{
                    backgroundColor: routineItems[item.key] ? "#00C896" : "transparent",
                    borderColor: routineItems[item.key] ? "#00C896" : "#1E1E2E",
                  }}
                >
                  {routineItems[item.key] && <Check className="w-[13px] h-[13px] text-[#0A0A0F]" />}
                </div>
                <div className="flex-1 ml-3">
                  <p
                    className="text-[15px] font-medium mb-0.5 transition-colors"
                    style={{
                      color: routineItems[item.key] ? "#8B8BA0" : "#FFFFFF",
                      textDecoration: routineItems[item.key] ? "line-through" : "none",
                    }}
                  >
                    {item.label}
                  </p>
                  <p className="text-xs text-[#8B8BA0]">{item.desc}</p>
                </div>
                <span style={{ color: routineItems[item.key] ? "#00C896" : "#8B8BA0" }}>
                  {item.icon}
                </span>
              </button>

              {item.key === "news" && routineItems.news && (
                <div className="flex items-center gap-2 px-3.5 pb-3">
                  <AlertTriangle className="w-4 h-4 text-[#FF9999]" />
                  <span className="flex-1 text-[13px] text-[#FF9999]">Red folder news today?</span>
                  <Switch
                    checked={hasRedNews}
                    onCheckedChange={toggleRedNews}
                    className="data-[state=checked]:bg-[rgba(255,68,68,0.5)] data-[state=unchecked]:bg-[#1E1E2E] scale-[0.85]"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <p className="text-[11px] font-semibold text-[#8B8BA0] uppercase tracking-[1.2px] mb-2.5 mt-0.5">My Routine</p>
        <div className="bg-[#12121A] rounded-2xl border border-[#1E1E2E] mb-5 overflow-hidden">
          {customItems.length === 0 && !newItemText ? (
            <div className="flex items-center justify-center gap-2 p-[18px]">
              <CirclePlus className="w-5 h-5 text-[#55556A]" />
              <span className="text-[13px] text-[#55556A]">Add personal routine items below</span>
            </div>
          ) : (
            customItems.map((item, idx) => {
              const isSnoozed = item.snoozedDate === todayDate;
              return (
                <div key={item.id}>
                  {idx > 0 && <div className="h-px bg-[#1E1E2E]" />}
                  <div
                    className="flex items-center py-2.5 pl-3.5 pr-1.5 transition-opacity"
                    style={{ opacity: isSnoozed ? 0.4 : 1 }}
                  >
                    <button
                      className="flex items-center flex-1 text-left"
                      onClick={() => !isSnoozed && toggleCustomItem(item.id)}
                      disabled={isSnoozed}
                    >
                      <div
                        className="w-[22px] h-[22px] rounded-md border-2 flex items-center justify-center shrink-0 transition-colors"
                        style={{
                          backgroundColor: item.checked ? "#8B8BA0" : "transparent",
                          borderColor: item.checked ? "#8B8BA0" : "#1E1E2E",
                        }}
                      >
                        {item.checked && <Check className="w-[13px] h-[13px] text-[#0A0A0F]" />}
                      </div>
                      <span
                        className="text-[15px] font-medium ml-3 transition-colors"
                        style={{
                          color: isSnoozed ? "#55556A" : item.checked ? "#8B8BA0" : "#FFFFFF",
                          textDecoration: item.checked || isSnoozed ? "line-through" : "none",
                        }}
                      >
                        {item.label}
                      </span>
                      {isSnoozed && (
                        <span className="ml-2 text-[11px] text-[#55556A]">snoozed</span>
                      )}
                    </button>
                    <div className="flex items-center gap-0.5">
                      {!isSnoozed && (
                        <button
                          className="p-2 hover:bg-[#1A1A24] rounded-lg transition-colors"
                          onClick={() => snoozeCustomItem(item.id)}
                          title="Snooze for 24 hours"
                        >
                          <Clock className="w-[18px] h-[18px] text-[#8B8BA0]" />
                        </button>
                      )}
                      {deleteConfirm === item.id ? (
                        <div className="flex items-center gap-1 ml-1">
                          <button
                            className="px-2 py-1 text-xs bg-[#FF4444] text-white rounded-md hover:bg-[#cc3636] transition-colors"
                            onClick={() => { removeCustomItem(item.id); setDeleteConfirm(null); }}
                            aria-label="Confirm delete"
                          >
                            Delete
                          </button>
                          <button
                            className="px-2 py-1 text-xs bg-[#1E1E2E] text-[#8B8BA0] rounded-md hover:bg-[#2a2a3a] transition-colors"
                            onClick={() => setDeleteConfirm(null)}
                            aria-label="Cancel delete"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="p-2 hover:bg-[#1A1A24] rounded-lg transition-colors"
                          onClick={() => setDeleteConfirm(item.id)}
                          title="Delete item"
                        >
                          <Trash2 className="w-[18px] h-[18px] text-[#FF4444]" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div className="h-px bg-[#1E1E2E]" />
          <div className="flex items-center p-2.5 pl-3.5 gap-2">
            <input
              className="flex-1 text-sm text-white font-medium py-1.5 bg-transparent outline-none placeholder:text-[#55556A]"
              placeholder="Add a routine item..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddItem(); }}
            />
            <button
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{
                backgroundColor: newItemText.trim() ? "#00C896" : "#1E1E2E",
              }}
              onClick={handleAddItem}
              disabled={!newItemText.trim()}
            >
              <Plus className="w-5 h-5" style={{ color: newItemText.trim() ? "#0A0A0F" : "#55556A" }} />
            </button>
          </div>
        </div>

        <p className="text-[11px] font-semibold text-[#8B8BA0] uppercase tracking-[1.2px] mb-2.5 mt-0.5">Trading Windows</p>
        {SESSIONS.map((session) => {
          const estNow = getESTNow();
          const nowMins = estNow.getHours() * 60 + estNow.getMinutes();
          const startMins = session.startH * 60 + session.startM;
          const endMins = session.endH * 60 + session.endM;
          const isLive = nowMins >= startMins && nowMins < endMins;

          const target = new Date(estNow);
          target.setHours(session.startH, session.startM, 0, 0);
          if (!isLive && estNow >= target) target.setDate(target.getDate() + 1);
          const msUntil = isLive ? 0 : target.getTime() - estNow.getTime();

          return (
            <div
              key={session.name}
              className="bg-[#12121A] rounded-[14px] p-3.5 mb-2.5 border transition-colors"
              style={{
                borderColor: isLive ? session.color : "#1E1E2E",
                borderWidth: isLive ? "1.5px" : "1px",
              }}
            >
              <div className="flex items-center">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{
                    backgroundColor: isLive ? session.color : "#1E1E2E",
                  }}
                />
                <div className="flex-1 ml-3">
                  <p
                    className="text-base font-semibold mb-0.5"
                    style={{ color: isLive ? session.color : "#FFFFFF" }}
                  >
                    {session.name}
                  </p>
                  <p className="text-xs text-[#8B8BA0]">{session.subtitle}</p>
                </div>
                {isLive ? (
                  <span
                    className="px-2.5 py-1 rounded-full text-[11px] font-bold text-[#0A0A0F]"
                    style={{ backgroundColor: session.color }}
                  >
                    LIVE
                  </span>
                ) : (
                  <div className="text-right">
                    <p className="text-[15px] font-bold text-white">{formatCountdown(msUntil)}</p>
                    <p className="text-[11px] text-[#8B8BA0]">until open</p>
                  </div>
                )}
              </div>
              {isLive && session.name === "Silver Bullet" && (
                <div
                  className="flex items-center gap-1.5 mt-2.5 pt-2.5 border-t"
                  style={{ borderColor: session.color }}
                >
                  <Zap className="w-[13px] h-[13px]" style={{ color: session.color }} />
                  <p className="text-xs font-medium flex-1" style={{ color: session.color }}>
                    Prime window — look for FVG entries after liquidity sweep!
                  </p>
                </div>
              )}
            </div>
          );
        })}

        <p className="text-[11px] font-semibold text-[#8B8BA0] uppercase tracking-[1.2px] mb-2.5 mt-5">Trader's Code</p>
        <div className="bg-[#12121A] rounded-2xl border border-[#1E1E2E] mb-5 overflow-hidden">
          {TRADERS_CODE.map((rule, i) => (
            <div
              key={i}
              className="flex items-start px-3.5 py-2.5"
              style={{ borderTop: i > 0 ? "1px solid #1E1E2E" : "none" }}
            >
              <span className="w-[22px] text-[13px] font-bold text-[#00C896] shrink-0">{i + 1}</span>
              <span className="text-[13px] text-white leading-5 flex-1">{rule}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DailyPlanner() {
  return (
    <PlannerProvider>
      <DailyPlannerInner />
    </PlannerProvider>
  );
}
