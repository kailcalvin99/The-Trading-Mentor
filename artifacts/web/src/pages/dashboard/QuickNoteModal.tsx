import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { StickyNote, X } from "lucide-react";

const QUICK_JOURNAL_KEY = "ict-quick-journal-notes";

interface QuickNote {
  id: string;
  text: string;
  timestamp: string;
}

export function getQuickNotes(): QuickNote[] {
  try {
    const raw = localStorage.getItem(QUICK_JOURNAL_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function saveQuickNote(note: QuickNote) {
  const notes = getQuickNotes();
  notes.unshift(note);
  localStorage.setItem(QUICK_JOURNAL_KEY, JSON.stringify(notes.slice(0, 100)));
}

export function QuickNoteFAB({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="fixed bottom-6 right-6 z-30 w-10 h-10 rounded-full bg-secondary border border-border shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all"
      title="Quick Note"
    >
      <StickyNote className="h-4 w-4" />
    </button>
  );
}

export function QuickNoteModalInner({ onClose }: { onClose?: () => void }) {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleLog() {
    const trimmed = text.trim();
    if (!trimmed) return;
    saveQuickNote({
      id: `qn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text: trimmed,
      timestamp: new Date().toISOString(),
    });
    setText("");
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <StickyNote className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold flex-1">Quick Note</span>
        <button onClick={() => navigate("/journal")} className="text-xs text-primary font-medium">
          Journal ↗
        </button>
        {onClose && (
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground ml-1">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLog()}
          placeholder="Note something..."
          className="flex-1 bg-secondary/40 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary min-w-0"
          maxLength={500}
        />
        {saved ? (
          <span className="text-xs text-emerald-400 font-semibold whitespace-nowrap">✓</span>
        ) : (
          <button
            onClick={handleLog}
            disabled={!text.trim()}
            className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-2 rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity shrink-0"
          >
            Log
          </button>
        )}
      </div>
      {getQuickNotes().slice(0, 2).map((note) => (
        <div key={note.id} className="flex items-start gap-2 text-xs text-muted-foreground mt-2">
          <span className="shrink-0 mt-0.5">·</span>
          <span className="line-clamp-1">{note.text}</span>
        </div>
      ))}
    </div>
  );
}

export function QuickNoteModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
      <div className="pointer-events-auto w-72 bg-card border border-border rounded-2xl shadow-2xl animate-in slide-in-from-bottom-2 duration-200">
        <QuickNoteModalInner onClose={onClose} />
      </div>
    </div>
  );
}
