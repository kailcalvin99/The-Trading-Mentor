import { useRef, useState } from "react";
import { Pencil } from "lucide-react";

const STORAGE_KEY = "ict-daily-mantra";
const DEFAULT_MANTRA = "You got this";

function loadMantra(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_MANTRA;
  } catch {
    return DEFAULT_MANTRA;
  }
}

export default function DailyMantraWidget() {
  const [text, setText] = useState<string>(loadMantra);
  const [editing, setEditing] = useState(false);
  const [hovered, setHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }

  function commit(value: string) {
    const trimmed = value.trim() || DEFAULT_MANTRA;
    setText(trimmed);
    try {
      localStorage.setItem(STORAGE_KEY, trimmed);
    } catch {}
    setEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit(e.currentTarget.value);
    }
    if (e.key === "Escape") {
      setEditing(false);
    }
  }

  return (
    <div
      className="bg-card border border-border rounded-2xl px-6 py-5 flex items-center justify-center relative group cursor-pointer select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !editing && startEdit()}
      role="button"
      tabIndex={0}
      aria-label="Edit daily mantra"
      onKeyDown={(e) => e.key === "Enter" && !editing && startEdit()}
    >
      {editing ? (
        <input
          ref={inputRef}
          defaultValue={text}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          maxLength={80}
          className="w-full bg-transparent border-none outline-none text-center text-2xl md:text-3xl font-bold text-white caret-white"
          style={{
            textShadow: "0 0 20px rgba(255,255,255,0.55), 0 0 8px rgba(255,255,255,0.3)",
            letterSpacing: "0.01em",
          }}
          spellCheck={false}
          autoComplete="off"
        />
      ) : (
        <span
          className="text-2xl md:text-3xl font-bold text-white text-center leading-tight"
          style={{
            textShadow: "0 0 20px rgba(255,255,255,0.55), 0 0 8px rgba(255,255,255,0.3)",
            letterSpacing: "0.01em",
          }}
        >
          {text}
        </span>
      )}

      {!editing && hovered && (
        <span className="absolute top-3 right-4 text-muted-foreground/50 pointer-events-none">
          <Pencil className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );
}
