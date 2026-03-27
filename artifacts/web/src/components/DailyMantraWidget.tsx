import { useRef, useState } from "react";
import { Pencil } from "lucide-react";

const STORAGE_KEY = "ict-daily-mantra";
const DEFAULT_MANTRA = "You got this";

const GLOW = "0 0 40px rgba(255,255,255,0.65), 0 0 16px rgba(255,255,255,0.4), 0 0 6px rgba(255,255,255,0.25)";

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
      className="relative flex items-center justify-center py-6 cursor-pointer select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => !editing && startEdit()}
      role="button"
      tabIndex={0}
      aria-label="Edit daily mantra"
      onKeyDown={(e) => e.key === "Enter" && !editing && startEdit()}
    >
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 80% at 50% 50%, rgba(255,255,255,0.04) 0%, transparent 70%)",
        }}
      />

      {editing ? (
        <input
          ref={inputRef}
          defaultValue={text}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-2xl bg-transparent border-none outline-none text-center text-4xl md:text-5xl font-bold text-white caret-white tracking-tight"
          style={{ textShadow: GLOW }}
          spellCheck={false}
          autoComplete="off"
        />
      ) : (
        <span
          className="relative z-10 text-4xl md:text-5xl font-bold text-white text-center leading-tight tracking-tight"
          style={{ textShadow: GLOW }}
        >
          {text}
        </span>
      )}

      {!editing && hovered && (
        <span className="absolute top-2 right-2 text-white/20 pointer-events-none z-10">
          <Pencil className="h-3.5 w-3.5" />
        </span>
      )}
    </div>
  );
}
