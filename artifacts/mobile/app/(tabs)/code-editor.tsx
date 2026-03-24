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
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { apiGet, apiPost, streamMessage, isSessionExpiredError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

const C = Colors.dark;

type AIStatus =
  | "idle"
  | "thinking"
  | "reading"
  | "writing"
  | "done"
  | "error"
  | "transcribing"
  | "recording";

interface ChatMessage {
  role: "user" | "assistant" | "status";
  content: string;
  streaming?: boolean;
  diffSummary?: string;
  isError?: boolean;
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
  const [sessionInitFailed, setSessionInitFailed] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [commandInput, setCommandInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [aiStatus, setAIStatus] = useState<AIStatus>("idle");
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastCommand, setLastCommand] = useState<string>("");

  const [fileSearchTerm, setFileSearchTerm] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingPermission, setRecordingPermission] = useState(false);

  const chatScrollRef = useRef<ScrollView>(null);
  const fileScrollRef = useRef<ScrollView>(null);
  const commandInputRef = useRef<TextInput>(null);
  const initialized = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef(false);

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
    requestMicPermission();
  }, [authLoading, user]);

  useEffect(() => {
    if (searchQuery.trim()) {
      setFilteredFiles(files.filter((f) => f.toLowerCase().includes(searchQuery.toLowerCase())));
    } else {
      setFilteredFiles(files);
    }
  }, [searchQuery, files]);

  async function requestMicPermission() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setRecordingPermission(status === "granted");
    } catch {
      setRecordingPermission(false);
    }
  }

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

  async function initConversation(isAutoRetry = false) {
    setSessionReady(false);
    setSessionInitFailed(false);
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
    } catch {
      setSessionInitFailed(true);
      if (!isAutoRetry) {
        setTimeout(() => {
          initConversation(true);
        }, 3000);
      }
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

  function startTimeout(onTimeout: () => void, ms = 60000) {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(onTimeout, ms);
  }

  function clearStreamTimeout() {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  async function handleCommandSubmit(overrideInput?: string) {
    const userText = (overrideInput ?? commandInput).trim();
    if (!userText || chatLoading) return;

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
        { role: "user", content: `Navigate to: ${userText}` },
        { role: "assistant", content: `Showing filtered files matching "${userText}". Tap a file to open it.` },
      ]);
      return;
    }

    setLastCommand(userText);
    setCommandInput("");
    setChatLoading(true);
    setAIStatus("thinking");
    setLastError(null);
    abortRef.current = false;

    const context = selectedFile
      ? `[Code Editor Instruction] File to edit: ${selectedFile}. Full path for write_source_file: ${selectedFile}. Instruction: ${userText}`
      : `[Code Editor Instruction — no file selected. Search the file list, read candidate files to locate the relevant code, then make the change.] ${userText}`;

    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: userText },
      { role: "assistant", content: "", streaming: true },
    ]);

    if (!conversationId) {
      finishWithError("AI session not ready. Please tap Retry below to restart the session.");
      return;
    }

    startTimeout(() => {
      if (chatLoading) {
        abortRef.current = true;
        finishWithError("Request timed out after 60 seconds. The AI may be busy — please try again.");
      }
    });

    let fullText = "";
    let hasDiff: string | undefined;

    await streamMessage(
      conversationId,
      context,
      (chunk) => {
        if (abortRef.current) return;
        fullText += chunk;
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: fullText, streaming: true };
          return updated;
        });
        chatScrollRef.current?.scrollToEnd({ animated: false });
      },
      () => {
        clearStreamTimeout();
        if (abortRef.current) return;
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "assistant",
            content: fullText,
            streaming: false,
            diffSummary: hasDiff,
          };
          return updated;
        });
        setAIStatus("done");
        setChatLoading(false);
        chatScrollRef.current?.scrollToEnd({ animated: false });
      },
      (err) => {
        clearStreamTimeout();
        if (abortRef.current) return;
        finishWithError(err);
      },
      undefined,
      (toolCall) => {
        if (abortRef.current) return;
        if (toolCall.name === "read_source_file") {
          setAIStatus("reading");
          const result = toolCall.result as { content?: string; path?: string };
          if (result.content) {
            setFileContent(result.content);
            if (result.path) setSelectedFile(result.path as string);
          }
        }
        if (toolCall.name === "write_source_file" || toolCall.name === "edit_source_file") {
          setAIStatus("writing");
          const written = toolCall.result as { success?: boolean; path?: string; diffSummary?: string; error?: string };
          if (written.error) {
            setChatMessages((prev) => [
              ...prev,
              { role: "status", content: `❌ ${toolCall.name === "edit_source_file" ? "Edit" : "Write"} failed: ${written.error}`, isError: true },
            ]);
          } else if (written.success) {
            const writtenPath = written.path as string | undefined;
            const label = toolCall.name === "edit_source_file" ? "Edited" : "Written";
            const successMsg = `✅ ${label}: ${writtenPath ?? selectedFile ?? "file"}${written.diffSummary ? ` — ${written.diffSummary}` : ""}`;
            hasDiff = written.diffSummary ?? successMsg;
            setChatMessages((prev) => [
              ...prev,
              { role: "status", content: successMsg },
            ]);
            if (writtenPath) {
              setTimeout(() => selectFile(writtenPath), 600);
            } else if (selectedFile) {
              setTimeout(() => selectFile(selectedFile), 600);
            }
          }
        }
      },
      true
    );
  }

  function finishWithError(msg: string) {
    clearStreamTimeout();
    setLastError(msg);
    setAIStatus("error");
    setChatMessages((prev) => {
      const updated = [...prev];
      if (updated.length > 0 && updated[updated.length - 1].role === "assistant") {
        updated[updated.length - 1] = {
          role: "assistant",
          content: msg,
          streaming: false,
          isError: true,
        };
      } else {
        updated.push({ role: "assistant", content: msg, isError: true });
      }
      return updated;
    });
    setChatLoading(false);
  }

  async function handleRetry() {
    if (lastCommand) {
      await handleCommandSubmit(lastCommand);
    } else {
      await initConversation();
    }
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
    setChatLoading(true);
    setAIStatus("reading");
    abortRef.current = false;

    setChatMessages((prev) => [
      ...prev,
      { role: "user", content: userMsg },
      { role: "assistant", content: "", streaming: true },
    ]);

    startTimeout(() => {
      if (chatLoading) {
        abortRef.current = true;
        finishWithError("File read timed out. Please try again.");
        setLoadingFile(false);
      }
    });

    let fullText = "";
    await streamMessage(
      conversationId,
      userMsg,
      (chunk) => {
        if (abortRef.current) return;
        fullText += chunk;
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: fullText, streaming: true };
          return updated;
        });
        chatScrollRef.current?.scrollToEnd({ animated: false });
      },
      () => {
        clearStreamTimeout();
        if (abortRef.current) return;
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "assistant", content: fullText, streaming: false };
          return updated;
        });
        setAIStatus("done");
        setChatLoading(false);
        setLoadingFile(false);
        chatScrollRef.current?.scrollToEnd({ animated: false });
      },
      (err) => {
        clearStreamTimeout();
        if (abortRef.current) return;
        finishWithError(`Error reading file: ${err}`);
        setLoadingFile(false);
      },
      undefined,
      (toolCall) => {
        if (abortRef.current) return;
        if (toolCall.name === "read_source_file" && toolCall.result) {
          const result = toolCall.result as { content?: string };
          if (result.content) {
            setFileContent(result.content as string);
          }
        }
      }
    );
  }

  async function startRecording() {
    if (!recordingPermission) {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Microphone permission is needed for voice input.");
        return;
      }
      setRecordingPermission(true);
    }

    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setAIStatus("recording");
    } catch (err) {
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  }

  async function stopRecordingAndTranscribe() {
    if (!recording) return;
    setAIStatus("transcribing");

    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

      const uri = recording.getURI();
      setRecording(null);

      if (!uri) {
        setAIStatus("idle");
        Alert.alert("Error", "No audio recorded. Please try again.");
        return;
      }

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: "base64" as const,
      });

      const result = await apiPost<{ text: string; error?: string }>(
        "gemini/transcribe",
        { audioBase64: base64, mimeType: "audio/m4a" }
      );

      if (result.text && result.text.trim()) {
        setCommandInput(result.text.trim());
        commandInputRef.current?.focus();
      } else {
        Alert.alert("No speech detected", "Could not detect speech. Please try again.");
      }
    } catch (err) {
      Alert.alert("Transcription failed", "Could not transcribe audio. Please type your command instead.");
    } finally {
      setAIStatus("idle");
    }
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

  function getStatusLabel(): { label: string; color: string; icon: React.ComponentProps<typeof Ionicons>["name"] } {
    switch (aiStatus) {
      case "thinking":
        return { label: "Thinking...", color: C.accent, icon: "sparkles-outline" };
      case "reading":
        return { label: "Reading file...", color: "#60a5fa", icon: "document-text-outline" };
      case "writing":
        return { label: "Writing file...", color: "#f59e0b", icon: "pencil-outline" };
      case "done":
        return { label: "Done ✓", color: "#22c55e", icon: "checkmark-circle-outline" };
      case "error":
        return { label: "Failed", color: "#ef4444", icon: "alert-circle-outline" };
      case "transcribing":
        return { label: "Transcribing...", color: "#a78bfa", icon: "mic-outline" };
      case "recording":
        return { label: "Recording — tap mic to stop", color: "#ef4444", icon: "radio-button-on-outline" };
      default:
        return { label: "", color: C.textSecondary, icon: "ellipse-outline" };
    }
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

  const statusInfo = getStatusLabel();
  const showStatusBar = aiStatus !== "idle";
  const isVoiceActive = aiStatus === "recording" || aiStatus === "transcribing";
  const isRecording = aiStatus === "recording";

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
        {/* Command Bar */}
        <View style={s.commandBar}>
          <View style={s.commandInputRow}>
            <Ionicons name="sparkles-outline" size={16} color={C.accent} style={s.commandIcon} />
            <TextInput
              ref={commandInputRef}
              style={s.commandInput}
              placeholder="Describe what to change in plain English..."
              placeholderTextColor={C.textSecondary}
              value={commandInput}
              onChangeText={setCommandInput}
              multiline={false}
              returnKeyType="send"
              onSubmitEditing={() => handleCommandSubmit()}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!chatLoading && sessionReady && !isVoiceActive}
            />
            {commandInput.length > 0 && !chatLoading && (
              <TouchableOpacity onPress={() => setCommandInput("")} style={s.commandClear}>
                <Ionicons name="close-circle" size={16} color={C.textSecondary} />
              </TouchableOpacity>
            )}
            {/* Mic button */}
            {Platform.OS !== "web" && (
              <TouchableOpacity
                style={[s.micBtn, isRecording && s.micBtnActive]}
                onPress={isRecording ? stopRecordingAndTranscribe : startRecording}
                disabled={chatLoading && !isRecording}
                activeOpacity={0.8}
              >
                {aiStatus === "transcribing" ? (
                  <ActivityIndicator size="small" color={C.accent} />
                ) : (
                  <Ionicons
                    name={isRecording ? "stop-circle" : "mic-outline"}
                    size={18}
                    color={isRecording ? "#ef4444" : C.textSecondary}
                  />
                )}
              </TouchableOpacity>
            )}
            {/* Send button */}
            <TouchableOpacity
              style={[s.sendBtn, (!commandInput.trim() || chatLoading || !sessionReady || isVoiceActive) && s.sendBtnDisabled]}
              onPress={() => handleCommandSubmit()}
              disabled={!commandInput.trim() || chatLoading || !sessionReady || isVoiceActive}
              activeOpacity={0.8}
            >
              {chatLoading && aiStatus !== "recording" && aiStatus !== "transcribing" ? (
                <ActivityIndicator size="small" color="#0A0A0F" />
              ) : (
                <Ionicons name="arrow-up" size={18} color="#0A0A0F" />
              )}
            </TouchableOpacity>
          </View>

          {/* Active file indicator */}
          {selectedFile && (
            <View style={s.activeFileRow}>
              <Ionicons name="document-outline" size={12} color={C.accent} />
              <Text style={s.activeFileName} numberOfLines={1}>{selectedFile}</Text>
              <TouchableOpacity
                onPress={() => selectFile(selectedFile)}
                disabled={loadingFile || chatLoading}
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

          {/* AI status feedback bar */}
          {showStatusBar && (
            <View style={[s.statusBar, aiStatus === "error" && s.statusBarError]}>
              {(aiStatus === "thinking" || aiStatus === "reading" || aiStatus === "writing" || aiStatus === "transcribing") ? (
                <ActivityIndicator size="small" color={statusInfo.color} />
              ) : (
                <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
              )}
              <Text style={[s.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
              {aiStatus === "error" && (
                <TouchableOpacity onPress={handleRetry} style={s.retryBtn}>
                  <Ionicons name="refresh-outline" size={13} color={C.accent} />
                  <Text style={s.retryBtnText}>Retry</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Session not ready banner */}
          {!sessionReady && !authLoading && (
            sessionInitFailed ? (
              <View style={[s.sessionBanner, s.sessionBannerError]}>
                <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
                <Text style={[s.sessionBannerText, s.sessionBannerTextError]}>Session disconnected — retrying...</Text>
                <TouchableOpacity onPress={initConversation} style={s.retryBtn}>
                  <Ionicons name="refresh-outline" size={13} color={C.accent} />
                  <Text style={s.retryBtnText}>Reconnect</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={s.sessionBanner}>
                <ActivityIndicator size="small" color={C.accent} />
                <Text style={s.sessionBannerText}>Connecting to AI session...</Text>
              </View>
            )
          )}
        </View>

        {/* File Browser */}
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

        {/* Code viewer */}
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

        {/* Conversation log */}
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
              {Platform.OS !== "web" && (
                <Text style={s.chatEmptyHint}>Or tap the mic button to speak your instruction.</Text>
              )}
            </View>
          ) : (
            chatMessages.map((msg, i) => (
              <View key={i}>
                {msg.role === "status" ? (
                  <View style={[s.statusInlineRow, msg.isError && s.statusInlineRowError]}>
                    <Text style={[s.statusInlineText, msg.isError && s.statusInlineTextError]} numberOfLines={2}>
                      {msg.content}
                    </Text>
                  </View>
                ) : (
                <View
                  style={[
                    s.chatBubble,
                    msg.role === "user" ? s.chatBubbleUser : s.chatBubbleAssistant,
                    msg.isError && s.chatBubbleError,
                  ]}
                >
                  {msg.isError && (
                    <View style={s.errorBubbleHeader}>
                      <Ionicons name="alert-circle-outline" size={13} color="#ef4444" />
                      <Text style={s.errorBubbleLabel}>Error</Text>
                    </View>
                  )}
                  <Text
                    style={[
                      s.chatBubbleText,
                      msg.role === "user" ? s.chatBubbleTextUser : s.chatBubbleTextAssistant,
                      msg.isError && s.chatBubbleTextError,
                    ]}
                  >
                    {msg.content}
                    {msg.streaming && <Text style={s.cursor}>▌</Text>}
                  </Text>
                </View>
                )}
                {msg.diffSummary && (
                  <View style={s.diffBadge}>
                    <Ionicons name="checkmark-circle" size={13} color="#22c55e" />
                    <Text style={s.diffText}>{msg.diffSummary}</Text>
                  </View>
                )}
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

  micBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.backgroundSecondary,
    borderWidth: 1,
    borderColor: C.cardBorder,
    flexShrink: 0,
  },
  micBtnActive: {
    borderColor: "#ef4444",
    backgroundColor: "#ef444415",
  },

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

  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    backgroundColor: C.backgroundSecondary,
  },
  statusBarError: {
    backgroundColor: "#ef444410",
    borderTopColor: "#ef444430",
  },
  statusText: { flex: 1, fontSize: 12, fontWeight: "600" },

  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: C.accent + "25",
    borderRadius: 8,
  },
  retryBtnText: { fontSize: 12, fontWeight: "600", color: C.accent },

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
  sessionBannerError: {
    backgroundColor: "#ef444410",
    borderTopColor: "#ef444430",
  },
  sessionBannerText: { flex: 1, fontSize: 12, color: C.textSecondary },
  sessionBannerTextError: { color: "#fca5a5" },

  statusInlineRow: {
    alignSelf: "center",
    marginVertical: 2,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: "#22c55e15",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#22c55e30",
  },
  statusInlineRowError: {
    backgroundColor: "#ef444410",
    borderColor: "#ef444430",
  },
  statusInlineText: {
    fontSize: 11,
    color: "#22c55e",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    textAlign: "center",
  },
  statusInlineTextError: { color: "#fca5a5" },

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
  chatBubbleError: { borderColor: "#ef444450", backgroundColor: "#ef444410" },
  chatBubbleText: { fontSize: 13, lineHeight: 19 },
  chatBubbleTextUser: { color: C.text },
  chatBubbleTextAssistant: { color: C.text },
  chatBubbleTextError: { color: "#fca5a5" },
  cursor: { color: C.accent },

  errorBubbleHeader: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  errorBubbleLabel: { fontSize: 11, fontWeight: "700", color: "#ef4444" },

  diffBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 4,
    marginLeft: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: "#22c55e15",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#22c55e30",
  },
  diffText: { fontSize: 11, color: "#22c55e", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" },

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
