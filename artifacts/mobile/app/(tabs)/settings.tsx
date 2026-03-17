import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { apiGet, apiPatch, apiPost } from "@/lib/api";
import Colors from "@/constants/colors";

const C = Colors.dark;

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const SESSION_OPTIONS = [
  { value: "", label: "Select session…" },
  { value: "london", label: "London Session" },
  { value: "new-york", label: "New York Session" },
  { value: "london-ny-overlap", label: "London/NY Overlap" },
  { value: "asian", label: "Asian Session" },
  { value: "all", label: "All Sessions" },
];

const ENTRY_STYLE_OPTIONS = [
  { value: "", label: "Select entry style…" },
  { value: "conservative", label: "Conservative" },
  { value: "silver-bullet", label: "Silver Bullet" },
];

interface UserSettingsData {
  profile: { name: string; email: string };
  tradingDefaults: {
    defaultSession: string;
    preferredEntryStyle: string;
    defaultPairs: string;
  };
  riskRules: {
    startingBalance: number;
    maxDailyLossPct: number;
    maxTotalDrawdownPct: number;
  };
}

interface AuthMeData {
  user: {
    id: number;
    email: string;
    name: string;
    role: string;
    isFounder: boolean;
    founderNumber: number | null;
  };
  subscription: {
    tierLevel: number;
    tierName: string;
  } | null;
}

function CycleSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  const idx = options.findIndex((o) => o.value === value);
  const current = idx >= 0 ? options[idx] : options[0];

  function cycle() {
    const next = (Math.max(idx, 0) + 1) % options.length;
    onChange(options[next].value);
  }

  return (
    <TouchableOpacity onPress={cycle} style={cycleS.row}>
      <Text style={cycleS.text}>{current.label}</Text>
      <Ionicons name="chevron-forward" size={14} color={C.textSecondary} />
    </TouchableOpacity>
  );
}

const cycleS = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.backgroundSecondary,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  text: { flex: 1, fontSize: 14, color: C.text },
});

function CardHeader({ icon, title }: { icon: IoniconsName; title: string }) {
  return (
    <View style={hdr.row}>
      <Ionicons name={icon} size={15} color={C.accent} />
      <Text style={hdr.title}>{title}</Text>
    </View>
  );
}

const hdr = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  title: { fontSize: 13, fontWeight: "700", color: C.text },
});

