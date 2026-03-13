import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Platform,
  ActivityIndicator,
  Alert,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Colors from "@/constants/colors";
import { apiGet, apiPost, apiDelete, streamMessage } from "@/lib/api";

const C = Colors.dark;

interface Conversation {
  id: number;
  title: string;
  createdAt: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

let msgCounter = 0;
function uid(): string {
  msgCounter++;
  return `msg-${Date.now()}-${msgCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

function TypingIndicator() {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d + 1) % 4), 400);
    return () => clearInterval(t);
  }, []);
  return (
    <View style={styles.typingBubble}>
      <Text style={styles.typingText}>{"●".repeat(dots || 1)}</Text>
    </View>
  );
}

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowUser]}>
      {!isUser && (
        <View style={styles.avatarBg}>
          <Ionicons name="brain" size={14} color={C.accent} />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
        <Text style={[styles.bubbleText, isUser ? styles.bubbleTextUser : styles.bubbleTextAssistant]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const initializedRef = useRef(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data: conversations = [] } = useQuery<Conversation[]>({
    queryKey: ["conversations"],
    queryFn: () => apiGet("gemini/conversations"),
  });

  const createConvMutation = useMutation({
    mutationFn: (title: string) =>
      apiPost<Conversation>("gemini/conversations", { title }),
    onSuccess: (conv) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setActiveConvId(conv.id);
      setMessages([]);
      initializedRef.current = false;
      setShowSidebar(false);
    },
  });

  const deleteConvMutation = useMutation({
    mutationFn: (id: number) => apiDelete(`gemini/conversations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      setActiveConvId(null);
      setMessages([]);
    },
  });

  useEffect(() => {
    if (!activeConvId || initializedRef.current) return;
    apiGet<{ messages: (Message & { id: number })[] }>(
      `gemini/conversations/${activeConvId}`
    ).then((data) => {
      if (!initializedRef.current) {
        setMessages(
          data.messages.map((m) => ({
            ...m,
            id: m.id.toString(),
          }))
        );
        initializedRef.current = true;
      }
    });
  }, [activeConvId]);

  async function handleSend() {
    if (!input.trim() || isStreaming || !activeConvId) return;
    const text = input.trim();
    setInput("");

    const currentMessages = [...messages];
    const userMsg: Message = { id: uid(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsStreaming(true);
    setShowTyping(true);

    let fullContent = "";
    let assistantAdded = false;

    try {
      await streamMessage(
        activeConvId,
        text,
        (chunk) => {
          fullContent += chunk;
          if (!assistantAdded) {
            setShowTyping(false);
            setMessages((prev) => [
              ...prev,
              { id: uid(), role: "assistant", content: fullContent },
            ]);
            assistantAdded = true;
          } else {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = {
                ...updated[updated.length - 1],
                content: fullContent,
              };
              return updated;
            });
          }
        },
        () => {},
        (err) => {
          setShowTyping(false);
          setMessages((prev) => [
            ...prev,
            { id: uid(), role: "assistant", content: `Sorry, something went wrong. ${err}` },
          ]);
        }
      );
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
      inputRef.current?.focus();
    }
  }

  function startNewChat() {
    createConvMutation.mutate("ICT Mentor Chat");
  }

  const reversedMessages = [...messages].reverse();

  if (!activeConvId) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconBg}>
            <Ionicons name="brain" size={40} color={C.accent} />
          </View>
          <Text style={styles.emptyTitle}>ICT Mentor</Text>
          <Text style={styles.emptySubtitle}>
            Your personal AI trading coach. Ask about FVGs, Liquidity Sweeps, the Silver Bullet, and more.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.newChatBtn, pressed && { opacity: 0.85 }]}
            onPress={startNewChat}
          >
            {createConvMutation.isPending ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <Ionicons name="add" size={20} color="#000" />
                <Text style={styles.newChatBtnText}>Start a Session</Text>
              </>
            )}
          </Pressable>

          {conversations.length > 0 && (
            <View style={styles.pastChats}>
              <Text style={styles.pastChatsTitle}>Past Sessions</Text>
              {conversations.slice(0, 5).map((conv) => (
                <Pressable
                  key={conv.id}
                  style={({ pressed }) => [styles.pastChatItem, pressed && { opacity: 0.7 }]}
                  onPress={() => {
                    setActiveConvId(conv.id);
                    setMessages([]);
                    initializedRef.current = false;
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={16} color={C.textSecondary} />
                  <Text style={styles.pastChatText} numberOfLines={1}>
                    {conv.title}
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={C.textTertiary} />
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: C.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 8 }]}>
        <Pressable
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
          onPress={() => {
            setActiveConvId(null);
            setMessages([]);
          }}
        >
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <View style={styles.headerDot} />
          <Text style={styles.headerTitle}>ICT Mentor</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.headerBtn, pressed && { opacity: 0.6 }]}
          onPress={() =>
            Alert.alert("Delete Session", "Remove this chat?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Delete",
                style: "destructive",
                onPress: () => deleteConvMutation.mutate(activeConvId),
              },
            ])
          }
        >
          <Ionicons name="trash-outline" size={20} color={C.accentAlert} />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={reversedMessages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <MessageBubble message={item} />}
          inverted={!!messages.length}
          ListHeaderComponent={showTyping ? <TypingIndicator /> : null}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.messageList}
          ListEmptyComponent={
            <View style={styles.chatEmpty}>
              <Ionicons name="chatbubbles-outline" size={32} color={C.textTertiary} />
              <Text style={styles.chatEmptyText}>
                Ask me about your trade idea, Kill Zones, FVGs, or anything ICT!
              </Text>
            </View>
          }
        />

        <View
          style={[
            styles.inputBar,
            { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 8 },
          ]}
        >
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Ask your mentor..."
            placeholderTextColor={C.textTertiary}
            multiline
            maxLength={1000}
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
          />
          <Pressable
            style={({ pressed }) => [
              styles.sendBtn,
              (!input.trim() || isStreaming) && styles.sendBtnDisabled,
              pressed && { opacity: 0.8 },
            ]}
            onPress={() => {
              handleSend();
              inputRef.current?.focus();
            }}
            disabled={!input.trim() || isStreaming}
          >
            {isStreaming ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <Ionicons name="arrow-up" size={20} color="#000" />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    backgroundColor: C.background,
  },
  headerBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  headerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.accent },
  headerTitle: { fontSize: 16, fontWeight: "600", color: C.text, fontFamily: "Inter_600SemiBold" },
  messageList: { padding: 16, gap: 10 },
  bubbleRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, marginBottom: 6 },
  bubbleRowUser: { justifyContent: "flex-end" },
  avatarBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.accent + "22",
    alignItems: "center",
    justifyContent: "center",
  },
  bubble: { maxWidth: "78%", borderRadius: 18, padding: 13 },
  bubbleUser: { backgroundColor: C.accent, borderBottomRightRadius: 5 },
  bubbleAssistant: { backgroundColor: C.card, borderBottomLeftRadius: 5, borderWidth: 1, borderColor: C.cardBorder },
  bubbleText: { fontSize: 15, lineHeight: 22, fontFamily: "Inter_400Regular" },
  bubbleTextUser: { color: "#000" },
  bubbleTextAssistant: { color: C.text },
  typingBubble: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderBottomLeftRadius: 5,
    padding: 13,
    marginLeft: 36,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignSelf: "flex-start",
  },
  typingText: { fontSize: 16, color: C.textSecondary },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
    backgroundColor: C.background,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 11,
    fontSize: 15,
    color: C.text,
    fontFamily: "Inter_400Regular",
    maxHeight: 120,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: C.backgroundTertiary },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.accent + "18",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: C.text,
    fontFamily: "Inter_700Bold",
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 15,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  newChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.accent,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 8,
  },
  newChatBtnText: { fontSize: 16, fontWeight: "600", color: "#000", fontFamily: "Inter_600SemiBold" },
  pastChats: { width: "100%", marginTop: 32 },
  pastChatsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: C.textSecondary,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  pastChatItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.cardBorder,
    gap: 10,
  },
  pastChatText: { flex: 1, fontSize: 14, color: C.text, fontFamily: "Inter_400Regular" },
  chatEmpty: { alignItems: "center", paddingTop: 60, gap: 12 },
  chatEmptyText: {
    fontSize: 14,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 260,
  },
});
