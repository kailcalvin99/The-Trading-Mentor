import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  TouchableOpacity,
  ScrollView,
  type DimensionValue,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";
import { apiGet, apiPut } from "@/lib/api";
import { useAIAssistant } from "@/contexts/AIAssistantContext";
import {
  COURSE_CHAPTERS,
  type Lesson,
  type Chapter,
} from "@/data/academy-data";

const C = Colors.dark;
const SH = Dimensions.get("window").height;
const PROGRESS_KEY = "ict-academy-progress";
const ACADEMY_UNLOCKED_KEY = "ict-academy-unlocked";

const CHART_IMAGES: Record<string, number> = {
  "chart-fvg.png": require("@/assets/images/chart-fvg.png"),
  "chart-mss.png": require("@/assets/images/chart-mss.png"),
  "chart-liquidity-sweep.png": require("@/assets/images/chart-liquidity-sweep.png"),
  "chart-ote.png": require("@/assets/images/chart-ote.png"),
  "chart-killzone.png": require("@/assets/images/chart-killzone.png"),
  "chart-idm-inducement.png": require("@/assets/images/chart-idm-inducement.png"),
  "chart-conservative-entry.png": require("@/assets/images/chart-conservative-entry.png"),
  "chart-silver-bullet.png": require("@/assets/images/chart-silver-bullet.png"),
  "chart-exit-criteria.png": require("@/assets/images/chart-exit-criteria.png"),
  "lesson-what-is-trading.png": require("@/assets/images/lesson-what-is-trading.png"),
  "lesson-futures-nq.png": require("@/assets/images/lesson-futures-nq.png"),
  "lesson-candlestick.png": require("@/assets/images/lesson-candlestick.png"),
  "lesson-timeframes.png": require("@/assets/images/lesson-timeframes.png"),
  "lesson-broker-platform.png": require("@/assets/images/lesson-broker-platform.png"),
  "lesson-prop-firm.png": require("@/assets/images/lesson-prop-firm.png"),
  "lesson-who-moves-market.png": require("@/assets/images/lesson-who-moves-market.png"),
  "lesson-liquidity.png": require("@/assets/images/lesson-liquidity.png"),
  "lesson-buyside-sellside.png": require("@/assets/images/lesson-buyside-sellside.png"),
  "lesson-smart-money.png": require("@/assets/images/lesson-smart-money.png"),
  "lesson-internal-external.png": require("@/assets/images/lesson-internal-external.png"),
  "lesson-market-structure.png": require("@/assets/images/lesson-market-structure.png"),
  "lesson-premium-discount.png": require("@/assets/images/lesson-premium-discount.png"),
  "lesson-displacement.png": require("@/assets/images/lesson-displacement.png"),
  "lesson-time-matters.png": require("@/assets/images/lesson-time-matters.png"),
  "lesson-ny-open.png": require("@/assets/images/lesson-ny-open.png"),
  "lesson-silver-bullet-window.png": require("@/assets/images/lesson-silver-bullet-window.png"),
  "lesson-when-not-trade.png": require("@/assets/images/lesson-when-not-trade.png"),
  "lesson-top-down.png": require("@/assets/images/lesson-top-down.png"),
  "lesson-stop-loss.png": require("@/assets/images/lesson-stop-loss.png"),
  "lesson-targets.png": require("@/assets/images/lesson-targets.png"),
  "lesson-breakeven.png": require("@/assets/images/lesson-breakeven.png"),
  "lesson-risk-importance.png": require("@/assets/images/lesson-risk-importance.png"),
  "lesson-risk-per-trade.png": require("@/assets/images/lesson-risk-per-trade.png"),
  "lesson-position-sizing.png": require("@/assets/images/lesson-position-sizing.png"),
  "lesson-loss-limits.png": require("@/assets/images/lesson-loss-limits.png"),
  "lesson-breaking-rules.png": require("@/assets/images/lesson-breaking-rules.png"),
  "lesson-why-lose.png": require("@/assets/images/lesson-why-lose.png"),
  "lesson-fomo.png": require("@/assets/images/lesson-fomo.png"),
  "lesson-revenge-trading.png": require("@/assets/images/lesson-revenge-trading.png"),
  "lesson-morning-routine.png": require("@/assets/images/lesson-morning-routine.png"),
  "lesson-journal-habit.png": require("@/assets/images/lesson-journal-habit.png"),
  "lesson-patience.png": require("@/assets/images/lesson-patience.png"),
  "lesson-discipline-toolkit.png": require("@/assets/images/lesson-discipline-toolkit.png"),
};

