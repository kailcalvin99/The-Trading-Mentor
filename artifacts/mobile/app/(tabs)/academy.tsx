import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  type DimensionValue,
  RefreshControl,
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { fireMobileAITrigger, incrementMobileQuizFail, resetMobileQuizFail } from "@/lib/aiTrigger";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiGet, apiPut } from "@/lib/api";
import GraduationCelebration, { useGraduationCheck } from "@/components/GraduationCelebration";
import { useAIAssistant } from "@/contexts/AIAssistantContext";
import { useAuth } from "@/contexts/AuthContext";
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
} from "@/data/academy-data";
import {
  FairValueGapDiagram,
  OrderBlockDiagram,
  BreakerBlockDiagram,
  SilverBulletDiagram,
  JudasSwingDiagram,
  PremiumDiscountDiagram,
} from "@/components/GlossaryDiagrams";
import { useScrollCollapseProps } from "@/contexts/ScrollDirectionContext";

const C = Colors.dark;

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = 80;

const GLOSSARY_IMAGES: Record<string, number> = {
  FVG: require("@/assets/images/chart-fvg.png"),
  MSS: require("@/assets/images/chart-mss.png"),
  "Liquidity Sweep": require("@/assets/images/chart-liquidity-sweep.png"),
  OTE: require("@/assets/images/chart-ote.png"),
  "Kill Zone": require("@/assets/images/chart-killzone.png"),
};

const GLOSSARY_DIAGRAMS: Record<string, () => React.ReactElement> = {
  fvg: () => <FairValueGapDiagram />,
  "order-block": () => <OrderBlockDiagram />,
  "breaker-block": () => <BreakerBlockDiagram />,
  "silver-bullet": () => <SilverBulletDiagram />,
  "judas-swing": () => <JudasSwingDiagram />,
  "premium-discount": () => <PremiumDiscountDiagram />,
};

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

const PROGRESS_KEY = "ict-academy-progress";
const ACADEMY_UNLOCKED_KEY = "ict-academy-unlocked";
const ACADEMY_PENDING_LESSON_KEY = "ict-academy-pending-lesson";

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

async function syncProgressFromServer(current: Set<string>, onUpdate: (merged: Set<string>) => void): Promise<void> {
  try {
    const data = await apiGet<{ lessonIds: string[] }>("academy/progress");
    const serverIds: string[] = data.lessonIds || [];
    const localIds = Array.from(current);
    const mergedArr = Array.from(new Set([...localIds, ...serverIds]));
    const merged = new Set(mergedArr);
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(mergedArr));
    if (mergedArr.length > serverIds.length) {
      saveProgressToServer(merged);
    }
    onUpdate(merged);
  } catch {}
}


function LearnView({ onAskMentor, pendingLessonId, refreshing, onRefresh }: { onAskMentor: (topic: string) => void; pendingLessonId?: string | null; refreshing?: boolean; onRefresh?: () => void }) {
  const scrollCollapseProps = useScrollCollapseProps();
  const [expandedChapter, setExpandedChapter] = useState<string | null>("ch1");
  const [expandedLesson, setExpandedLesson] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const { appMode, setAppMode } = useAuth();
  const hasAutoPromotedRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(ACADEMY_UNLOCKED_KEY)
      .then((val) => { if (val === "true") hasAutoPromotedRef.current = true; })
      .catch(() => {});
    loadLocalProgress().then((local) => {
      setCompleted(local);
      syncProgressFromServer(local, (merged) => setCompleted(merged));
    });
  }, []);

  useEffect(() => {
    if (!pendingLessonId) return;
    for (const chapter of COURSE_CHAPTERS) {
      for (const lesson of chapter.lessons) {
        if (lesson.id === pendingLessonId) {
          setExpandedChapter(chapter.id);
          setExpandedLesson(lesson.id);
          return;
        }
      }
    }
  }, [pendingLessonId]);

  function toggleComplete(lessonId: string) {
    const allIds = COURSE_CHAPTERS.flatMap((ch) => ch.lessons.map((l) => l.id));
    const wasAllDone = allIds.every((id) => completed.has(id));
    const next = new Set(completed);
    if (next.has(lessonId)) next.delete(lessonId);
    else next.add(lessonId);
    setCompleted(next);
    AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify([...next]));
    saveProgressToServer(next);
    const allDone = allIds.every((id) => next.has(id));
    if (allDone) {
      AsyncStorage.setItem(ACADEMY_UNLOCKED_KEY, "true");
      if (!wasAllDone && !hasAutoPromotedRef.current && appMode === "lite") {
        hasAutoPromotedRef.current = true;
        setAppMode("full");
      }
    }
  }

  const totalLessons = COURSE_CHAPTERS.reduce((sum, ch) => sum + ch.lessons.length, 0);
  const completedCount = COURSE_CHAPTERS.reduce(
    (sum, ch) => sum + ch.lessons.filter((l) => completed.has(l.id)).length,
    0
  );

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
      refreshControl={
        <RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.accent} />
      }
      {...scrollCollapseProps}
    >
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
                    {lesson.chartImage && CHART_IMAGES[lesson.chartImage] && (
                      <Image
                        source={CHART_IMAGES[lesson.chartImage]}
                        style={learnStyles.lessonThumbnail}
                        contentFit="cover"
                      />
                    )}
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

