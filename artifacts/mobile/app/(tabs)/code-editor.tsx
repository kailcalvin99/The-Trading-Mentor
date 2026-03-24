import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { apiGet, apiPost, streamMessage, isSessionExpiredError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

const C = Colors.dark;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export default function CodeEditorScreen() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [files, setFiles] = useState<string[]>([]);
  const [filteredFiles, setFilteredFiles] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingFiles, setLoadingFiles] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileBrowserOpen, setFileBrowserOpen] = useState(false);

  const [conversationId, setConversationId] = useState<number | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [commandInput, setCommandInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const [fileSearchTerm, setFileSearchTerm] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  const chatScrollRef = useRef<ScrollView>(null);
  const fileScrollRef = useRef<ScrollView>(null);
  const commandInputRef = useRef<TextInput>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (authLoading) return;
    if (user?.role !== "admin") {
      router.replace("/dashboard");
      return;
    }
    if (initialized.current) return;
    initialized.current = true;
    loadFiles();
    initConversation();
  }, [authLoading, user]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredFiles(files.filter((f) => f.toLowerCase().includes(searchQuery.toLowerCase())));
    } else {
      setFilteredFiles(files);
    }
  }, [searchQuery, files]);

  async function loadFiles() {
    setLoadingFiles(true);
    try {
      const data = await apiGet<{ files: string[] }>("admin/files");
      setFiles(data.files);
      setFilteredFiles(data.files);
    } catch (err: unknown) {
      if (isSessionExpiredError(err)) return;
      Alert.alert("Error", "Failed to load file list. Check admin access.");
    } finally {
      setLoadingFiles(false);
    }
  }

  async function initConversation() {
    try {
      const data = await apiPost<{ id: number; title: string }>(
        "gemini/conversations",
        { title: "Code Editor Session" }
      );
      if (typeof data?.id !== "number") {
        throw new Error(`Unexpected conversation response: ${JSON.stringify(data)}`);
      }
      setConversationId(data.id);
      setSessionReady(true);
    } catch (err) {
      Alert.alert(
        "Session Error",
        `Failed to start AI session: ${err instanceof Error ? err.message : String(err)}. Please go back and try again.`
      );
    }
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
        setFileBrowserOpen(false);
        selectFile(matched);
        return;
      }
      setSearchQuery(userText);
      setFileBrowserOpen(true);
      setCommandInput("");
      setChatMessages((prev) => [
        ...prev,
        { role: "user", content: `Navigate to: ${userText}`, streaming: false },
        { role: "assistant", content: `Showing filtered files matching "${userText}". Tap a file to open it.`, streaming: false },
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

    if (!conversationId) {
      setChatMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: "Error: AI session not ready. Please retry.", streaming: false };
        return updated;
      });
      setChatLoading(false);
      return;
    }

    let fullText = "";
    await streamMessage(
      conversationId,
      context,
      (chunk) => {
        fullText += chunk;
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: fullText, streaming: true };
          return updated;
        });
        chatScrollRef.current?.scrollToEnd({ animated: false });
      },
      () => {
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: fullText, streaming: false };
          return updated;
        });
        setChatLoading(false);
        chatScrollRef.current?.scrollToEnd({ animated: false });
      },
      (err) => {
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: `Error: ${err}`, streaming: false };
          return updated;
        });
        setChatLoading(false);
      },
      undefined,
      (toolCall) => {
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
      }
    );
  }

  async function selectFile(filePath: string) {
    setSelectedFile(filePath);
    setFileContent(null);
    setLoadingFile(true);
    setFileSearchTerm("");
    setActiveMatchIndex(0);

    if (!conversationId) {
      setLoadingFile(false);
      Alert.alert("Error", "Chat session not ready. Please try again.");
      return;
    }

    const userMsg = `Please read the file at path: ${filePath}`;
    const assistantPlaceholder: ChatMessage = { role: "assistant", content: "", streaming: true };
    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: userMsg },
      assistantPlaceholder,
    ]);

    let fullText = "";
    await streamMessage(
      conversationId,
      userMsg,
      (chunk) => {
        fullText += chunk;
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: fullText, streaming: true };
          return updated;
        });
        chatScrollRef.current?.scrollToEnd({ animated: false });
      },
      () => {
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: fullText, streaming: false };
          return updated;
        });
        setLoadingFile(false);
        chatScrollRef.current?.scrollToEnd({ animated: false });
      },
      (err) => {
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: `Error reading file: ${err}`, streaming: false };
          return updated;
        });
        setLoadingFile(false);
      },
      undefined,
      (toolCall) => {
        if (toolCall.name === "read_source_file" && toolCall.result) {
          const result = toolCall.result as { content?: string };
          if (result.content) {
            setFileContent(result.content as string);
          }
        }
      }
    );
  }

  function getMobileMatches(content: string, term: string): number[] {
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

  function renderHighlightedCode(content: string, term: string, activeIdx: number): React.ReactNode {
    const matches = getMobileMatches(content, term);
    if (matches.length === 0) return <Text style={s.codeText}>{content}</Text>;
    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    matches.forEach((pos, i) => {
      if (pos > cursor) {
        nodes.push(
          <Text key={`t-${i}`} style={s.codeText}>{content.slice(cursor, pos)}</Text>
        );
      }
      const isActive = i === activeIdx;
      nodes.push(
        <Text
          key={`m-${i}`}
          style={[s.codeText, isActive ? s.codeMatchActive : s.codeMatch]}
        >
          {content.slice(pos, pos + term.length)}
        </Text>
      );
      cursor = pos + term.length;
    });
    if (cursor < content.length) {
      nodes.push(<Text key="tail" style={s.codeText}>{content.slice(cursor)}</Text>);
    }
    return <Text>{nodes}</Text>;
  }

  const mobileFileMatches = fileContent && fileSearchTerm.trim()
    ? getMobileMatches(fileContent, fileSearchTerm)
    : [];

  function scrollToMatch(content: string, matches: number[], idx: number) {
    if (!fileScrollRef.current || matches.length === 0) return;
    const pos = matches[idx];
    const linesBefore = content.slice(0, pos).split("\n").length - 1;
    const LINE_HEIGHT = 17;
    const CODE_PADDING = 14;
    const yOffset = Math.max(0, linesBefore * LINE_HEIGHT + CODE_PADDING - 40);
    fileScrollRef.current.scrollTo({ y: yOffset, animated: true });
  }

  function renderFileItem({ item }: { item: string }) {
    const parts = item.split("/");
    const fileName = parts[parts.length - 1];
    const dirPath = parts.slice(0, -1).join("/");
    const ext = fileName.split(".").pop() ?? "";
    const isSelected = item === selectedFile;

    return (
      <TouchableOpacity
        style={[s.fileItem, isSelected && s.fileItemActive, !sessionReady && s.fileItemDisabled]}
        onPress={() => {
          if (sessionReady) {
            selectFile(item);
            setFileBrowserOpen(false);
          }
        }}
        activeOpacity={sessionReady ? 0.7 : 1}
      >
        <Ionicons
          name={getFileIcon(ext)}
          size={15}
          color={isSelected ? C.accent : C.textSecondary}
          style={s.fileIcon}
        />
        <View style={s.fileInfo}>
          <Text style={[s.fileName, isSelected && s.fileNameActive]} numberOfLines={1}>
            {fileName}
          </Text>
          {dirPath ? (
            <Text style={s.filePath} numberOfLines={1}>
              {dirPath}
            </Text>
          ) : null}
        </View>
        {isSelected && (
          <Ionicons name="chevron-forward" size={14} color={C.accent} />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["bottom"]}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Ionicons name="code-slash-outline" size={18} color={C.accent} />
        <Text style={s.title}>AI Code Editor</Text>
        <TouchableOpacity
          style={[s.filesToggleBtn, fileBrowserOpen && s.filesToggleBtnActive]}
          onPress={() => setFileBrowserOpen((v) => !v)}
        >
          <Ionicons name="folder-outline" size={16} color={fileBrowserOpen ? C.accent : C.textSecondary} />
          <Text style={[s.filesToggleText, fileBrowserOpen && s.filesToggleTextActive]}>Files</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Unified Command Bar */}
        <View style={s.commandBar}>
          <View style={s.commandInputRow}>
            <Ionicons name="sparkles-outline" size={16} color={C.accent} style={s.commandIcon} />
            <TextInput
              ref={commandInputRef}
              style={s.commandInput}
              placeholder="What do you want to change? Or type a file path..."
              placeholderTextColor={C.textSecondary}
              value={commandInput}
              onChangeText={setCommandInput}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={handleCommandSubmit}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!chatLoading && sessionReady}
            />
            {commandInput.length > 0 && (
              <TouchableOpacity onPress={() => setCommandInput("")} style={s.commandClear}>
                <Ionicons name="close-circle" size={16} color={C.textSecondary} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.sendBtn, (!commandInput.trim() || chatLoading || !sessionReady) && s.sendBtnDisabled]}
              onPress={handleCommandSubmit}
              disabled={!commandInput.trim() || chatLoading || !sessionReady}
              activeOpacity={0.8}
            >
              {chatLoading ? (
                <ActivityIndicator size="small" color="#0A0A0F" />
              ) : (
                <Ionicons name="arrow-up" size={18} color="#0A0A0F" />
              )}
            </TouchableOpacity>
          </View>
          {selectedFile && (
            <View style={s.activeFileRow}>
              <Ionicons name="document-outline" size={12} color={C.accent} />
              <Text style={s.activeFileName} numberOfLines={1}>{selectedFile}</Text>
              <TouchableOpacity
                onPress={() => selectFile(selectedFile)}
                disabled={loadingFile}
                style={s.refreshBtn}
              >
                {loadingFile ? (
                  <ActivityIndicator size="small" color={C.textSecondary} />
                ) : (
                  <Ionicons name="refresh-outline" size={14} color={C.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          )}
          {!sessionReady && (
            <View style={s.sessionBanner}>
              <ActivityIndicator size="small" color={C.accent} />
              <Text style={s.sessionBannerText}>Starting AI session...</Text>
              <TouchableOpacity onPress={initConversation} style={s.retryBtn}>
                <Text style={s.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* File Browser — collapsible panel (fixed height, conversation log still visible below) */}
        {fileBrowserOpen && (
          <View style={s.fileBrowser}>
            <View style={s.searchBar}>
              <Ionicons name="search-outline" size={16} color={C.textSecondary} />
              <TextInput
                style={s.searchInput}
                placeholder="Search files..."
                placeholderTextColor={C.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={16} color={C.textSecondary} />
                </TouchableOpacity>
              ) : null}
            </View>

            {loadingFiles ? (
              <View style={s.center}>
                <ActivityIndicator size="large" color={C.accent} />
                <Text style={s.loadingText}>Loading files...</Text>
              </View>
            ) : (
              <FlatList
                data={filteredFiles}
                keyExtractor={(item) => item}
                renderItem={renderFileItem}
                contentContainerStyle={s.fileList}
                showsVerticalScrollIndicator={false}
                style={s.fileListContainer}
                ListEmptyComponent={
                  <View style={s.emptyState}>
                    <Ionicons name="folder-open-outline" size={32} color={C.textTertiary} />
                    <Text style={s.emptyText}>
                      {searchQuery ? "No files match your search" : "No files found in artifacts/"}
                    </Text>
                  </View>
                }
              />
            )}
            <View style={s.chatDivider} />
          </View>
        )}

        {/* Code viewer — only shown when a file is selected and not browsing */}
        {selectedFile && !fileBrowserOpen && (
          <>
            {fileContent && (
              <View style={s.fileSearchBar}>
                <Ionicons name="search-outline" size={13} color={C.textSecondary} />
                <TextInput
                  style={s.fileSearchInput}
                  placeholder="Search in file..."
                  placeholderTextColor={C.textSecondary}
                  value={fileSearchTerm}
                  onChangeText={(val) => { setFileSearchTerm(val); setActiveMatchIndex(0); }}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {fileSearchTerm ? (
                  <>
                    <Text style={s.fileSearchCount}>
                      {mobileFileMatches.length === 0
                        ? "0 matches"
                        : `${activeMatchIndex + 1} of ${mobileFileMatches.length}`}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        const next = activeMatchIndex <= 0 ? mobileFileMatches.length - 1 : activeMatchIndex - 1;
                        setActiveMatchIndex(next);
                        scrollToMatch(fileContent, mobileFileMatches, next);
                      }}
                      disabled={mobileFileMatches.length === 0}
                      style={s.fileSearchNavBtn}
                    >
                      <Ionicons name="chevron-up-outline" size={14} color={mobileFileMatches.length === 0 ? C.textTertiary : C.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        const next = activeMatchIndex >= mobileFileMatches.length - 1 ? 0 : activeMatchIndex + 1;
                        setActiveMatchIndex(next);
                        scrollToMatch(fileContent, mobileFileMatches, next);
                      }}
                      disabled={mobileFileMatches.length === 0}
                      style={s.fileSearchNavBtn}
                    >
                      <Ionicons name="chevron-down-outline" size={14} color={mobileFileMatches.length === 0 ? C.textTertiary : C.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setFileSearchTerm(""); setActiveMatchIndex(0); }} style={s.fileSearchNavBtn}>
                      <Ionicons name="close-outline" size={15} color={C.textSecondary} />
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            )}
            {fileSearchTerm.trim() && mobileFileMatches.length > 0 && (
              <View style={s.activeMatchRow}>
                <Text style={s.activeMatchLabel} numberOfLines={1}>
                  Match {activeMatchIndex + 1}: …{fileContent!.slice(
                    Math.max(0, mobileFileMatches[activeMatchIndex] - 12),
                    mobileFileMatches[activeMatchIndex] + fileSearchTerm.length + 12
                  ).replace(/\n/g, " ")}…
                </Text>
                <TouchableOpacity
                  style={s.promoteBtn}
                  onPress={() => {
                    const prefill = `In "${selectedFile}", find "${fileSearchTerm}" (match ${activeMatchIndex + 1}) — `;
                    setCommandInput(prefill);
                    setTimeout(() => {
                      chatScrollRef.current?.scrollToEnd({ animated: true });
                      commandInputRef.current?.focus();
                    }, 100);
                  }}
                >
                  <Text style={s.promoteBtnText}>Promote</Text>
                </TouchableOpacity>
              </View>
            )}

            {fileContent ? (
              <ScrollView
                ref={fileScrollRef}
                style={s.codeScroll}
                contentContainerStyle={s.codeContent}
                showsVerticalScrollIndicator
                horizontal={false}
              >
                <ScrollView horizontal showsHorizontalScrollIndicator>
                  {fileSearchTerm.trim()
                    ? renderHighlightedCode(fileContent, fileSearchTerm, activeMatchIndex)
                    : <Text style={s.codeText} selectable>{fileContent}</Text>}
                </ScrollView>
              </ScrollView>
            ) : (
              <View style={s.codeEmptyState}>
                {loadingFile ? (
                  <>
                    <ActivityIndicator size="small" color={C.accent} />
                    <Text style={s.loadingText}>Reading file...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="document-text-outline" size={28} color={C.textTertiary} />
                    <Text style={s.emptyText}>File content will appear here after the AI reads it</Text>
                  </>
                )}
              </View>
            )}

            <View style={s.chatDivider} />
          </>
        )}

        {/* Conversation log — always visible */}
        <ScrollView
          ref={chatScrollRef}
          style={s.chatHistory}
          contentContainerStyle={s.chatHistoryContent}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: false })}
        >
          {chatMessages.length === 0 ? (
            <View style={s.chatEmpty}>
              <Ionicons name="sparkles-outline" size={28} color={C.textTertiary} />
              <Text style={s.chatEmptyText}>
                Type a command above to get started. Describe what you want to change in plain English — the AI will figure out which files to touch.
              </Text>
              <Text style={s.chatEmptyHint}>Or type a file name to open it for reference.</Text>
            </View>
          ) : (
            chatMessages.map((msg, i) => (
              <View
                key={i}
                style={[
                  s.chatBubble,
                  msg.role === "user" ? s.chatBubbleUser : s.chatBubbleAssistant,
                ]}
              >
                <Text
                  style={[
                    s.chatBubbleText,
                    msg.role === "user" ? s.chatBubbleTextUser : s.chatBubbleTextAssistant,
                  ]}
                >
                  {msg.content}
                  {msg.streaming && <Text style={s.cursor}>▌</Text>}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getFileIcon(ext: string): React.ComponentProps<typeof Ionicons>["name"] {
  switch (ext.toLowerCase()) {
    case "ts":
    case "tsx":
    case "js":
    case "jsx":
      return "logo-javascript";
    case "json":
      return "code-slash-outline";
    case "md":
      return "document-text-outline";
    case "css":
    case "scss":
      return "color-palette-outline";
    case "png":
    case "jpg":
    case "jpeg":
    case "svg":
    case "gif":
      return "image-outline";
    case "sql":
      return "server-outline";
    case "sh":
      return "terminal-outline";
    default:
      return "document-outline";
  }
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    gap: 8,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 17, fontWeight: "800", color: C.text },
  filesToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.cardBorder,
    backgroundColor: C.backgroundSecondary,
  },
  filesToggleBtnActive: {
    borderColor: C.accent + "60",
    backgroundColor: C.accent + "15",
  },
  filesToggleText: { fontSize: 12, fontWeight: "600", color: C.textSecondary },
  filesToggleTextActive: { color: C.accent },

  commandBar: {
    margin: 12,
    marginBottom: 8,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: "hidden",
  },
  commandInputRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  commandIcon: { flexShrink: 0 },
  commandInput: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    padding: 0,
  },
  commandClear: { padding: 2 },
  activeFileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    backgroundColor: C.accent + "08",
  },
  activeFileName: {
    flex: 1,
    fontSize: 11,
    color: C.accent,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  refreshBtn: { padding: 4 },

  sessionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    backgroundColor: C.accent + "08",
  },
  sessionBannerText: { flex: 1, fontSize: 12, color: C.textSecondary },
  retryBtn: { paddingHorizontal: 10, paddingVertical: 4, backgroundColor: C.accent + "25", borderRadius: 8 },
  retryBtnText: { fontSize: 12, fontWeight: "600", color: C.accent },

  fileBrowser: {
    maxHeight: 280,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    padding: 0,
  },
  fileListContainer: { flex: 1 },
  fileList: { paddingHorizontal: 12, paddingBottom: 24 },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 3,
    backgroundColor: C.backgroundSecondary,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  fileItemActive: {
    borderColor: C.accent + "60",
    backgroundColor: C.accent + "10",
  },
  fileItemDisabled: {
    opacity: 0.5,
  },
  fileIcon: { marginRight: 8 },
  fileInfo: { flex: 1 },
  fileName: { fontSize: 13, fontWeight: "600", color: C.text },
  fileNameActive: { color: C.accent },
  filePath: { fontSize: 10, color: C.textSecondary, marginTop: 1 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { fontSize: 13, color: C.textSecondary },
  emptyState: { alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 13, color: C.textSecondary, textAlign: "center", maxWidth: 280 },

  fileSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    backgroundColor: C.backgroundSecondary,
  },
  fileSearchInput: {
    flex: 1,
    fontSize: 12,
    color: C.text,
    padding: 0,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  fileSearchCount: { fontSize: 10, color: C.textSecondary },
  fileSearchNavBtn: { padding: 2 },
  promoteBtn: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    backgroundColor: "#7c3aed",
    borderRadius: 6,
    flexShrink: 0,
  },
  promoteBtnText: { fontSize: 10, fontWeight: "700", color: "#fff" },

  activeMatchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#f59e0b18",
    borderBottomWidth: 1,
    borderBottomColor: "#f59e0b40",
  },
  activeMatchLabel: {
    flex: 1,
    fontSize: 10,
    color: C.textSecondary,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },

  codeScroll: { maxHeight: 200 },
  codeContent: { padding: 14 },
  codeText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 11,
    color: C.text,
    lineHeight: 17,
  },
  codeMatch: {
    backgroundColor: "#fde68a",
    color: "#111",
  },
  codeMatchActive: {
    backgroundColor: "#f59e0b",
    color: "#111",
  },
  codeEmptyState: {
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.backgroundSecondary,
  },

  chatDivider: { height: 1, backgroundColor: C.cardBorder },

  chatHistory: { flex: 1 },
  chatHistoryContent: { padding: 12, gap: 8, paddingBottom: 16 },
  chatEmpty: { padding: 24, alignItems: "center", gap: 10 },
  chatEmptyText: { fontSize: 13, color: C.textSecondary, textAlign: "center", lineHeight: 20 },
  chatEmptyHint: { fontSize: 11, color: C.textTertiary, textAlign: "center" },

  chatBubble: { maxWidth: "90%", borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9 },
  chatBubbleUser: { alignSelf: "flex-end", backgroundColor: C.accent + "25", borderBottomRightRadius: 4 },
  chatBubbleAssistant: { alignSelf: "flex-start", backgroundColor: C.backgroundSecondary, borderWidth: 1, borderColor: C.cardBorder, borderBottomLeftRadius: 4 },
  chatBubbleText: { fontSize: 13, lineHeight: 19 },
  chatBubbleTextUser: { color: C.text },
  chatBubbleTextAssistant: { color: C.text },
  cursor: { color: C.accent },

  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sendBtnDisabled: { opacity: 0.4 },
});
