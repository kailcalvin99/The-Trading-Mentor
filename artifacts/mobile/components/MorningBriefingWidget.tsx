import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useMorningBriefing } from "@/hooks/useMorningBriefing";

const C = Colors.dark;
const AUTO_DISMISS_MS = 15000;

interface MorningBriefingWidgetProps {
  firstName: string;
  trades: Array<{ outcome?: string | null; pnl?: string | number | null; createdAt?: string | null; isDraft?: boolean | null }>;
  drawdownPct: number;
  userId?: number | string;
}

export default function MorningBriefingWidget({ firstName, trades, drawdownPct, userId }: MorningBriefingWidgetProps) {
  const { shouldShow, data, dismiss } = useMorningBriefing({ firstName, trades, drawdownPct, userId });

  const [progressWidth, setProgressWidth] = useState(100);

  const slideAnim = useRef(new Animated.Value(-200)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;

  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const handleDismiss = useCallback(() => {
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    if (progressAnimRef.current) progressAnimRef.current.stop();

    Animated.parallel([
      Animated.timing(slideAnim, { toValue: -200, duration: 250, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]).start(() => {
      dismiss();
    });
  }, [slideAnim, opacityAnim, dismiss]);

  useEffect(() => {
    if (!shouldShow) return;

    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 180 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();

    progressAnim.setValue(1);
    progressAnimRef.current = Animated.timing(progressAnim, {
      toValue: 0,
      duration: AUTO_DISMISS_MS,
      useNativeDriver: false,
    });
    progressAnimRef.current.start();

    const listener = progressAnim.addListener(({ value }) => {
      setProgressWidth(value * 100);
    });

    dismissTimerRef.current = setTimeout(() => {
      handleDismiss();
    }, AUTO_DISMISS_MS);

    return () => {
      progressAnim.removeListener(listener);
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
      if (progressAnimRef.current) progressAnimRef.current.stop();
    };
  }, [shouldShow]);

  if (!shouldShow || !data) return null;

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY: slideAnim }], opacity: opacityAnim }]}>
      <TouchableOpacity activeOpacity={0.9} onPress={handleDismiss} style={styles.inner}>
        <View style={styles.header}>
          <Ionicons name="sparkles" size={13} color="#E53E3E" />
          <Text style={styles.headerText}>AI MORNING BRIEFING</Text>
          <Text style={styles.dismissHint}>Tap to dismiss</Text>
          <Ionicons name="close" size={14} color={C.textTertiary} />
        </View>

        <View style={styles.body}>
          <Text style={styles.robotEmoji}>🤖</Text>
          <Text style={styles.message}>{data.briefingMessage}</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>P&L</Text>
            <Text style={[styles.statValue, { color: data.todayPnL > 0 ? "#00C896" : data.todayPnL < 0 ? "#E53E3E" : C.textSecondary }]}>
              {data.hasTrades ? data.todayPnLFormatted : "—"}
            </Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>Drawdown</Text>
            <Text style={[styles.statValue, { color: data.drawdownPct >= 5 ? "#E53E3E" : C.textSecondary }]}>
              {data.drawdownPct > 0 ? `${data.drawdownPct.toFixed(1)}%` : "0.0%"}
            </Text>
          </View>
          <View style={styles.statPill}>
            <Text style={styles.statLabel}>Streak</Text>
            <Text style={[styles.statValue, { color: data.winStreak > 0 ? "#00C896" : C.textSecondary }]}>
              {data.winStreak > 0 ? `${data.winStreak}W` : "—"}
            </Text>
          </View>
        </View>

        <View style={styles.actionsContainer}>
          {data.actionItems.map((item, i) => (
            <View key={i} style={styles.actionRow}>
              <Ionicons name="chevron-forward" size={11} color="#E53E3E" />
              <Text style={styles.actionText}>{item}</Text>
            </View>
          ))}
        </View>

        <View style={styles.progressTrack}>
          <View style={[styles.progressBar, { width: `${progressWidth}%` }]} />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  inner: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E53E3E40",
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#E53E3E12",
    borderBottomWidth: 1,
    borderBottomColor: "#E53E3E20",
  },
  headerText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "#E53E3E",
    letterSpacing: 1,
    flex: 1,
  },
  dismissHint: {
    fontSize: 9,
    color: C.textTertiary,
    fontFamily: "Inter_400Regular",
  },
  body: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
  },
  robotEmoji: {
    fontSize: 18,
    lineHeight: 22,
  },
  message: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: C.text,
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: C.backgroundTertiary,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  statLabel: {
    fontSize: 9,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  statValue: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  actionsContainer: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 4,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  actionText: {
    fontSize: 11,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
    flex: 1,
  },
  progressTrack: {
    height: 3,
    backgroundColor: C.cardBorder,
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#E53E3E80",
  },
});
