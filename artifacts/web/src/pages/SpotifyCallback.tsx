import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSpotify, SPOTIFY_CLIENT_ID, REDIRECT_URI, VERIFIER_KEY, STATE_KEY } from "@/contexts/SpotifyContext";

interface TokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
  token_type: string;
  scope: string;
}

interface TokenErrorResponse {
  error: string;
  error_description?: string;
}

function isTokenResponse(data: unknown): data is TokenResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "access_token" in data &&
    "expires_in" in data &&
    "refresh_token" in data
  );
}

function isTokenError(data: unknown): data is TokenErrorResponse {
  return typeof data === "object" && data !== null && "error" in data;
}

export default function SpotifyCallback() {
  const navigate = useNavigate();
  const { completeAuth } = useSpotify();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const err = params.get("error");
    const returnedState = params.get("state");

    if (err) {
      setError(`Spotify authorization failed: ${err}`);
      setTimeout(() => navigate("/settings", { replace: true }), 3000);
      return;
    }

    const savedState = sessionStorage.getItem(STATE_KEY);
    if (!returnedState || returnedState !== savedState) {
      setError("OAuth state mismatch. Please try connecting again.");
      sessionStorage.removeItem(STATE_KEY);
      setTimeout(() => navigate("/settings", { replace: true }), 3000);
      return;
    }
    sessionStorage.removeItem(STATE_KEY);

    if (!code) {
      setError("No authorization code received.");
      setTimeout(() => navigate("/settings", { replace: true }), 3000);
      return;
    }

    const verifier = sessionStorage.getItem(VERIFIER_KEY);
    if (!verifier) {
      setError("Missing code verifier. Please try connecting again.");
      setTimeout(() => navigate("/settings", { replace: true }), 3000);
      return;
    }

    async function exchangeToken() {
      try {
        const body = new URLSearchParams({
          client_id: SPOTIFY_CLIENT_ID,
          grant_type: "authorization_code",
          code: code!,
          redirect_uri: REDIRECT_URI,
          code_verifier: verifier!,
        });

        const res = await fetch("https://accounts.spotify.com/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });

        if (!res.ok) {
          const errorData: unknown = await res.json().catch(() => ({}));
          if (isTokenError(errorData)) {
            throw new Error(errorData.error_description || "Token exchange failed");
          }
          throw new Error("Token exchange failed");
        }

        const data: unknown = await res.json();
        if (!isTokenResponse(data)) {
          throw new Error("Invalid token response from Spotify");
        }

        sessionStorage.removeItem(VERIFIER_KEY);
        completeAuth(data.access_token, data.expires_in, data.refresh_token);
        navigate("/", { replace: true });
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to connect to Spotify.";
        setError(message);
        setTimeout(() => navigate("/settings", { replace: true }), 3000);
      }
    }

    exchangeToken();
  }, [navigate, completeAuth]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <div className="w-12 h-12 mx-auto rounded-full bg-destructive/10 flex items-center justify-center">
              <svg className="w-6 h-6 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-sm text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground">Redirecting to settings...</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 mx-auto rounded-full bg-[#1DB954]/10 flex items-center justify-center animate-pulse">
              <svg className="w-6 h-6 text-[#1DB954]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
              </svg>
            </div>
            <p className="text-sm text-foreground font-medium">Connecting to Spotify...</p>
            <p className="text-xs text-muted-foreground">Please wait</p>
          </>
        )}
      </div>
    </div>
  );
}
