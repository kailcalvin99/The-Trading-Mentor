import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";

const SPOTIFY_CLIENT_ID = import.meta.env.VITE_SPOTIFY_CLIENT_ID || "";
const REDIRECT_URI = import.meta.env.VITE_SPOTIFY_REDIRECT_URI ||
  `${window.location.origin}${import.meta.env.BASE_URL}spotify-callback`;
const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
  "user-read-currently-playing",
].join(" ");

const TOKEN_KEY = "spotify_access_token";
const REFRESH_TOKEN_KEY = "spotify_refresh_token";
const EXPIRY_KEY = "spotify_token_expiry";
const VERIFIER_KEY = "spotify_code_verifier";
const STATE_KEY = "spotify_oauth_state";

interface SpotifyTrack {
  name: string;
  artist: string;
  albumArt: string;
  durationMs: number;
  positionMs: number;
}

interface SpotifyContextType {
  isConnected: boolean;
  isPremium: boolean | null;
  isReady: boolean;
  isPlaying: boolean;
  currentTrack: SpotifyTrack | null;
  connect: () => void;
  disconnect: () => void;
  togglePlay: () => void;
  nextTrack: () => void;
  previousTrack: () => void;
  premiumError: string | null;
  completeAuth: (accessToken: string, expiresIn: number, refreshToken: string) => void;
  showFloat: boolean;
  setShowFloat: (v: boolean) => void;
}

const SpotifyContext = createContext<SpotifyContextType>({
  isConnected: false,
  isPremium: null,
  isReady: false,
  isPlaying: false,
  currentTrack: null,
  connect: () => {},
  disconnect: () => {},
  togglePlay: () => {},
  nextTrack: () => {},
  previousTrack: () => {},
  premiumError: null,
  completeAuth: () => {},
  showFloat: false,
  setShowFloat: () => {},
});

export function useSpotify() {
  return useContext(SpotifyContext);
}

function generateCodeVerifier(): string {
  const array = new Uint8Array(64);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("").slice(0, 128);
}

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number; refresh_token?: string } | null> {
  try {
    const body = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    });

    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!res.ok) return null;

    const data: unknown = await res.json();
    if (typeof data === "object" && data !== null && "access_token" in data && "expires_in" in data) {
      const result = data as { access_token: string; expires_in: number; refresh_token?: string };
      return result;
    }
    return null;
  } catch {
    return null;
  }
}

export { TOKEN_KEY, REFRESH_TOKEN_KEY, EXPIRY_KEY, VERIFIER_KEY, STATE_KEY, SPOTIFY_CLIENT_ID, REDIRECT_URI };

