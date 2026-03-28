import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  type DimensionValue,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { GLOSSARY } from "@/data/academy-data";

const C = Colors.dark;
const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = 80;

interface Flashcard {
  term: string;
  full: string;
  color: string;
  front: string;
  back: string;
}

const CARDS: Flashcard[] = GLOSSARY.map((item) => ({
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
}: {
  card: Flashcard;
  index: number;
  total: number;
}) {
  const [flipped, setFlipped] = useState(false);
  const flipAnim = useRef(new Animated.Value(0)).current;

  function handleFlip() {
    const toValue = flipped ? 0 : 1;
    Animated.spring(flipAnim, {
      toValue,
      useNativeDriver: true,
      friction: 8,
      tension: 10,
    }).start();
    setFlipped(!flipped);
  }

  const frontRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  const backRotate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [1, 1, 0, 0],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 0.5, 1],
    outputRange: [0, 0, 1, 1],
  });

  return (
    <TouchableOpacity
      activeOpacity={0.97}
      onPress={handleFlip}
      style={styles.cardTouchable}
    >
      <View style={styles.cardWrapper}>
        <Animated.View
          style={[
            styles.card,
            { borderColor: card.color + "44", opacity: frontOpacity, transform: [{ rotateY: frontRotate }] },
          ]}
        >
          <View style={[styles.cardTopRow, { backgroundColor: card.color + "15" }]}>
            <View style={[styles.termBadge, { backgroundColor: card.color + "25" }]}>
              <Text style={[styles.termBadgeText, { color: card.color }]}>{card.term}</Text>
            </View>
            <Text style={styles.cardCounter}>{index + 1} / {total}</Text>
          </View>
          <View style={styles.frontContent}>
            <Text style={[styles.termText, { color: card.color }]}>{card.term}</Text>
            <Text style={styles.fullText}>{card.full}</Text>
            <View style={styles.tapHint}>
              <Ionicons name="sync-outline" size={14} color={C.textSecondary} />
              <Text style={styles.tapHintText}>Tap to reveal definition</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.card,
            styles.cardBack,
            { borderColor: card.color + "44", opacity: backOpacity, transform: [{ rotateY: backRotate }] },
          ]}
        >
          <View style={[styles.cardTopRow, { backgroundColor: card.color + "15" }]}>
            <View style={[styles.termBadge, { backgroundColor: card.color + "25" }]}>
              <Text style={[styles.termBadgeText, { color: card.color }]}>{card.term}</Text>
            </View>
            <Text style={styles.cardCounter}>{index + 1} / {total}</Text>
          </View>
          <View style={styles.backContent}>
            <Text style={styles.defLabel}>Definition</Text>
            <Text style={styles.defText}>{card.back}</Text>
          </View>
        </Animated.View>
      </View>
    </TouchableOpacity>
  );
}

