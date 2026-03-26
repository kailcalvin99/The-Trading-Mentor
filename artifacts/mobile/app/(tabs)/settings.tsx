import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Share,
  Modal,
  Image,
} from "react-native";
import * as ExpoSharing from "expo-sharing";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { apiGet, apiPatch, getBaseUrl, isSessionExpiredError } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";
import {
  WIDGET_PREFS_KEY,
  WIDGET_CONFIG,
  DEFAULT_WIDGET_PREFS,
  type WidgetPrefs,
} from "@/constants/dashboardWidgets";
import { useScrollCollapseProps } from "@/contexts/ScrollDirectionContext";
import RulesBeforeTradeModal from "@/components/RulesBeforeTradeModal";

const C = Colors.dark;

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const WEBHOOK_API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

const WEBHOOK_SETUP_STEPS = [
  { step: 1, title: "Copy your Webhook URL", desc: "Copy the unique URL shown above — this is your personal webhook endpoint." },
  { step: 2, title: "Open TradingView", desc: "Go to TradingView and open your NQ/MNQ chart. Tap the Alert button (clock icon) to create a new alert." },
  { step: 3, title: "Set the webhook URL", desc: 'In Alert settings, switch to the "Notifications" tab. Enable "Webhook URL" and paste your URL.' },
  { step: 4, title: "Configure the alert message", desc: 'In the "Alert message" field, paste one of the example payloads. TradingView will send this JSON when the alert fires.' },
  { step: 5, title: "Fire the alert", desc: "When TradingView fires the alert, a draft trade is automatically created in your Smart Journal — ready for you to review and confirm." },
];

const WEBHOOK_ALERT_EXAMPLES = [
  {
    label: "Long Entry (Buy) — Full",
    payload: `{\n  "ticker": "NQ1!",\n  "side": "BUY",\n  "price": "{{close}}",\n  "sl": "{{plot_0}}",\n  "tp": "{{plot_1}}",\n  "session": "NY Open",\n  "timestamp": "{{timenow}}"\n}`,
  },
  {
    label: "Short Entry (Sell) — Full",
    payload: `{\n  "ticker": "NQ1!",\n  "side": "SELL",\n  "price": "{{close}}",\n  "sl": "{{plot_0}}",\n  "tp": "{{plot_1}}",\n  "session": "London Open",\n  "timestamp": "{{timenow}}"\n}`,
  },
  {
    label: "Simple Buy (minimal)",
    payload: `{\n  "ticker": "NQ1!",\n  "side": "BUY",\n  "price": "{{close}}",\n  "timestamp": "{{timenow}}"\n}`,
  },
  {
    label: "MNQ Long",
    payload: `{\n  "ticker": "MNQ1!",\n  "side": "BUY",\n  "price": "{{close}}",\n  "timestamp": "{{timenow}}"\n}`,
  },
];

const WEBHOOK_FIELD_NOTES = [
  { field: "ticker", required: true, desc: "Symbol (e.g. NQ1!, MNQ1!, ES1!)" },
  { field: "side", required: true, desc: "BUY or SELL" },
  { field: "price", required: true, desc: "Entry price — use {{close}} for current bar" },
  { field: "sl", required: false, desc: "Stop loss price — used to auto-calculate risk %" },
  { field: "tp", required: false, desc: "Take profit price" },
  { field: "timestamp", required: false, desc: "Alert time — use {{timenow}} for accurate session detection" },
  { field: "session", required: false, desc: "Override session label manually — skips auto-detection" },
];

