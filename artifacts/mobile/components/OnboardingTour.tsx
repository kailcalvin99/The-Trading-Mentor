import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Platform,
  type DimensionValue,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "@/constants/colors";

const C = Colors.dark;
const { width: SW, height: SH } = Dimensions.get("window");

const TOUR_DONE_KEY = "mobile-onboarding-tour-done";

type SpotlightPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

interface TourStep {
  title: string;
  description: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  color: string;
  spotlightHint?: "tab-bar" | "ai-button" | "dashboard" | null;
  calloutPosition: "above" | "below" | "center";
  spotlightRect?: SpotlightPosition;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to ICT Mentor!",
    icon: "rocket-outline",
    color: "#00C896",
    description:
      "Hey trader! Welcome aboard. I'm your personal ICT mentor. Let me give you a quick tour — I'll highlight exactly where everything lives.",
    calloutPosition: "center",
  },
  {
    title: "Daily Planner Tab",
    icon: "calendar-outline",
    color: "#00C896",
    description:
      "The Planner tab is your morning command center. Check trading sessions, news windows, and daily bias before ever opening a chart.",
    calloutPosition: "below",
    spotlightHint: "tab-bar",
    spotlightRect: { x: 0, y: 0, width: SW * 0.18, height: 60 },
  },
  {
    title: "ICT Academy Tab",
    icon: "school-outline",
    color: "#818CF8",
    description:
      "39 lessons covering ICT methodology from zero — FVGs, Order Blocks, Kill Zones, and more. Swipe-to-Learn makes it feel like flashcards.",
    calloutPosition: "below",
    spotlightHint: "tab-bar",
    spotlightRect: { x: SW * 0.18, y: 0, width: SW * 0.18, height: 60 },
  },
  {
    title: "Risk Shield & Journal",
    icon: "shield-checkmark-outline",
    color: "#EF4444",
    description:
      "Risk Shield protects your account from blowing up. Smart Journal tracks every trade so you can spot what's actually working.",
    calloutPosition: "below",
    spotlightHint: "tab-bar",
    spotlightRect: { x: SW * 0.36, y: 0, width: SW * 0.36, height: 60 },
  },
  {
    title: "AI Mentor Button",
    icon: "sparkles-outline",
    color: "#F59E0B",
    description:
      "See that sparkle button at the bottom-right? That's your 24/7 ICT AI tutor. Tap it anytime to ask about FVGs, OTE, position sizing — anything.",
    calloutPosition: "above",
    spotlightHint: "ai-button",
    spotlightRect: { x: SW - 80, y: SH - 120, width: 64, height: 64 },
  },
  {
    title: "Dashboard Rewards",
    icon: "trophy-outline",
    color: "#00C896",
    description:
      "Scroll down on the Planner tab to find your XP tracker, daily spin wheel, and mission slot machine. Rewards for every lesson and trade logged!",
    calloutPosition: "center",
    spotlightHint: "dashboard",
  },
];

export function useOnboardingTour() {
  const [shouldShow, setShouldShow] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    (async () => {
      try {
        const done = await AsyncStorage.getItem(TOUR_DONE_KEY);
        if (!done) {
          timer = setTimeout(async () => {
            try {
              await AsyncStorage.setItem(TOUR_DONE_KEY, "1");
            } catch {}
            setShouldShow(true);
          }, 1200);
        }
      } catch {}
      setChecked(true);
    })();
    return () => clearTimeout(timer);
  }, []);

  async function completeTour() {
    setShouldShow(false);
  }

  return { shouldShow: checked && shouldShow, completeTour };
}

interface OnboardingTourProps {
  visible: boolean;
  onComplete: () => void;
  tabBarHeight?: number;
  tabBarY?: number;
}

