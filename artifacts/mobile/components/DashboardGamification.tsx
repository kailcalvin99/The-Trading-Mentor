import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  type DimensionValue,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";

const C = Colors.dark;

const DAILY_TIPS = [
  "Always wait for the liquidity sweep before entering!",
  "The best setups happen at session opens — be ready!",
  "Never risk more than 1% on a single trade.",
  "FVGs are your best friend — learn to spot them!",
  "Patience is the most profitable trading skill.",
  "Check the daily bias BEFORE looking at charts.",
  "Silver Bullet window (10-11 AM) has the highest probability.",
  "If you missed the move, DON'T chase it!",
  "Your journal is your most powerful trading tool.",
  "3 green days in a row? Time for a rest day.",
  "The market rewards discipline, not aggression.",
  "Always trade with the trend — the trend is your friend.",
];

const SLOT_SESSIONS = ["Silver Bullet 🎯", "NY Open 📈", "London 🌍", "Asian 🌏"];
const SLOT_ACTIONS = ["FVG Entry", "OB Retest", "Liquidity Grab", "Market Structure"];
const SLOT_GOALS = ["1 trade max", "Watch only", "Log in journal", "50-pt target"];

const RANKS = ["Apprentice", "Student", "Trader", "Pro", "Master", "ICT Legend"];

const SPIN_DATE_KEY = "mobile-last-spin-date";
const SPIN_RESULT_KEY = "mobile-spin-result";
const XP_KEY = "mobile-total-xp";
const STREAK_KEY = "mobile-login-streak";
const LAST_LOGIN_KEY = "mobile-last-login-date";

