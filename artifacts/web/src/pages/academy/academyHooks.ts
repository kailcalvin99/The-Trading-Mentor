import { useState, useEffect, useCallback } from "react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

export function getApiUrl(): string {
  const base = import.meta.env.VITE_API_URL || "/api/";
  return base.endsWith("/") ? base : `${base}/`;
}

export const ADVANCED_LESSON_IDS = new Set(["ch3-4", "ch3-4b"]);

export function useAcademyWatchedVideos() {
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/videos/watched`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.watchedIds)) {
          setWatched(new Set(data.watchedIds));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markWatched = useCallback(async (videoId: string) => {
    setWatched((prev) => new Set([...prev, videoId]));
    try {
      await fetch(`${API_BASE}/videos/watched`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
    } catch {}
  }, []);

  const unmarkWatched = useCallback(async (videoId: string) => {
    setWatched((prev) => {
      const next = new Set(prev);
      next.delete(videoId);
      return next;
    });
    try {
      await fetch(`${API_BASE}/videos/watched/${videoId}`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch {}
  }, []);

  return { watched, loading, markWatched, unmarkWatched };
}

export async function streamMessageWeb(
  conversationId: number,
  content: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  const res = await fetch(
    `${getApiUrl()}gemini/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ content }),
    }
  );

  if (!res.ok) {
    onError("Failed to get response");
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onError("No response body");
    return;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let doneSignaled = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        try {
          const parsed = JSON.parse(data);
          if (parsed.content) onChunk(parsed.content);
          if (parsed.done) { doneSignaled = true; onDone(); }
          if (parsed.error) onError(parsed.error);
        } catch {}
      }
    }

    if (buffer.trim()) {
      const remaining = buffer.trim();
      if (remaining.startsWith("data: ")) {
        try {
          const parsed = JSON.parse(remaining.slice(6));
          if (parsed.content) onChunk(parsed.content);
          if (parsed.done) { doneSignaled = true; onDone(); }
          if (parsed.error) onError(parsed.error);
        } catch {}
      }
    }

    if (!doneSignaled) onDone();
  } catch {
    onError("Stream interrupted");
  }
}
