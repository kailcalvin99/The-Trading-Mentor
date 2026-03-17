import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { apiPost } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";

const C = Colors.dark;

export default function LoginScreen() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password) {
      Alert.alert("Error", "Please enter your email and password");
      return;
    }
    setLoading(true);
    try {
      await apiPost("auth/login", { email: email.trim(), password });
      await refresh();
      router.replace("/(tabs)");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Login failed";
      Alert.alert("Login Failed", msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={s.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={s.header}>
            <View style={s.logoCircle}>
              <Ionicons name="trending-up" size={32} color={C.accent} />
            </View>
            <Text style={s.title}>ICT Trading Mentor</Text>
            <Text style={s.subtitle}>Sign in to your account</Text>
          </View>

          <View style={s.form}>
            <Text style={s.label}>Email</Text>
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              placeholderTextColor={C.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />

            <Text style={[s.label, s.mt]}>Password</Text>
            <View style={s.pwRow}>
              <TextInput
                style={[s.input, s.pwInput]}
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                placeholderTextColor={C.textSecondary}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={s.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={C.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[s.btn, loading && s.btnLoading]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#0A0A0F" />
              ) : (
                <Text style={s.btnText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0A0A0F",
  },
  flex: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.backgroundSecondary,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: C.text,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: C.textSecondary,
  },
  form: {
    gap: 4,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: C.text,
    marginBottom: 6,
  },
  mt: {
    marginTop: 12,
  },
  input: {
    backgroundColor: C.backgroundSecondary,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
  },
  pwRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pwInput: {
    flex: 1,
    paddingRight: 44,
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    padding: 4,
  },
  btn: {
    backgroundColor: C.accent,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 24,
  },
  btnLoading: {
    opacity: 0.65,
  },
  btnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0A0A0F",
  },
});
