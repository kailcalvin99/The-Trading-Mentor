import { useState, useRef, useCallback, useEffect } from "react";
import { X, Wrench, StickyNote, Bot, Gift, Newspaper, Shield, PenLine, CalendarDays, TrendingUp, ClipboardList, BarChart2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSpotify } from "@/contexts/SpotifyContext";
import { SpinWheel } from "@/components/CasinoElements";
import { EconomicCalendarWidget } from "@/components/LiveMarketWidgets";
import { ConfidenceScoreCard } from "@/pages/dashboard/LiveSignalWidgets";
import { QuickNoteModalInner } from "@/pages/dashboard/QuickNoteModal";
import PnLCalendarPanel from "@/components/PnLCalendarPanel";
import { FuturesDataPanel } from "@/components/FuturesDataPanel";
import { PlanView } from "@/pages/academy/PlanView";
import { ToolsView } from "@/pages/academy/ToolsView";

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

type OpenPanel = "spotify" | "note" | "ai" | "spin" | "news" | "confidence" | "pnl-calendar" | "futures" | "trading-plan" | "tv-tools" | null;

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
  {
    id: "trading-plan" as const,
    label: "Trading Plan",
    Icon: ClipboardList,
    color: "bg-orange-600 hover:bg-orange-500 text-white",
  },
  {
    id: "tv-tools" as const,
    label: "TV Tools",
    Icon: BarChart2,
    color: "bg-rose-600 hover:bg-rose-500 text-white",
  },
] as const;

const RING_RADIUS = 210;
const HUB_SIZE = 48;

const HUB_CENTER_MS = 370;
const RING_COLLAPSE_MS = TOOLS.length * 25 + 380;

