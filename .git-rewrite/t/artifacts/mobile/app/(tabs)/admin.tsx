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
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { apiGet, apiPut } from "@/lib/api";
import Colors from "@/constants/colors";

const C = Colors.dark;

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const TOGGLE_KEYS: { key: string; label: string; desc: string }[] = [
  {
    key: "founder_program_enabled",
    label: "Founder Program",
    desc: "Show founder pricing and status badges",
  },
  {
    key: "community_enabled",
    label: "Community Hub",
    desc: "Enable the community forum tab",
  },
  {
    key: "journal_enabled",
    label: "Smart Journal",
    desc: "Enable trade journaling features",
  },
  {
    key: "academy_enabled",
    label: "ICT Academy",
    desc: "Enable the academy lessons tab",
  },
  {
    key: "analytics_enabled",
    label: "Analytics Dashboard",
    desc: "Enable analytics for all users",
  },
  {
    key: "spin_wheel_enabled",
    label: "Daily Spin Wheel",
    desc: "Enable the daily reward spin",
  },
];

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: IoniconsName;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={sc.card}>
      <View style={sc.header}>
        <Ionicons name={icon} size={15} color={C.accent} />
        <Text style={sc.title}>{title}</Text>
      </View>
      <View style={sc.body}>{children}</View>
    </View>
  );
}

const sc = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 14,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  title: { fontSize: 13, fontWeight: "700", color: C.text },
  body: { padding: 16, gap: 5 },
});

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "email-address" | "decimal-pad" | "number-pad";
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={fi.label}>{label}</Text>
      <TextInput
        style={fi.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={C.textSecondary}
        keyboardType={keyboardType}
        autoCapitalize="none"
      />
    </View>
  );
}

const fi = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "600", color: C.textSecondary },
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
});

export default function AdminScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const data = await apiGet<{ settings: Record<string, string> }>(
        "admin/settings"
      );
      setSettings(data.settings || {});
    } catch {
      Alert.alert(
        "Access Denied",
        "Admin access required to view this screen."
      );
      router.back();
    } finally {
      setLoading(false);
    }
  }

  function set(key: string, value: string) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  function toggle(key: string) {
    setSettings((s) => ({ ...s, [key]: s[key] === "false" ? "true" : "false" }));
  }

  async function save() {
    setSaving(true);
    try {
      await apiPut("admin/settings", { settings });
      Alert.alert("Saved", "Admin settings saved successfully");
    } catch {
      Alert.alert("Error", "Failed to save settings");
    }
    setSaving(false);
  }

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
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={s.title}>Admin Panel</Text>
        <TouchableOpacity
          style={[s.saveBtn, saving && s.saveBtnLoading]}
          onPress={save}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#0A0A0F" />
          ) : (
            <Text style={s.saveBtnText}>Save All</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Branding */}
        <SectionCard icon="color-palette-outline" title="App Branding">
          <FieldInput
            label="App Name"
            value={settings["app_name"] || ""}
            onChange={(v) => set("app_name", v)}
            placeholder="ICT Trading Mentor"
          />
          <View style={{ height: 6 }} />
          <FieldInput
            label="Support Email"
            value={settings["support_email"] || ""}
            onChange={(v) => set("support_email", v)}
            placeholder="support@ictmentor.com"
            keyboardType="email-address"
          />
          <View style={{ height: 6 }} />
          <FieldInput
            label="App Tagline"
            value={settings["app_tagline"] || ""}
            onChange={(v) => set("app_tagline", v)}
            placeholder="Master ICT methodology with AI coaching"
          />
        </SectionCard>

        {/* Founder Program */}
        <SectionCard icon="diamond-outline" title="Founder Program">
          <FieldInput
            label="Max Founder Spots"
            value={settings["founder_max_spots"] || "20"}
            onChange={(v) => set("founder_max_spots", v)}
            placeholder="20"
            keyboardType="number-pad"
          />
          <View style={{ height: 6 }} />
          <FieldInput
            label="Founder Discount (%)"
            value={settings["founder_discount_pct"] || "30"}
            onChange={(v) => set("founder_discount_pct", v)}
            placeholder="30"
            keyboardType="decimal-pad"
          />
        </SectionCard>

        {/* Discipline Rules */}
        <SectionCard icon="shield-outline" title="Discipline Rules">
          <FieldInput
            label="Cooldown After Losses (minutes)"
            value={settings["cooldown_minutes"] || "60"}
            onChange={(v) => set("cooldown_minutes", v)}
            placeholder="60"
            keyboardType="number-pad"
          />
          <View style={{ height: 6 }} />
          <FieldInput
            label="Losses Before Cooldown Triggers"
            value={settings["cooldown_trigger_losses"] || "3"}
            onChange={(v) => set("cooldown_trigger_losses", v)}
            placeholder="3"
            keyboardType="number-pad"
          />
          <View style={{ height: 6 }} />
          <FieldInput
            label="Default Max Daily Loss (%)"
            value={settings["default_max_daily_loss_pct"] || "2"}
            onChange={(v) => set("default_max_daily_loss_pct", v)}
            placeholder="2"
            keyboardType="decimal-pad"
          />
        </SectionCard>

        {/* Feature Toggles */}
        <SectionCard icon="toggle-outline" title="Feature Toggles">
          {TOGGLE_KEYS.map((item, idx) => {
            const isOn = settings[item.key] !== "false";
            return (
              <View
                key={item.key}
                style={[
                  s.toggleRow,
                  idx < TOGGLE_KEYS.length - 1 && s.toggleBorder,
                ]}
              >
                <View style={s.toggleInfo}>
                  <Text style={s.toggleLabel}>{item.label}</Text>
                  <Text style={s.toggleDesc}>{item.desc}</Text>
                </View>
                <Switch
                  value={isOn}
                  onValueChange={() => toggle(item.key)}
                  trackColor={{ false: C.cardBorder, true: C.accent + "70" }}
                  thumbColor={isOn ? C.accent : C.textSecondary}
                  ios_backgroundColor={C.cardBorder}
                />
              </View>
            );
          })}
        </SectionCard>

        <Text style={s.note}>
          Changes are applied to all users immediately after saving.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
    gap: 8,
  },
  backBtn: { padding: 4 },
  title: { flex: 1, fontSize: 18, fontWeight: "800", color: C.text },
  saveBtn: {
    backgroundColor: C.accent,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 70,
    alignItems: "center",
  },
  saveBtnLoading: { opacity: 0.65 },
  saveBtnText: { fontSize: 13, fontWeight: "700", color: "#0A0A0F" },
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 100, gap: 12 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  toggleBorder: {
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: C.text },
  toggleDesc: { fontSize: 11, color: C.textSecondary, marginTop: 1 },
  note: {
    fontSize: 11,
    color: C.textSecondary,
    textAlign: "center",
    marginTop: 4,
  },
});