function dateSeed(): number {
  const d = new Date().toDateString();
  let hash = 0;
  for (let i = 0; i < d.length; i++) {
    hash = (hash << 5) - hash + d.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function useDailyGamification() {
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [xpGained, setXpGained] = useState(0);

  useEffect(() => {
    (async () => {
      const savedXp = parseInt((await AsyncStorage.getItem(XP_KEY)) || "0");
      const savedStreak = parseInt((await AsyncStorage.getItem(STREAK_KEY)) || "0");
      const lastLogin = await AsyncStorage.getItem(LAST_LOGIN_KEY);
      const today = new Date().toDateString();

      if (lastLogin !== today) {
        const yesterday = new Date(Date.now() - 86400000).toDateString();
        const newStreak = lastLogin === yesterday ? savedStreak + 1 : 1;
        const gain = Math.min(newStreak * 10, 100);
        setStreak(newStreak);
        setXp(savedXp + gain);
        setXpGained(gain);
        await AsyncStorage.setItem(LAST_LOGIN_KEY, today);
        await AsyncStorage.setItem(STREAK_KEY, String(newStreak));
        await AsyncStorage.setItem(XP_KEY, String(savedXp + gain));
      } else {
        setStreak(savedStreak);
        setXp(savedXp);
      }
    })();
  }, []);

  return { xp, streak, xpGained };
}

export function XPLevelCard() {
  const { xp, streak } = useDailyGamification();
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;
  const rankIdx = Math.min(Math.floor((level - 1) / 2), RANKS.length - 1);
  const rank = RANKS[rankIdx];

  return (
    <View style={styles.card}>
      <View style={styles.xpRow}>
        <View style={styles.xpItem}>
          <View style={styles.xpHeader}>
            <Ionicons name="star" size={16} color={C.accent} />
            <Text style={styles.xpLabel}>Level {level}</Text>
          </View>
          <Text style={styles.xpValue}>{rank}</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${xpInLevel}%` as DimensionValue }]} />
          </View>
          <Text style={styles.xpSub}>{xpInLevel}/100 XP</Text>
        </View>

        <View style={styles.xpDivider} />

        <View style={styles.xpItem}>
          <View style={styles.xpHeader}>
            <Ionicons name="flame" size={16} color={streak >= 7 ? "#EF4444" : "#F59E0B"} />
            <Text style={styles.xpLabel}>Streak</Text>
          </View>
          <Text style={styles.xpValue}>{streak} day{streak !== 1 ? "s" : ""}</Text>
          <View style={styles.streakDots}>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <View
                key={d}
                style={[styles.streakDot, { backgroundColor: d <= streak ? "#F59E0B" : C.cardBorder }]}
              />
            ))}
          </View>
          <Text style={styles.xpSub}>{xp} total XP</Text>
        </View>
      </View>
    </View>
  );
}

export function SpinWheelCard() {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [canSpin, setCanSpin] = useState(true);
  const spinAnim = useRef(new Animated.Value(0)).current;
  const rotationRef = useRef(0);

  useEffect(() => {
    (async () => {
      const lastSpin = await AsyncStorage.getItem(SPIN_DATE_KEY);
      const today = new Date().toDateString();
      if (lastSpin === today) {
        setCanSpin(false);
        setResult(await AsyncStorage.getItem(SPIN_RESULT_KEY));
      }
    })();
  }, []);

  function spin() {
    if (!canSpin || spinning) return;
    setSpinning(true);
    setResult(null);

    const randomIdx = Math.floor(Math.random() * DAILY_TIPS.length);
    const targetRotation = rotationRef.current + 720 + (randomIdx * (360 / DAILY_TIPS.length));

    Animated.timing(spinAnim, {
      toValue: targetRotation,
      duration: 2800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(async () => {
      rotationRef.current = targetRotation;
      const tip = DAILY_TIPS[randomIdx];
      setResult(tip);
      setSpinning(false);
      setCanSpin(false);
      await AsyncStorage.setItem(SPIN_DATE_KEY, new Date().toDateString());
      await AsyncStorage.setItem(SPIN_RESULT_KEY, tip);
    });
  }

  const rotate = spinAnim.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Ionicons name="gift-outline" size={16} color={C.accent} />
        <Text style={styles.cardTitle}>Daily Trading Tip</Text>
      </View>

      <View style={styles.wheelContainer}>
        <Animated.View style={[styles.wheel, { transform: [{ rotate }] }]}>
          <View style={styles.wheelInner}>
            <Ionicons name="star" size={32} color={C.accent} />
          </View>
        </Animated.View>
        <View style={styles.wheelPointer} />
      </View>

      {result ? (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>{result}</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.spinBtn, (!canSpin || spinning) && styles.spinBtnDisabled]}
          onPress={spin}
          disabled={!canSpin || spinning}
          activeOpacity={0.8}
        >
          <Text style={styles.spinBtnText}>
            {spinning ? "Spinning..." : canSpin ? "SPIN NOW!" : "Come back tomorrow!"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export function SlotMachineCard() {
  const [reelsStopped, setReelsStopped] = useState([false, false, false]);
  const [results, setResults] = useState(["", "", ""]);
  const [reelValues, setReelValues] = useState(["", "", ""]);
  const spinAnims = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  const seed = dateSeed();

  useEffect(() => {
    const r1 = SLOT_SESSIONS[seed % SLOT_SESSIONS.length];
    const r2 = SLOT_ACTIONS[Math.floor(seed / 7) % SLOT_ACTIONS.length];
    const r3 = SLOT_GOALS[Math.floor(seed / 13) % SLOT_GOALS.length];
    const finalResults = [r1, r2, r3];

    const intervals: ReturnType<typeof setInterval>[] = [];
    const stops: ReturnType<typeof setTimeout>[] = [];

    intervals.forEach((_, i) => clearInterval(intervals[i]));

    const opts = [SLOT_SESSIONS, SLOT_ACTIONS, SLOT_GOALS];

    opts.forEach((options, i) => {
      let counter = 0;
      const iv = setInterval(() => {
        counter++;
        setReelValues((prev) => {
          const next = [...prev];
          next[i] = options[counter % options.length];
          return next;
        });
      }, 100);
      intervals.push(iv);

      const delay = 1200 + i * 600;
      const timeout = setTimeout(() => {
        clearInterval(intervals[i]);
        setResults((prev) => {
          const next = [...prev];
          next[i] = finalResults[i];
          return next;
        });
        setReelValues((prev) => {
          const next = [...prev];
          next[i] = finalResults[i];
          return next;
        });
        setReelsStopped((prev) => {
          const next = [...prev];
          next[i] = true;
          return next;
        });
      }, delay);
      stops.push(timeout);
    });

    return () => {
      intervals.forEach((iv) => clearInterval(iv));
      stops.forEach((t) => clearTimeout(t));
    };
  }, []);

  const allDone = reelsStopped.every(Boolean);

  return (
    <View style={styles.slotCard}>
      <View style={styles.cardHeader}>
        <Ionicons name="trophy-outline" size={16} color="#F59E0B" />
        <Text style={[styles.cardTitle, { color: "#F59E0B" }]}>Today's Mission</Text>
        <View style={styles.dailyBadge}>
          <Text style={styles.dailyBadgeText}>DAILY</Text>
        </View>
      </View>

      <View style={styles.reelsRow}>
        {["Session", "Action", "Goal"].map((label, i) => (
          <View key={label} style={styles.reelContainer}>
            <Text style={styles.reelLabel}>{label}</Text>
            <View style={[styles.reel, reelsStopped[i] && styles.reelStopped]}>
              <Text
                style={[styles.reelText, !reelsStopped[i] && styles.reelTextBlurred]}
                numberOfLines={2}
              >
                {reelValues[i] || "..."}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {allDone && (
        <View style={styles.missionBox}>
          <Text style={styles.missionText}>
            <Text style={styles.missionLabel}>Mission: </Text>
            {results[0]} → {results[1]} → {results[2]}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: C.text,
    flex: 1,
  },
  xpRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  xpItem: {
    flex: 1,
  },
  xpDivider: {
    width: 1,
    backgroundColor: C.cardBorder,
    marginHorizontal: 14,
  },
  xpHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  xpLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  xpValue: {
    fontSize: 17,
    fontWeight: "700",
    color: C.text,
    marginBottom: 6,
  },
  xpSub: {
    fontSize: 11,
    color: C.textTertiary,
    marginTop: 4,
  },
  progressBar: {
    height: 4,
    backgroundColor: C.cardBorder,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: C.accent,
    borderRadius: 2,
  },
  streakDots: {
    flexDirection: "row",
    gap: 3,
    marginTop: 6,
  },
  streakDot: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  wheelContainer: {
    alignItems: "center",
    marginBottom: 14,
    position: "relative",
  },
  wheel: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: C.accent + "60",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.accent + "10",
  },
  wheelInner: {
    alignItems: "center",
    justifyContent: "center",
  },
  wheelPointer: {
    position: "absolute",
    top: -4,
    width: 10,
    height: 10,
    backgroundColor: C.accent,
    transform: [{ rotate: "45deg" }],
  },
  resultBox: {
    backgroundColor: C.accent + "15",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: C.accent + "30",
  },
  resultText: {
    fontSize: 13,
    color: C.text,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
  },
  spinBtn: {
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  spinBtnDisabled: {
    backgroundColor: C.cardBorder,
  },
  spinBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0A0A0F",
  },
  slotCard: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F59E0B30",
    padding: 16,
    marginBottom: 14,
  },
  dailyBadge: {
    backgroundColor: "#F59E0B20",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dailyBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#F59E0B",
  },
  reelsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  reelContainer: {
    flex: 1,
    alignItems: "center",
  },
  reelLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  reel: {
    width: "100%",
    height: 64,
    backgroundColor: C.cardBorder + "80",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    padding: 6,
  },
  reelStopped: {
    borderColor: "#F59E0B40",
    backgroundColor: "#F59E0B08",
  },
  reelText: {
    fontSize: 12,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
  },
  reelTextBlurred: {
    opacity: 0.4,
  },
  missionBox: {
    backgroundColor: "#F59E0B10",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#F59E0B30",
  },
  missionText: {
    fontSize: 13,
    color: C.text,
    textAlign: "center",
    lineHeight: 20,
  },
  missionLabel: {
    color: "#F59E0B",
    fontWeight: "700",
  },
});