export default function FloatingToolkit() {
  const [fanOpen, setFanOpen] = useState(false);
  const [isCentered, setIsCentered] = useState(false);
  const [ringExpanded, setRingExpanded] = useState(false);
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const { setShowFloat } = useSpotify();
  const navigate = useNavigate();
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function clearAllTimers() {
    if (openTimer.current) { clearTimeout(openTimer.current); openTimer.current = null; }
    if (collapseTimer.current) { clearTimeout(collapseTimer.current); collapseTimer.current = null; }
  }

  useEffect(() => {
    return () => clearAllTimers();
  }, []);

  function openFan() {
    clearAllTimers();
    setFanOpen(true);
    setIsCentered(true);
    setRingExpanded(false);
    openTimer.current = setTimeout(() => {
      openTimer.current = null;
      setRingExpanded(true);
    }, HUB_CENTER_MS);
  }

  function closeFan() {
    clearAllTimers();
    setFanOpen(false);
    setRingExpanded(false);
    collapseTimer.current = setTimeout(() => {
      collapseTimer.current = null;
      setIsCentered(false);
    }, RING_COLLAPSE_MS);
  }

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && fanOpen) closeFan();
    }
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [fanOpen]);

  function handleHubClick() {
    if (fanOpen) {
      closeFan();
    } else {
      openFan();
    }
  }

  function openTool(id: (typeof TOOLS)[number]["id"]) {
    closeFan();
    if (id === "spotify") {
      setShowFloat(true);
      return;
    }
    if (id === "ai") {
      window.dispatchEvent(new Event("ict-open-ai"));
      return;
    }
    if (id === "log-trade") {
      navigate("/journal?new=1");
      return;
    }
    setOpenPanel((prev) => (prev === id ? null : id as OpenPanel));
  }

  const total = TOOLS.length;

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

      {/* Trading Plan */}
      {openPanel === "trading-plan" && (
        <FloatingPanel
          title="ICT Trading Plan"
          onClose={() => setOpenPanel(null)}
          width="w-[480px]"
          initialPos={{ x: Math.max(0, window.innerWidth - 520), y: 80 }}
        >
          <PlanView />
        </FloatingPanel>
      )}

      {/* TV Indicators */}
      {openPanel === "tv-tools" && (
        <FloatingPanel
          title="TradingView Indicators"
          onClose={() => setOpenPanel(null)}
          width="w-[480px]"
          initialPos={{ x: Math.max(0, window.innerWidth - 520), y: 80 }}
        >
          <ToolsView />
        </FloatingPanel>
      )}

      {/* Backdrop overlay — stays visible while hub/ring are centered (isCentered),
          but only responds to clicks when fan is actively open (fanOpen) */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        style={{
          opacity: isCentered ? 1 : 0,
          pointerEvents: fanOpen ? "auto" : "none",
          transition: "opacity 300ms ease",
        }}
        onClick={() => closeFan()}
      />

      {/*
        Hub container: fixed-size box (HUB_SIZE × HUB_SIZE) that moves between
        bottom-right corner and viewport center.
        - Closed: bottom-right corner via right/bottom
        - Open (isCentered): left: 50vw / top: 50vh / translate(-50%,-50%)
        All child tool icons are anchored at `left: 50%; top: 50%` (hub center)
        so radial transforms burst outward from the exact hub center.
      */}
      <div
        className="fixed z-50 select-none"
        style={{
          width: HUB_SIZE,
          height: HUB_SIZE,
          right: isCentered ? "auto" : "1.5rem",
          bottom: isCentered ? "auto" : "5rem",
          left: isCentered ? "50vw" : "auto",
          top: isCentered ? "50vh" : "auto",
          transform: isCentered ? "translate(-50%, -50%)" : "none",
          transition: "left 350ms ease-in-out, right 350ms ease-in-out, top 350ms ease-in-out, bottom 350ms ease-in-out, transform 350ms ease-in-out",
        }}
      >
        {/* 360° ring of tool icons — each anchored at hub center (50%, 50%) */}
        {TOOLS.map((tool, i) => {
          const angleDeg = (360 / total) * i - 90;
          const angleRad = (angleDeg * Math.PI) / 180;
          const tx = Math.cos(angleRad) * RING_RADIUS;
          const ty = Math.sin(angleRad) * RING_RADIUS;

          const labelRadius = RING_RADIUS + 44;
          const lx = Math.cos(angleRad) * labelRadius;
          const ly = Math.sin(angleRad) * labelRadius;

          const { Icon } = tool;

          return (
            <div
              key={tool.id}
              className="absolute"
              style={{
                left: "50%",
                top: "50%",
                transform: ringExpanded
                  ? `translate(calc(${tx}px - 50%), calc(${ty}px - 50%))`
                  : "translate(-50%, -50%)",
                transition: `transform 350ms cubic-bezier(0.34, 1.56, 0.64, 1) ${ringExpanded ? i * 35 : (total - 1 - i) * 25}ms, opacity 250ms ease ${ringExpanded ? i * 35 : 0}ms`,
                opacity: ringExpanded ? 1 : 0,
                pointerEvents: ringExpanded ? "auto" : "none",
              }}
            >
              <button
                onClick={() => openTool(tool.id)}
                className={`w-11 h-11 rounded-full ${tool.color} shadow-lg flex items-center justify-center transition-transform hover:scale-110`}
                title={tool.label}
              >
                <Icon className="w-5 h-5" />
              </button>

              {/* Always-visible radial label positioned further along radial */}
              <span
                className="absolute pointer-events-none whitespace-nowrap text-white font-semibold"
                style={{
                  fontSize: "11px",
                  textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.7)",
                  left: `calc(50% + ${lx - tx}px)`,
                  top: `calc(50% + ${ly - ty}px)`,
                  transform: "translate(-50%, -50%)",
                  opacity: ringExpanded ? 1 : 0,
                  transition: `opacity 250ms ease ${ringExpanded ? i * 35 + 150 : 0}ms`,
                }}
              >
                {tool.label}
              </span>
            </div>
          );
        })}

        {/* Hub button — sits at the natural flow position, center of container */}
        <button
          onClick={handleHubClick}
          className={`absolute inset-0 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 ${
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
