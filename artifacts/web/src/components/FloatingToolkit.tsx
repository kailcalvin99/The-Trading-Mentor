import { useState, useRef, useCallback, useEffect } from "react";
import { X, Wrench, StickyNote, Bot, Gift, Newspaper, Shield, PenLine, CalendarDays, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSpotify } from "@/contexts/SpotifyContext";
import { SpinWheel } from "@/components/CasinoElements";
import { EconomicCalendarWidget } from "@/components/LiveMarketWidgets";
import { ConfidenceScoreCard } from "@/pages/dashboard/LiveSignalWidgets";
import { QuickNoteModalInner } from "@/pages/dashboard/QuickNoteModal";
import PnLCalendarPanel from "@/components/PnLCalendarPanel";
import { FuturesDataPanel } from "@/components/FuturesDataPanel";

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

interface DragPos {
  x: number;
  y: number;
}

function useDraggable(initialPos: DragPos) {
  const [pos, setPos] = useState<DragPos>(initialPos);
  const dragging = useRef(false);
  const moved = useRef(false);
  const startMouse = useRef({ x: 0, y: 0 });
  const startPos = useRef<DragPos>(initialPos);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragging.current = true;
      moved.current = false;
      startMouse.current = { x: e.clientX, y: e.clientY };
      startPos.current = pos;
      e.preventDefault();
    },
    [pos],
  );

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      const dx = e.clientX - startMouse.current.x;
      const dy = e.clientY - startMouse.current.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved.current = true;
      setPos({
        x: startPos.current.x + dx,
        y: startPos.current.y + dy,
      });
    }
    function onMouseUp() {
      dragging.current = false;
    }
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  return { pos, onMouseDown, moved };
}

interface FloatingPanelProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  initialPos?: DragPos;
  width?: string;
}

function FloatingPanel({ title, onClose, children, initialPos, width = "w-80" }: FloatingPanelProps) {
  const { pos, onMouseDown } = useDraggable(
    initialPos ?? { x: Math.max(0, window.innerWidth - 360), y: 80 },
  );

  return (
    <div
      className={`fixed z-50 ${width} bg-card border border-border rounded-2xl shadow-2xl overflow-hidden`}
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-border/60 cursor-grab active:cursor-grabbing select-none bg-secondary/30"
        onMouseDown={onMouseDown}
      >
        <span className="text-xs font-semibold text-foreground">{title}</span>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="max-h-[420px] overflow-y-auto">{children}</div>
    </div>
  );
}

type OpenPanel = "spotify" | "note" | "ai" | "spin" | "news" | "confidence" | "pnl-calendar" | "futures" | null;

const TOOLS = [
  {
    id: "spotify" as const,
    label: "Spotify",
    Icon: SpotifyIcon,
    color: "bg-[#1DB954] hover:bg-[#1ed760] text-white",
  },
  {
    id: "note" as const,
    label: "Quick Note",
    Icon: StickyNote,
    color: "bg-secondary hover:bg-secondary/80 text-foreground border border-border",
  },
  {
    id: "ai" as const,
    label: "Ask AI",
    Icon: Bot,
    color: "bg-primary hover:bg-primary/90 text-primary-foreground",
  },
  {
    id: "spin" as const,
    label: "Spin Wheel",
    Icon: Gift,
    color: "bg-amber-500 hover:bg-amber-400 text-white",
  },
  {
    id: "news" as const,
    label: "Today's News",
    Icon: Newspaper,
    color: "bg-blue-600 hover:bg-blue-500 text-white",
  },
  {
    id: "confidence" as const,
    label: "FVG Score",
    Icon: Shield,
    color: "bg-emerald-600 hover:bg-emerald-500 text-white",
  },
  {
    id: "log-trade" as const,
    label: "Log Trade",
    Icon: PenLine,
    color: "bg-violet-600 hover:bg-violet-500 text-white",
  },
  {
    id: "pnl-calendar" as const,
    label: "P&L Calendar",
    Icon: CalendarDays,
    color: "bg-sky-600 hover:bg-sky-500 text-white",
  },
  {
    id: "futures" as const,
    label: "Futures Data",
    Icon: TrendingUp,
    color: "bg-teal-600 hover:bg-teal-500 text-white",
  },
] as const;

const ARC_RADIUS = 135;
const ARC_START_DEG = 150;
const ARC_END_DEG = 280;

