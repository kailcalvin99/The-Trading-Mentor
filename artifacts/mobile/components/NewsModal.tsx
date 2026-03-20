import React, { useEffect, useState, useRef } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { apiGet } from "@/lib/api";

const C = Colors.dark;

interface CalendarEvent {
  time: string;
  event: string;
  country: string;
  impact: string;
  actual: string | null;
  estimate: string | null;
}

interface NewsModalProps {
  visible: boolean;
  onDone: () => void;
  onClose: () => void;
}

function formatEventTime(timeStr: string): string {
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return timeStr;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return timeStr;
  }
}

function isEventPast(timeStr: string): boolean {
  try {
    return new Date(timeStr).getTime() < Date.now();
  } catch {
    return false;
  }
}

export default function NewsModal({ visible, onDone, onClose }: NewsModalProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!visible) return;
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    setLoading(true);
    setFetchError(false);
    apiGet<{ events: CalendarEvent[] }>("/calendar/today")
      .then((data) => {
        if (data?.events) setEvents(data.events);
      })
      .catch(() => {
        setFetchError(true);
      })
      .finally(() => setLoading(false));
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      fetchedRef.current = false;
      setEvents([]);
      setFetchError(false);
    }
  }, [visible]);

  const hasEvents = events.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />

          <View style={s.header}>
            <Ionicons name="newspaper-outline" size={18} color={C.accent} />
            <Text style={s.title}>Today's News</Text>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close" size={22} color={C.textTertiary} />
            </TouchableOpacity>
          </View>

          <Text style={s.subtitle}>High & medium impact events today</Text>

          {loading ? (
            <View style={s.centerBox}>
              <ActivityIndicator color={C.accent} size="large" />
              <Text style={s.loadingText}>Checking calendar...</Text>
            </View>
          ) : fetchError ? (
            <View style={s.centerBox}>
              <Ionicons name="cloud-offline-outline" size={44} color={C.textTertiary} />
              <Text style={s.errorHeading}>Could not load events</Text>
              <Text style={s.errorSub}>Check your connection — data may be unavailable.</Text>
            </View>
          ) : hasEvents ? (
            <ScrollView
              style={s.eventList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {events.map((ev, i) => {
                const isHigh = ev.impact?.toLowerCase() === "high";
                const past = isEventPast(ev.time);
                return (
                  <View
                    key={i}
                    style={[s.eventRow, past && s.eventRowPast]}
                  >
                    <View
                      style={[
                        s.impactBadge,
                        {
                          backgroundColor: isHigh
                            ? "#EF444420"
                            : "#F59E0B20",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.impactText,
                          { color: isHigh ? "#EF4444" : "#F59E0B" },
                        ]}
                      >
                        {isHigh ? "HIGH" : "MED"}
                      </Text>
                    </View>

                    <View style={s.eventInfo}>
                      <Text
                        style={[s.eventName, past && { color: C.textSecondary }]}
                        numberOfLines={2}
                      >
                        {ev.event}
                      </Text>
                      <View style={s.metaRow}>
                        <Text style={s.metaText}>{formatEventTime(ev.time)}</Text>
                        <View style={s.metaDot} />
                        <Text style={s.metaText}>{ev.country}</Text>
                        {ev.actual !== null && ev.actual !== undefined && (
                          <>
                            <View style={s.metaDot} />
                            <Text style={[s.metaText, { color: "#00C896" }]}>
                              A: {ev.actual}
                            </Text>
                          </>
                        )}
                        {!ev.actual && ev.estimate && (
                          <>
                            <View style={s.metaDot} />
                            <Text style={[s.metaText, { color: "#F59E0B" }]}>
                              E: {ev.estimate}
                            </Text>
                          </>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          ) : (
            <TouchableOpacity style={s.centerBox} onPress={onDone} activeOpacity={0.75}>
              <View style={s.allClearCircle}>
                <Ionicons name="checkmark" size={44} color="#00C896" />
              </View>
              <Text style={s.allClearHeading}>All Clear</Text>
              <Text style={s.allClearSub}>Nothing major today</Text>
              <Text style={s.allClearTap}>Tap to confirm</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.doneBtn} onPress={onDone} activeOpacity={0.85}>
            <Ionicons name="checkmark-circle-outline" size={18} color="#0A0A0F" />
            <Text style={s.doneBtnText}>Got it</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: C.cardBorder,
    maxHeight: "85%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.cardBorder,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  subtitle: {
    fontSize: 12,
    color: C.textTertiary,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
  },
  centerBox: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
    marginTop: 8,
  },
  allClearCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#00C89618",
    borderWidth: 2,
    borderColor: "#00C89640",
    alignItems: "center",
    justifyContent: "center",
  },
  allClearHeading: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: "#00C896",
  },
  allClearSub: {
    fontSize: 14,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  allClearTap: {
    fontSize: 11,
    color: C.textTertiary,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  errorHeading: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
    textAlign: "center",
  },
  errorSub: {
    fontSize: 13,
    color: C.textTertiary,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  eventList: {
    maxHeight: 340,
    marginBottom: 8,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  eventRowPast: {
    opacity: 0.5,
  },
  impactBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    minWidth: 44,
    alignItems: "center",
    marginTop: 2,
  },
  impactText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  eventInfo: {
    flex: 1,
    gap: 3,
  },
  eventName: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: C.textTertiary,
  },
  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
  },
  doneBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#0A0A0F",
  },
});
