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
      let savedXp = parseInt((await AsyncStorage.getItem(XP_KEY)) || "0");
      let savedStreak = parseInt((await AsyncStorage.getItem(STREAK_KEY)) || "0");
      let lastLogin = await AsyncStorage.getItem(LAST_LOGIN_KEY);

      try {
        const { apiGet } = await import("@/lib/api");
        const res = await apiGet<{ gamification?: { totalXp: number; loginStreak: number; lastLoginDate: string | null } }>("user-settings");
        if (res.gamification) {
          const g = res.gamification;
          if (g.totalXp > savedXp) savedXp = g.totalXp;
          if (g.loginStreak > savedStreak) savedStreak = g.loginStreak;
          if (g.lastLoginDate) lastLogin = g.lastLoginDate;
        }
      } catch {}

      const today = new Date().toISOString().split("T")[0];

      if (lastLogin !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
        const newStreak = lastLogin === yesterday ? savedStreak + 1 : 1;
        const gain = Math.min(newStreak * 10, 100);
        const newXp = savedXp + gain;
        setStreak(newStreak);
        setXp(newXp);
        setXpGained(gain);
        await AsyncStorage.setItem(LAST_LOGIN_KEY, today);
        await AsyncStorage.setItem(STREAK_KEY, String(newStreak));
        await AsyncStorage.setItem(XP_KEY, String(newXp));

        try {
          const { apiPatch } = await import("@/lib/api");
          apiPatch("user-settings", { section: "gamification", data: { totalXp: newXp, loginStreak: newStreak, lastLoginDate: today } }).catch(() => {});
        } catch {}
      } else {
        setStreak(savedStreak);
        setXp(savedXp);
        await AsyncStorage.setItem(STREAK_KEY, String(savedStreak));
        await AsyncStorage.setItem(XP_KEY, String(savedXp));
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

export function SlotMachineCard() {
  const [reelsStopped, setReelsStopped] = useState([false, false, false]);
  const [results, setResults] = useState(["", "", ""]);
  const [reelValues, setReelValues] = useState(["", "", ""]);

  const seed = dateSeed();

  useEffect(() => {
    const r1 = SLOT_SESSIONS[seed % SLOT_SESSIONS.length];
    const r2 = SLOT_ACTIONS[Math.floor(seed / 7) % SLOT_ACTIONS.length];
    const r3 = SLOT_GOALS[Math.floor(seed / 13) % SLOT_GOALS.length];
    const finalResults = [r1, r2, r3];

    const intervals: ReturnType<typeof setInterval>[] = [];
    const stops: ReturnType<typeof setTimeout>[] = [];

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
        <Ionicons name="trophy-outline" size={16} color="#E53E3E" />
        <Text style={[styles.cardTitle, { color: "#E53E3E" }]}>Today's Mission</Text>
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
  slotCard: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E53E3E30",
    padding: 16,
    marginBottom: 14,
  },
  dailyBadge: {
    backgroundColor: "#E53E3E20",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  dailyBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#E53E3E",
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
    borderColor: "#E53E3E40",
    backgroundColor: "#E53E3E08",
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
    backgroundColor: "#E53E3E10",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E53E3E30",
  },
  missionText: {
    fontSize: 13,
    color: C.text,
    textAlign: "center",
    lineHeight: 20,
  },
  missionLabel: {
    color: "#E53E3E",
    fontWeight: "700",
  },
});
