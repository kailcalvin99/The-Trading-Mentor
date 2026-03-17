import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  PanResponder,
  Dimensions,
  Platform,
  type DimensionValue,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { fireMobileAITrigger, incrementMobileQuizFail, resetMobileQuizFail } from "@/lib/aiTrigger";
import AsyncStorage from "@react-native-async-storage/async-storage";
import GraduationCelebration, { useGraduationCheck } from "@/components/GraduationCelebration";
import { useAIAssistant } from "@/contexts/AIAssistantContext";
import {
  COURSE_CHAPTERS,
  GLOSSARY as GLOSSARY_DATA,
  QUIZ_BANK,
  PLAN_SECTIONS as PLAN_DATA,
  DIFFICULTY_COLORS,
  DIFFICULTY_LABELS,
  TOTAL_QUIZ_QUESTIONS,
  TIER_ORDER,
  pickQuestion,
  type Difficulty,
  type QuizQuestion,
  type Lesson,
  type Chapter,
} from "@/data/academy-data";

const C = Colors.dark;

const GLOSSARY_IMAGES: Record<string, number> = {
  FVG: require("@/assets/images/chart-fvg.png"),
  MSS: require("@/assets/images/chart-mss.png"),
  "Liquidity Sweep": require("@/assets/images/chart-liquidity-sweep.png"),
  OTE: require("@/assets/images/chart-ote.png"),
  "Kill Zone": require("@/assets/images/chart-killzone.png"),
};

const CHART_IMAGES: Record<string, number> = {
  "chart-fvg.png": require("@/assets/images/chart-fvg.png"),
  "chart-mss.png": require("@/assets/images/chart-mss.png"),
  "chart-liquidity-sweep.png": require("@/assets/images/chart-liquidity-sweep.png"),
  "chart-ote.png": require("@/assets/images/chart-ote.png"),
  "chart-killzone.png": require("@/assets/images/chart-killzone.png"),
  "chart-conservative-entry.png": require("@/assets/images/chart-conservative-entry.png"),
  "chart-silver-bullet.png": require("@/assets/images/chart-silver-bullet.png"),
  "chart-exit-criteria.png": require("@/assets/images/chart-exit-criteria.png"),
};

type Tab = "learn" | "glossary" | "quiz" | "plan";

const PROGRESS_KEY = "ict-academy-progress";
const SW = Dimensions.get("window").width;
const ACADEMY_UNLOCKED_KEY = "ict-academy-unlocked";

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

interface SwipeModeProps {
  onExit: () => void;
  onAskMentor: (topic: string) => void;
}

