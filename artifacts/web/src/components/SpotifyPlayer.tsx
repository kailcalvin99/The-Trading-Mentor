import { useState, useRef, useEffect, useCallback } from "react";
import { useSpotify } from "@/contexts/SpotifyContext";
import { ChevronDown, ChevronUp, SkipBack, SkipForward, Play, Pause, X, Music } from "lucide-react";

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

const DRAG_THRESHOLD = 4;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function clampPos(x: number, y: number, elW: number, elH: number) {
  return {
    x: clamp(x, 0, Math.max(0, window.innerWidth - elW)),
    y: clamp(y, 0, Math.max(0, window.innerHeight - elH)),
  };
}

export default function SpotifyPlayer() {
  const {
    isConnected,
    isPremium,
    isReady,
    isPlaying,
    currentTrack,
    togglePlay,
    nextTrack,
    previousTrack,
    premiumError,
    showFloat,
    setShowFloat,
  } = useSpotify();

  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const dragging = useRef(false);
  const hasMoved = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const pointerStart = useRef({ x: 0, y: 0 });
  const widgetRef = useRef<HTMLDivElement>(null);

  const computeDefaultPos = useCallback(() => {
    const elW = 240;
    const elH = 180;
    return clampPos(
      window.innerWidth - elW - 16,
      window.innerHeight - elH - 16,
      elW,
      elH
    );
  }, []);

  useEffect(() => {
    if (pos === null && isConnected && showFloat) {
      setPos(computeDefaultPos());
    }
  }, [isConnected, showFloat, pos, computeDefaultPos]);

  useEffect(() => {
    const handleResize = () => {
      setPos((prev) => {
        if (prev === null) return prev;
        const el = widgetRef.current;
        return clampPos(prev.x, prev.y, el?.offsetWidth ?? 240, el?.offsetHeight ?? 120);
      });
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    setPos((prev) => {
      if (prev === null) return prev;
      const el = widgetRef.current;
      return clampPos(prev.x, prev.y, el?.offsetWidth ?? 240, el?.offsetHeight ?? 120);
    });
  }, [minimized]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    dragging.current = true;
    hasMoved.current = false;
    pointerStart.current = { x: e.clientX, y: e.clientY };
    const rect = widgetRef.current?.getBoundingClientRect();
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - pointerStart.current.x;
    const dy = e.clientY - pointerStart.current.y;
    if (!hasMoved.current && Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
    if (!hasMoved.current) {
      hasMoved.current = true;
      setIsDragging(true);
    }
    const el = widgetRef.current;
    setPos(clampPos(
      e.clientX - dragOffset.current.x,
      e.clientY - dragOffset.current.y,
      el?.offsetWidth ?? 240,
      el?.offsetHeight ?? 120
    ));
  }, []);

  const didDragRef = useRef(false);

  const onPointerUp = useCallback(() => {
    didDragRef.current = hasMoved.current;
    dragging.current = false;
    hasMoved.current = false;
    setIsDragging(false);
  }, []);

  const onPointerCancel = useCallback(() => {
    didDragRef.current = false;
    dragging.current = false;
    hasMoved.current = false;
    setIsDragging(false);
  }, []);

  const onPillClick = useCallback(() => {
    if (!didDragRef.current) {
      setMinimized(false);
    }
    didDragRef.current = false;
  }, []);

  if (!isConnected || !showFloat) return null;

  const currentPos = pos ?? computeDefaultPos();
  const cursor = isDragging ? "grabbing" : "grab";

  const frostedStyle: React.CSSProperties = {
    background: "rgba(0,0,0,0.82)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.08)",
  };

  if (minimized) {
    return (
      <div
        ref={widgetRef}
        style={{
          position: "fixed",
          left: currentPos.x,
          top: currentPos.y,
          zIndex: 40,
          userSelect: "none",
          cursor,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onClick={onPillClick}
      >
        <div
          style={{ ...frostedStyle, cursor }}
          className="flex items-center gap-1.5 text-white rounded-full px-2.5 py-1.5 shadow-lg"
        >
          <SpotifyIcon className="w-3.5 h-3.5 text-[#1DB954] shrink-0" />
          {currentTrack && isPlaying && (
            <span className="text-[10px] font-medium max-w-[80px] truncate">{currentTrack.name}</span>
          )}
          <ChevronUp className="w-3 h-3 ml-1 shrink-0 text-white/60" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={widgetRef}
      style={{
        position: "fixed",
        left: currentPos.x,
        top: currentPos.y,
        zIndex: 40,
        width: 240,
        userSelect: "none",
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div
        style={{ ...frostedStyle, cursor }}
        className="rounded-xl shadow-2xl overflow-hidden"
      >
        <div
          className="flex items-center justify-between px-2.5 py-1.5 pl-[0px] pr-[0px] pt-[0px] pb-[0px] opacity-[1]"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-1">
            <SpotifyIcon className="w-3.5 h-3.5 text-[#1DB954]" />
            <span className="text-[9px] font-semibold text-white/50 uppercase tracking-wider">Spotify</span>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => setMinimized(true)}
              className="p-1 rounded text-white/40 hover:text-white hover:bg-white/10 transition-colors"
              title="Minimize"
              style={{ cursor: "pointer" }}
            >
              <ChevronDown className="w-3 h-3" />
            </button>
            <button
              onClick={() => setShowFloat(false)}
              className="p-1 rounded text-white/40 hover:text-red-400 hover:bg-white/10 transition-colors"
              title="Close player"
              style={{ cursor: "pointer" }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>

        {premiumError && isPremium === false ? (
          <div className="px-3 py-4 text-center space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
              <Music className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-[10px] text-amber-500 font-medium">Premium Required</p>
            <p className="text-[10px] text-white/40 leading-relaxed">{premiumError}</p>
          </div>
        ) : !isReady ? (
          <div className="px-3 py-4 text-center space-y-1.5">
            <div className="w-8 h-8 rounded-full bg-[#1DB954]/10 flex items-center justify-center mx-auto animate-pulse">
              <SpotifyIcon className="w-4 h-4 text-[#1DB954]" />
            </div>
            <p className="text-[10px] text-white/40">Connecting to Spotify...</p>
          </div>
        ) : (
          <div className="p-2.5">
            <div className="flex items-center gap-2 mb-2">
              {currentTrack?.albumArt ? (
                <img
                  src={currentTrack.albumArt}
                  alt="Album art"
                  className="w-9 h-9 rounded-md object-cover shrink-0 shadow-md"
                />
              ) : (
                <div className="w-9 h-9 rounded-md bg-white/10 flex items-center justify-center shrink-0">
                  <Music className="w-4 h-4 text-white/30" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold text-white truncate leading-tight">
                  {currentTrack?.name || "No track playing"}
                </p>
                <p className="text-[10px] text-white/40 truncate leading-tight">
                  {currentTrack?.artist || "Play something on Spotify"}
                </p>
              </div>
            </div>

            {currentTrack && (
              <div className="w-full h-0.5 bg-white/10 rounded-full mb-2 overflow-hidden">
                <div
                  className="h-full bg-[#1DB954] rounded-full transition-all duration-1000"
                  style={{
                    width: `${currentTrack.durationMs > 0 ? (currentTrack.positionMs / currentTrack.durationMs) * 100 : 0}%`,
                  }}
                />
              </div>
            )}

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={previousTrack}
                className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                style={{ cursor: "pointer" }}
              >
                <SkipBack className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={togglePlay}
                className="p-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-white transition-colors shadow-md"
                style={{ cursor: "pointer" }}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              </button>
              <button
                onClick={nextTrack}
                className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                style={{ cursor: "pointer" }}
              >
                <SkipForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
