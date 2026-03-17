import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Easing,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";

const C = Colors.dark;
const { width: SW, height: SH } = Dimensions.get("window");

const CELEBRATION_SEEN_KEY = "mobile-graduation-celebrated";

interface ConfettiPiece {
  x: Animated.Value;
  y: Animated.Value;
  rotation: Animated.Value;
  opacity: Animated.Value;
  color: string;
  size: number;
}

const COLORS = ["#FFD700", "#FF6B6B", "#00C896", "#818CF8", "#06B6D4", "#F59E0B", "#EC4899", "#8B5CF6"];

function useConfetti(active: boolean, count: number = 30) {
  const pieces = useRef<ConfettiPiece[]>([]).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);

  if (pieces.length === 0) {
    for (let i = 0; i < count; i++) {
      pieces.push({
        x: new Animated.Value(Math.random() * SW),
        y: new Animated.Value(-20),
        rotation: new Animated.Value(0),
        opacity: new Animated.Value(1),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 6 + Math.random() * 8,
      });
    }
  }

  useEffect(() => {
    if (!active) return;

    pieces.forEach((p) => {
      p.x.setValue(Math.random() * SW);
      p.y.setValue(-20);
      p.rotation.setValue(0);
      p.opacity.setValue(1);
    });

    const animations = pieces.map((p) =>
      Animated.parallel([
        Animated.timing(p.y, {
          toValue: SH + 40,
          duration: 2500 + Math.random() * 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(p.rotation, {
          toValue: (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 6),
          duration: 2500 + Math.random() * 2000,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.delay(1500 + Math.random() * 1000),
          Animated.timing(p.opacity, { toValue: 0, duration: 800, useNativeDriver: true }),
        ]),
      ])
    );

    animRef.current = Animated.stagger(40, animations);
    animRef.current.start();

    return () => animRef.current?.stop();
  }, [active]);

  return pieces;
}

interface GraduationCelebrationProps {
  visible: boolean;
  onClose: () => void;
}

export default function GraduationCelebration({ visible, onClose }: GraduationCelebrationProps) {
  const [phase, setPhase] = useState(0);
  const confettiPieces = useConfetti(visible);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const textAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      setPhase(0);
      scaleAnim.setValue(0);
      fadeAnim.setValue(0);
      textAnim.setValue(0);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    timers.push(
      setTimeout(() => {
        setPhase(1);
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 80,
          friction: 8,
          useNativeDriver: true,
        }).start();
      }, 300)
    );

    timers.push(
      setTimeout(() => {
        setPhase(2);
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      }, 1800)
    );

    timers.push(
      setTimeout(() => {
        setPhase(3);
        Animated.timing(textAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
      }, 3000)
    );

    return () => timers.forEach(clearTimeout);
  }, [visible]);

  async function handleClose() {
    try {
      await AsyncStorage.setItem(CELEBRATION_SEEN_KEY, "1");
    } catch {}
    onClose();
  }

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={s.overlay}>
        {confettiPieces.map((piece, i) => {
          const rotateInterp = piece.rotation.interpolate({
            inputRange: [-10, 10],
            outputRange: ["-360deg", "360deg"],
          });
          return (
            <Animated.View
              key={i}
              style={[
                s.confetti,
                {
                  left: 0,
                  top: 0,
                  width: piece.size,
                  height: piece.size,
                  borderRadius: Math.random() > 0.5 ? piece.size / 2 : 2,
                  backgroundColor: piece.color,
                  transform: [
                    { translateX: piece.x },
                    { translateY: piece.y },
                    { rotate: rotateInterp },
                  ],
                  opacity: piece.opacity,
                },
              ]}
            />
          );
        })}

        <Animated.View style={[s.card, { transform: [{ scale: scaleAnim }] }]}>
          <View style={s.trophyRow}>
            {["🎉", "🏆", "🎓", "⭐", "🎊"].map((e, i) => (
              <Text key={i} style={s.emoji}>{e}</Text>
            ))}
          </View>

          <Text style={s.congrats}>CONGRATULATIONS!</Text>

          <Animated.View style={{ opacity: fadeAnim }}>
            <Text style={s.subtitle}>You've mastered the ICT Trading Academy!</Text>
          </Animated.View>

          <Animated.View style={[s.badgesRow, { opacity: textAnim }]}>
            {[
              { label: "All Lessons", icon: "📚" },
              { label: "ICT Certified", icon: "🏅" },
              { label: "Course Graduate", icon: "🎓" },
            ].map((badge, i) => (
              <View key={i} style={s.badge}>
                <Text style={s.badgeEmoji}>{badge.icon}</Text>
                <Text style={s.badgeLabel}>{badge.label}</Text>
              </View>
            ))}
          </Animated.View>

          <Animated.View style={{ opacity: textAnim, width: "100%" }}>
            <TouchableOpacity style={s.closeBtn} onPress={handleClose} activeOpacity={0.85}>
              <Text style={s.closeBtnText}>Accept Your Diploma</Text>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity style={s.skipBtn} onPress={handleClose}>
            <Text style={s.skipText}>Skip</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function useGraduationCheck() {
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const unlocked = await AsyncStorage.getItem("ict-academy-unlocked");
        const alreadySeen = await AsyncStorage.getItem(CELEBRATION_SEEN_KEY);
        if (unlocked === "true" && !alreadySeen) {
          setShowCelebration(true);
        }
      } catch {}
    };

    check();
    const interval = setInterval(check, 3000);
    return () => clearInterval(interval);
  }, []);

  return {
    showCelebration,
    closeCelebration: async () => {
      setShowCelebration(false);
      try {
        await AsyncStorage.setItem(CELEBRATION_SEEN_KEY, "1");
      } catch {}
    },
  };
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  confetti: {
    position: "absolute",
  },
  card: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 24,
    padding: 28,
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: "#FFD700" + "40",
    alignItems: "center",
    ...(Platform.OS === "android" ? { elevation: 10 } : {
      shadowColor: "#FFD700",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 20,
    }),
  },
  trophyRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
  },
  emoji: {
    fontSize: 28,
  },
  congrats: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFD700",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 15,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 20,
  },
  badgesRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  badgeEmoji: {
    fontSize: 16,
  },
  badgeLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: C.text,
  },
  closeBtn: {
    backgroundColor: "#FFD700",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
    width: "100%",
  },
  closeBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#000",
  },
  skipBtn: {
    padding: 8,
  },
  skipText: {
    fontSize: 12,
    color: C.textTertiary,
  },
});
