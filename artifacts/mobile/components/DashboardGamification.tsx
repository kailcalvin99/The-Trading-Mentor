import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  type DimensionValue,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";

const C = Colors.dark;

const RANKS = ["Apprentice", "Student", "Trader", "Pro", "Master", "ICT Legend"];

const XP_KEY = "mobile-total-xp";
const STREAK_KEY = "mobile-login-streak";
const LAST_LOGIN_KEY = "mobile-last-login-date";

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


const styles = StyleSheet.create({
  card: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    padding: 16,
    marginBottom: 14,
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
});
