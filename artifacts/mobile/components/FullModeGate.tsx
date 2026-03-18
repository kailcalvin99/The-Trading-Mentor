import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

const C = Colors.dark;

export default function FullModeGate({ children }: { children: React.ReactNode }) {
  const { appMode, setAppMode } = useAuth();
  const router = useRouter();

  if (appMode === "lite") {
    return (
      <View style={styles.container}>
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed" size={32} color={C.accent} />
        </View>
        <Text style={styles.title}>Full Mode Feature</Text>
        <Text style={styles.body}>
          This section is available in Full Mode. Lite Mode keeps things simple with Academy, Journal, and Risk Shield.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => setAppMode("full")}>
          <Text style={styles.primaryBtnText}>Switch to Full Mode</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.navigate("/(tabs)/dashboard")}>
          <Text style={styles.secondaryBtnText}>Back to Dashboard</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background, justifyContent: "center", alignItems: "center", padding: 24 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(0,200,150,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 16 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: C.text, marginBottom: 8 },
  body: { fontSize: 14, color: C.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: 24, maxWidth: 300 },
  primaryBtn: { width: "100%", maxWidth: 280, backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginBottom: 12 },
  primaryBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
  secondaryBtn: { width: "100%", maxWidth: 280, borderRadius: 14, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: C.cardBorder },
  secondaryBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.textSecondary },
});
