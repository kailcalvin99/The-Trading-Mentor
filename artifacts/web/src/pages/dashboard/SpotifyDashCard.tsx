import { Music2, Play, Pause, SkipBack, SkipForward } from "lucide-react";
import { useSpotify } from "@/contexts/SpotifyContext";

function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

export function SpotifyDashCard() {
  const {
    isConnected, isReady, isPlaying, currentTrack,
    connect, disconnect, togglePlay, nextTrack, previousTrack,
    isPremium, premiumError, showFloat, setShowFloat,
  } = useSpotify();

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <div className="flex items-center gap-2">
          <SpotifyIcon className="w-4 h-4 text-[#1DB954]" />
          <span className="text-xs font-semibold text-foreground">Spotify</span>
        </div>
        {isConnected && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowFloat(!showFloat)}
              title={showFloat ? "Hide floating player" : "Pop out as floating player"}
              className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-lg border transition-colors ${
                showFloat
                  ? "bg-[#1DB954]/10 border-[#1DB954]/30 text-[#1DB954]"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
              }`}
            >
              <Music2 className="w-3 h-3" />
              {showFloat ? "Floating" : "Float"}
            </button>
            <button
              onClick={disconnect}
              className="text-[10px] text-muted-foreground hover:text-destructive transition-colors px-1.5 py-1"
              title="Disconnect Spotify"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {!isConnected ? (
        <div className="flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#1DB954]/10 flex items-center justify-center">
              <SpotifyIcon className="w-5 h-5 text-[#1DB954]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Connect Spotify</p>
              <p className="text-xs text-muted-foreground">Play music while you trade</p>
            </div>
          </div>
          <button
            onClick={connect}
            className="flex items-center gap-1.5 bg-[#1DB954] hover:bg-[#1ed760] text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
          >
            <SpotifyIcon className="w-3.5 h-3.5" />
            Connect
          </button>
        </div>
      ) : premiumError && isPremium === false ? (
        <div className="px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
            <Music2 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-amber-500">Spotify Premium Required</p>
            <p className="text-[11px] text-muted-foreground leading-relaxed truncate">{premiumError}</p>
          </div>
        </div>
      ) : !isReady ? (
        <div className="px-4 py-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#1DB954]/10 flex items-center justify-center shrink-0 animate-pulse">
            <SpotifyIcon className="w-4 h-4 text-[#1DB954]" />
          </div>
          <p className="text-xs text-muted-foreground">Connecting to Spotify...</p>
        </div>
      ) : (
        <div className="px-4 py-3 flex items-center gap-3">
          {currentTrack?.albumArt ? (
            <img src={currentTrack.albumArt} alt="Album" className="w-10 h-10 rounded-lg object-cover shrink-0 shadow-sm" />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
              <Music2 className="w-4 h-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground truncate">
              {currentTrack?.name || "No track playing"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {currentTrack?.artist || "Open Spotify and play something"}
            </p>
            {currentTrack && (
              <div className="w-full h-0.5 bg-secondary rounded-full mt-1.5 overflow-hidden">
                <div
                  className="h-full bg-[#1DB954] rounded-full transition-all duration-1000"
                  style={{ width: `${currentTrack.durationMs > 0 ? (currentTrack.positionMs / currentTrack.durationMs) * 100 : 0}%` }}
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={previousTrack} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            <button onClick={togglePlay} className="p-2 rounded-full bg-[#1DB954] hover:bg-[#1ed760] text-white transition-colors shadow-sm">
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
            <button onClick={nextTrack} className="p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