export function SpotifyProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    const expiry = localStorage.getItem(EXPIRY_KEY);
    if (stored && expiry && Date.now() < parseInt(expiry, 10)) {
      return stored;
    }
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    return null;
  });
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [premiumError, setPremiumError] = useState<string | null>(null);
  const [showFloat, setShowFloat] = useState(false);
  const playerRef = useRef<Spotify.Player | null>(null);
  const deviceIdRef = useRef<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenRef = useRef<string | null>(token);

  const isConnected = !!token;

  const scheduleRefresh = useCallback((expiresIn: number) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);

    const refreshMs = Math.max((expiresIn - 300) * 1000, 30000);
    refreshTimerRef.current = setTimeout(async () => {
      const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!storedRefresh) return;

      const result = await refreshAccessToken(storedRefresh);
      if (result) {
        localStorage.setItem(TOKEN_KEY, result.access_token);
        localStorage.setItem(EXPIRY_KEY, String(Date.now() + result.expires_in * 1000));
        if (result.refresh_token) {
          localStorage.setItem(REFRESH_TOKEN_KEY, result.refresh_token);
        }
        setToken(result.access_token);
        tokenRef.current = result.access_token;
        scheduleRefresh(result.expires_in);
      }
    }, refreshMs);
  }, []);

  const completeAuth = useCallback((accessToken: string, expiresIn: number, refreshToken: string) => {
    localStorage.setItem(TOKEN_KEY, accessToken);
    localStorage.setItem(EXPIRY_KEY, String(Date.now() + expiresIn * 1000));
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    setToken(accessToken);
    tokenRef.current = accessToken;
    scheduleRefresh(expiresIn);
  }, [scheduleRefresh]);

  const connect = useCallback(async () => {
    if (!SPOTIFY_CLIENT_ID) return;
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const state = generateState();
    sessionStorage.setItem(VERIFIER_KEY, verifier);
    sessionStorage.setItem(STATE_KEY, state);

    const params = new URLSearchParams({
      client_id: SPOTIFY_CLIENT_ID,
      response_type: "code",
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      code_challenge_method: "S256",
      code_challenge: challenge,
      state,
    });
    window.location.href = `https://accounts.spotify.com/authorize?${params.toString()}`;
  }, []);

  const disconnect = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.disconnect();
      playerRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    deviceIdRef.current = null;
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setToken(null);
    tokenRef.current = null;
    setIsReady(false);
    setIsPlaying(false);
    setCurrentTrack(null);
    setIsPremium(null);
    setPremiumError(null);
  }, []);

  useEffect(() => {
    if (!token) return;

    const expiry = localStorage.getItem(EXPIRY_KEY);
    if (expiry) {
      const remainingSec = Math.floor((parseInt(expiry, 10) - Date.now()) / 1000);
      if (remainingSec > 0) {
        scheduleRefresh(remainingSec);
      }
    }
  }, [token, scheduleRefresh]);

  useEffect(() => {
    if (!token) return;

    const tryFetchProfile = async (accessToken: string, retried: boolean): Promise<void> => {
      const res = await fetch("https://api.spotify.com/v1/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        if (res.status === 401 && !retried) {
          const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);
          if (storedRefresh) {
            const refreshResult = await refreshAccessToken(storedRefresh);
            if (refreshResult) {
              localStorage.setItem(TOKEN_KEY, refreshResult.access_token);
              localStorage.setItem(EXPIRY_KEY, String(Date.now() + refreshResult.expires_in * 1000));
              if (refreshResult.refresh_token) {
                localStorage.setItem(REFRESH_TOKEN_KEY, refreshResult.refresh_token);
              }
              setToken(refreshResult.access_token);
              tokenRef.current = refreshResult.access_token;
              scheduleRefresh(refreshResult.expires_in);
              return tryFetchProfile(refreshResult.access_token, true);
            }
          }
          disconnect();
        }
        return;
      }

      const data: unknown = await res.json();
      if (typeof data === "object" && data !== null && "product" in data) {
        const profile = data as { product: string };
        if (profile.product === "premium") {
          setIsPremium(true);
          setPremiumError(null);
        } else {
          setIsPremium(false);
          setPremiumError("Spotify Premium is required for in-browser playback. You can still control playback on other devices.");
        }
      }
    };

    tryFetchProfile(token, false).catch(() => {});
  }, [token, disconnect, scheduleRefresh]);

  const initializePlayer = useCallback((currentToken: string) => {
    if (playerRef.current) {
      playerRef.current.disconnect();
      playerRef.current = null;
    }

    const player = new Spotify.Player({
      name: "Trading Mentor Player",
      getOAuthToken: (cb) => {
        const latestToken = tokenRef.current;
        if (latestToken) cb(latestToken);
      },
      volume: 0.5,
    });

    player.addListener("ready", (e) => {
      deviceIdRef.current = e.device_id;
      setIsReady(true);

      fetch("https://api.spotify.com/v1/me/player", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ device_ids: [e.device_id], play: false }),
      }).catch(() => {});
    });

    player.addListener("not_ready", () => {
      setIsReady(false);
    });

    player.addListener("player_state_changed", (state) => {
      if (!state) {
        setIsPlaying(false);
        setCurrentTrack(null);
        return;
      }
      setIsPlaying(!state.paused);
      const track = state.track_window.current_track;
      if (track) {
        setCurrentTrack({
          name: track.name,
          artist: track.artists.map((a) => a.name).join(", "),
          albumArt: track.album.images[0]?.url || "",
          durationMs: state.duration,
          positionMs: state.position,
        });
      }
    });

    player.addListener("initialization_error", () => {});
    player.addListener("authentication_error", () => {
      disconnect();
    });
    player.addListener("account_error", () => {
      setPremiumError("Spotify Premium is required for in-browser playback.");
    });

    player.connect();
    playerRef.current = player;
  }, [disconnect]);

  useEffect(() => {
    if (!token || isPremium !== true) return;

    const spotifyWindow = window as SpotifyWindow;
    const scriptExists = document.getElementById("spotify-sdk-script");

    if (scriptExists) {
      if (spotifyWindow.Spotify) {
        initializePlayer(token);
      }
      return;
    }

    spotifyWindow.onSpotifyWebPlaybackSDKReady = () => {
      initializePlayer(token);
    };

    const script = document.createElement("script");
    script.id = "spotify-sdk-script";
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
        playerRef.current = null;
      }
    };
  }, [token, isPremium, initializePlayer]);

  useEffect(() => {
    if (!token || !isReady) return;

    function pollState() {
      playerRef.current?.getCurrentState().then((state) => {
        if (!state) return;
        setIsPlaying(!state.paused);
        const track = state.track_window.current_track;
        if (track) {
          setCurrentTrack({
            name: track.name,
            artist: track.artists.map((a) => a.name).join(", "),
            albumArt: track.album.images[0]?.url || "",
            durationMs: state.duration,
            positionMs: state.position,
          });
        }
      });
    }

    pollRef.current = setInterval(pollState, 1000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [token, isReady]);

  const togglePlay = useCallback(() => {
    playerRef.current?.togglePlay();
  }, []);

  const nextTrackFn = useCallback(() => {
    playerRef.current?.nextTrack();
  }, []);

  const previousTrackFn = useCallback(() => {
    playerRef.current?.previousTrack();
  }, []);

  return (
    <SpotifyContext.Provider
      value={{
        isConnected,
        isPremium,
        isReady,
        isPlaying,
        currentTrack,
        connect,
        disconnect,
        togglePlay,
        nextTrack: nextTrackFn,
        previousTrack: previousTrackFn,
        premiumError,
        completeAuth,
        showFloat,
        setShowFloat,
      }}
    >
      {children}
    </SpotifyContext.Provider>
  );
}