export default function OnboardingTour({ visible, onComplete, tabBarHeight = 56, tabBarY = 44 }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const calloutAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      setStep(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    } else {
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  useEffect(() => {
    calloutAnim.setValue(0);
    Animated.timing(calloutAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [step]);

  function goNext() {
    if (step < TOUR_STEPS.length - 1) {
      calloutAnim.setValue(0);
      setStep((s) => s + 1);
    } else {
      onComplete();
    }
  }

  if (!visible) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;
  const hasSpotlight = !!current.spotlightRect;
  const spot = current.spotlightRect;

  const spotTop = spot ? (current.spotlightHint === "tab-bar" ? tabBarY : spot.y) : 0;
  const spotLeft = spot ? spot.x : 0;
  const spotW = spot ? spot.width : 0;
  const spotH = spot ? (current.spotlightHint === "tab-bar" ? tabBarHeight : spot.height) : 0;

  const calloutY = calloutAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] });

  const calloutStyle =
    current.calloutPosition === "above"
      ? { bottom: SH - spotTop + 16 }
      : current.calloutPosition === "below"
      ? { top: spotTop + spotH + 16 }
      : { top: SH * 0.28 };

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onComplete}>
      <Animated.View style={[s.overlay, { opacity: fadeAnim }]} pointerEvents="box-none">

        {hasSpotlight && (
          <>
            <View style={[s.maskTop, { height: spotTop }]} />
            <View style={[s.maskRow, { top: spotTop, height: spotH }]}>
              <View style={[s.maskLeft, { width: spotLeft }]} />
              <Animated.View
                style={[
                  s.spotlight,
                  { width: spotW, height: spotH, transform: [{ scale: pulseAnim }] },
                ]}
              />
              <View style={[s.maskRight, { width: SW - spotLeft - spotW }]} />
            </View>
            <View style={[s.maskBottom, { top: spotTop + spotH }]} />
          </>
        )}

        {!hasSpotlight && <View style={s.fullMask} />}

        <Animated.View
          style={[
            s.callout,
            calloutStyle,
            { opacity: calloutAnim, transform: [{ translateY: calloutY }] },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity style={s.skipBtn} onPress={onComplete} activeOpacity={0.7}>
            <Text style={s.skipText}>Skip tour</Text>
          </TouchableOpacity>

          <View style={[s.iconCircle, { backgroundColor: current.color + "20", borderColor: current.color + "50" }]}>
            <Ionicons name={current.icon} size={32} color={current.color} />
          </View>

          <Text style={s.title}>{current.title}</Text>
          <Text style={s.description}>{current.description}</Text>

          <View style={s.dots}>
            {TOUR_STEPS.map((_, i) => (
              <View
                key={i}
                style={[
                  s.dot,
                  { backgroundColor: i === step ? C.accent : C.cardBorder, width: i === step ? 18 : 7 },
                ]}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[s.nextBtn, { backgroundColor: current.color }]}
            onPress={goNext}
            activeOpacity={0.85}
          >
            <Text style={s.nextBtnText}>{isLast ? "Start Trading!" : "Next"}</Text>
            {!isLast && <Ionicons name="arrow-forward" size={15} color="#0A0A0F" />}
          </TouchableOpacity>

          <Text style={s.stepCount}>{step + 1} / {TOUR_STEPS.length}</Text>
        </Animated.View>

      </Animated.View>
    </Modal>
  );
}

const MASK_COLOR = "rgba(0,0,0,0.82)";

const s = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  fullMask: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: MASK_COLOR,
  },
  maskTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: MASK_COLOR,
  },
  maskRow: {
    position: "absolute",
    left: 0,
    right: 0,
    flexDirection: "row",
  },
  maskLeft: {
    backgroundColor: MASK_COLOR,
  },
  maskRight: {
    backgroundColor: MASK_COLOR,
    flex: 1,
  },
  maskBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: MASK_COLOR,
  },
  spotlight: {
    backgroundColor: "transparent",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: C.accent + "80",
  },
  callout: {
    position: "absolute",
    left: 16,
    right: 16,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: "center",
    ...(Platform.OS === "android"
      ? { elevation: 16 }
      : { shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 20 }),
  },
  skipBtn: {
    alignSelf: "flex-end",
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 10,
  },
  skipText: {
    fontSize: 13,
    color: C.textSecondary,
  },
  iconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: C.text,
    textAlign: "center",
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 18,
  },
  dots: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    marginBottom: 16,
  },
  dot: {
    height: 7,
    borderRadius: 4,
  },
  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 13,
    paddingHorizontal: 32,
    borderRadius: 13,
    marginBottom: 10,
    width: "100%" as DimensionValue,
    justifyContent: "center",
  },
  nextBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0A0A0F",
  },
  stepCount: {
    fontSize: 11,
    color: C.textTertiary,
  },
});