export default function FloatingToolkit() {
  const [fanOpen, setFanOpen] = useState(false);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const { setShowFloat } = useSpotify();
  const navigate = useNavigate();

  const hubInitial = useRef({ x: window.innerWidth - 72, y: window.innerHeight - 180 });
  const { pos: hubPos, onMouseDown: hubMouseDown, moved } = useDraggable(hubInitial.current);

  useEffect(() => {
    if (!fanOpen) return;
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setFanOpen(false);
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [fanOpen]);

  function handleHubMouseDown(e: React.MouseEvent) {
    hubMouseDown(e);
  }

  function handleHubClick() {
    if (moved.current) return;
    setFanOpen((v) => !v);
  }

  function openTool(id: (typeof TOOLS)[number]["id"]) {
    if (id === "spotify") {
      setShowFloat(true);
      setFanOpen(false);
      return;
    }
    if (id === "ai") {
      window.dispatchEvent(new Event("ict-open-ai"));
      setFanOpen(false);
      return;
    }
    if (id === "log-trade") {
      navigate("/journal?new=1");
      setFanOpen(false);
      return;
    }
    setOpenPanel((prev) => (prev === id ? null : id as OpenPanel));
    setFanOpen(false);
  }

  return (
    <>
      {/* Quick Note */}
      {openPanel === "note" && (
        <FloatingPanel
          title="Quick Note"
          onClose={() => setOpenPanel(null)}
          width="w-72"
          initialPos={{ x: Math.max(0, window.innerWidth - 320), y: 120 }}
        >
          <QuickNoteModalInner />
        </FloatingPanel>
      )}

      {/* Spin Wheel */}
      {openPanel === "spin" && (
        <FloatingPanel
          title="Daily Spin Wheel"
          onClose={() => setOpenPanel(null)}
          initialPos={{ x: Math.max(0, window.innerWidth - 380), y: 100 }}
        >
          <div className="p-4">
            <SpinWheel />
          </div>
        </FloatingPanel>
      )}

      {/* Today's News */}
      {openPanel === "news" && (
        <FloatingPanel
          title="Today's News"
          onClose={() => setOpenPanel(null)}
          width="w-96"
          initialPos={{ x: Math.max(0, window.innerWidth - 420), y: 80 }}
        >
          <EconomicCalendarWidget />
        </FloatingPanel>
      )}

      {/* FVG Confidence Score */}
      {openPanel === "confidence" && (
        <FloatingPanel
          title="FVG Confidence Score"
          onClose={() => setOpenPanel(null)}
          initialPos={{ x: Math.max(0, window.innerWidth - 380), y: 80 }}
        >
          <div className="p-4">
            <ConfidenceScoreCard />
          </div>
        </FloatingPanel>
      )}

      {/* P&L Calendar */}
      {openPanel === "pnl-calendar" && (
        <FloatingPanel
          title="P&L Calendar"
          onClose={() => setOpenPanel(null)}
          width="w-80"
          initialPos={{ x: Math.max(0, window.innerWidth - 360), y: 80 }}
        >
          <PnLCalendarPanel />
        </FloatingPanel>
      )}

      {/* Futures Data */}
      {openPanel === "futures" && (
        <FloatingPanel
          title="Futures Data"
          onClose={() => setOpenPanel(null)}
          width="w-96"
          initialPos={{ x: Math.max(0, window.innerWidth - 420), y: 80 }}
        >
          <FuturesDataPanel />
        </FloatingPanel>
      )}

      {/* Hub + Fan */}
      <div
        className="fixed z-40 select-none"
        style={{ left: hubPos.x, top: hubPos.y }}
      >
        {/* Fan tool icons */}
        {TOOLS.map((tool, i) => {
          const total = TOOLS.length;
          const angleDeg =
            ARC_START_DEG + ((ARC_END_DEG - ARC_START_DEG) / (total - 1)) * i;
          const angleRad = (angleDeg * Math.PI) / 180;
          const tx = Math.cos(angleRad) * ARC_RADIUS;
          const ty = Math.sin(angleRad) * ARC_RADIUS;
          const { Icon } = tool;

          return (
            <div
              key={tool.id}
              className="absolute"
              style={{
                left: 24,
                top: 24,
                transform: fanOpen
                  ? `translate(calc(${tx}px - 50%), calc(${ty}px - 50%))`
                  : "translate(-50%, -50%)",
                transition: `transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1) ${fanOpen ? i * 40 : (total - 1 - i) * 30}ms, opacity 200ms ease ${fanOpen ? i * 40 : 0}ms`,
                opacity: fanOpen ? 1 : 0,
                pointerEvents: fanOpen ? "auto" : "none",
              }}
            >
              <div className="relative group">
                <button
                  onClick={() => openTool(tool.id)}
                  className={`w-10 h-10 rounded-full ${tool.color} shadow-lg flex items-center justify-center transition-transform hover:scale-110`}
                  title={tool.label}
                >
                  <Icon className="w-4 h-4" />
                </button>
                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-0.5 bg-card border border-border text-[10px] font-semibold text-foreground rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
                  {tool.label}
                </span>
              </div>
            </div>
          );
        })}

        {/* Hub button */}
        <button
          onMouseDown={handleHubMouseDown}
          onClick={handleHubClick}
          className={`relative w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 cursor-grab active:cursor-grabbing ${
            fanOpen
              ? "bg-primary text-primary-foreground scale-95"
              : "bg-card border-2 border-primary text-primary hover:scale-105"
          }`}
          title={fanOpen ? "Close toolkit" : "Open toolkit"}
        >
          {fanOpen ? <X className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
        </button>
      </div>
    </>
  );
}
