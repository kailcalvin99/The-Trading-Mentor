import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  type DimensionValue,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  useListGeminiConversations,
  createGeminiConversation,
  getGeminiConversation,
  deleteGeminiConversation,
  useGetPropAccount,
} from "@workspace/api-client-react";
import { streamMessage, apiPost, type ToolCallEvent } from "@/lib/api";
import { usePlanner } from "@/contexts/PlannerContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { subscribeToAITrigger } from "@/lib/aiTrigger";
import { useAIAssistant } from "@/contexts/AIAssistantContext";
import Colors from "@/constants/colors";
import { useChromeCollapse } from "@/contexts/ChromeCollapseContext";

interface AITrigger {
  message: string;
  autoOpen?: boolean;
  prefillPrompt?: string;
  autoSend?: boolean;
}

const KILL_ZONES = [
  { label: "London Kill Zone", startHour: 2, endHour: 5 },
  { label: "New York Kill Zone", startHour: 10, endHour: 11 },
];

function getNewYorkHour(): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    }).formatToParts(new Date());
    const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
    return h + m / 60;
  } catch {
    const now = new Date();
    const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
    return ((utcHour - 5) % 24 + 24) % 24;
  }
}

function getCurrentKillZone(): { active: boolean; label: string } {
  const h = getNewYorkHour();
  for (const kz of KILL_ZONES) {
    if (h >= kz.startHour && h < kz.endHour) return { active: true, label: kz.label };
  }
  return { active: false, label: "" };
}

const KZ_NUDGE_COOLDOWN = 60 * 60 * 1000;
const KZ_NUDGE_STORAGE_KEY = "ict-ai-kz-nudge-last";

const C = Colors.dark;

interface ToolCallInfo {
  name: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

interface Message {
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCallInfo[];
}

const NAV_MAP: Record<string, string> = {
  planner: "/(tabs)/index",
  academy: "/(tabs)/academy",
  "risk-shield": "/(tabs)/tracker",
  journal: "/(tabs)/journal",
  community: "/(tabs)/community",
};

function IdlePill({ onPress }: { onPress: () => void }) {
  const pulseAnim = useRef(new Animated.Value(0.7)).current;
  const [clock, setClock] = useState(() => new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }));

  useEffect(() => {
    const id = setInterval(() => {
      setClock(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true }));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 900, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const scaleAnim = pulseAnim.interpolate({ inputRange: [0.7, 1], outputRange: [0.97, 1] });

  return (
    <TouchableOpacity
      style={idlePillStyles.wrapperBase}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Animated.View style={[idlePillStyles.pill, { opacity: pulseAnim, transform: [{ scale: scaleAnim }] }]}>
        <Ionicons name="menu" size={18} color={C.text} />
        <Text style={idlePillStyles.appName}>ICT Trading Mentor</Text>
        <Text style={idlePillStyles.clock}>{clock}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const idlePillStyles = StyleSheet.create({
  wrapperBase: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 200,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 30,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: C.accent + "80",
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 12,
    elevation: 10,
  },
  appName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: C.text,
    letterSpacing: 0.3,
  },
  clock: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: C.accent,
  },
});

