import { useState } from "react";
import { CheckCircle2, CheckSquare, Square, Pencil, Plus, X } from "lucide-react";
import { usePlanner } from "@/contexts/PlannerContext";
import { getESTNow, SESSIONS } from "@/lib/timeUtils";

const CUSTOM_SCHEDULE_KEY = "custom_schedule_items_v1";
const SCHEDULE_LOCKED_KEY = "today_schedule_locked_v1";
const SCHEDULE_COMPLETE_KEY = "schedule_completed_";

interface CustomScheduleItem {
  id: string;
  time: string;
  label: string;
  done?: boolean;
}

function getCustomItems(): CustomScheduleItem[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SCHEDULE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCustomItems(items: CustomScheduleItem[]) {
  localStorage.setItem(CUSTOM_SCHEDULE_KEY, JSON.stringify(items));
}

function parseAmPmToH24(timeStr: string): { h: number; m: number } | null {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  if (ampm === "PM" && h < 12) h += 12;
  if (ampm === "AM" && h === 12) h = 0;
  if (isNaN(h) || isNaN(m)) return null;
  return { h, m };
}

function parseHhmm(timeStr: string): { h: number; m: number } | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (isNaN(h) || isNaN(m)) return null;
  return { h, m };
}

export function TodayScheduleWidget() {
  const { isRoutineComplete } = usePlanner();
  const [customItems, setCustomItems] = useState<CustomScheduleItem[]>(() => getCustomItems());
  const [newTime, setNewTime] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null);
  const [editingTimeVal, setEditingTimeVal] = useState("");
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelVal, setEditingLabelVal] = useState("");
  const [showAddCustom, setShowAddCustom] = useState(false);

  type RowItem = {
    id: string; time: string; label: string;
    done: boolean; customId?: string;
  };

  function rowTimeToMins(timeStr: string): number {
    if (!timeStr) return Infinity;
    const ampm = parseAmPmToH24(timeStr);
    if (ampm) return ampm.h * 60 + ampm.m;
    const hhmm = parseHhmm(timeStr);
    if (hhmm) return hhmm.h * 60 + hhmm.m;
    return Infinity;
  }

  const customRows: RowItem[] = customItems.map((c): RowItem => ({
    id: c.id, time: c.time, label: c.label, done: c.done ?? false, customId: c.id,
  })).sort((a, b) => rowTimeToMins(a.time) - rowTimeToMins(b.time));

  function addItem() {
    if (!newLabel.trim()) return;
    const id = `custom_${Date.now()}`;
    const item: CustomScheduleItem = { id, time: newTime || "", label: newLabel.trim(), done: false };
    const updated = [...customItems, item];
    setCustomItems(updated);
    saveCustomItems(updated);
    setNewTime("");
    setNewLabel("");
  }

  function deleteItem(customId: string) {
    const updated = customItems.filter((c) => c.id !== customId);
    setCustomItems(updated);
    saveCustomItems(updated);
  }

  function toggleCustomDone(customId: string) {
    const updated = customItems.map((c) =>
      c.id === customId ? { ...c, done: !c.done } : c
    );
    setCustomItems(updated);
    saveCustomItems(updated);
  }

  function startEditCustomTime(customId: string, currentTime: string) {
    setEditingTimeId(customId);
    setEditingTimeVal(currentTime);
  }

  function saveCustomTime(customId: string) {
    const updated = customItems.map((c) =>
      c.id === customId ? { ...c, time: editingTimeVal.trim() } : c
    );
    setCustomItems(updated);
    saveCustomItems(updated);
    setEditingTimeId(null);
  }

  function startEditCustomLabel(customId: string, currentLabel: string) {
    setEditingLabelId(customId);
    setEditingLabelVal(currentLabel);
    setEditingTimeId(null);
  }

  function saveCustomLabel(customId: string) {
    const trimmed = editingLabelVal.trim();
    if (trimmed) {
      const updated = customItems.map((c) =>
        c.id === customId ? { ...c, label: trimmed } : c
      );
      setCustomItems(updated);
      saveCustomItems(updated);
    }
    setEditingLabelId(null);
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-4">
        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
        <h3 className="text-sm font-semibold text-foreground flex-1">My Routine</h3>
        {isRoutineComplete && (
          <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold animate-pulse">
            Complete ✓
          </span>
        )}
      </div>

      {customRows.length > 0 && (
        <div>
          <div className="space-y-0.5">
            {customRows.map((row, idx) => (
              <div key={row.id} className="flex items-center gap-2 py-1.5 group">
                <div className="w-16 shrink-0">
                  {editingTimeId === row.id ? (
                    <input
                      type="text"
                      value={editingTimeVal}
                      onChange={(e) => setEditingTimeVal(e.target.value)}
                      onBlur={() => row.customId && saveCustomTime(row.customId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && row.customId) saveCustomTime(row.customId);
                        if (e.key === "Escape") setEditingTimeId(null);
                      }}
                      placeholder="7:30 AM"
                      autoFocus
                      className="w-full bg-secondary border border-primary rounded px-1 py-0.5 text-xs text-foreground focus:outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => row.customId && startEditCustomTime(row.customId, row.time)}
                      className="text-xs font-mono text-muted-foreground whitespace-nowrap leading-tight transition-colors hover:text-primary cursor-pointer"
                    >
                      {row.time || "—"}
                    </button>
                  )}
                </div>
                <div className="flex flex-col items-center self-stretch shrink-0" style={{ width: 14 }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0 mt-1" />
                  {idx < customRows.length - 1 && <div className="flex-1 w-px bg-border mt-0.5" />}
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <button
                    onClick={() => row.customId && toggleCustomDone(row.customId)}
                    className={`w-4 h-4 rounded border shrink-0 flex items-center justify-center transition-colors cursor-pointer ${
                      row.done ? "bg-primary border-primary" : "border-border hover:border-primary/50"
                    }`}
                  >
                    {row.done && <CheckSquare className="h-3 w-3 text-primary-foreground" />}
                  </button>
                  {editingLabelId === row.customId ? (
                    <input
                      type="text"
                      value={editingLabelVal}
                      onChange={(e) => setEditingLabelVal(e.target.value)}
                      onBlur={() => row.customId && saveCustomLabel(row.customId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && row.customId) saveCustomLabel(row.customId);
                        if (e.key === "Escape") setEditingLabelId(null);
                      }}
                      autoFocus
                      className="flex-1 bg-secondary border border-primary rounded px-1 py-0.5 text-xs text-foreground focus:outline-none min-w-0"
                    />
                  ) : (
                    <span className={`text-xs leading-tight min-w-0 flex-1 ${row.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {row.label}
                    </span>
                  )}
                  {editingLabelId !== row.customId && (
                    <>
                      <button
                        onClick={() => row.customId && startEditCustomLabel(row.customId, row.label)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary shrink-0"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => row.customId && deleteItem(row.customId)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-400 shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3">
        {showAddCustom ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              placeholder="7:30 AM"
              className="w-20 bg-secondary border border-border rounded px-1 py-0.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { addItem(); setShowAddCustom(false); }
                if (e.key === "Escape") { setShowAddCustom(false); setNewLabel(""); setNewTime(""); }
              }}
              placeholder="Add custom item..."
              autoFocus
              className="flex-1 bg-secondary border border-border rounded px-2 py-0.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <button onClick={() => { addItem(); setShowAddCustom(false); }} className="text-xs font-bold text-primary px-2 py-0.5 rounded border border-primary/30 hover:bg-primary/10 transition-colors shrink-0">Add</button>
            <button onClick={() => { setShowAddCustom(false); setNewLabel(""); setNewTime(""); }} className="text-xs text-muted-foreground hover:text-foreground shrink-0"><X className="h-3 w-3" /></button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddCustom(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary/40 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <Plus className="h-3 w-3" />
            + Add custom item
          </button>
        )}
      </div>
    </div>
  );
}