async function loadLocalProgress(): Promise<Set<string>> {
  const raw = await AsyncStorage.getItem(PROGRESS_KEY);
  if (!raw) return new Set();
  try { return new Set(JSON.parse(raw)); } catch { return new Set(); }
}

async function saveProgressToServer(ids: Set<string>): Promise<void> {
  try {
    await apiPut("academy/progress", { lessonIds: Array.from(ids) });
  } catch {}
}

async function syncProgressFromServer(
  current: Set<string>,
  onUpdate: (merged: Set<string>) => void
): Promise<void> {
  try {
    const data = await apiGet<{ lessonIds: string[] }>("academy/progress");
    const serverIds: string[] = data.lessonIds || [];
    const mergedArr = Array.from(new Set([...Array.from(current), ...serverIds]));
    const merged = new Set(mergedArr);
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(mergedArr));
    if (mergedArr.length > serverIds.length) saveProgressToServer(merged);
    onUpdate(merged);
  } catch {}
}

function getAllCards(): { lesson: Lesson; chapter: Chapter; globalIdx: number }[] {
  const cards: { lesson: Lesson; chapter: Chapter; globalIdx: number }[] = [];
  let idx = 0;
  for (const ch of COURSE_CHAPTERS) {
    for (const l of ch.lessons) {
      cards.push({ lesson: l, chapter: ch, globalIdx: idx++ });
    }
  }
  return cards;
}