function GlossaryView({ refreshing, onRefresh }: { refreshing?: boolean; onRefresh?: () => void }) {
  const scrollCollapseProps = useScrollCollapseProps();
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.accent} />} {...scrollCollapseProps}>
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
                {!GLOSSARY_IMAGES[item.term] && item.diagram && GLOSSARY_DIAGRAMS[item.diagram] && (
                  <View style={{ marginBottom: 12 }}>
                    {GLOSSARY_DIAGRAMS[item.diagram]()}
                  </View>
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

function QuizView({ refreshing, onRefresh }: { refreshing?: boolean; onRefresh?: () => void }) {
  const scrollCollapseProps = useScrollCollapseProps();
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
      <ScrollView contentContainerStyle={{ padding: 16, alignItems: "center", paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.accent} />} {...scrollCollapseProps}>
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
      <ScrollView contentContainerStyle={{ padding: 16, alignItems: "center", paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.accent} />} {...scrollCollapseProps}>
        <Text style={{ color: C.text, fontSize: 16 }}>No more questions available!</Text>
        <TouchableOpacity style={quizStyles.retryBtn} onPress={handleReset}>
          <Text style={quizStyles.retryText}>Start Over</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  const diffColor = DIFFICULTY_COLORS[q.difficulty];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.accent} />} {...scrollCollapseProps}>
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

function PlanView({ refreshing, onRefresh }: { refreshing?: boolean; onRefresh?: () => void }) {
  const scrollCollapseProps = useScrollCollapseProps();
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={!!refreshing} onRefresh={onRefresh} tintColor={C.accent} />} {...scrollCollapseProps}>
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

interface FlashcardData {
  term: string;
  full: string;
  color: string;
  front: string;
  back: string;
}

const FLASHCARDS: FlashcardData[] = GLOSSARY_DATA.map((item) => ({
  term: item.term,
  full: item.full,
  color: item.color,
  front: item.term,
  back: item.definition,
}));

function FlipCard({
  card,
  index,
  total,
  flipped,
}: {
  card: FlashcardData;
  index: number;
  total: number;
  flipped: boolean;
}) {
  const flipAnim = useRef(new Animated.Value(0)).current;
  const prevFlipped = useRef(flipped);

  useEffect(() => {
    flipAnim.setValue(0);
    prevFlipped.current = false;
  }, [index]);

  useEffect(() => {
    if (prevFlipped.current === flipped) return;
    prevFlipped.current = flipped;
    const toValue = flipped ? 1 : 0;
    Animated.spring(flipAnim, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 10,
    }).start();
  }, [flipped]);

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const backRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.49, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  return (
    <View style={flashStyles.cardWrapper}>
      <Animated.View
        style={[
          flashStyles.card,
          { borderColor: card.color + "44", opacity: frontOpacity, transform: [{ rotateY: frontRotate }], zIndex: flipped ? 0 : 1 },
        ]}
      >
        <View style={[flashStyles.cardTopRow, { backgroundColor: card.color + "15" }]}>
          <View style={[flashStyles.termBadge, { backgroundColor: card.color + "25" }]}>
            <Text style={[flashStyles.termBadgeText, { color: card.color }]}>{card.term}</Text>
          </View>
          <Text style={flashStyles.cardCounter}>{index + 1} / {total}</Text>
        </View>
        <View style={flashStyles.frontContent}>
          <Text style={[flashStyles.termText, { color: card.color }]}>{card.term}</Text>
          <Text style={flashStyles.fullText}>{card.full}</Text>
          <View style={flashStyles.tapHint}>
            <Ionicons name="sync-outline" size={14} color={C.textSecondary} />
            <Text style={flashStyles.tapHintText}>Tap to reveal definition</Text>
          </View>
        </View>
      </Animated.View>

      <Animated.View
        style={[
          flashStyles.card,
          flashStyles.cardBack,
          { borderColor: card.color + "44", opacity: backOpacity, transform: [{ rotateY: backRotate }], zIndex: flipped ? 1 : 0 },
        ]}
      >
        <View style={[flashStyles.cardTopRow, { backgroundColor: card.color + "15" }]}>
          <View style={[flashStyles.termBadge, { backgroundColor: card.color + "25" }]}>
            <Text style={[flashStyles.termBadgeText, { color: card.color }]}>{card.term}</Text>
          </View>
          <Text style={flashStyles.cardCounter}>{index + 1} / {total}</Text>
        </View>
        <View style={flashStyles.backContent}>
          <Text style={flashStyles.defLabel}>Definition</Text>
          <Text style={flashStyles.defText}>{card.back}</Text>
        </View>
      </Animated.View>
    </View>
  );
}

