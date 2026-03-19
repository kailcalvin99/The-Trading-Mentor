import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  StyleSheet,
  Alert,
  Platform,
  ActivityIndicator,
  Share,
} from "react-native";
import * as ExpoSharing from "expo-sharing";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { apiGet, apiPatch, getBaseUrl } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";
import { useNotifications } from "@/contexts/NotificationContext";
import {
  WIDGET_PREFS_KEY,
  WIDGET_CONFIG,
  DEFAULT_WIDGET_PREFS,
  type WidgetPrefs,
} from "@/constants/dashboardWidgets";

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

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = ["00", "15", "30", "45"];
const ITEM_HEIGHT = 44;

function TimePicker({
  value,
  onChange,
  onClose,
}: {
  value: string;
  onChange: (v: string) => void;
  onClose: () => void;
}) {
  const parts = value.match(/^(\d{2}):(\d{2})$/) ?? ["", "07", "00"];
  const initH = parts[1];
  const initM = parts[2];
  const closestM = MINUTES.reduce((best, m) => {
    return Math.abs(parseInt(m) - parseInt(initM)) < Math.abs(parseInt(best) - parseInt(initM)) ? m : best;
  }, MINUTES[0]);

  const [selH, setSelH] = useState(initH);
  const [selM, setSelM] = useState(closestM);
  const hRef = useRef<FlatList<string>>(null);
  const mRef = useRef<FlatList<string>>(null);

  useEffect(() => {
    const hi = HOURS.indexOf(initH);
    if (hi >= 0) hRef.current?.scrollToIndex({ index: hi, animated: false });
    const mi = MINUTES.indexOf(closestM);
    if (mi >= 0) mRef.current?.scrollToIndex({ index: mi, animated: false });
  }, []);

  function confirm() {
    onChange(`${selH}:${selM}`);
    onClose();
  }

  function renderHour({ item }: { item: string }) {
    const selected = item === selH;
    return (
      <TouchableOpacity style={tpS.item} onPress={() => setSelH(item)}>
        <Text style={[tpS.itemText, selected && tpS.itemSelected]}>{item}</Text>
      </TouchableOpacity>
    );
  }

  function renderMinute({ item }: { item: string }) {
    const selected = item === selM;
    return (
      <TouchableOpacity style={tpS.item} onPress={() => setSelM(item)}>
        <Text style={[tpS.itemText, selected && tpS.itemSelected]}>{item}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={tpS.overlay} activeOpacity={1} onPress={onClose}>
        <View style={tpS.sheet} onStartShouldSetResponder={() => true}>
          <Text style={tpS.title}>Select Time</Text>
          <View style={tpS.columns}>
            <View style={tpS.col}>
              <Text style={tpS.colLabel}>Hour</Text>
              <FlatList
                ref={hRef}
                data={HOURS}
                keyExtractor={(item) => item}
                renderItem={renderHour}
                getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                showsVerticalScrollIndicator={false}
                style={tpS.list}
              />
            </View>
            <Text style={tpS.colon}>:</Text>
            <View style={tpS.col}>
              <Text style={tpS.colLabel}>Min</Text>
              <FlatList
                ref={mRef}
                data={MINUTES}
                keyExtractor={(item) => item}
                renderItem={renderMinute}
                getItemLayout={(_, index) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index })}
                showsVerticalScrollIndicator={false}
                style={tpS.list}
              />
            </View>
          </View>
          <View style={tpS.preview}>
            <Text style={tpS.previewText}>{selH}:{selM}</Text>
          </View>
          <View style={tpS.buttons}>
            <TouchableOpacity onPress={onClose} style={tpS.btnCancel}>
              <Text style={tpS.btnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={confirm} style={tpS.btnDone}>
              <Text style={tpS.btnDoneText}>Set</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const tpS = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheet: {
    backgroundColor: "#1A1A2E",
    borderRadius: 16,
    padding: 20,
    width: 240,
    borderWidth: 1,
    borderColor: "#2A2A3E",
  },
  title: { fontSize: 15, fontWeight: "700", color: "#fff", textAlign: "center", marginBottom: 12 },
  columns: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  col: { alignItems: "center", width: 70 },
  colLabel: { fontSize: 11, color: "#888", marginBottom: 4 },
  list: { height: ITEM_HEIGHT * 4, width: 70 },
  item: { height: ITEM_HEIGHT, justifyContent: "center", alignItems: "center" },
  itemText: { fontSize: 18, color: "#888" },
  itemSelected: { color: "#00C896", fontWeight: "700", fontSize: 20 },
  colon: { fontSize: 24, color: "#fff", marginHorizontal: 8, paddingTop: 18 },
  preview: { alignItems: "center", marginTop: 8 },
  previewText: { fontSize: 28, fontWeight: "700", color: "#00C896" },
  buttons: { flexDirection: "row", gap: 10, marginTop: 16 },
  btnCancel: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: "#333", alignItems: "center",
  },
  btnCancelText: { color: "#888", fontSize: 14, fontWeight: "600" },
  btnDone: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    backgroundColor: "#00C896", alignItems: "center",
  },
  btnDoneText: { color: "#0A0A0F", fontSize: 14, fontWeight: "700" },
});