export default function AIAssistant() {
  const [visible, setVisible] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [pendingToolCalls, setPendingToolCalls] = useState<ToolCallInfo[]>([]);
  const [nudge, setNudge] = useState<AITrigger | null>(null);
  const [nudgeExpanded, setNudgeExpanded] = useState(false);
  const nudgeAnim = useRef(new Animated.Value(0)).current;
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const killZoneCheckedRef = useRef(false);
  const pendingAutoSendRef = useRef<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const planner = usePlanner();
  const { registerOpenHandler } = useAIAssistant();

  const { data: conversations, refetch } = useListGeminiConversations();
  const { data: propAccount } = useGetPropAccount();

  const { isCollapsed, restore, footerAnim } = useChromeCollapse();

  const footerTranslateY = footerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 160],
  });

  const drawdownNudgedRef = useRef(false);

  useEffect(() => {
    registerOpenHandler((topic: string) => {
      setInput(`Tell me more about: ${topic}`);
      setVisible(true);
    });
  }, []);

  useEffect(() => {
    if (visible) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
  }, [messages, visible]);

  useEffect(() => {
    if (visible && pendingAutoSendRef.current) {
      const msgToSend = pendingAutoSendRef.current;
      pendingAutoSendRef.current = null;
      setTimeout(() => {
        (async () => {
          let cid = conversationId;
          if (!cid) {
            try {
              const res = await createGeminiConversation({ title: msgToSend.slice(0, 40) });
              if (res) {
                cid = res.id;
                setConversationId(res.id);
                refetch();
              }
            } catch {
              return;
            }
          }
          if (!cid) return;
          setMessages((prev) => [...prev, { role: "user", content: msgToSend }]);
          setIsStreaming(true);
          setPendingToolCalls([]);
          let assistantMsg = "";
          setMessages((prev) => [...prev, { role: "assistant", content: "", toolCalls: [] }]);
          try {
            await streamMessage(
              cid,
              msgToSend,
              (chunk) => {
                assistantMsg += chunk;
                setMessages((prev) => {
                  const updated = [...prev];
                  const last = updated[updated.length - 1];
                  updated[updated.length - 1] = { ...last, role: "assistant", content: assistantMsg };
                  return updated;
                });
              },
              () => { setIsStreaming(false); },
              () => {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { role: "assistant", content: "Connection error. Please try again." };
                  return updated;
                });
                setIsStreaming(false);
              },
              { currentPage: "Mobile App", platform: "mobile" },
              handleToolCall
            );
          } catch {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: "Connection error. Please try again." };
              return updated;
            });
            setIsStreaming(false);
          }
        })();
      }, 300);
    }
  }, [visible]);

  const fireTrigger = useCallback((trigger: AITrigger) => {
    if (visible) return;
    setNudge(trigger);
    setNudgeExpanded(true);
    Animated.spring(nudgeAnim, { toValue: 1, useNativeDriver: true }).start();
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = setTimeout(() => {
      Animated.timing(nudgeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
        setNudgeExpanded(false);
        setNudge(null);
      });
    }, 6000);
    if (trigger.autoOpen) {
      if (autoOpenTimerRef.current) clearTimeout(autoOpenTimerRef.current);
      autoOpenTimerRef.current = setTimeout(() => {
        setNudge(null);
        setNudgeExpanded(false);
        if (trigger.prefillPrompt) {
          if (trigger.autoSend) {
            pendingAutoSendRef.current = trigger.prefillPrompt;
          } else {
            setInput(trigger.prefillPrompt);
          }
        }
        setVisible(true);
      }, 800);
    }
  }, [visible, nudgeAnim]);

  useEffect(() => {
    return () => {
      if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
      if (autoOpenTimerRef.current) clearTimeout(autoOpenTimerRef.current);
    };
  }, []);

  function dismissNudge() {
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    if (autoOpenTimerRef.current) clearTimeout(autoOpenTimerRef.current);
    Animated.timing(nudgeAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
      setNudgeExpanded(false);
      setNudge(null);
    });
  }

  function openFromNudge() {
    const msg = nudge?.prefillPrompt || "";
    dismissNudge();
    setInput(msg);
    setVisible(true);
  }

  useEffect(() => {
    const unsubscribe = subscribeToAITrigger((trigger) => fireTrigger(trigger));
    return unsubscribe;
  }, [fireTrigger]);

  useEffect(() => {
    const startingBalance = propAccount?.startingBalance ?? 0;
    const dailyLoss = propAccount?.dailyLoss ?? 0;
    const maxDailyLoss = propAccount?.maxDailyLossPct ?? 2;
    if (startingBalance <= 0) return;
    const dailyLossPct = (dailyLoss / startingBalance) * 100;
    const ratio = dailyLossPct / maxDailyLoss;
    if (ratio >= 0.75 && !drawdownNudgedRef.current) {
      drawdownNudgedRef.current = true;
      fireTrigger({
        message: "Your drawdown is near the limit — want advice?",
        autoOpen: true,
        prefillPrompt: "My drawdown is getting close to the limit. What should I do?",
      });
    } else if (ratio < 0.5) {
      drawdownNudgedRef.current = false;
    }
  }, [propAccount, fireTrigger]);

  useEffect(() => {
    async function checkKillZone() {
      if (killZoneCheckedRef.current) return;
      const kz = getCurrentKillZone();
      if (!kz.active) return;
      let lastNudge = 0;
      try {
        const stored = await AsyncStorage.getItem(KZ_NUDGE_STORAGE_KEY);
        lastNudge = stored ? parseInt(stored, 10) || 0 : 0;
      } catch {}
      if (Date.now() - lastNudge < KZ_NUDGE_COOLDOWN) return;
      killZoneCheckedRef.current = true;
      try {
        await AsyncStorage.setItem(KZ_NUDGE_STORAGE_KEY, String(Date.now()));
      } catch {}
      fireTrigger({ message: `Kill zone is open — ready to trade? (${kz.label})` });
    }
    checkKillZone();
    const interval = setInterval(() => {
      killZoneCheckedRef.current = false;
      checkKillZone();
    }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fireTrigger]);

  async function startConversation() {
    try {
      const res = await createGeminiConversation({ title: "AI Chat" });
      if (res) {
        setConversationId(res.id);
        setMessages([
          {
            role: "assistant",
            content:
              "Welcome to the Inner Circle. 🔑 You've just gained access to a private AI mentor built exclusively for ICT traders. Master concepts like FVGs, OTE, Kill Zones, and liquidity sweeps — log trades, size positions, and track your performance like the elite. You're in. What would you like to start with?",
          },
        ]);
        setShowHistory(false);
        refetch();
      }
    } catch {}
  }

  async function loadConversation(id: number) {
    setConversationId(id);
    setShowHistory(false);
    try {
      const res = await getGeminiConversation(id);
      if (res) {
        const data = res as { messages?: Array<{ role: string; content: string }> };
        if (data.messages) {
          setMessages(
            data.messages.map((m) => ({
              role: m.role as "user" | "assistant",
              content: m.content,
            }))
          );
        }
      }
    } catch {}
  }

  async function handleDelete(id: number) {
    try {
      await deleteGeminiConversation(id);
      if (conversationId === id) {
        setConversationId(null);
        setMessages([]);
      }
      refetch();
    } catch {}
  }

  function handleToolCall(tc: ToolCallEvent) {
    const toolInfo: ToolCallInfo = { name: tc.name, args: tc.args, result: tc.result };
    setPendingToolCalls((prev) => [...prev, toolInfo]);
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last && last.role === "assistant") {
        updated[updated.length - 1] = {
          ...last,
          toolCalls: [...(last.toolCalls || []), toolInfo],
        };
      }
      return updated;
    });
  }

  function executeToolAction(tc: ToolCallInfo) {
    const result = tc.result;
    if (result.action === "navigate" && result.page) {
      const page = String(result.page);
      const route = NAV_MAP[page] || NAV_MAP["planner"];
      setVisible(false);
      router.push(route as Parameters<typeof router.push>[0]);
    } else if (result.action === "log_trade" && result.requiresConfirmation) {
      Alert.alert(
        "Log Trade",
        String(result.confirmMessage || "Log this trade?"),
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            onPress: async () => {
              try {
                const tradeData = result.tradeData as Record<string, unknown>;
                await apiPost("trades/", tradeData);
                Alert.alert("Success", "Trade logged successfully.");
              } catch {
                Alert.alert("Error", "Failed to log trade.");
              }
            },
          },
        ]
      );
    } else if (result.action === "complete_planner" && result.requiresConfirmation) {
      Alert.alert(
        "Complete Items",
        String(result.confirmMessage || "Mark items complete?"),
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Confirm",
            onPress: () => {
              const routineKeys = ["water", "breathing", "news", "bias"] as const;
              if (result.markAll) {
                routineKeys.forEach(key => {
                  if (!planner.routineItems[key]) {
                    planner.toggleItem(key);
                  }
                });
              } else {
                const items = result.items as string[];
                items.forEach(key => {
                  if (routineKeys.includes(key as typeof routineKeys[number])) {
                    const typedKey = key as typeof routineKeys[number];
                    if (!planner.routineItems[typedKey]) {
                      planner.toggleItem(typedKey);
                    }
                  }
                });
              }
              Alert.alert("Done", "Routine items marked as complete.");
            },
          },
        ]
      );
    } else if (result.action === "position_size" && result.navigateTo) {
      setVisible(false);
      router.push("/(tabs)/tracker");
    }
    setPendingToolCalls((prev) => prev.filter((p) => p !== tc));
  }

  async function sendMessage() {
    if (!input.trim() || isStreaming) return;
    const userMsg = input.trim();
    setInput("");

    let cid = conversationId;
    if (!cid) {
      try {
        const res = await createGeminiConversation({ title: userMsg.slice(0, 40) });
        if (res) {
          cid = res.id;
          setConversationId(res.id);
          refetch();
        }
      } catch {
        return;
      }
    }
    if (!cid) return;

    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setIsStreaming(true);
    setPendingToolCalls([]);

    let assistantMsg = "";
    setMessages((prev) => [...prev, { role: "assistant", content: "", toolCalls: [] }]);

    try {
      await streamMessage(
        cid,
        userMsg,
        (chunk) => {
          assistantMsg += chunk;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, role: "assistant", content: assistantMsg };
            return updated;
          });
        },
        () => {
          setIsStreaming(false);
        },
        () => {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              role: "assistant",
              content: "Connection error. Please try again.",
            };
            return updated;
          });
          setIsStreaming(false);
        },
        { currentPage: "Mobile App", platform: "mobile" },
        handleToolCall
      );
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Connection error. Please try again.",
        };
        return updated;
      });
      setIsStreaming(false);
    }
  }

  function openDrawer() {
    setVisible(true);
    if (!conversationId && (!conversations || conversations.length === 0)) {
      startConversation();
    }
  }

  return (
    <>
      {isCollapsed && <IdlePill onPress={restore} />}
      <Animated.View style={[s.fabFloating, { transform: [{ translateY: footerTranslateY }] }]}>
        <View style={s.fabContainer}>
          {nudgeExpanded && nudge && (
            <Animated.View
              style={[
                s.nudgeCard,
                {
                  opacity: nudgeAnim,
                  transform: [{ translateY: nudgeAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
                },
              ]}
            >
              <TouchableOpacity style={s.nudgeDismiss} onPress={dismissNudge}>
                <Ionicons name="close" size={14} color={C.textSecondary} />
              </TouchableOpacity>
              <View style={s.nudgeHeader}>
                <Ionicons name="sparkles" size={12} color={C.accent} />
                <Text style={s.nudgeLabel}>AI Coach</Text>
              </View>
              <Text style={s.nudgeMessage}>{nudge.message}</Text>
              <TouchableOpacity onPress={openFromNudge} style={s.nudgeAction}>
                <Text style={s.nudgeActionText}>Open AI</Text>
                <Ionicons name="arrow-forward" size={12} color={C.accent} />
              </TouchableOpacity>
            </Animated.View>
          )}
          <TouchableOpacity
            style={nudgeExpanded ? s.fabExpanded : s.fabMini}
            onPress={openDrawer}
            activeOpacity={0.8}
          >
            <Ionicons name="sparkles" size={nudgeExpanded ? 16 : 14} color="#0A0A0F" />
            {nudgeExpanded && <Text style={s.fabLabel}>AI</Text>}
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setVisible(false)}
      >
        <KeyboardAvoidingView
          style={[s.modal, { paddingTop: insets.top }]}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setVisible(false)} style={s.headerBtn}>
              <Ionicons name="chevron-down" size={24} color={C.text} />
            </TouchableOpacity>
            <View style={s.headerCenter}>
              <Ionicons name="sparkles" size={16} color={C.accent} />
              <Text style={s.headerTitle}>AI Assistant</Text>
            </View>
            <View style={s.headerRight}>
              <TouchableOpacity onPress={() => setShowHistory(!showHistory)} style={s.headerBtn}>
                <Ionicons name="time-outline" size={20} color={C.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={startConversation} style={s.headerBtn}>
                <Ionicons name="add" size={22} color={C.accent} />
              </TouchableOpacity>
            </View>
          </View>

          {showHistory ? (
            <ScrollView style={s.historyList} contentContainerStyle={{ padding: 16 }}>
              <Text style={s.historyLabel}>Conversations</Text>
              {(!conversations || conversations.length === 0) && (
                <Text style={s.emptyText}>No conversations yet</Text>
              )}
              {conversations &&
                [...conversations].reverse().map((c: any) => (
                  <View key={c.id} style={s.historyRow}>
                    <TouchableOpacity
                      style={s.historyItem}
                      onPress={() => loadConversation(c.id)}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={16} color={C.textSecondary} />
                      <Text style={s.historyText} numberOfLines={1}>
                        {c.title}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(c.id)} style={s.deleteBtn}>
                      <Ionicons name="trash-outline" size={16} color={C.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))}
            </ScrollView>
          ) : (
            <>
              <ScrollView
                ref={scrollRef}
                style={s.chatArea}
                contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
              >
                {messages.length === 0 && (
                  <View style={s.emptyState}>
                    <Ionicons name="sparkles" size={40} color={C.accent + "44"} />
                    <Text style={s.emptyTitle}>AI Trading Assistant</Text>
                    <Text style={s.emptyText}>
                      Ask about ICT concepts, log trades, calculate position sizes, or check your analytics.
                    </Text>
                    <View style={s.quickActions}>
                      {[
                        "Calculate position size for NQ",
                        "Show my recent trades",
                        "What is a Fair Value Gap?",
                      ].map((q) => (
                        <TouchableOpacity
                          key={q}
                          style={s.quickBtn}
                          onPress={() => {
                            setInput(q);
                          }}
                        >
                          <Text style={s.quickBtnText}>{q}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}
                {messages.map((msg, i) => (
                  <View key={i}>
                    <View
                      style={[
                        s.bubble,
                        msg.role === "user" ? s.userBubble : s.aiBubble,
                      ]}
                    >
                      {msg.role === "assistant" && (
                        <View style={s.aiAvatar}>
                          <Ionicons name="sparkles" size={12} color={C.accent} />
                        </View>
                      )}
                      <View
                        style={[
                          s.bubbleContent,
                          msg.role === "user" ? s.userContent : s.aiContent,
                        ]}
                      >
                        <Text
                          style={[
                            s.bubbleText,
                            msg.role === "user" && { color: "#0A0A0F" },
                          ]}
                        >
                          {msg.content}
                          {isStreaming && i === messages.length - 1 && msg.role === "assistant"
                            ? "\u258B"
                            : ""}
                        </Text>
                      </View>
                    </View>
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <View style={s.toolCardsContainer}>
                        {msg.toolCalls.map((tc, ti) => (
                          <ToolCallCard key={ti} toolCall={tc} onExecute={executeToolAction} />
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </ScrollView>

              <View style={[s.inputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
                <TextInput
                  style={s.input}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask your AI assistant..."
                  placeholderTextColor={C.textSecondary}
                  multiline
                  maxLength={2000}
                  editable={!isStreaming}
                  onSubmitEditing={sendMessage}
                  blurOnSubmit
                />
                <TouchableOpacity
                  style={[s.sendBtn, (!input.trim() || isStreaming) && { opacity: 0.4 }]}
                  onPress={sendMessage}
                  disabled={!input.trim() || isStreaming}
                >
                  {isStreaming ? (
                    <ActivityIndicator size="small" color="#0A0A0F" />
                  ) : (
                    <Ionicons name="send" size={18} color="#0A0A0F" />
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function ToolCallCard({ toolCall, onExecute }: { toolCall: ToolCallInfo; onExecute: (tc: ToolCallInfo) => void }) {
  const result = toolCall.result;
  const action = result.action as string;

  const iconMap: Record<string, string> = {
    navigate: "compass-outline",
    log_trade: "create-outline",
    position_size: "calculator-outline",
    complete_planner: "checkmark-circle-outline",
    data: "analytics-outline",
  };

  const labelMap: Record<string, string> = {
    navigate: "Navigate",
    log_trade: "Log Trade",
    position_size: "Position Size",
    complete_planner: "Complete Items",
    data: "Data",
  };

  const icon = iconMap[action] || "ellipsis-horizontal-outline";
  const label = labelMap[action] || toolCall.name;
  const needsAction = result.requiresConfirmation || action === "navigate" || action === "position_size";

  let details = "";
  if (action === "position_size" && result.calculation) {
    const calc = result.calculation as Record<string, number>;
    details = `$${calc.accountBalance} | ${calc.riskPct}% risk = $${calc.riskAmount}\nNQ: ${calc.nqContractsRounded} | MNQ: ${calc.mnqContractsRounded}`;
  } else if (action === "navigate") {
    details = `Go to ${String(result.page || "page")}`;
  } else if (result.confirmMessage) {
    details = String(result.confirmMessage);
  }

  return (
    <View style={tcStyles.card}>
      <View style={tcStyles.cardHeader}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={16} color={C.accent} />
        <Text style={tcStyles.cardLabel}>{label}</Text>
      </View>
      {details ? <Text style={tcStyles.cardDetails}>{details}</Text> : null}
      {needsAction && (
        <TouchableOpacity style={tcStyles.actionBtn} onPress={() => onExecute(toolCall)}>
          <Text style={tcStyles.actionBtnText}>{action === "navigate" ? "Go" : "Confirm"}</Text>
          <Ionicons name="arrow-forward" size={14} color="#0A0A0F" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const tcStyles = StyleSheet.create({
  card: {
    backgroundColor: C.backgroundSecondary,
    borderWidth: 1,
    borderColor: C.accent + "44",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: C.accent,
    textTransform: "uppercase",
  },
  cardDetails: {
    fontSize: 13,
    color: C.text,
    lineHeight: 20,
    marginBottom: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.accent,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  actionBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#0A0A0F",
  },
});

const s = StyleSheet.create({
  fabFloating: {
    position: "absolute",
    bottom: 90,
    right: 14,
    zIndex: 100,
  },
  fabContainer: {
    alignItems: "flex-end",
  },
  fabMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    opacity: 0.85,
  },
  fabExpanded: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.accent,
    elevation: 6,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  fabLabel: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#0A0A0F",
  },
  nudgeCard: {
    backgroundColor: C.backgroundSecondary,
    borderWidth: 1,
    borderColor: C.accent + "55",
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    maxWidth: 220,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  nudgeDismiss: {
    position: "absolute",
    top: 8,
    right: 8,
    padding: 2,
  },
  nudgeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  nudgeLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: C.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  nudgeMessage: {
    fontSize: 13,
    color: C.text,
    lineHeight: 18,
    marginBottom: 8,
    paddingRight: 16,
  },
  nudgeAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  nudgeActionText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: C.accent,
  },
  modal: {
    flex: 1,
    backgroundColor: C.background,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  headerBtn: {
    padding: 8,
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyList: {
    flex: 1,
  },
  historyLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  historyItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  historyText: {
    flex: 1,
    fontSize: 14,
    color: C.text,
  },
  deleteBtn: {
    padding: 10,
  },
  toolCardsContainer: {
    paddingLeft: 36,
    marginBottom: 8,
  },
  chatArea: {
    flex: 1,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: C.text,
    marginTop: 12,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  quickActions: {
    gap: 8,
    width: "100%" as DimensionValue,
  },
  quickBtn: {
    backgroundColor: C.backgroundSecondary,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  quickBtnText: {
    fontSize: 13,
    color: C.text,
    fontFamily: "Inter_500Medium",
  },
  bubble: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-end",
  },
  userBubble: {
    justifyContent: "flex-end",
  },
  aiBubble: {
    justifyContent: "flex-start",
    gap: 8,
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.accent + "33",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  bubbleContent: {
    maxWidth: "80%" as DimensionValue,
    borderRadius: 16,
    padding: 12,
  },
  userContent: {
    backgroundColor: C.accent,
    borderBottomRightRadius: 4,
  },
  aiContent: {
    backgroundColor: C.backgroundSecondary,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 14,
    color: C.text,
    lineHeight: 21,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
  },
  input: {
    flex: 1,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
    borderWidth: 1,
    borderColor: C.cardBorder,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});