function FlashcardsView() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [knownCount, setKnownCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [done, setDone] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handleSwipeRef = useRef<(result: "known" | "review") => void>(() => {});

  const handleSwipe = useCallback((result: "known" | "review") => {
    const direction = result === "known" ? SCREEN_WIDTH * 1.2 : -SCREEN_WIDTH * 1.2;
    Animated.parallel([
      Animated.timing(translateX, { toValue: direction, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      if (!isMounted.current) return;
      if (result === "known") setKnownCount((c) => c + 1);
      else setReviewCount((c) => c + 1);
      setFlipped(false);
      setCurrentIndex((prev) => {
        const nextIndex = prev + 1;
        if (nextIndex >= FLASHCARDS.length) {
          setDone(true);
          return prev;
        }
        translateX.setValue(0);
        opacity.setValue(1);
        return nextIndex;
      });
    });
  }, [translateX, opacity]);

  handleSwipeRef.current = handleSwipe;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 8,
      onPanResponderMove: (_, gs) => {
        translateX.setValue(gs.dx);
      },
      onPanResponderRelease: (_, gs) => {
        const isTap = Math.abs(gs.dx) < 8 && Math.abs(gs.dy) < 8;
        if (gs.dx > SWIPE_THRESHOLD) {
          handleSwipeRef.current("known");
        } else if (gs.dx < -SWIPE_THRESHOLD) {
          handleSwipeRef.current("review");
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          if (isTap) {
            setFlipped((f) => !f);
          }
        }
      },
    })
  ).current;

  function handleReset() {
    setCurrentIndex(0);
    setFlipped(false);
    setKnownCount(0);
    setReviewCount(0);
    setDone(false);
    translateX.setValue(0);
    opacity.setValue(1);
  }

  const card = FLASHCARDS[currentIndex];
  const progress = (currentIndex + 1) / FLASHCARDS.length;

  const rotate = translateX.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ["-8deg", "0deg", "8deg"],
    extrapolate: "clamp",
  });

  const swipeLeftOpacity = translateX.interpolate({
    inputRange: [-80, 0],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const swipeRightOpacity = translateX.interpolate({
    inputRange: [0, 80],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  if (done) {
    return (
      <View style={flashStyles.doneContainer}>
        <Text style={flashStyles.doneEmoji}>🎓</Text>
        <Text style={flashStyles.doneTitle}>Session Complete!</Text>
        <Text style={flashStyles.doneSub}>You've gone through all {FLASHCARDS.length} ICT flashcards</Text>

        <View style={flashStyles.statsRow}>
          <View style={[flashStyles.statBox, { borderColor: "#00C89644", backgroundColor: "#00C89615" }]}>
            <Ionicons name="checkmark-circle" size={24} color="#00C896" />
            <Text style={[flashStyles.statNum, { color: "#00C896" }]}>{knownCount}</Text>
            <Text style={flashStyles.statLabel}>Got It</Text>
          </View>
          <View style={[flashStyles.statBox, { borderColor: "#F59E0B44", backgroundColor: "#F59E0B15" }]}>
            <Ionicons name="refresh-circle" size={24} color="#F59E0B" />
            <Text style={[flashStyles.statNum, { color: "#F59E0B" }]}>{reviewCount}</Text>
            <Text style={flashStyles.statLabel}>Review</Text>
          </View>
        </View>

        <TouchableOpacity style={flashStyles.resetBtn} onPress={handleReset}>
          <Ionicons name="refresh-outline" size={16} color="#0A0A0F" />
          <Text style={flashStyles.resetBtnText}>Study Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={flashStyles.progressBarContainer}>
        <View style={[flashStyles.progressBarFill, { width: `${progress * 100}%` as DimensionValue }]} />
      </View>

      <View style={flashStyles.statsBar}>
        <View style={flashStyles.statsBarItem}>
          <Ionicons name="checkmark-circle" size={14} color="#00C896" />
          <Text style={[flashStyles.statsBarText, { color: "#00C896" }]}>{knownCount}</Text>
        </View>
        <Text style={flashStyles.statsBarLabel}>{currentIndex + 1} of {FLASHCARDS.length}</Text>
        <View style={flashStyles.statsBarItem}>
          <Ionicons name="refresh-circle" size={14} color="#F59E0B" />
          <Text style={[flashStyles.statsBarText, { color: "#F59E0B" }]}>{reviewCount}</Text>
        </View>
      </View>

      <View style={flashStyles.swipeLabels}>
        <Animated.View style={[flashStyles.swipeLabelLeft, { opacity: swipeLeftOpacity }]}>
          <Ionicons name="refresh-circle" size={18} color="#F59E0B" />
          <Text style={[flashStyles.swipeLabelText, { color: "#F59E0B" }]}>Review</Text>
        </Animated.View>
        <Animated.View style={[flashStyles.swipeLabelRight, { opacity: swipeRightOpacity }]}>
          <Text style={[flashStyles.swipeLabelText, { color: "#00C896" }]}>Got It</Text>
          <Ionicons name="checkmark-circle" size={18} color="#00C896" />
        </Animated.View>
      </View>

      <Animated.View
        style={[flashStyles.swipeContainer, { opacity, transform: [{ translateX }, { rotate }] }]}
        {...panResponder.panHandlers}
      >
        {card && (
          <FlipCard key={currentIndex} card={card} index={currentIndex} total={FLASHCARDS.length} flipped={flipped} />
        )}
      </Animated.View>

      <View style={flashStyles.actionRow}>
        <TouchableOpacity
          style={[flashStyles.actionBtn, flashStyles.actionBtnReview]}
          onPress={() => handleSwipe("review")}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-circle-outline" size={20} color="#F59E0B" />
          <Text style={[flashStyles.actionBtnText, { color: "#F59E0B" }]}>Review</Text>
        </TouchableOpacity>

        <View style={flashStyles.actionCenter}>
          <Ionicons name="swap-horizontal-outline" size={16} color={C.textSecondary} />
          <Text style={flashStyles.actionCenterText}>swipe or tap buttons</Text>
        </View>

        <TouchableOpacity
          style={[flashStyles.actionBtn, flashStyles.actionBtnKnown]}
          onPress={() => handleSwipe("known")}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#00C896" />
          <Text style={[flashStyles.actionBtnText, { color: "#00C896" }]}>Got It</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

type Tab = "learn" | "glossary" | "quiz" | "plan" | "flashcards";

const TAB_LABELS: Record<Tab, string> = {
  learn: "Learn",
  glossary: "Glossary",
  quiz: "Quiz",
  plan: "Plan",
  flashcards: "Flashcards",
};

export default function AcademyScreen() {
  const [tab, setTab] = useState<Tab>("learn");
  const [pendingLessonId, setPendingLessonId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const { showCelebration, closeCelebration } = useGraduationCheck();
  const { openWithTopic } = useAIAssistant();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const local = await loadLocalProgress();
      await new Promise<void>((resolve) => {
        syncProgressFromServer(local, () => resolve());
      });
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(ACADEMY_PENDING_LESSON_KEY).then((raw) => {
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw) as { lessonId: string };
          setPendingLessonId(parsed.lessonId);
          setTab("learn");
        } catch {}
        AsyncStorage.removeItem(ACADEMY_PENDING_LESSON_KEY);
      });
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <GraduationCelebration visible={showCelebration} onClose={closeCelebration} />

      <View style={styles.header}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll} contentContainerStyle={styles.tabScrollContent}>
          {(["learn", "glossary", "quiz", "plan", "flashcards"] as Tab[]).map((t) => (
            <TouchableOpacity key={t} style={[styles.tabBtn, tab === t && styles.tabBtnActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabBtnText, tab === t && styles.tabBtnTextActive]}>
                {TAB_LABELS[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      <View style={{ flex: 1 }}>
        {tab === "learn" && <LearnView onAskMentor={openWithTopic} pendingLessonId={pendingLessonId} refreshing={refreshing} onRefresh={handleRefresh} />}
        {tab === "glossary" && <GlossaryView refreshing={refreshing} onRefresh={handleRefresh} />}
        {tab === "quiz" && <QuizView refreshing={refreshing} onRefresh={handleRefresh} />}
        {tab === "plan" && <PlanView refreshing={refreshing} onRefresh={handleRefresh} />}
        {tab === "flashcards" && <FlashcardsView />}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: { paddingHorizontal: 12, paddingBottom: 0 },
  tabScroll: { marginBottom: 4 },
  tabScrollContent: { flexDirection: "row", backgroundColor: C.backgroundSecondary, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: C.cardBorder, gap: 2 },
  tabBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 9, alignItems: "center" },
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
  lessonThumbnail: { width: 40, height: 28, borderRadius: 6, backgroundColor: C.backgroundSecondary },
  lessonTitle: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium", color: C.text },
  lessonDone: { color: "#666666" },
  lessonContent: { paddingHorizontal: 14, paddingBottom: 16, marginLeft: 44 },
  paragraph: { fontSize: 14, color: C.text, lineHeight: 22, marginBottom: 10, opacity: 0.9 },
  chartLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  chartImage: { width: "100%" as DimensionValue, height: 180, borderRadius: 10 },
  takeawayBox: { borderLeftWidth: 3, borderRadius: 8, padding: 12, marginTop: 12 },
  takeawayLabel: { fontSize: 10, fontFamily: "Inter_700Bold", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  takeawayText: { fontSize: 13, fontFamily: "Inter_500Medium", color: C.text, lineHeight: 20 },
  markBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginTop: 12, alignSelf: "flex-start" },
  markBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
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

const flashStyles = StyleSheet.create({
  progressBarContainer: {
    height: 3,
    backgroundColor: C.cardBorder,
    marginHorizontal: 20,
    marginTop: 8,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: { height: 3, backgroundColor: C.accent, borderRadius: 2 },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  statsBarItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statsBarText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  statsBarLabel: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_500Medium" },
  swipeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 4,
    height: 24,
  },
  swipeLabelLeft: { flexDirection: "row", alignItems: "center", gap: 4 },
  swipeLabelRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  swipeLabelText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  swipeContainer: { flex: 1, paddingHorizontal: 20, paddingBottom: 8 },
  cardTouchable: { flex: 1 },
  cardWrapper: { flex: 1, position: "relative" },
  card: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1.5,
    overflow: "hidden",
    backfaceVisibility: "hidden",
  },
  cardBack: { backfaceVisibility: "hidden" },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  termBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  termBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  cardCounter: { fontSize: 11, color: C.textSecondary, fontFamily: "Inter_500Medium" },
  frontContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 10,
  },
  termText: { fontSize: 36, fontFamily: "Inter_700Bold", textAlign: "center" },
  fullText: { fontSize: 14, color: C.textSecondary, textAlign: "center", fontFamily: "Inter_500Medium" },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  tapHintText: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_500Medium" },
  backContent: { flex: 1, paddingHorizontal: 20, paddingVertical: 16 },
  defLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  defText: { fontSize: 14, color: C.text, lineHeight: 22, fontFamily: "Inter_400Regular" },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  actionBtnReview: { borderColor: "#F59E0B44", backgroundColor: "#F59E0B15" },
  actionBtnKnown: { borderColor: "#00C89644", backgroundColor: "#00C89615" },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  actionCenter: { alignItems: "center", gap: 3 },
  actionCenterText: { fontSize: 10, color: C.textSecondary, fontFamily: "Inter_400Regular" },
  doneContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 14,
  },
  doneEmoji: { fontSize: 56 },
  doneTitle: { fontSize: 24, fontFamily: "Inter_700Bold", color: C.text },
  doneSub: { fontSize: 13, color: C.textSecondary, textAlign: "center", lineHeight: 20 },
  statsRow: { flexDirection: "row", gap: 16, marginTop: 8 },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  statNum: { fontSize: 28, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_500Medium" },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 12,
    marginTop: 8,
  },
  resetBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
});