function SwipeMode({ onExit, onAskMentor }: SwipeModeProps) {
  const allCards = getAllCards();
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [cardStep, setCardStep] = useState(0);
  const [justCompleted, setJustCompleted] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    AsyncStorage.getItem(PROGRESS_KEY).then((raw) => {
      if (raw) {
        try {
          const prog = new Set<string>(JSON.parse(raw));
          setCompleted(prog);
          const first = allCards.findIndex((c) => !prog.has(c.lesson.id));
          setCurrentIdx(first >= 0 ? first : 0);
        } catch {}
      }
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
    Animated.timing(translateX, {
      toValue: dir * -SW,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      translateX.setValue(dir * SW);
      onDone();
      Animated.timing(translateX, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10 && Math.abs(gs.dx) > Math.abs(gs.dy),
      onPanResponderMove: (_, gs) => translateX.setValue(gs.dx),
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -60) {
          goNext();
          Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        } else if (gs.dx > 60) {
          goPrev();
          Animated.timing(translateX, { toValue: 0, duration: 200, useNativeDriver: true }).start();
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
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
    <Modal visible animationType="slide" onRequestClose={onExit}>
      <SafeAreaView style={swipeStyles.safe} edges={["top"]}>
        <View style={swipeStyles.topBar}>
          <TouchableOpacity onPress={onExit} style={swipeStyles.exitBtn}>
            <Ionicons name="close" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={swipeStyles.progressText}>{completedCount}/{totalCards} lessons</Text>
          <TouchableOpacity
            style={swipeStyles.mentorBtn}
            onPress={() => onAskMentor(lesson.title)}
          >
            <Ionicons name="sparkles" size={16} color="#0A0A0F" />
            <Text style={swipeStyles.mentorBtnText}>Ask Mentor</Text>
          </TouchableOpacity>
        </View>

        <View style={swipeStyles.progressBarRow}>
          {allCards.map((_, i) => (
            <View
              key={i}
              style={[
                swipeStyles.progressSegment,
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
          style={[swipeStyles.cardWrapper, { transform: [{ translateX }, { scale: cardScale }] }]}
          {...panResponder.panHandlers}
        >
          <View style={[swipeStyles.cardHeader, { backgroundColor: chapter.color + "15" }]}>
            <Text style={swipeStyles.chapterIcon}>{chapter.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[swipeStyles.chapterLabel, { color: chapter.color }]}>{chapter.title}</Text>
              <Text style={swipeStyles.lessonTitle}>{lesson.title}</Text>
            </View>
            {isDone && <Ionicons name="checkmark-circle" size={22} color={C.accent} />}
          </View>

          <ScrollView style={swipeStyles.cardBody} showsVerticalScrollIndicator={false}>
            {stepContent.type === "paragraph" && (
              <Text style={swipeStyles.paragraph}>{stepContent.text}</Text>
            )}
            {stepContent.type === "chart" && lesson.chartImage && CHART_IMAGES[lesson.chartImage] && (
              <View>
                <Text style={swipeStyles.chartLabel}>See it on the chart</Text>
                <Image
                  source={CHART_IMAGES[lesson.chartImage]}
                  style={swipeStyles.chartImage}
                  contentFit="cover"
                />
              </View>
            )}
            {stepContent.type === "takeaway" && (
              <View style={[swipeStyles.takeawayBox, { borderLeftColor: chapter.color, backgroundColor: chapter.color + "10" }]}>
                <Text style={[swipeStyles.takeawayLabel, { color: chapter.color }]}>Key Takeaway</Text>
                <Text style={swipeStyles.takeawayText}>{lesson.takeaway}</Text>
              </View>
            )}
          </ScrollView>

          <View style={swipeStyles.stepDots}>
            {Array.from({ length: totalSteps }).map((_, i) => (
              <View
                key={i}
                style={[swipeStyles.stepDot, { backgroundColor: i === cardStep ? chapter.color : C.cardBorder, width: i === cardStep ? 18 : 8 }]}
              />
            ))}
          </View>
        </Animated.View>

        <View style={swipeStyles.navRow}>
          <TouchableOpacity
            style={[swipeStyles.navBtn, (currentIdx === 0 && cardStep === 0) && swipeStyles.navBtnDisabled]}
            onPress={goPrev}
            disabled={currentIdx === 0 && cardStep === 0}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={22} color={currentIdx === 0 && cardStep === 0 ? C.textTertiary : C.text} />
            <Text style={[swipeStyles.navBtnText, (currentIdx === 0 && cardStep === 0) && { color: C.textTertiary }]}>Back</Text>
          </TouchableOpacity>

          {stepContent.type === "takeaway" && !isDone && (
            <TouchableOpacity style={swipeStyles.doneBtn} onPress={markComplete}>
              <Ionicons name="checkmark-circle" size={16} color="#0A0A0F" />
              <Text style={swipeStyles.doneBtnText}>Mark Done</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[swipeStyles.navBtn, isLastCard && swipeStyles.navBtnDisabled]}
            onPress={goNext}
            disabled={isLastCard}
            activeOpacity={0.7}
          >
            <Text style={[swipeStyles.navBtnText, isLastCard && { color: C.textTertiary }]}>Next</Text>
            <Ionicons name="chevron-forward" size={22} color={isLastCard ? C.textTertiary : C.text} />
          </TouchableOpacity>
        </View>

        <Text style={swipeStyles.swipeHint}>Swipe left/right to navigate</Text>
      </SafeAreaView>
    </Modal>
  );
}

const swipeStyles = StyleSheet.create({
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
  exitBtn: { padding: 4 },
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
});

function LearnView({ onSwipeMode, onAskMentor }: { onSwipeMode: () => void; onAskMentor: (topic: string) => void }) {
  const [expandedChapter, setExpandedChapter] = useState<string | null>("ch1");
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());

  useEffect(() => {
    AsyncStorage.getItem(PROGRESS_KEY).then((raw) => {
      if (raw) {
        try { setCompleted(new Set(JSON.parse(raw))); } catch {}
      }
    });
  }, []);

  function toggleComplete(lessonId: string) {
    const next = new Set(completed);
    if (next.has(lessonId)) next.delete(lessonId);
    else next.add(lessonId);
    setCompleted(next);
    AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify([...next]));
    const allIds = COURSE_CHAPTERS.flatMap((ch) => ch.lessons.map((l) => l.id));
    const allDone = allIds.every((id) => next.has(id));
    if (allDone) {
      AsyncStorage.setItem(ACADEMY_UNLOCKED_KEY, "true");
    }
  }

  const totalLessons = COURSE_CHAPTERS.reduce((sum, ch) => sum + ch.lessons.length, 0);
  const completedCount = COURSE_CHAPTERS.reduce(
    (sum, ch) => sum + ch.lessons.filter((l) => completed.has(l.id)).length,
    0
  );

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <View style={learnStyles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={learnStyles.heading}>ICT Trading Course</Text>
          <Text style={learnStyles.subheading}>Learn everything from zero</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={learnStyles.progressCount}>{completedCount}/{totalLessons}</Text>
          <Text style={learnStyles.progressLabel}>lessons done</Text>
        </View>
      </View>

      <View style={learnStyles.progressBar}>
        <View style={[learnStyles.progressFill, { width: `${totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0}%` }]} />
      </View>

      <TouchableOpacity style={learnStyles.swipeModeBtn} onPress={onSwipeMode} activeOpacity={0.85}>
        <Ionicons name="layers-outline" size={18} color="#0A0A0F" />
        <Text style={learnStyles.swipeModeBtnText}>Swipe Mode</Text>
        <Text style={learnStyles.swipeModeSubtext}>Flip through lessons like cards</Text>
        <Ionicons name="arrow-forward" size={16} color="#0A0A0F" />
      </TouchableOpacity>

      {COURSE_CHAPTERS.map((chapter, chIdx) => {
        const isOpen = expandedChapter === chapter.id;
        const chCompleted = chapter.lessons.filter((l) => completed.has(l.id)).length;
        const chTotal = chapter.lessons.length;
        const chDone = chCompleted === chTotal && chTotal > 0;

        return (
          <View key={chapter.id} style={learnStyles.chapterCard}>
            <TouchableOpacity
              style={learnStyles.chapterHeader}
              onPress={() => setExpandedChapter(isOpen ? null : chapter.id)}
              activeOpacity={0.7}
            >
              <Text style={learnStyles.chapterIcon}>{chapter.icon}</Text>
              <View style={{ flex: 1 }}>
                <View style={learnStyles.chapterTitleRow}>
                  <Text style={learnStyles.chapterNum}>Chapter {chIdx + 1}</Text>
                  {chDone && <Ionicons name="checkmark-circle" size={16} color={C.accent} />}
                </View>
                <Text style={learnStyles.chapterTitle}>{chapter.title}</Text>
                <Text style={learnStyles.chapterDesc} numberOfLines={2}>{chapter.description}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[learnStyles.chapterProgress, { color: chapter.color }]}>
                  {chCompleted}/{chTotal}
                </Text>
                <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={C.textSecondary} />
              </View>
            </TouchableOpacity>

            {isOpen && chapter.lessons.map((lesson, lIdx) => {
              const isLessonOpen = expandedLesson === lesson.id;
              const isDone = completed.has(lesson.id);

              return (
                <View key={lesson.id} style={learnStyles.lessonContainer}>
                  <TouchableOpacity
                    style={learnStyles.lessonRow}
                    onPress={() => setExpandedLesson(isLessonOpen ? null : lesson.id)}
                    activeOpacity={0.7}
                  >
                    <TouchableOpacity onPress={() => toggleComplete(lesson.id)}>
                      <Ionicons
                        name={isDone ? "checkmark-circle" : "ellipse-outline"}
                        size={22}
                        color={isDone ? C.accent : C.textSecondary + "60"}
                      />
                    </TouchableOpacity>
                    <Text style={learnStyles.lessonNum}>{lIdx + 1}.</Text>
                    <Text style={[learnStyles.lessonTitle, isDone && learnStyles.lessonDone]} numberOfLines={2}>
                      {lesson.title}
                    </Text>
                    <Ionicons name={isLessonOpen ? "chevron-up" : "chevron-down"} size={14} color={C.textSecondary} />
                  </TouchableOpacity>

                  {isLessonOpen && (
                    <View style={learnStyles.lessonContent}>
                      {lesson.paragraphs.map((p, pIdx) => (
                        <Text key={pIdx} style={learnStyles.paragraph}>{p}</Text>
                      ))}

                      {lesson.chartImage && CHART_IMAGES[lesson.chartImage] && (
                        <View style={{ marginTop: 12 }}>
                          <Text style={learnStyles.chartLabel}>See it on the chart</Text>
                          <Image
                            source={CHART_IMAGES[lesson.chartImage]}
                            style={learnStyles.chartImage}
                            contentFit="cover"
                          />
                        </View>
                      )}

                      <View style={[learnStyles.takeawayBox, { borderLeftColor: chapter.color, backgroundColor: chapter.color + "10" }]}>
                        <Text style={[learnStyles.takeawayLabel, { color: chapter.color }]}>Key Takeaway</Text>
                        <Text style={learnStyles.takeawayText}>{lesson.takeaway}</Text>
                      </View>

                      <TouchableOpacity
                        style={learnStyles.aiMentorBtn}
                        onPress={() => onAskMentor(lesson.title)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="sparkles" size={14} color={C.accent} />
                        <Text style={learnStyles.aiMentorBtnText}>Ask AI Mentor about this lesson</Text>
                      </TouchableOpacity>

                      {!isDone && (
                        <TouchableOpacity style={learnStyles.markBtn} onPress={() => toggleComplete(lesson.id)}>
                          <Ionicons name="checkmark-circle" size={16} color="#0A0A0F" />
                          <Text style={learnStyles.markBtnText}>Mark as Complete</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        );
      })}
    </ScrollView>
  );
}

function GlossaryView() {
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <Text style={glossStyles.heading}>ICT Concepts</Text>
      <Text style={glossStyles.subheading}>Tap any term for the full definition + trader tip</Text>
      {GLOSSARY_DATA.map((item) => {
        const isOpen = expanded === item.term;
        return (
          <TouchableOpacity
            key={item.term}
            style={[glossStyles.card, isOpen && { borderColor: item.color }]}
            onPress={() => setExpanded(isOpen ? null : item.term)}
            activeOpacity={0.8}
          >
            <View style={glossStyles.cardHeader}>
              <View style={[glossStyles.badge, { backgroundColor: item.color + "22" }]}>
                <Text style={[glossStyles.badgeText, { color: item.color }]}>{item.term}</Text>
              </View>
              <Text style={glossStyles.fullName}>{item.full}</Text>
              <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={16} color={C.textSecondary} />
            </View>
            {isOpen && (
              <View style={glossStyles.cardBody}>
                <Text style={glossStyles.definition}>{item.definition}</Text>
                {GLOSSARY_IMAGES[item.term] && (
                  <Image
                    source={GLOSSARY_IMAGES[item.term]}
                    style={glossStyles.chartImage}
                    contentFit="cover"
                  />
                )}
                <View style={[glossStyles.tipBox, { borderLeftColor: item.color }]}>
                  <Text style={[glossStyles.tipLabel, { color: item.color }]}>NQ Tip</Text>
                  <Text style={glossStyles.tipText}>{item.tip}</Text>
                </View>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function QuizView() {
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [answered, setAnswered] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [diffScore, setDiffScore] = useState(0);
  const [done, setDone] = useState(false);
  const [usedIndices, setUsedIndices] = useState<Set<number>>(new Set());
  const [activeQuestion, setActiveQuestion] = useState<{ q: QuizQuestion; idx: number } | null>(
    () => pickQuestion("medium", new Set())
  );

  const q = activeQuestion?.q ?? null;
  const isCorrect = q ? selected === q.answer : false;

  function diffPoints(d: Difficulty): number {
    return d === "easy" ? 1 : d === "medium" ? 2 : 3;
  }

  function handleSelect(idx: number) {
    if (selected !== null || !q || !activeQuestion) return;
    setSelected(idx);
    const pts = diffPoints(q.difficulty);
    setMaxScore((s) => s + pts);
    const correct = idx === q.answer;
    if (correct) {
      setScore((s) => s + pts);
      setDiffScore((s) => s + 1);
      resetMobileQuizFail();
    } else {
      setDiffScore((s) => Math.max(0, s - 1));
      const failCount = incrementMobileQuizFail();
      if (failCount >= 2) {
        resetMobileQuizFail();
        fireMobileAITrigger({
          message: "Need help with this concept?",
          autoOpen: true,
          autoSend: true,
          prefillPrompt: `I keep getting quiz questions wrong about "${q.scenario.slice(0, 60)}". Can you explain this concept?`,
        });
      }
    }
  }

  function handleNext() {
    if (!activeQuestion) return;
    const newUsed = new Set(usedIndices);
    newUsed.add(activeQuestion.idx);
    setUsedIndices(newUsed);

    if (answered + 1 >= TOTAL_QUIZ_QUESTIONS) {
      setDone(true);
      return;
    }
    let nextDiff = difficulty;
    if (isCorrect) {
      if (diffScore >= 2 && difficulty !== "hard") {
        nextDiff = difficulty === "easy" ? "medium" : "hard";
        setDiffScore(0);
      }
    } else {
      if (difficulty !== "easy") {
        nextDiff = difficulty === "hard" ? "medium" : "easy";
        setDiffScore(0);
      }
    }
    setDifficulty(nextDiff);
    setAnswered((a) => a + 1);
    setSelected(null);
    setActiveQuestion(pickQuestion(nextDiff, newUsed));
  }

  function handleReset() {
    setDifficulty("medium");
    setAnswered(0);
    setSelected(null);
    setScore(0);
    setMaxScore(0);
    setDiffScore(0);
    setDone(false);
    resetMobileQuizFail();
    const emptySet = new Set<number>();
    setUsedIndices(emptySet);
    setActiveQuestion(pickQuestion("medium", emptySet));
  }

  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  if (done) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, alignItems: "center", paddingBottom: 100 }}>
        <View style={quizStyles.resultCard}>
          <Text style={quizStyles.resultEmoji}>{pct >= 70 ? "🏆" : pct >= 40 ? "📈" : "📚"}</Text>
          <Text style={quizStyles.resultScore}>{score}/{maxScore}</Text>
          <Text style={quizStyles.resultPct}>{pct}%</Text>
          <Text style={quizStyles.resultMsg}>
            {pct >= 70 ? "ICT Concept Master! You dominated the adaptive quiz." : pct >= 40 ? "Good progress — the quiz adjusted to your level. Review and retry!" : "Keep studying — review the glossary and plan, then try again!"}
          </Text>
          <Text style={[quizStyles.resultMsg, { marginTop: 8, color: C.textSecondary }]}>
            Scoring: Easy = 1pt, Medium = 2pts, Hard = 3pts
          </Text>
          <TouchableOpacity style={quizStyles.retryBtn} onPress={handleReset}>
            <Text style={quizStyles.retryText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  if (!q) {
    return (
      <ScrollView contentContainerStyle={{ padding: 16, alignItems: "center", paddingBottom: 100 }}>
        <Text style={{ color: C.text, fontSize: 16 }}>No more questions available!</Text>
        <TouchableOpacity style={quizStyles.retryBtn} onPress={handleReset}>
          <Text style={quizStyles.retryText}>Start Over</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const diffColor = DIFFICULTY_COLORS[q.difficulty];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <View style={quizStyles.progressRow}>
        <Text style={quizStyles.progressText}>Question {answered + 1} of {TOTAL_QUIZ_QUESTIONS}</Text>
        <Text style={quizStyles.scoreText}>Score: {score}</Text>
      </View>
      <View style={quizStyles.progressBar}>
        <View style={[quizStyles.progressFill, { width: `${((answered) / TOTAL_QUIZ_QUESTIONS) * 100}%` }]} />
      </View>

      <View style={quizStyles.diffBadgeRow}>
        <View style={[quizStyles.diffBadge, { backgroundColor: diffColor + "20", borderColor: diffColor }]}>
          <Ionicons name={q.difficulty === "easy" ? "leaf-outline" : q.difficulty === "medium" ? "flash-outline" : "skull-outline"} size={12} color={diffColor} />
          <Text style={[quizStyles.diffBadgeText, { color: diffColor }]}>{DIFFICULTY_LABELS[q.difficulty]}</Text>
        </View>
      </View>

      <View style={quizStyles.scenarioCard}>
        <View style={quizStyles.scenarioBadge}>
          <Ionicons name="bar-chart-outline" size={14} color={C.accent} />
          <Text style={quizStyles.scenarioBadgeText}>NQ Scenario</Text>
        </View>
        <Text style={quizStyles.scenarioText}>{q.scenario}</Text>
      </View>

      {q.options.map((opt, idx) => {
        let bg = C.backgroundSecondary;
        let border = C.cardBorder;
        let textColor = C.text;
        if (selected !== null) {
          if (idx === q.answer) { bg = "rgba(0,200,150,0.12)"; border = C.accent; textColor = C.accent; }
          else if (idx === selected && selected !== q.answer) { bg = "rgba(255,68,68,0.1)"; border = "#FF4444"; textColor = "#FF4444"; }
        }
        return (
          <TouchableOpacity
            key={idx}
            style={[quizStyles.option, { backgroundColor: bg, borderColor: border }]}
            onPress={() => handleSelect(idx)}
            activeOpacity={0.8}
          >
            <View style={[quizStyles.optionLetter, { borderColor: border }]}>
              <Text style={[quizStyles.optionLetterText, { color: textColor }]}>{String.fromCharCode(65 + idx)}</Text>
            </View>
            <Text style={[quizStyles.optionText, { color: textColor }]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}

      {selected !== null && (
        <View style={[quizStyles.feedbackBox, { borderColor: isCorrect ? C.accent : "#FF4444" }]}>
          <Text style={[quizStyles.feedbackTitle, { color: isCorrect ? C.accent : "#FF4444" }]}>
            {isCorrect ? "✓ Correct!" : "✗ Not quite..."}
          </Text>
          <Text style={quizStyles.feedbackText}>{q.explanation}</Text>
          <TouchableOpacity style={[quizStyles.nextBtn, { backgroundColor: isCorrect ? C.accent : "#F59E0B" }]} onPress={handleNext}>
            <Text style={quizStyles.nextBtnText}>{answered + 1 < TOTAL_QUIZ_QUESTIONS ? "Next Question →" : "See Results"}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}


const PLAN_IMAGES: Record<string, number> = {
  "Conservative Entry": require("@/assets/images/chart-conservative-entry.png"),
  "Aggressive Entry (Silver Bullet)": require("@/assets/images/chart-silver-bullet.png"),
  "Exit Criteria": require("@/assets/images/chart-exit-criteria.png"),
};

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const PLAN_ICONS: Record<string, IoniconsName> = {
  "The Tools": "construct-outline",
  "Timeframe Alignment (Matching Big and Small Charts)": "layers-outline",
  "Conservative Entry": "shield-checkmark-outline",
  "Aggressive Entry (Silver Bullet)": "flash-outline",
  "Exit Criteria": "exit-outline",
  "Prop Firm Survival Rules": "warning-outline",
  "Key Takeaways": "bulb-outline",
};

const DEFAULT_PLAN_ICON: IoniconsName = "document-outline";

function PlanView() {
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <Text style={planStyles.heading}>NQ Futures: ICT Trading Plan</Text>
      <Text style={planStyles.subheading}>Your mechanical, top-down trading framework</Text>
      {PLAN_DATA.map((section) => (
        <View key={section.title} style={planStyles.card}>
          <View style={[planStyles.cardHeaderBar, { backgroundColor: section.color + "15" }]}>
            <Ionicons name={PLAN_ICONS[section.title] || DEFAULT_PLAN_ICON} size={16} color={section.color} />
            <Text style={[planStyles.cardTitle, { color: section.color }]}>{section.title}</Text>
          </View>
          {section.items.map((item, idx) => (
            <View key={idx} style={planStyles.itemRow}>
              <View style={[planStyles.itemDot, { backgroundColor: section.color }]} />
              <View style={{ flex: 1 }}>
                <Text style={planStyles.itemLabel}>{item.label}</Text>
                <Text style={planStyles.itemDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
          {PLAN_IMAGES[section.title] && (
            <Image
              source={PLAN_IMAGES[section.title]}
              style={planStyles.chartImage}
              contentFit="cover"
            />
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const TAB_LABELS: Record<Tab, string> = {
  learn: "Learn",
  glossary: "Glossary",
  quiz: "Quiz",
  plan: "Plan",
};

export default function AcademyScreen() {
  const [tab, setTab] = useState<Tab>("learn");
  const [swipeMode, setSwipeMode] = useState(false);
  const { showCelebration, closeCelebration } = useGraduationCheck();
  const { openWithTopic } = useAIAssistant();

  function handleAskMentor(topic: string) {
    setSwipeMode(false);
    openWithTopic(topic);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <GraduationCelebration visible={showCelebration} onClose={closeCelebration} />

      {swipeMode && (
        <SwipeMode
          onExit={() => setSwipeMode(false)}
          onAskMentor={handleAskMentor}
        />
      )}

      <View style={styles.header}>
        <Text style={styles.title}>ICT Academy</Text>
        <View style={styles.tabBar}>
          {(["learn", "glossary", "quiz", "plan"] as Tab[]).map((t) => (
            <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
                {TAB_LABELS[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={{ flex: 1 }}>
        {tab === "learn" && <LearnView onSwipeMode={() => setSwipeMode(true)} onAskMentor={handleAskMentor} />}
        {tab === "glossary" && <GlossaryView />}
        {tab === "quiz" && <QuizView />}
        {tab === "plan" && <PlanView />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 0 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 14 },
  tabBar: { flexDirection: "row", backgroundColor: C.backgroundSecondary, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: "center" },
  tabBtnActive: { backgroundColor: C.accent },
  tabBtnText: { fontSize: 12, fontFamily: "Inter_500Medium", color: C.textSecondary },
  tabBtnTextActive: { color: "#0A0A0F", fontFamily: "Inter_700Bold" },
});

const learnStyles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 12 },
  heading: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 4 },
  subheading: { fontSize: 13, color: C.textSecondary },
  progressCount: { fontSize: 22, fontFamily: "Inter_700Bold", color: C.accent },
  progressLabel: { fontSize: 11, color: C.textSecondary },
  progressBar: { height: 6, backgroundColor: C.cardBorder, borderRadius: 3, marginBottom: 20, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: C.accent, borderRadius: 3 },
  chapterCard: { backgroundColor: C.backgroundSecondary, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 12, overflow: "hidden" },
  chapterHeader: { flexDirection: "row", alignItems: "flex-start", padding: 14, gap: 12 },
  chapterIcon: { fontSize: 24, marginTop: 2 },
  chapterTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  chapterNum: { fontSize: 12, fontFamily: "Inter_700Bold", color: C.textSecondary },
  chapterTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: C.text, marginTop: 2 },
  chapterDesc: { fontSize: 12, color: C.textSecondary, lineHeight: 18, marginTop: 4 },
  chapterProgress: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  lessonContainer: { borderTopWidth: 1, borderTopColor: C.cardBorder },
  lessonRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  lessonNum: { fontSize: 13, color: C.textSecondary, fontFamily: "Inter_500Medium", width: 22 },
  lessonTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: C.text },
  lessonDone: { textDecorationLine: "line-through", color: C.textSecondary },
  lessonContent: { paddingHorizontal: 14, paddingBottom: 16, marginLeft: 44 },
  paragraph: { fontSize: 14, color: C.text, lineHeight: 22, marginBottom: 10, opacity: 0.9 },
  chartLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  chartImage: { width: "100%" as DimensionValue, height: 180, borderRadius: 10 },
  takeawayBox: { borderLeftWidth: 3, borderRadius: 8, padding: 12, marginTop: 12 },
  takeawayLabel: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  takeawayText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.text, lineHeight: 20 },
  markBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12, alignSelf: "flex-start" },
  markBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
  swipeModeBtn: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginBottom: 20 },
  swipeModeBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0A0A0F", flex: 1 },
  swipeModeSubtext: { fontSize: 11, color: "#0A0A0F", opacity: 0.7 },
  aiMentorBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: C.accent + "40", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginTop: 12, alignSelf: "flex-start", backgroundColor: C.accent + "10" },
  aiMentorBtnText: { fontSize: 12, fontFamily: "Inter_500Medium", color: C.accent },
});

const glossStyles = StyleSheet.create({
  heading: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 4 },
  subheading: { fontSize: 13, color: C.textSecondary, marginBottom: 16 },
  card: { backgroundColor: C.backgroundSecondary, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 10, overflow: "hidden" },
  cardHeader: { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  fullName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium", color: C.textSecondary },
  cardBody: { paddingHorizontal: 14, paddingBottom: 14 },
  definition: { fontSize: 14, color: C.text, lineHeight: 22, marginBottom: 12 },
  chartImage: { width: "100%" as DimensionValue, height: 200, borderRadius: 10, marginBottom: 12 },
  tipBox: { borderLeftWidth: 3, paddingLeft: 12, paddingVertical: 4 },
  tipLabel: { fontSize: 11, fontFamily: "Inter_700Bold", marginBottom: 4 },
  tipText: { fontSize: 13, color: C.textSecondary, lineHeight: 20 },
});

const quizStyles = StyleSheet.create({
  progressRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  progressText: { fontSize: 13, color: C.textSecondary },
  scoreText: { fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.accent },
  progressBar: { height: 4, backgroundColor: C.cardBorder, borderRadius: 2, marginBottom: 16, overflow: "hidden" },
  progressFill: { height: 4, backgroundColor: C.accent, borderRadius: 2 },
  diffBadgeRow: { marginBottom: 10 },
  diffBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  diffBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  scenarioCard: { backgroundColor: C.backgroundSecondary, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 14 },
  scenarioBadge: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  scenarioBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold", color: C.accent, textTransform: "uppercase" },
  scenarioText: { fontSize: 15, color: C.text, lineHeight: 24, fontFamily: "Inter_500Medium" },
  option: { borderRadius: 12, borderWidth: 1.5, padding: 14, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 10 },
  optionLetter: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  optionLetterText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  optionText: { flex: 1, fontSize: 14, lineHeight: 20 },
  feedbackBox: { borderRadius: 14, borderWidth: 1.5, padding: 16, marginTop: 8 },
  feedbackTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 8 },
  feedbackText: { fontSize: 13, color: C.text, lineHeight: 21, marginBottom: 16 },
  nextBtn: { borderRadius: 10, padding: 14, alignItems: "center" },
  nextBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
  resultCard: { backgroundColor: C.backgroundSecondary, borderRadius: 20, padding: 30, alignItems: "center" as const, borderWidth: 1, borderColor: C.cardBorder, width: "100%" as DimensionValue, marginTop: 20 },
  resultEmoji: { fontSize: 48, marginBottom: 16 },
  resultScore: { fontSize: 48, fontFamily: "Inter_700Bold", color: C.text },
  resultPct: { fontSize: 22, fontFamily: "Inter_600SemiBold", color: C.accent, marginBottom: 12 },
  resultMsg: { fontSize: 14, color: C.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 24 },
  retryBtn: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 30, paddingVertical: 14 },
  retryText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
});


const planStyles = StyleSheet.create({
  heading: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 4 },
  subheading: { fontSize: 13, color: C.textSecondary, marginBottom: 16 },
  card: { backgroundColor: C.backgroundSecondary, borderRadius: 14, borderWidth: 1, borderColor: C.cardBorder, marginBottom: 12, overflow: "hidden" },
  cardHeaderBar: { flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  cardTitle: { fontSize: 14, fontFamily: "Inter_700Bold" },
  chartImage: { width: "100%" as DimensionValue, height: 180, marginBottom: 4 },
  itemRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  itemDot: { width: 6, height: 6, borderRadius: 3, marginTop: 7 },
  itemLabel: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text, marginBottom: 2 },
  itemDesc: { fontSize: 13, color: C.textSecondary, lineHeight: 20 },
});