export default function SettingsScreen() {
  const router = useRouter();
  const { logout, appMode, setAppMode } = useAuth();
  const [currentAppMode, setCurrentAppMode] = useState<"full" | "lite">(appMode);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const { settings: notifSettings, requestPermission, updateSettings: updateNotifSettings } = useNotifications();
  const [showTimePicker, setShowTimePicker] = useState<"morning" | "evening" | null>(null);

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
  const [founderSpotsLeft, setFounderSpotsLeft] = useState<number | null>(null);
  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPrefs>(DEFAULT_WIDGET_PREFS);

  useEffect(() => {
    load();
    AsyncStorage.getItem(WIDGET_PREFS_KEY).then((raw) => {
      if (raw) {
        try { setWidgetPrefs({ ...DEFAULT_WIDGET_PREFS, ...JSON.parse(raw) }); } catch {}
      }
    });
  }, []);

  async function load() {
    try {
      const [settingsData, meData, tiersData] = await Promise.all([
        apiGet<UserSettingsData>("user/settings"),
        apiGet<AuthMeData>("auth/me"),
        apiGet<{ founderSpotsLeft?: number }>("subscriptions/tiers").catch(() => ({})),
      ]);
      if (typeof (tiersData as { founderSpotsLeft?: number }).founderSpotsLeft === "number") {
        setFounderSpotsLeft((tiersData as { founderSpotsLeft: number }).founderSpotsLeft);
      }
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

  function handleAppModeChange(mode: "full" | "lite") {
    setCurrentAppMode(mode);
    setAppMode(mode);
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

  async function handleShare() {
    const appUrl = getBaseUrl().replace(/\/$/, "");
    const message = `Hey! I've been using this app to learn how to trade like the big banks. It's an all-in-one trading tool — from learning ICT concepts, to daily planning, risk calculating, journaling, smart analytics, and even an AI mentor and coach. Get started trading just like me 👉 ${appUrl}`;
    const isAvailable = await ExpoSharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert("Sharing not available", "Sharing is not available on this device.");
      return;
    }
    try {
      await Share.share({ message, url: appUrl });
    } catch {
    }
  }

  async function handleLogout() {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await logout();
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
      <SafeAreaView style={s.safe} edges={["bottom"]}>
        <View style={s.center}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={["bottom"]}>
      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>Settings</Text>
      </View>

      {showTimePicker === "morning" && (
        <TimePicker
          value={notifSettings.morningTime}
          onChange={(v) => updateNotifSettings({ morningTime: v })}
          onClose={() => setShowTimePicker(null)}
        />
      )}
      {showTimePicker === "evening" && (
        <TimePicker
          value={notifSettings.eveningTime}
          onChange={(v) => updateNotifSettings({ eveningTime: v })}
          onClose={() => setShowTimePicker(null)}
        />
      )}

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

        {/* App Mode */}
        <View style={s.card}>
          <CardHeader icon="options-outline" title="App Mode" />
          <View style={s.section}>
            <Text style={{ color: C.textSecondary, fontSize: 12, marginBottom: 12 }}>
              Learning Mode shows only essential features. Full Mode unlocks everything.
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {(["lite", "full"] as const).map((mode) => {
                const active = currentAppMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => handleAppModeChange(mode)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 8,
                      borderWidth: 1,
                      borderColor: active ? C.accent : C.cardBorder,
                      backgroundColor: active ? C.accent + "20" : "transparent",
                      alignItems: "center",
                    }}
                  >
                    <Ionicons
                      name={mode === "lite" ? "flash-outline" : "layers-outline"}
                      size={18}
                      color={active ? C.accent : C.textSecondary}
                    />
                    <Text
                      style={{
                        color: active ? C.accent : C.textSecondary,
                        fontSize: 13,
                        fontWeight: active ? "700" : "500",
                        marginTop: 4,
                      }}
                    >
                      {mode === "lite" ? "Learning" : "Full"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>

        {/* Edit Dashboard */}
        <View style={s.card}>
          <CardHeader icon="grid-outline" title="Dashboard Widgets" />
          <View style={s.section}>
            <Text style={{ color: C.textSecondary, fontSize: 12, marginBottom: 12 }}>
              Toggle widgets on or off to customise your dashboard.
            </Text>
            {WIDGET_CONFIG.map((widget) => (
              <View key={widget.key} style={s.toggleRow}>
                <View style={[s.toggleIcon, { backgroundColor: C.backgroundTertiary }]}>
                  <Ionicons name={widget.icon} size={18} color={C.accent} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={s.toggleLabel}>{widget.label}</Text>
                  <Text style={s.toggleDesc}>{widget.desc}</Text>
                </View>
                <Switch
                  value={widgetPrefs[widget.key]}
                  onValueChange={async () => {
                    const next = { ...widgetPrefs, [widget.key]: !widgetPrefs[widget.key] };
                    setWidgetPrefs(next);
                    await AsyncStorage.setItem(WIDGET_PREFS_KEY, JSON.stringify(next));
                  }}
                  trackColor={{ false: C.cardBorder, true: C.accent + "60" }}
                  thumbColor={widgetPrefs[widget.key] ? C.accent : C.textSecondary}
                />
              </View>
            ))}
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

        {/* Share / Invite Friends */}
        <View style={s.card}>
          <CardHeader icon="share-social-outline" title="Invite Friends" />
          <View style={s.section}>
            {founderSpotsLeft !== null && (
              <View style={shareS.urgency}>
                <Text style={shareS.urgencyText}>
                  🔥 {founderSpotsLeft > 0
                    ? `Only ${founderSpotsLeft} Founder spot${founderSpotsLeft !== 1 ? "s" : ""} left — share now to help your friends save 50%!`
                    : "Founder spots are full — but sharing is still appreciated!"}
                </Text>
              </View>
            )}
            <Text style={[s.label, { marginTop: founderSpotsLeft !== null ? 4 : 0 }]}>
              Share this app with your trading network
            </Text>
            <TouchableOpacity style={shareS.shareBtn} onPress={handleShare}>
              <Ionicons name="share-social-outline" size={18} color="#0A0A0F" />
              <Text style={shareS.shareBtnText}>Share with Friends</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifications */}
        {Platform.OS !== "web" && (
          <View style={s.card}>
            <CardHeader icon="notifications-outline" title="Notifications" />
            <View style={s.section}>
              {!notifSettings.permissionGranted ? (
                <>
                  <Text style={s.hint}>
                    Enable notifications to get kill zone alerts and daily reminders.
                  </Text>
                  <SaveButton
                    onPress={requestPermission}
                    loading={false}
                    label="Enable Notifications"
                  />
                </>
              ) : (
                <>
                  <Text style={[s.label, { marginBottom: 4 }]}>Kill Zone Alerts (5 min before)</Text>

                  <View style={notifS.row}>
                    <Text style={notifS.rowLabel}>London Open (7:00 AM UTC)</Text>
                    <Switch
                      value={notifSettings.killZoneLondon}
                      onValueChange={(v) => updateNotifSettings({ killZoneLondon: v })}
                      trackColor={{ false: C.cardBorder, true: C.accent }}
                      thumbColor="#fff"
                    />
                  </View>

                  <View style={notifS.row}>
                    <Text style={notifS.rowLabel}>NY Open (1:30 PM UTC)</Text>
                    <Switch
                      value={notifSettings.killZoneNY}
                      onValueChange={(v) => updateNotifSettings({ killZoneNY: v })}
                      trackColor={{ false: C.cardBorder, true: C.accent }}
                      thumbColor="#fff"
                    />
                  </View>

                  <View style={notifS.row}>
                    <Text style={notifS.rowLabel}>Asian Session (12:00 AM UTC)</Text>
                    <Switch
                      value={notifSettings.killZoneAsian}
                      onValueChange={(v) => updateNotifSettings({ killZoneAsian: v })}
                      trackColor={{ false: C.cardBorder, true: C.accent }}
                      thumbColor="#fff"
                    />
                  </View>

                  <View style={notifS.divider} />

                  <Text style={[s.label, { marginBottom: 4 }]}>Daily Reminders</Text>

                  <View style={notifS.row}>
                    <Text style={notifS.rowLabel}>Morning Routine</Text>
                    <Switch
                      value={notifSettings.morningReminder}
                      onValueChange={(v) => updateNotifSettings({ morningReminder: v })}
                      trackColor={{ false: C.cardBorder, true: C.accent }}
                      thumbColor="#fff"
                    />
                  </View>
                  {notifSettings.morningReminder && (
                    <TouchableOpacity
                      style={notifS.timePicker}
                      onPress={() => setShowTimePicker("morning")}
                    >
                      <Ionicons name="time-outline" size={14} color={C.textSecondary} />
                      <Text style={notifS.timePickerText}>{notifSettings.morningTime}</Text>
                      <Ionicons name="chevron-forward" size={13} color={C.textSecondary} />
                    </TouchableOpacity>
                  )}

                  <View style={notifS.row}>
                    <Text style={notifS.rowLabel}>Evening Journal</Text>
                    <Switch
                      value={notifSettings.eveningReminder}
                      onValueChange={(v) => updateNotifSettings({ eveningReminder: v })}
                      trackColor={{ false: C.cardBorder, true: C.accent }}
                      thumbColor="#fff"
                    />
                  </View>
                  {notifSettings.eveningReminder && (
                    <TouchableOpacity
                      style={notifS.timePicker}
                      onPress={() => setShowTimePicker("evening")}
                    >
                      <Ionicons name="time-outline" size={14} color={C.textSecondary} />
                      <Text style={notifS.timePickerText}>{notifSettings.eveningTime}</Text>
                      <Ionicons name="chevron-forward" size={13} color={C.textSecondary} />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        )}

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

const notifS = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  rowLabel: { fontSize: 14, color: C.text, flex: 1 },
  divider: {
    height: 1,
    backgroundColor: C.cardBorder,
    marginVertical: 8,
  },
  timePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.backgroundSecondary,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 4,
  },
  timePickerText: {
    fontSize: 15,
    fontWeight: "600",
    color: C.accent,
    flex: 1,
  },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  pageTitle: { fontSize: 22, fontWeight: "800", color: C.text },
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 100, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    backgroundColor: C.card,
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
    backgroundColor: C.card,
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
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.cardBorder,
  },
  toggleIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: C.text,
    marginBottom: 2,
  },
  toggleDesc: {
    fontSize: 11,
    color: C.textSecondary,
  },
});

const shareS = StyleSheet.create({
  urgency: {
    backgroundColor: C.accent + "18",
    borderWidth: 1,
    borderColor: C.accent + "40",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 4,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: "600",
    color: C.accent,
    lineHeight: 17,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 12,
    marginTop: 4,
  },
  shareBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0A0A0F",
  },
});