function SaveButton({
  onPress,
  loading,
  label = "Save",
}: {
  onPress: () => void;
  loading: boolean;
  label?: string;
}) {
  return (
    <TouchableOpacity
      style={[sb.btn, loading && sb.btnLoading]}
      onPress={onPress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#0A0A0F" />
      ) : (
        <Text style={sb.text}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const sb = StyleSheet.create({
  btn: {
    backgroundColor: C.accent,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  btnLoading: { opacity: 0.65 },
  text: { fontSize: 14, fontWeight: "700", color: "#0A0A0F" },
});

export default function SettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    role: "user",
    tierLevel: 0,
    isFounder: false,
  });
  const [trading, setTrading] = useState({
    defaultSession: "",
    preferredEntryStyle: "",
    defaultPairs: "",
  });
  const [risk, setRisk] = useState({
    startingBalance: "50000",
    maxDailyLossPct: "2",
    maxTotalDrawdownPct: "10",
  });

  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurPw, setShowCurPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const [settingsData, meData] = await Promise.all([
        apiGet<UserSettingsData>("user/settings"),
        apiGet<AuthMeData>("auth/me"),
      ]);
      setProfile({
        name: settingsData.profile?.name || "",
        email: settingsData.profile?.email || "",
        role: meData.user?.role || "user",
        tierLevel: meData.subscription?.tierLevel ?? 0,
        isFounder: meData.user?.isFounder ?? false,
      });
      setTrading({
        defaultSession: settingsData.tradingDefaults?.defaultSession || "",
        preferredEntryStyle: settingsData.tradingDefaults?.preferredEntryStyle || "",
        defaultPairs: settingsData.tradingDefaults?.defaultPairs || "",
      });
      setRisk({
        startingBalance: String(settingsData.riskRules?.startingBalance ?? 50000),
        maxDailyLossPct: String(settingsData.riskRules?.maxDailyLossPct ?? 2),
        maxTotalDrawdownPct: String(settingsData.riskRules?.maxTotalDrawdownPct ?? 10),
      });
    } catch {
      Alert.alert("Error", "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    if (newPw && newPw !== confirmPw) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }
    if (newPw && !curPw) {
      Alert.alert("Error", "Enter your current password to change it");
      return;
    }
    setSaving("profile");
    const data: Record<string, string> = {};
    if (profile.name) data.name = profile.name;
    if (profile.email) data.email = profile.email;
    if (curPw && newPw) {
      data.currentPassword = curPw;
      data.newPassword = newPw;
    }
    try {
      await apiPatch("user/settings", { section: "profile", data });
      setCurPw("");
      setNewPw("");
      setConfirmPw("");
      Alert.alert("Saved", "Profile updated successfully");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to save profile";
      Alert.alert("Error", msg);
    }
    setSaving(null);
  }

  async function saveTrading() {
    setSaving("trading");
    try {
      await apiPatch("user/settings", { section: "tradingDefaults", data: trading });
      Alert.alert("Saved", "Trading defaults updated");
    } catch {
      Alert.alert("Error", "Failed to save trading defaults");
    }
    setSaving(null);
  }

  async function saveRisk() {
    setSaving("risk");
    try {
      await apiPatch("user/settings", {
        section: "riskRules",
        data: {
          startingBalance: parseFloat(risk.startingBalance) || 50000,
          maxDailyLossPct: parseFloat(risk.maxDailyLossPct) || 2,
          maxTotalDrawdownPct: parseFloat(risk.maxTotalDrawdownPct) || 10,
        },
      });
      Alert.alert("Saved", "Risk rules updated");
    } catch {
      Alert.alert("Error", "Failed to save risk rules");
    }
    setSaving(null);
  }

  async function handleLogout() {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            await apiPost("auth/logout", {});
          } catch {}
          router.replace("/");
        },
      },
    ]);
  }

  const tierLabel =
    profile.tierLevel === 0
      ? "Free"
      : profile.tierLevel === 1
      ? "Standard"
      : profile.tierLevel === 2
      ? "Premium"
      : "Elite";

  if (loading) {
    return (
      <SafeAreaView style={s.safe} edges={["top"]}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["top"]}>
      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>Settings</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Account card */}
        <View style={s.card}>
          <View style={s.accountRow}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {(profile.name || profile.email || "U")[0].toUpperCase()}
              </Text>
            </View>
            <View style={s.accountInfo}>
              <Text style={s.accountName}>{profile.name || "User"}</Text>
              <Text style={s.accountEmail}>{profile.email}</Text>
              <View style={s.tierRow}>
                <Ionicons
                  name={profile.tierLevel > 0 ? "star" : "person-outline"}
                  size={10}
                  color={C.accent}
                />
                <Text style={s.tierText}>
                  {tierLabel}
                  {profile.isFounder ? " · Founder" : ""}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Profile */}
        <View style={s.card}>
          <CardHeader icon="person-outline" title="Profile" />
          <View style={s.section}>
            <Text style={s.label}>Name</Text>
            <TextInput
              style={s.input}
              value={profile.name}
              onChangeText={(v) => setProfile((p) => ({ ...p, name: v }))}
              placeholder="Your name"
              placeholderTextColor={C.textSecondary}
            />

            <Text style={[s.label, s.mt]}>Email</Text>
            <TextInput
              style={s.input}
              value={profile.email}
              onChangeText={(v) => setProfile((p) => ({ ...p, email: v }))}
              placeholder="email@example.com"
              placeholderTextColor={C.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={[s.label, s.mt]}>Change Password</Text>
            <Text style={s.hint}>Leave blank to keep current password</Text>

            <View style={s.pwRow}>
              <TextInput
                style={[s.input, s.pwInput]}
                value={curPw}
                onChangeText={setCurPw}
                placeholder="Current password"
                placeholderTextColor={C.textSecondary}
                secureTextEntry={!showCurPw}
              />
              <TouchableOpacity
                style={s.eyeBtn}
                onPress={() => setShowCurPw(!showCurPw)}
              >
                <Ionicons
                  name={showCurPw ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={C.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={s.pwRow}>
              <TextInput
                style={[s.input, s.pwInput]}
                value={newPw}
                onChangeText={setNewPw}
                placeholder="New password (min 6 chars)"
                placeholderTextColor={C.textSecondary}
                secureTextEntry={!showNewPw}
              />
              <TouchableOpacity
                style={s.eyeBtn}
                onPress={() => setShowNewPw(!showNewPw)}
              >
                <Ionicons
                  name={showNewPw ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={C.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TextInput
              style={s.input}
              value={confirmPw}
              onChangeText={setConfirmPw}
              placeholder="Confirm new password"
              placeholderTextColor={C.textSecondary}
              secureTextEntry
            />

            <SaveButton
              onPress={saveProfile}
              loading={saving === "profile"}
              label="Save Profile"
            />
          </View>
        </View>

        {/* Trading Defaults */}
        <View style={s.card}>
          <CardHeader icon="trending-up-outline" title="Trading Defaults" />
          <View style={s.section}>
            <Text style={s.label}>Default Session</Text>
            <CycleSelect
              value={trading.defaultSession}
              onChange={(v) => setTrading((p) => ({ ...p, defaultSession: v }))}
              options={SESSION_OPTIONS}
            />

            <Text style={[s.label, s.mt]}>Preferred Entry Style</Text>
            <CycleSelect
              value={trading.preferredEntryStyle}
              onChange={(v) =>
                setTrading((p) => ({ ...p, preferredEntryStyle: v }))
              }
              options={ENTRY_STYLE_OPTIONS}
            />

            <Text style={[s.label, s.mt]}>Default Pairs to Watch</Text>
            <TextInput
              style={s.input}
              value={trading.defaultPairs}
              onChangeText={(v) =>
                setTrading((p) => ({ ...p, defaultPairs: v }))
              }
              placeholder="NQ1!, MNQ1!, ES1!, EUR/USD"
              placeholderTextColor={C.textSecondary}
            />

            <SaveButton
              onPress={saveTrading}
              loading={saving === "trading"}
              label="Save Trading Defaults"
            />
          </View>
        </View>

        {/* Risk Rules */}
        <View style={s.card}>
          <CardHeader icon="shield-outline" title="Risk Rules" />
          <View style={s.section}>
            <Text style={s.label}>Starting Balance ($)</Text>
            <TextInput
              style={s.input}
              value={risk.startingBalance}
              onChangeText={(v) =>
                setRisk((p) => ({ ...p, startingBalance: v }))
              }
              keyboardType="decimal-pad"
              placeholder="50000"
              placeholderTextColor={C.textSecondary}
            />

            <Text style={[s.label, s.mt]}>Max Daily Loss (%)</Text>
            <TextInput
              style={s.input}
              value={risk.maxDailyLossPct}
              onChangeText={(v) =>
                setRisk((p) => ({ ...p, maxDailyLossPct: v }))
              }
              keyboardType="decimal-pad"
              placeholder="2"
              placeholderTextColor={C.textSecondary}
            />

            <Text style={[s.label, s.mt]}>Max Total Drawdown (%)</Text>
            <TextInput
              style={s.input}
              value={risk.maxTotalDrawdownPct}
              onChangeText={(v) =>
                setRisk((p) => ({ ...p, maxTotalDrawdownPct: v }))
              }
              keyboardType="decimal-pad"
              placeholder="10"
              placeholderTextColor={C.textSecondary}
            />

            <SaveButton
              onPress={saveRisk}
              loading={saving === "risk"}
              label="Save Risk Rules"
            />
          </View>
        </View>

        {/* Admin Panel */}
        {profile.role === "admin" && (
          <TouchableOpacity
            style={s.adminCard}
            onPress={() => router.push("/admin")}
          >
            <View style={s.adminLeft}>
              <Ionicons name="settings" size={18} color={C.accent} />
              <View>
                <Text style={s.adminTitle}>Admin Panel</Text>
                <Text style={s.adminSub}>Manage app settings, users & features</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textSecondary} />
          </TouchableOpacity>
        )}

        {/* Logout */}
        <TouchableOpacity style={s.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={s.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={s.footer}>ICT AI Trading Mentor · Educational use only</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  pageTitle: { fontSize: 22, fontWeight: "800", color: C.text },
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 100, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 14,
    overflow: "hidden",
  },
  section: { padding: 16, gap: 5 },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: C.accent + "20",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "800", color: C.accent },
  accountInfo: { flex: 1, gap: 2 },
  accountName: { fontSize: 16, fontWeight: "700", color: C.text },
  accountEmail: { fontSize: 12, color: C.textSecondary },
  tierRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  tierText: { fontSize: 11, fontWeight: "600", color: C.accent },
  label: { fontSize: 12, fontWeight: "600", color: C.textSecondary },
  hint: { fontSize: 11, color: C.textSecondary, marginTop: -2, marginBottom: 2 },
  mt: { marginTop: 8 },
  input: {
    backgroundColor: C.backgroundSecondary,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
  },
  pwRow: { flexDirection: "row", alignItems: "center" },
  pwInput: { flex: 1 },
  eyeBtn: { padding: 10 },
  adminCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: C.cardBg,
    borderWidth: 1,
    borderColor: C.accent + "35",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  adminLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  adminTitle: { fontSize: 15, fontWeight: "700", color: C.text },
  adminSub: { fontSize: 11, color: C.textSecondary, marginTop: 1 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#EF444415",
    borderWidth: 1,
    borderColor: "#EF444430",
    borderRadius: 14,
    paddingVertical: 14,
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: "#EF4444" },
  footer: {
    fontSize: 11,
    color: C.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
});
