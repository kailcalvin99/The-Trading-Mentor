import { fetch } from "expo/fetch";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";

let _on401Handler: (() => void) | null = null;

export class SessionExpiredError extends Error {
  readonly name = "SessionExpiredError";
  constructor() {
    super("Session expired");
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function setOn401Handler(handler: (() => void) | null): void {
  _on401Handler = handler;
}

export function fireOn401(): void {
  if (_on401Handler) _on401Handler();
}

function handle401(): never {
  fireOn401();
  throw new SessionExpiredError();
}

export const getBaseUrl = () => {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/`;
  return "http://localhost:80/";
};

export const getApiUrl = () => `${getBaseUrl()}api/`;

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  if (token) return { Authorization: `Bearer ${token}` };
  return {};
}

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${getApiUrl()}${path}`, {
    credentials: "include",
    headers,
  });
  if (!res.ok) {
    if (res.status === 401) handle401();
    throw new Error(`API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${getApiUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) handle401();
    let message = `Request failed (${res.status})`;
    try {
      const json = await res.json() as { error?: string; message?: string };
      if (json.error) message = json.error;
      else if (json.message) message = json.message;
    } catch {}
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${getApiUrl()}${path}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) handle401();
    throw new Error(`API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  const headers = await authHeaders();
  const res = await fetch(`${getApiUrl()}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
    credentials: "include",
  });
  if (!res.ok) {
    if (res.status === 401) handle401();
    throw new Error(`API error: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function apiDelete(path: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${getApiUrl()}${path}`, {
    method: "DELETE",
    credentials: "include",
    headers,
  });
  if (!res.ok && res.status !== 204) {
    if (res.status === 401) handle401();
    throw new Error(`API error: ${res.status}`);
  }
}

export function isSessionExpiredError(err: unknown): boolean {
  if (err instanceof SessionExpiredError) return true;
  if (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 401) return true;
  return false;
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
  const headers = await authHeaders();
  const res = await fetch(
    `${getApiUrl()}gemini/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        ...headers,
      },
      body: JSON.stringify({ content, pageContext }),
      credentials: "include",
    }
  );

  if (!res.ok) {
    if (res.status === 401) handle401();
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
