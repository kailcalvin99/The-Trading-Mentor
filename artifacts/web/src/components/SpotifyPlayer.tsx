import { useState } from "react";
import { useSpotify } from "@/contexts/SpotifyContext";
import { ChevronDown, ChevronUp, SkipBack, SkipForward, Play, Pause, X, Music } from "lucide-react";

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

export default function SpotifyPlayer() {
  const {
    isConnected,
    isPremium,
    isReady,
    isPlaying,
    currentTrack,
    disconnect,
    togglePlay,
    nextTrack,
    previousTrack,
    premiumError,
  } = useSpotify();

  const [minimized, setMinimized] = useState(false);

  if (!isConnected) return null;

  if (minimized) {
    return (
      <div className="fixed bottom-20 md:bottom-4 right-4 z-40">
        <button
          onClick={() => setMinimized(false)}
          className="flex items-center gap-2 bg-[#1DB954] hover:bg-[#1ed760] text-white rounded-full px-3 py-2 shadow-lg transition-all"
        >
          <SpotifyIcon className="w-4 h-4" />
          {currentTrack && isPlaying && (
            <span className="text-xs font-medium max-w-[120px] truncate">{currentTrack.name}</span>
          )}
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 md:bottom-4 right-4 z-40 w-[300px]">
      <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/50">
          <div className="flex items-center gap-1.5">
            <SpotifyIcon className="w-4 h-4 text-[#1DB954]" />
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Spotify</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMinimized(true)}
              className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              title="Minimize"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={disconnect}
              className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title="Disconnect Spotify"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {premiumError && isPremium === false ? (
          <div className="px-4 py-5 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
              <Music className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-xs text-amber-500 font-medium">Premium Required</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed">{premiumError}</p>
          </div>
        ) : !isReady ? (
          <div className="px-4 py-5 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#1DB954]/10 flex items-center justify-center mx-auto animate-pulse">
              <SpotifyIcon className="w-5 h-5 text-[#1DB954]" />
            </div>
            <p className="text-xs text-muted-foreground">Connecting to Spotify...</p>
          </div>
        ) : (
          <div className="p-3">
            <div className="flex items-center gap-3 mb-3">
              {currentTrack?.albumArt ? (
                <img
                  src={currentTrack.albumArt}
                  alt="Album art"
                  className="w-12 h-12 rounded-lg object-cover shrink-0 shadow-md"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  <Music className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground truncate">
                  {currentTrack?.name || "No track playing"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {currentTrack?.artist || "Play something on Spotify"}
                </p>
              </div>
            </div>

            {currentTrack && (
              <div className="w-full h-1 bg-secondary rounded-full mb-3 overflow-hidden">
                <div
                  className="h-full bg-[#1DB954] rounded-full transition-all duration-1000"
                  style={{
                    width: `${currentTrack.durationMs > 0 ? (currentTrack.positionMs / currentTrack.durationMs) * 100 : 0}%`,
                  }}
                />
              </div>
            )}

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={previousTrack}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={togglePlay}
                className="p-2.5 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-white transition-colors shadow-md"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button
                onClick={nextTrack}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
