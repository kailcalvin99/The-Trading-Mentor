import { fetch } from "expo/fetch";

const getBaseUrl = () => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/`;
  return "http://localhost:80/";
};

export const getApiUrl = () => `${getBaseUrl()}api/`;

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${getApiUrl()}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${getApiUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${getApiUrl()}${path}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error(`API error: ${res.status}`);
}

export interface ToolCallEvent {
  name: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

export async function streamMessage(
  conversationId: number,
  content: string,
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: string) => void,
  pageContext?: Record<string, unknown>,
  onToolCall?: (toolCall: ToolCallEvent) => void
): Promise<void> {
  const res = await fetch(
    `${getApiUrl()}gemini/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ content, pageContext }),
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
        if (parsed.toolCall && onToolCall) onToolCall(parsed.toolCall);
        if (parsed.done) onDone();
        if (parsed.error) onError(parsed.error);
      } catch {}
    }
  }
}
