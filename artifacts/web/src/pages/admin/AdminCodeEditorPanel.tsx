import { useState, useRef, useEffect } from "react";
import {
  Loader2, Send, Search, FolderOpen, File, RefreshCcw, Code2,
  AlertTriangle, Sparkles, X, ChevronUp, ChevronDown,
} from "lucide-react";
import { API_BASE, authHeaders } from "./adminUtils";

interface CodeEditorChatMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export function AdminCodeEditorPanel() {
  const [files, setFiles] = useState<string[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileBrowserOpen, setFileBrowserOpen] = useState(false);

  const [convId, setConvId] = useState<number | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [fileLoadError, setFileLoadError] = useState(false);
  const [chatMessages, setChatMessages] = useState<CodeEditorChatMessage[]>([]);
  const [commandInput, setCommandInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [fileSearchTerm, setFileSearchTerm] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const activeMatchRef = useRef<HTMLElement | null>(null);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  const fetchOpts: RequestInit = { credentials: "include" };
  const headers = { "Content-Type": "application/json", ...authHeaders() };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    loadFiles();
    initConversation();
  }, []);

  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    setFilteredFiles(q ? files.filter((f) => f.toLowerCase().includes(q)) : files);
  }, [searchQuery, files]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  async function loadFiles() {
    setLoadingFiles(true);
    setFileLoadError(false);
    try {
      const res = await fetch(`${API_BASE}/admin/files`, { ...fetchOpts, headers });
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files);
        setFilteredFiles(data.files);
      } else {
        setFileLoadError(true);
      }
    } catch {
      setFileLoadError(true);
    }
    setLoadingFiles(false);
  }

  async function initConversation(): Promise<number | null> {
    setSessionError(false);
    try {
      const res = await fetch(`${API_BASE}/gemini/conversations`, {
        method: "POST", ...fetchOpts, headers,
        body: JSON.stringify({ title: "Code Editor Session" }),
      });
      const data = await res.json();
      if (typeof data?.id === "number") {
        setConvId(data.id);
        setSessionReady(true);
        return data.id;
      }
      setSessionError(true);
    } catch {
      setSessionError(true);
    }
    return null;
  }

  async function ensureConversation(): Promise<number | null> {
    if (convId) return convId;
    return initConversation();
  }

  async function selectFile(filePath: string) {
    setSelectedFile(filePath);
    setFileContent(null);
    setLoadingFile(true);
    setFileSearchTerm("");
    setActiveMatchIndex(0);

    const currentConvId = await ensureConversation();
    if (!currentConvId) {
      setLoadingFile(false);
      return;
    }

    const userMsg = `Please read the file at path: ${filePath}`;
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: userMsg },
      { role: "assistant", content: "", streaming: true },
    ]);

    await streamCodeEditorMessage(userMsg, currentConvId, (toolCall) => {
      if (toolCall.name === "read_source_file" && toolCall.result) {
        const result = toolCall.result as { content?: string };
        if (result.content) setFileContent(result.content);
      }
    });

    setLoadingFile(false);
  }

  async function streamCodeEditorMessage(
    msg: string,
    currentConvId: number,
    onToolCall?: (tc: { name: string; result: unknown }) => void,
  ) {
    const response = await fetch(`${API_BASE}/gemini/conversations/${currentConvId}/messages`, {
      method: "POST", ...fetchOpts, headers,
      body: JSON.stringify({
        content: msg,
        pageContext: { currentPage: "Admin Code Editor", route: "/admin", isAdmin: true },
      }),
    });

    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    let buffer = "";
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          if (parsed.content) {
            fullText += parsed.content;
            setChatMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: fullText, streaming: true };
              return updated;
            });
          }
          if (parsed.toolCall && onToolCall) {
            onToolCall(parsed.toolCall);
          }
          if (parsed.done) {
            setChatMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: fullText, streaming: false };
              return updated;
            });
          }
        } catch {}
      }
    }

    setChatMessages((prev) => {
      const updated = [...prev];
      if (updated[updated.length - 1]?.streaming) {
        updated[updated.length - 1] = { role: "assistant", content: fullText, streaming: false };
      }
      return updated;
    });
  }

  function isFilePath(input: string): boolean {
    if (input.includes("/")) return true;
    const lowerInput = input.toLowerCase().trim();
    return files.some((f) => {
      const fileName = f.split("/").pop()?.toLowerCase() ?? "";
      return fileName === lowerInput || f.toLowerCase() === lowerInput;
    });
  }

  async function handleCommandSubmit() {
    if (!commandInput.trim() || chatLoading) return;
    const userText = commandInput.trim();

    if (isFilePath(userText)) {
      const matched = files.find(
        (f) =>
          f.toLowerCase() === userText.toLowerCase() ||
          (f.split("/").pop()?.toLowerCase() ?? "") === userText.toLowerCase()
      );
      if (matched) {
        setCommandInput("");
        setSearchQuery(userText);
        setFileBrowserOpen(true);
        selectFile(matched);
        return;
      }
      setSearchQuery(userText);
      setFileBrowserOpen(true);
      setCommandInput("");
      setChatMessages((prev) => [
        ...prev,
        { role: "user", content: `Navigate to: ${userText}`, streaming: false },
        { role: "assistant", content: `Showing filtered files matching "${userText}" in the file browser. Click a file to open it.`, streaming: false },
      ]);
      return;
    }

    setCommandInput("");
    setChatLoading(true);
    const context = selectedFile
      ? `[Context: currently viewing file "${selectedFile}"] ${userText}`
      : userText;

    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: userText },
      { role: "assistant", content: "", streaming: true },
    ]);

    try {
      const currentConvId = await ensureConversation();
      if (!currentConvId) {
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: "Error: Could not start AI session.", streaming: false };
          return updated;
        });
        setChatLoading(false);
        return;
      }

      await streamCodeEditorMessage(context, currentConvId, (toolCall) => {
        if (toolCall.name === "write_source_file") {
          const written = toolCall.result as { success?: boolean; path?: string };
          if (written.success) {
            const writtenPath = written.path as string | undefined;
            if (writtenPath) {
              setTimeout(() => selectFile(writtenPath), 500);
            } else if (selectedFile) {
              setTimeout(() => selectFile(selectedFile), 500);
            }
          }
        }
        if (toolCall.name === "read_source_file") {
          const result = toolCall.result as { content?: string; path?: string };
          if (result.content) {
            setFileContent(result.content);
            if (result.path) setSelectedFile(result.path as string);
          }
        }
      });
    } catch {
      setChatMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Error getting response.", streaming: false };
        return updated;
      });
    }

    setChatLoading(false);
  }

  function getMatches(content: string, term: string): number[] {
    if (!term.trim()) return [];
    const positions: number[] = [];
    const lower = content.toLowerCase();
    const lowerTerm = term.toLowerCase();
    let idx = 0;
    while (idx < lower.length) {
      const found = lower.indexOf(lowerTerm, idx);
      if (found === -1) break;
      positions.push(found);
      idx = found + lowerTerm.length;
    }
    return positions;
  }

  function renderHighlightedCode(content: string, term: string, activeIdx: number) {
    const matches = getMatches(content, term);
    if (matches.length === 0) {
      return <>{content}</>;
    }
    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    matches.forEach((pos, i) => {
      if (pos > cursor) {
        nodes.push(<span key={`t-${i}`}>{content.slice(cursor, pos)}</span>);
      }
      const isActive = i === activeIdx;
      nodes.push(
        <mark
          key={`m-${i}`}
          ref={isActive ? (el) => { activeMatchRef.current = el; } : undefined}
          style={{
            backgroundColor: isActive ? "#f59e0b" : "#fde68a",
            color: "#111",
            borderRadius: "2px",
            position: "relative",
          }}
        >
          {content.slice(pos, pos + term.length)}
          {isActive && (
            <button
              onClick={() => {
                const prefill = `In "${selectedFile}", find "${term}" (match ${activeIdx + 1}) — `;
                setCommandInput(prefill);
                setTimeout(() => commandInputRef.current?.focus(), 50);
              }}
              style={{
                position: "absolute",
                top: "-22px",
                left: "50%",
                transform: "translateX(-50%)",
                backgroundColor: "#7c3aed",
                color: "#fff",
                fontSize: "9px",
                fontWeight: 600,
                padding: "2px 6px",
                borderRadius: "4px",
                whiteSpace: "nowrap",
                cursor: "pointer",
                border: "none",
                zIndex: 10,
              }}
            >
              Promote
            </button>
          )}
        </mark>
      );
      cursor = pos + term.length;
    });
    if (cursor < content.length) {
      nodes.push(<span key="tail">{content.slice(cursor)}</span>);
    }
    return <>{nodes}</>;
  }

  const fileSearchMatches = fileContent && fileSearchTerm.trim()
    ? getMatches(fileContent, fileSearchTerm)
    : [];

  function handleFileSearchChange(val: string) {
    setFileSearchTerm(val);
    setActiveMatchIndex(0);
  }

  function goToPrevMatch() {
    setActiveMatchIndex((prev) =>
      prev <= 0 ? fileSearchMatches.length - 1 : prev - 1
    );
  }

  function goToNextMatch() {
    setActiveMatchIndex((prev) =>
      prev >= fileSearchMatches.length - 1 ? 0 : prev + 1
    );
  }

  useEffect(() => {
    if (activeMatchRef.current) {
      activeMatchRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeMatchIndex, fileSearchTerm]);

  return (
      <div className="space-y-4 flex flex-col h-[780px]">
        {/* Header */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <Code2 className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">AI Code Editor</h2>
          {!sessionReady && !sessionError && (
            <span className="flex items-center gap-1.5 text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
              <Loader2 className="h-3 w-3 animate-spin" />
              Starting AI session...
            </span>
          )}
          {sessionError && (
            <span className="flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 px-2 py-1 rounded-full">
              <AlertTriangle className="h-3 w-3" />
              AI session failed —
              <button onClick={() => initConversation()} className="underline ml-0.5">retry</button>
            </span>
          )}
        </div>

        {/* Unified Command Bar */}
        <div className="shrink-0 bg-card border border-border rounded-xl p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-2 focus-within:ring-1 focus-within:ring-primary">
              <input
                ref={commandInputRef}
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleCommandSubmit()}
                placeholder="What do you want to change? Or type a file path to navigate..."
                disabled={chatLoading || !sessionReady}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
              />
              {commandInput && (
                <button onClick={() => setCommandInput("")} className="text-muted-foreground hover:text-foreground shrink-0">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={handleCommandSubmit}
              disabled={!commandInput.trim() || chatLoading || !sessionReady}
              className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center shrink-0 disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {chatLoading ? <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" /> : <Send className="h-4 w-4 text-primary-foreground" />}
            </button>
            <button
              onClick={() => setFileBrowserOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 h-9 rounded-lg text-xs font-medium border transition-colors shrink-0 ${
                fileBrowserOpen
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
              }`}
              title="Toggle file browser"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Files
              {fileBrowserOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          </div>
          {selectedFile && (
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <File className="h-3 w-3 text-primary shrink-0" />
              <span className="font-mono text-primary truncate flex-1">{selectedFile}</span>
              <button
                onClick={() => selectedFile && selectFile(selectedFile)}
                disabled={loadingFile}
                className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-40"
                title="Refresh file"
              >
                {loadingFile ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
              </button>
            </div>
          )}
        </div>

        {/* Main content area */}
        <div className="flex gap-4 flex-1 min-h-0">
          {/* File browser — collapsible side panel */}
          {fileBrowserOpen && (
            <div className="w-72 shrink-0 bg-card border border-border rounded-xl flex flex-col overflow-hidden">
              <div className="p-3 border-b border-border shrink-0">
                <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5">
                  <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search files..."
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto">
                {loadingFiles ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-2">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <p className="text-xs text-muted-foreground">Loading files...</p>
                  </div>
                ) : fileLoadError ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-2 px-4 text-center">
                    <AlertTriangle className="h-6 w-6 text-destructive/50" />
                    <p className="text-xs text-destructive">Failed to load files.</p>
                    <button onClick={loadFiles} className="text-xs text-primary hover:underline">Retry</button>
                  </div>
                ) : filteredFiles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-2 px-4 text-center">
                    <FolderOpen className="h-6 w-6 text-muted-foreground/40" />
                    <p className="text-xs text-muted-foreground">
                      {searchQuery ? "No files match your search" : "No files found in artifacts/"}
                    </p>
                  </div>
                ) : (
                  filteredFiles.map((filePath) => {
                    const parts = filePath.split("/");
                    const fileName = parts[parts.length - 1];
                    const dirPath = parts.slice(0, -1).join("/");
                    const isSelected = filePath === selectedFile;
                    return (
                      <button
                        key={filePath}
                        onClick={() => !isSelected && sessionReady && selectFile(filePath)}
                        disabled={!sessionReady}
                        className={`w-full text-left px-3 py-2 flex items-start gap-2 transition-colors border-b border-border/30 last:border-0 ${
                          isSelected
                            ? "bg-primary/10 border-l-2 border-l-primary"
                            : "hover:bg-muted/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        }`}
                      >
                        <File className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-medium truncate ${isSelected ? "text-primary" : "text-foreground"}`}>
                            {fileName}
                          </p>
                          {dirPath && (
                            <p className="text-[10px] text-muted-foreground truncate">{dirPath}</p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="p-2 border-t border-border shrink-0">
                <p className="text-[10px] text-muted-foreground text-center">
                  {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""}
                  {searchQuery ? ` matching "${searchQuery}"` : " in artifacts/"}
                </p>
              </div>
            </div>
          )}

          {/* Right panel: code viewer + conversation log */}
          <div className="flex-1 flex flex-col gap-3 min-w-0 min-h-0">
            {/* Code viewer (shown when a file is selected) */}
            {selectedFile && (
              <div className="bg-card border border-border rounded-xl flex flex-col overflow-hidden shrink-0" style={{ maxHeight: "280px" }}>
                {fileContent && (
                  <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-muted/10 shrink-0">
                    <Search className="h-3 w-3 text-muted-foreground shrink-0" />
                    <input
                      type="text"
                      value={fileSearchTerm}
                      onChange={(e) => handleFileSearchChange(e.target.value)}
                      placeholder="Search in file..."
                      className="flex-1 bg-transparent text-xs outline-none placeholder:text-muted-foreground font-mono"
                    />
                    {fileSearchTerm && (
                      <>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {fileSearchMatches.length === 0
                            ? "0 matches"
                            : `${activeMatchIndex + 1} of ${fileSearchMatches.length}`}
                        </span>
                        <button
                          onClick={goToPrevMatch}
                          disabled={fileSearchMatches.length === 0}
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          title="Previous match"
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={goToNextMatch}
                          disabled={fileSearchMatches.length === 0}
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          title="Next match"
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => { setFileSearchTerm(""); setActiveMatchIndex(0); }}
                          className="p-0.5 text-muted-foreground hover:text-foreground"
                          title="Clear search"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                )}
                <div className="overflow-auto flex-1 bg-background/50">
                  {fileContent ? (
                    <pre className="p-4 text-xs font-mono text-foreground/90 whitespace-pre overflow-x-auto min-w-0" style={{ lineHeight: "1.6", paddingTop: fileSearchTerm ? "24px" : undefined }}>
                      {fileSearchTerm.trim()
                        ? renderHighlightedCode(fileContent, fileSearchTerm, activeMatchIndex)
                        : fileContent}
                    </pre>
                  ) : loadingFile ? (
                    <div className="flex flex-col items-center justify-center h-24 gap-2">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      <p className="text-xs text-muted-foreground">Reading file via AI...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-24 gap-2 text-center px-4">
                      <File className="h-6 w-6 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">File content will appear here after the AI reads it</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Conversation log */}
            <div className="flex-1 bg-card border border-border rounded-xl flex flex-col overflow-hidden min-h-0">
              <div
                ref={chatScrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0"
              >
                {chatMessages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6 py-8">
                    <Sparkles className="h-8 w-8 text-primary/30" />
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">Type a command above to get started</p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        Describe what you want to change in plain English — the AI will identify which files to read and modify. Or type a file name / path to open it in the viewer.
                      </p>
                    </div>
                    {!sessionReady && !sessionError && (
                      <p className="text-xs text-amber-500">Waiting for AI session to start...</p>
                    )}
                    {sessionError && (
                      <button onClick={() => initConversation()} className="text-xs text-primary hover:underline">
                        Retry AI session
                      </button>
                    )}
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-xl px-3 py-2.5 text-xs ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}>
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                          {msg.streaming && <span className="opacity-70">▌</span>}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  