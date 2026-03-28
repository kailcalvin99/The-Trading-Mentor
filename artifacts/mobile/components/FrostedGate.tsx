import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Colors from "@/constants/colors";

const C = Colors.dark;

export type FrostedGateMode = "standard" | "premium";

interface FrostedGateProps {
  children: React.ReactNode;
  mode: FrostedGateMode;
  onAction?: () => void;
}

const GATE_CONFIG: Record<FrostedGateMode, {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  title: string;
  description: string;
  buttonText: string;
  buttonColor: string;
}> = {
  standard: {
    iconName: "lock-closed-outline",
    iconColor: "#F59E0B",
    title: "Upgrade to Standard",
    description: "This feature is included in the Standard plan. Upgrade to access your full trading toolkit.",
    buttonText: "Upgrade Now",
    buttonColor: "#F59E0B",
  },
  premium: {
    iconName: "lock-closed-outline",
    iconColor: "#F59E0B",
    title: "Upgrade to Premium",
    description: "This is a Premium feature. Unlock advanced analytics, AI coaching, and more.",
    buttonText: "Upgrade to Premium",
    buttonColor: "#F59E0B",
  },
};

export default function FrostedGate({ children, mode, onAction }: FrostedGateProps) {
  const router = useRouter();
  const config = GATE_CONFIG[mode];

  function handleAction() {
    if (onAction) {
      onAction();
      return;
    }
    router.navigate("/subscription" as never);
  }

  return (
    <View style={styles.container}>
      <View style={styles.demoWrapper} pointerEvents="none">
        {children}
      </View>

      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: config.iconColor + "22" }]}>
            <Ionicons name={config.iconName} size={36} color={config.iconColor} />
          </View>

          <Text style={styles.title}>{config.title}</Text>
          <Text style={styles.body}>{config.description}</Text>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: config.buttonColor }]}
            onPress={handleAction}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>{config.buttonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  demoWrapper: {
    flex: 1,
    opacity: 0.45,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 10, 15, 0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    alignItems: "center",
    maxWidth: 320,
    width: "100%",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
    textAlign: "center",
    marginBottom: 10,
    lineHeight: 28,
  },
  body: {
    fontSize: 14,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  actionBtn: {
    width: "100%",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  actionBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#0A0A0F",
  },
});
