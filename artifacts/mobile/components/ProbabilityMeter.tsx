import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import { Audio } from "expo-av";
import Colors from "@/constants/colors";

const C = Colors.dark;

interface ProbabilityMeterProps {
  score: number;
}

export default function ProbabilityMeter({ score }: ProbabilityMeterProps) {
  const chimed = useRef(false);

  useEffect(() => {
    if (score === 100 && !chimed.current) {
      chimed.current = true;
      (async () => {
        try {
          const { sound } = await Audio.Sound.createAsync(
            require("@/assets/sounds/chime.mp3"),
            { shouldPlay: true, volume: 0.6 }
          );
          sound.setOnPlaybackStatusUpdate((status) => {
            if ("didJustFinish" in status && status.didJustFinish) {
              sound.unloadAsync();
            }
          });
        } catch {}
      })();
    }
    if (score < 100) {
      chimed.current = false;
    }
  }, [score]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score === 100
      ? "#00ff88"
      : score >= 80
      ? "#00C896"
      : score >= 60
      ? "#F59E0B"
      : "#EF4444";

  const label =
    score === 100
      ? "Perfect Setup"
      : score >= 80
      ? "High Confidence"
      : score >= 60
      ? "Moderate Setup"
      : "Incomplete Setup";

  return (
    <View style={styles.container}>
      <Svg width={128} height={128} viewBox="0 0 128 128">
        <Circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={C.cardBorder}
          strokeWidth="10"
        />
        <Circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          rotation="-90"
          origin="64, 64"
        />
        <SvgText
          x="64"
          y={score === 100 ? "58" : "68"}
          textAnchor="middle"
          fill={color}
          fontSize={score === 100 ? 20 : 24}
          fontWeight="700"
        >
          {score}%
        </SvgText>
        {score === 100 && (
          <SvgText
            x="64"
            y="78"
            textAnchor="middle"
            fill="#00ff88"
            fontSize="10"
            fontWeight="700"
            letterSpacing="1"
          >
            A+ SETUP
          </SvgText>
        )}
      </Svg>
      <Text style={[styles.label, { color }]}>{label}</Text>
      <Text style={styles.sub}>Setup Probability</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", gap: 4 },
  label: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  sub: { fontSize: 10, color: C.textTertiary },
});