export default function SwipeModeScreen() {
  const router = useRouter();
  const { openWithTopic } = useAIAssistant();

  const allCards = getAllCards();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [cardStep, setCardStep] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<number | null>(null);
  const translateY = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadLocalProgress().then((local) => {
      setCompleted(local);
      const first = allCards.findIndex((c) => !local.has(c.lesson.id));
      setCurrentIdx(first >= 0 ? first : 0);
      syncProgressFromServer(local, (merged) => {
        setCompleted(merged);
        const nextFirst = allCards.findIndex((c) => !merged.has(c.lesson.id));
        if (nextFirst >= 0) setCurrentIdx((prev) => (prev === 0 ? nextFirst : prev));
      });
    });
  }, []);

  const card = allCards[currentIdx];
  if (!card) return null;

  const { lesson, chapter } = card;
  const isDone = completed.has(lesson.id);
  const totalCards = allCards.length;
  const completedCount = allCards.filter((c) => completed.has(c.lesson.id)).length;
  const totalSteps = lesson.paragraphs.length + (lesson.chartImage ? 1 : 0) + 1;

  async function markComplete() {
    if (completed.has(lesson.id)) return;
    const next = new Set(completed);
    next.add(lesson.id);
    setCompleted(next);
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify([...next]));
    saveProgressToServer(next);
    if (next.size >= totalCards) {
      await AsyncStorage.setItem(ACADEMY_UNLOCKED_KEY, "true");
    }
    setJustCompleted(true);
    Animated.sequence([
      Animated.timing(cardScale, { toValue: 1.03, duration: 150, useNativeDriver: true }),
      Animated.timing(cardScale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start(() => setJustCompleted(false));
  }

  function goNext() {
    if (cardStep < totalSteps - 1) {
      setCardStep(cardStep + 1);
      return;
    }
    if (!isDone && !completed.has(lesson.id)) markComplete();
    if (currentIdx < totalCards - 1) {
      animateCardOut(1, () => {
        setCurrentIdx(currentIdx + 1);
        setCardStep(0);
      });
    }
  }

  function goPrev() {
    if (cardStep > 0) {
      setCardStep(cardStep - 1);
      return;
    }
    if (currentIdx > 0) {
      animateCardOut(-1, () => {
        setCurrentIdx(currentIdx - 1);
        setCardStep(0);
      });
    }
  }

  function animateCardOut(dir: 1 | -1, onDone: () => void) {
    Animated.timing(translateY, {
      toValue: dir * -SH,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      translateY.setValue(dir * SH);
      onDone();
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  }

  const goNextRef = useRef(goNext);
  const goPrevRef = useRef(goPrev);
  goNextRef.current = goNext;
  goPrevRef.current = goPrev;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 10 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => translateY.setValue(gs.dy),
      onPanResponderRelease: (_, gs) => {
        if (gs.dy < -60) {
          goNextRef.current();
          Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        } else if (gs.dy > 60) {
          goPrevRef.current();
          Animated.timing(translateY, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const stepContent = (() => {
    const paraCount = lesson.paragraphs.length;
    let step = cardStep;
    if (step < paraCount) return { type: "paragraph" as const, text: lesson.paragraphs[step] };
    step -= paraCount;
    if (lesson.chartImage && step === 0) return { type: "chart" as const };
    return { type: "takeaway" as const };
  })();

  const isLastCard = currentIdx === totalCards - 1 && cardStep === totalSteps - 1;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.exitBtn}>
          <Ionicons name="close" size={18} color={C.text} />
          <Text style={styles.exitBtnText}>Exit</Text>
        </TouchableOpacity>
        <Text style={styles.progressText}>{completedCount}/{totalCards} lessons</Text>
        <TouchableOpacity
          style={styles.mentorBtn}
          onPress={() => { router.back(); setTimeout(() => openWithTopic(lesson.title), 400); }}
        >
          <Ionicons name="sparkles" size={16} color="#0A0A0F" />
          <Text style={styles.mentorBtnText}>Ask Mentor</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.progressBarRow}>
        {allCards.map((_, i) => (
          <View
            key={i}
            style={[
              styles.progressSegment,
              {
                backgroundColor:
                  completed.has(allCards[i].lesson.id)
                    ? C.accent
                    : i === currentIdx
                    ? C.accent + "80"
                    : C.cardBorder,
              },
            ]}
          />
        ))}
      </View>

      <Animated.View
        style={[styles.cardWrapper, { transform: [{ translateY }, { scale: cardScale }] }]}
        {...panResponder.panHandlers}
      >
        <View style={[styles.cardHeader, { backgroundColor: chapter.color + "15" }]}>
          <Text style={styles.chapterIcon}>{chapter.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.chapterLabel, { color: chapter.color }]}>{chapter.title}</Text>
            <Text style={styles.lessonTitle}>{lesson.title}</Text>
          </View>
          {isDone && <Ionicons name="checkmark-circle" size={22} color={C.accent} />}
        </View>

        <ScrollView style={styles.cardBody} showsVerticalScrollIndicator={false}>
          {stepContent.type === "paragraph" && (
            <Text style={styles.paragraph}>{stepContent.text}</Text>
          )}
          {stepContent.type === "chart" && lesson.chartImage && CHART_IMAGES[lesson.chartImage] && (
            <View>
              <Text style={styles.chartLabel}>See it on the chart</Text>
              <TouchableOpacity activeOpacity={0.85} onPress={() => setLightboxImage(CHART_IMAGES[lesson.chartImage!])}>
                <Image
                  source={CHART_IMAGES[lesson.chartImage]}
                  style={styles.chartImage}
                  contentFit="cover"
                />
                <Text style={styles.tapHint}>Tap to enlarge</Text>
              </TouchableOpacity>
            </View>
          )}
          {stepContent.type === "takeaway" && (
            <View style={[styles.takeawayBox, { borderLeftColor: chapter.color, backgroundColor: chapter.color + "10" }]}>
              <Text style={[styles.takeawayLabel, { color: chapter.color }]}>Key Takeaway</Text>
              <Text style={styles.takeawayText}>{lesson.takeaway}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.stepDots}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View
              key={i}
              style={[styles.stepDot, { backgroundColor: i === cardStep ? chapter.color : C.cardBorder, width: i === cardStep ? 18 : 8 }]}
            />
          ))}
        </View>
      </Animated.View>

      <View style={styles.navRow}>
        <TouchableOpacity
          style={[styles.navBtn, (currentIdx === 0 && cardStep === 0) && styles.navBtnDisabled]}
          onPress={goPrev}
          disabled={currentIdx === 0 && cardStep === 0}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={currentIdx === 0 && cardStep === 0 ? C.textTertiary : C.text} />
          <Text style={[styles.navBtnText, (currentIdx === 0 && cardStep === 0) && { color: C.textTertiary }]}>Back</Text>
        </TouchableOpacity>

        {stepContent.type === "takeaway" && !isDone && (
          <TouchableOpacity style={styles.doneBtn} onPress={markComplete}>
            <Ionicons name="checkmark-circle" size={16} color="#0A0A0F" />
            <Text style={styles.doneBtnText}>Mark Done</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.navBtn, isLastCard && styles.navBtnDisabled]}
          onPress={goNext}
          disabled={isLastCard}
          activeOpacity={0.7}
        >
          <Text style={[styles.navBtnText, isLastCard && { color: C.textTertiary }]}>Next</Text>
          <Ionicons name="chevron-forward" size={22} color={isLastCard ? C.textTertiary : C.text} />
        </TouchableOpacity>
      </View>

      <Text style={styles.swipeHint}>Swipe up/down to navigate</Text>

      {lightboxImage !== null && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setLightboxImage(null)}>
          <TouchableOpacity style={styles.lightboxOverlay} activeOpacity={1} onPress={() => setLightboxImage(null)}>
            <Image source={lightboxImage} style={styles.lightboxImage} contentFit="contain" />
            <Text style={styles.lightboxDismiss}>Tap to close</Text>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    gap: 8,
  },
  exitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.backgroundSecondary,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
  },
  exitBtnText: { fontSize: 13, fontWeight: "600", color: C.text },
  progressText: { flex: 1, fontSize: 13, color: C.textSecondary, textAlign: "center" },
  mentorBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: C.accent,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  mentorBtnText: { fontSize: 12, fontWeight: "700", color: "#0A0A0F" },
  progressBarRow: {
    flexDirection: "row",
    gap: 2,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  progressSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
  },
  cardWrapper: {
    flex: 1,
    marginHorizontal: 14,
    marginTop: 6,
    marginBottom: 6,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 16,
  },
  chapterIcon: { fontSize: 24 },
  chapterLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 },
  lessonTitle: { fontSize: 17, fontWeight: "700", color: C.text },
  cardBody: { flex: 1, padding: 18 },
  paragraph: { fontSize: 15, color: C.text, lineHeight: 26, opacity: 0.9 },
  chartLabel: { fontSize: 10, fontWeight: "700", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 },
  chartImage: { width: "100%" as DimensionValue, height: 200, borderRadius: 12 },
  takeawayBox: { borderLeftWidth: 3, borderRadius: 10, padding: 14 },
  takeawayLabel: { fontSize: 10, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  takeawayText: { fontSize: 14, fontWeight: "500", color: C.text, lineHeight: 22 },
  stepDots: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  stepDot: {
    height: 6,
    borderRadius: 3,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 6,
    paddingTop: 2,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 10,
  },
  navBtnDisabled: { opacity: 0.3 },
  navBtnText: { fontSize: 14, fontWeight: "600", color: C.text },
  doneBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.accent,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  doneBtnText: { fontSize: 14, fontWeight: "700", color: "#0A0A0F" },
  swipeHint: {
    fontSize: 11,
    color: C.textTertiary,
    textAlign: "center",
    paddingBottom: Platform.OS === "ios" ? 20 : 10,
  },
  tapHint: {
    fontSize: 10,
    color: C.textTertiary,
    textAlign: "center",
    marginTop: 4,
    fontStyle: "italic",
  },
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  lightboxImage: {
    width: "100%" as DimensionValue,
    height: "80%" as DimensionValue,
    borderRadius: 12,
  },
  lightboxDismiss: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    marginTop: 16,
  },
});