export default function FlashcardsScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [knownCount, setKnownCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [done, setDone] = useState(false);

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10,
      onPanResponderMove: (_, gs) => {
        translateX.setValue(gs.dx);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > SWIPE_THRESHOLD) {
          handleSwipe("known");
        } else if (gs.dx < -SWIPE_THRESHOLD) {
          handleSwipe("review");
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  function handleSwipe(result: "known" | "review") {
    const direction = result === "known" ? SCREEN_WIDTH * 1.2 : -SCREEN_WIDTH * 1.2;

    Animated.parallel([
      Animated.timing(translateX, { toValue: direction, duration: 250, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      if (result === "known") setKnownCount((c) => c + 1);
      else setReviewCount((c) => c + 1);

      const nextIndex = currentIndex + 1;
      if (nextIndex >= CARDS.length) {
        setDone(true);
      } else {
        translateX.setValue(0);
        opacity.setValue(1);
        setCurrentIndex(nextIndex);
      }
    });
  }

  function handleReset() {
    setCurrentIndex(0);
    setKnownCount(0);
    setReviewCount(0);
    setDone(false);
    translateX.setValue(0);
    opacity.setValue(1);
  }

  const card = CARDS[currentIndex];
  const progress = currentIndex / CARDS.length;

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
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Flashcards</Text>
        </View>
        <View style={styles.doneContainer}>
          <Text style={styles.doneEmoji}>🎓</Text>
          <Text style={styles.doneTitle}>Session Complete!</Text>
          <Text style={styles.doneSub}>You've gone through all {CARDS.length} ICT flashcards</Text>

          <View style={styles.statsRow}>
            <View style={[styles.statBox, { borderColor: "#00C89644", backgroundColor: "#00C89615" }]}>
              <Ionicons name="checkmark-circle" size={24} color="#00C896" />
              <Text style={[styles.statNum, { color: "#00C896" }]}>{knownCount}</Text>
              <Text style={styles.statLabel}>Got It</Text>
            </View>
            <View style={[styles.statBox, { borderColor: "#F59E0B44", backgroundColor: "#F59E0B15" }]}>
              <Ionicons name="refresh-circle" size={24} color="#F59E0B" />
              <Text style={[styles.statNum, { color: "#F59E0B" }]}>{reviewCount}</Text>
              <Text style={styles.statLabel}>Review</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
            <Ionicons name="refresh-outline" size={16} color="#0A0A0F" />
            <Text style={styles.resetBtnText}>Study Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Flashcards</Text>
        <Text style={styles.headerSub}>{currentIndex + 1} of {CARDS.length}</Text>
      </View>

      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%` as DimensionValue }]} />
      </View>

      <View style={styles.statsBar}>
        <View style={styles.statsBarItem}>
          <Ionicons name="checkmark-circle" size={14} color="#00C896" />
          <Text style={[styles.statsBarText, { color: "#00C896" }]}>{knownCount}</Text>
        </View>
        <Text style={styles.statsBarLabel}>ICT Concepts</Text>
        <View style={styles.statsBarItem}>
          <Ionicons name="refresh-circle" size={14} color="#F59E0B" />
          <Text style={[styles.statsBarText, { color: "#F59E0B" }]}>{reviewCount}</Text>
        </View>
      </View>

      <View style={styles.swipeLabels}>
        <Animated.View style={[styles.swipeLabelLeft, { opacity: swipeLeftOpacity }]}>
          <Ionicons name="refresh-circle" size={18} color="#F59E0B" />
          <Text style={[styles.swipeLabelText, { color: "#F59E0B" }]}>Review</Text>
        </Animated.View>
        <Animated.View style={[styles.swipeLabelRight, { opacity: swipeRightOpacity }]}>
          <Text style={[styles.swipeLabelText, { color: "#00C896" }]}>Got It</Text>
          <Ionicons name="checkmark-circle" size={18} color="#00C896" />
        </Animated.View>
      </View>

      <Animated.View
        style={[styles.swipeContainer, { opacity, transform: [{ translateX }, { rotate }] }]}
        {...panResponder.panHandlers}
      >
        {card && (
          <FlipCard card={card} index={currentIndex} total={CARDS.length} />
        )}
      </Animated.View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnReview]}
          onPress={() => handleSwipe("review")}
          activeOpacity={0.8}
        >
          <Ionicons name="refresh-circle-outline" size={20} color="#F59E0B" />
          <Text style={[styles.actionBtnText, { color: "#F59E0B" }]}>Review</Text>
        </TouchableOpacity>

        <View style={styles.actionCenter}>
          <Ionicons name="swap-horizontal-outline" size={16} color={C.textSecondary} />
          <Text style={styles.actionCenterText}>swipe or tap buttons</Text>
        </View>

        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnKnown]}
          onPress={() => handleSwipe("known")}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color="#00C896" />
          <Text style={[styles.actionBtnText, { color: "#00C896" }]}>Got It</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: C.text },
  headerSub: { fontSize: 13, color: C.textSecondary },
  progressBarContainer: {
    height: 3,
    backgroundColor: C.cardBorder,
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 3,
    backgroundColor: C.accent,
    borderRadius: 2,
  },
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  statsBarItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statsBarText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  statsBarLabel: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_500Medium" },
  swipeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 4,
    height: 26,
  },
  swipeLabelLeft: { flexDirection: "row", alignItems: "center", gap: 4 },
  swipeLabelRight: { flexDirection: "row", alignItems: "center", gap: 4 },
  swipeLabelText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  swipeContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
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
  termText: { fontSize: 40, fontFamily: "Inter_700Bold", textAlign: "center" },
  fullText: { fontSize: 15, color: C.textSecondary, textAlign: "center", fontFamily: "Inter_500Medium" },
  tapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  tapHintText: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_500Medium" },
  backContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  defLabel: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  defText: {
    fontSize: 15,
    color: C.text,
    lineHeight: 24,
    fontFamily: "Inter_400Regular",
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  actionBtnReview: {
    borderColor: "#F59E0B44",
    backgroundColor: "#F59E0B15",
  },
  actionBtnKnown: {
    borderColor: "#00C89644",
    backgroundColor: "#00C89615",
  },
  actionBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  actionCenter: { alignItems: "center", gap: 3 },
  actionCenterText: { fontSize: 10, color: C.textSecondary, fontFamily: "Inter_400Regular" },
  doneContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  doneEmoji: { fontSize: 64 },
  doneTitle: { fontSize: 26, fontFamily: "Inter_700Bold", color: C.text },
  doneSub: { fontSize: 14, color: C.textSecondary, textAlign: "center", lineHeight: 20 },
  statsRow: { flexDirection: "row", gap: 16, marginTop: 8 },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  statNum: { fontSize: 32, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 12, color: C.textSecondary, fontFamily: "Inter_500Medium" },
  resetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingHorizontal: 28,
    paddingVertical: 14,
    marginTop: 8,
  },
  resetBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
});