const STOCK_AVATARS = [
  { id: "bull", emoji: "🐂", label: "Bull" },
  { id: "bear", emoji: "🐻", label: "Bear" },
  { id: "chart", emoji: "📈", label: "Chart" },
  { id: "candle", emoji: "🕯️", label: "Candle" },
  { id: "rocket", emoji: "🚀", label: "Rocket" },
  { id: "shield", emoji: "🛡️", label: "Shield" },
  { id: "flame", emoji: "🔥", label: "Flame" },
  { id: "crown", emoji: "👑", label: "Crown" },
];

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
  const scrollCollapseProps = useScrollCollapseProps();
  const router = useRouter();
  const { logout, appMode, setAppMode, user, setAvatarUrl, tierLevel, isAdmin } = useAuth();
  const [currentAppMode, setCurrentAppMode] = useState<"full" | "lite">(appMode);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

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
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [founderSpotsLeft, setFounderSpotsLeft] = useState<number | null>(null);
  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPrefs>(DEFAULT_WIDGET_PREFS);

  const [webhooksExpanded, setWebhooksExpanded] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [webhookStepExpanded, setWebhookStepExpanded] = useState<number | null>(null);
  const [webhookExampleCopied, setWebhookExampleCopied] = useState<number | null>(null);

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
        tierLevel: isAdmin ? 2 : (meData.subscription?.tierLevel ?? 0),
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
    } catch (err: unknown) {
      if (isSessionExpiredError(err)) return;
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
      if (isSessionExpiredError(e)) return;
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
    } catch (err: unknown) {
      if (isSessionExpiredError(err)) return;
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
    } catch (err: unknown) {
      if (isSessionExpiredError(err)) return;
      Alert.alert("Error", "Failed to save risk rules");
    }
    setSaving(null);
  }

  async function loadWebhookUrl() {
    if (webhookUrl || webhookLoading) return;
    if (!isAdmin && tierLevel < 2) return;
    setWebhookLoading(true);
    setWebhookError(null);
    try {
      const res = await fetch(`${WEBHOOK_API_BASE}/webhook/tradingview/info`, { credentials: "include" });
      const data = await res.json();
      if (data.webhookUrl) {
        setWebhookUrl(data.webhookUrl);
      } else {
        setWebhookError(data.error || "Failed to load webhook info");
      }
    } catch {
      setWebhookError("Failed to load webhook info");
    } finally {
      setWebhookLoading(false);
    }
  }

  async function copyWebhookUrl() {
    if (!webhookUrl) return;
    try {
      await Share.share({ message: webhookUrl });
      setWebhookCopied(true);
      setTimeout(() => setWebhookCopied(false), 2000);
    } catch {}
  }

  async function copyWebhookExample(idx: number, payload: string) {
    try {
      await Share.share({ message: payload });
      setWebhookExampleCopied(idx);
      setTimeout(() => setWebhookExampleCopied(null), 2000);
    } catch {}
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
    tierLevel === 0
      ? "Free"
      : tierLevel === 1
      ? "Standard"
      : tierLevel === 2
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

  const avatarUrl = user?.avatarUrl;
  const initials = (profile.name || profile.email || "U")[0].toUpperCase();

  return (
    <SafeAreaView style={s.safe} edges={["bottom"]}>
      {/* Avatar Picker Modal */}
      <Modal visible={showAvatarPicker} transparent animationType="slide" onRequestClose={() => setShowAvatarPicker(false)}>
        <TouchableOpacity style={ap.overlay} activeOpacity={1} onPress={() => setShowAvatarPicker(false)} />
        <View style={ap.sheet}>
          <View style={ap.handle} />
          <Text style={ap.title}>Choose Avatar</Text>
          <Text style={ap.subtitle}>Pick a trading avatar or upload your photo</Text>
          <View style={ap.grid}>
            {STOCK_AVATARS.map((av) => (
              <TouchableOpacity
                key={av.id}
                style={[ap.option, avatarUrl === av.emoji && ap.optionSelected]}
                onPress={async () => {
                  await setAvatarUrl(av.emoji);
                  setShowAvatarPicker(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={ap.emoji}>{av.emoji}</Text>
                <Text style={ap.label}>{av.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={ap.uploadRow}>
            <TouchableOpacity
              style={ap.uploadBtn}
              activeOpacity={0.7}
              onPress={async () => {
                const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (status !== "granted") return;
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: "images",
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.8,
                });
                if (!result.canceled && result.assets[0]) {
                  const manipulated = await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 200, height: 200 } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
                  );
                  await setAvatarUrl(`data:image/jpeg;base64,${manipulated.base64}`);
                  setShowAvatarPicker(false);
                }
              }}
            >
              <Ionicons name="image-outline" size={16} color={C.accent} />
              <Text style={ap.uploadBtnText}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={ap.uploadBtn}
              activeOpacity={0.7}
              onPress={async () => {
                const { status } = await ImagePicker.requestCameraPermissionsAsync();
                if (status !== "granted") return;
                const result = await ImagePicker.launchCameraAsync({
                  allowsEditing: true,
                  aspect: [1, 1],
                  quality: 0.8,
                });
                if (!result.canceled && result.assets[0]) {
                  const manipulated = await ImageManipulator.manipulateAsync(
                    result.assets[0].uri,
                    [{ resize: { width: 200, height: 200 } }],
                    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
                  );
                  await setAvatarUrl(`data:image/jpeg;base64,${manipulated.base64}`);
                  setShowAvatarPicker(false);
                }
              }}
            >
              <Ionicons name="camera-outline" size={16} color={C.accent} />
              <Text style={ap.uploadBtnText}>Camera</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={ap.doneBtn} onPress={() => setShowAvatarPicker(false)}>
            <Text style={ap.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>Settings</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        {...scrollCollapseProps}
      >
        {/* Account card */}
        <View style={s.card}>
          <View style={s.accountRow}>
            <TouchableOpacity
              style={[s.avatar, { position: "relative" }]}
              onPress={() => setShowAvatarPicker(true)}
              activeOpacity={0.8}
              accessibilityLabel="Change avatar"
            >
              {avatarUrl ? (
                avatarUrl.startsWith("data:") || avatarUrl.startsWith("http") ? (
                  <Image source={{ uri: avatarUrl }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                ) : (
                  <Text style={{ fontSize: 24 }}>{avatarUrl}</Text>
                )
              ) : (
                <Text style={s.avatarText}>{initials}</Text>
              )}
              <View style={s.avatarEditBadge}>
                <Ionicons name="pencil" size={8} color="#0A0A0F" />
              </View>
            </TouchableOpacity>
            <View style={s.accountInfo}>
              <Text style={s.accountName}>{profile.name || "User"}</Text>
              <Text style={s.accountEmail}>{profile.email}</Text>
              <View style={s.tierRow}>
                <Ionicons
                  name={tierLevel > 0 ? "star" : "person-outline"}
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

        {/* My Trading Rules */}
        <View style={s.card}>
          <CardHeader icon="shield-checkmark-outline" title="My Trading Rules" />
          <View style={s.section}>
            <Text style={{ color: C.textSecondary, fontSize: 12, marginBottom: 12 }}>
              Manage your personal "Rules Before I Trade" checklist. Add, remove, or reorder rules to reinforce discipline in your morning routine.
            </Text>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                backgroundColor: C.accent + "18",
                borderWidth: 1,
                borderColor: C.accent + "40",
                borderRadius: 10,
                paddingVertical: 12,
              }}
              onPress={() => setShowRulesModal(true)}
              activeOpacity={0.75}
            >
              <Ionicons name="create-outline" size={16} color={C.accent} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: C.accent }}>
                Edit Trading Rules
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <RulesBeforeTradeModal
          visible={showRulesModal}
          onClose={() => setShowRulesModal(false)}
          onConfirm={() => setShowRulesModal(false)}
          initialEditMode
        />

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

        {/* TradingView Webhooks — Premium feature */}
        {(isAdmin || tierLevel >= 2) && (
          <View style={s.card}>
            <TouchableOpacity
              onPress={() => {
                const next = !webhooksExpanded;
                setWebhooksExpanded(next);
                if (next) loadWebhookUrl();
              }}
              activeOpacity={0.8}
            >
              <View style={[hdr.row, { justifyContent: "space-between" }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="flash" size={15} color={C.accent} />
                  <Text style={hdr.title}>TradingView Webhooks</Text>
                </View>
                <Ionicons name={webhooksExpanded ? "chevron-up" : "chevron-down"} size={16} color={C.textSecondary} />
              </View>
            </TouchableOpacity>
            {webhooksExpanded && (
              <View style={s.section}>
                <Text style={{ fontSize: 12, color: C.textSecondary, marginBottom: 8 }}>
                  Auto-create draft trades in your Smart Journal when TradingView alerts fire.
                </Text>

                {/* Webhook URL */}
                <Text style={[s.label, { marginBottom: 6 }]}>Your Webhook URL</Text>
                {webhookLoading ? (
                  <ActivityIndicator size="small" color={C.accent} style={{ alignSelf: "flex-start" }} />
                ) : webhookError ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="warning-outline" size={14} color="#EF4444" />
                    <Text style={{ fontSize: 12, color: "#EF4444", flex: 1 }}>{webhookError}</Text>
                  </View>
                ) : webhookUrl ? (
                  <>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <Text
                        style={[s.input, { flex: 1, fontSize: 10, color: C.textSecondary, paddingVertical: 8 }]}
                        numberOfLines={2}
                      >
                        {webhookUrl}
                      </Text>
                      <TouchableOpacity
                        style={{ backgroundColor: C.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 4 }}
                        onPress={copyWebhookUrl}
                        activeOpacity={0.8}
                      >
                        <Ionicons name={webhookCopied ? "checkmark" : "copy-outline"} size={14} color="#0A0A0F" />
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#0A0A0F" }}>{webhookCopied ? "Copied!" : "Copy"}</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: "#F59E0B12", borderRadius: 8, padding: 8, borderWidth: 1, borderColor: "#F59E0B30", marginBottom: 12 }}>
                      <Ionicons name="warning-outline" size={13} color="#F59E0B" />
                      <Text style={{ fontSize: 11, color: "#F59E0B", flex: 1 }}>Keep this URL private. Anyone with it can create draft trades in your journal.</Text>
                    </View>
                  </>
                ) : null}

                {/* Setup Steps */}
                <Text style={[s.label, { marginBottom: 8 }]}>Setup Guide</Text>
                {WEBHOOK_SETUP_STEPS.map((step) => (
                  <View key={step.step} style={{ borderWidth: 1, borderColor: C.cardBorder, borderRadius: 10, overflow: "hidden", marginBottom: 6 }}>
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center", gap: 10, padding: 10 }}
                      onPress={() => setWebhookStepExpanded(webhookStepExpanded === step.step ? null : step.step)}
                      activeOpacity={0.8}
                    >
                      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: C.accent + "20", alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: C.accent }}>{step.step}</Text>
                      </View>
                      <Text style={{ flex: 1, fontSize: 13, fontWeight: "600", color: C.text }}>{step.title}</Text>
                      <Ionicons name={webhookStepExpanded === step.step ? "chevron-up" : "chevron-down"} size={14} color={C.textSecondary} />
                    </TouchableOpacity>
                    {webhookStepExpanded === step.step && (
                      <Text style={{ fontSize: 12, color: C.textSecondary, lineHeight: 18, paddingHorizontal: 10, paddingBottom: 10, paddingLeft: 42 }}>{step.desc}</Text>
                    )}
                  </View>
                ))}

                {/* Alert Message Examples */}
                <Text style={[s.label, { marginTop: 12, marginBottom: 4 }]}>Alert Message Examples</Text>
                <Text style={{ fontSize: 11, color: C.textSecondary, marginBottom: 8, lineHeight: 16 }}>
                  Paste one of these into the TradingView alert message field.
                </Text>
                {WEBHOOK_ALERT_EXAMPLES.map((ex, i) => (
                  <View key={i} style={{ borderWidth: 1, borderColor: C.cardBorder, borderRadius: 10, overflow: "hidden", marginBottom: 6 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10, backgroundColor: C.backgroundSecondary, borderBottomWidth: 1, borderBottomColor: C.cardBorder }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: C.text, flex: 1 }}>{ex.label}</Text>
                      <TouchableOpacity
                        onPress={() => copyWebhookExample(i, ex.payload)}
                        style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                        activeOpacity={0.7}
                      >
                        <Ionicons name={webhookExampleCopied === i ? "checkmark" : "copy-outline"} size={13} color={webhookExampleCopied === i ? C.accent : C.textSecondary} />
                        <Text style={{ fontSize: 11, color: webhookExampleCopied === i ? C.accent : C.textSecondary }}>{webhookExampleCopied === i ? "Copied" : "Copy"}</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontFamily: "Inter_400Regular", fontSize: 10, color: C.textSecondary, padding: 10, lineHeight: 16 }}>{ex.payload}</Text>
                  </View>
                ))}

                {/* Payload Field Reference */}
                <Text style={[s.label, { marginTop: 12, marginBottom: 8 }]}>Payload Field Reference</Text>
                {WEBHOOK_FIELD_NOTES.map((f) => (
                  <View key={f.field} style={{ marginBottom: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: C.text }}>{f.field}</Text>
                      <View style={{ borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: f.required ? "#EF444420" : C.accent + "15" }}>
                        <Text style={{ fontSize: 10, fontWeight: "600", color: f.required ? "#EF4444" : C.accent }}>{f.required ? "required" : "optional"}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, color: C.textSecondary, lineHeight: 17 }}>{f.desc}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

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

        <Text style={s.footer}>The Trading Mentor · Educational use only</Text>
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
  avatarEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
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

const ap = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.cardBorder,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: "center",
    marginBottom: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "center",
    marginBottom: 16,
  },
  option: {
    width: 72,
    height: 72,
    borderRadius: 12,
    backgroundColor: C.backgroundSecondary,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  optionSelected: {
    borderColor: C.accent,
    backgroundColor: C.accent + "20",
  },
  emoji: { fontSize: 28 },
  label: { fontSize: 10, color: C.textSecondary },
  uploadRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  uploadBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: C.backgroundSecondary,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 10,
    paddingVertical: 11,
  },
  uploadBtnText: { fontSize: 13, fontWeight: "600", color: C.accent },
  doneBtn: {
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  doneBtnText: { fontSize: 14, fontWeight: "700", color: "#0A0A0F" },
});
