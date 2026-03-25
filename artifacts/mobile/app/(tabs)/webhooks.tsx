import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import Colors from "@/constants/colors";
import FrostedGate from "@/components/FrostedGate";
import FullModeGate from "@/components/FullModeGate";
import { WebhooksDemoSnapshot } from "@/components/DemoSnapshots";

const C = Colors.dark;

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "http://localhost:8080/api";

const SETUP_STEPS = [
  {
    step: 1,
    title: "Copy your Webhook URL",
    desc: "Copy the unique URL shown above — this is your personal webhook endpoint.",
  },
  {
    step: 2,
    title: "Open TradingView",
    desc: "Go to TradingView and open your NQ/MNQ chart. Tap the Alert button (clock icon) to create a new alert.",
  },
  {
    step: 3,
    title: "Set the webhook URL",
    desc: 'In Alert settings, switch to the "Notifications" tab. Enable "Webhook URL" and paste your URL.',
  },
  {
    step: 4,
    title: "Configure the alert message",
    desc: 'In the "Alert message" field, paste one of the example payloads below. TradingView will send this JSON when the alert fires.',
  },
  {
    step: 5,
    title: "Fire the alert",
    desc: "When TradingView fires the alert, a draft trade is automatically created in your Smart Journal — ready for you to review and confirm.",
  },
];

const ALERT_EXAMPLES = [
  {
    label: "Long Entry (Buy) — Full",
    payload: `{
  "ticker": "NQ1!",
  "side": "BUY",
  "price": "{{close}}",
  "sl": "{{plot_0}}",
  "tp": "{{plot_1}}",
  "session": "NY Open",
  "timestamp": "{{timenow}}"
}`,
  },
  {
    label: "Short Entry (Sell) — Full",
    payload: `{
  "ticker": "NQ1!",
  "side": "SELL",
  "price": "{{close}}",
  "sl": "{{plot_0}}",
  "tp": "{{plot_1}}",
  "session": "London Open",
  "timestamp": "{{timenow}}"
}`,
  },
  {
    label: "Simple Buy (minimal)",
    payload: `{
  "ticker": "NQ1!",
  "side": "BUY",
  "price": "{{close}}",
  "timestamp": "{{timenow}}"
}`,
  },
  {
    label: "MNQ Long",
    payload: `{
  "ticker": "MNQ1!",
  "side": "BUY",
  "price": "{{close}}",
  "timestamp": "{{timenow}}"
}`,
  },
];

const FIELD_NOTES = [
  { field: "ticker", required: true, desc: "Symbol (e.g. NQ1!, MNQ1!, ES1!)" },
  { field: "side", required: true, desc: "BUY or SELL" },
  { field: "price", required: true, desc: "Entry price — use {{close}} for current bar" },
  { field: "sl", required: false, desc: "Stop loss price — used to auto-calculate risk %" },
  { field: "tp", required: false, desc: "Take profit price" },
  { field: "timestamp", required: false, desc: "Alert time — use {{timenow}} for accurate session detection (London Open, NY Open, Silver Bullet)" },
  { field: "session", required: false, desc: "Override session label manually — skips auto-detection" },
];

export default function WebhooksScreenGated() {
  return (
    <FullModeGate demoContent={<WebhooksDemoSnapshot />}>
      <WebhooksScreen />
    </FullModeGate>
  );
}

function WebhooksScreen() {
  const { tierLevel, isAdmin } = useAuth();
  const router = useRouter();

  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedExample, setCopiedExample] = useState<number | null>(null);
  const [expandedStep, setExpandedStep] = useState<number | null>(1);

  useEffect(() => {
    if (!isAdmin && tierLevel < 2) return;
    setLoading(true);
    fetch(`${API_BASE}/webhook/tradingview/info`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.webhookUrl) {
          setWebhookUrl(data.webhookUrl);
        } else {
          setError(data.error || "Failed to load webhook info");
        }
      })
      .catch(() => setError("Failed to load webhook info"))
      .finally(() => setLoading(false));
  }, [tierLevel, isAdmin]);

  if (!isAdmin && tierLevel < 2) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <FrostedGate mode="premium">
          <WebhooksDemoSnapshot />
        </FrostedGate>
      </SafeAreaView>
    );
  }

  async function copyUrl() {
    if (!webhookUrl) return;
    try {
      await Share.share({ message: webhookUrl });
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {}
  }

  async function copyExample(idx: number, payload: string) {
    try {
      await Share.share({ message: payload });
      setCopiedExample(idx);
      setTimeout(() => setCopiedExample(null), 2000);
    } catch {}
  }

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Ionicons name="flash" size={22} color={C.accent} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>TradingView Webhooks</Text>
            <Text style={styles.subtitle}>Auto-create draft trades from TradingView alerts</Text>
          </View>
        </View>

        {/* Webhook URL Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="link" size={16} color={C.accent} />
            <Text style={styles.cardTitle}>Your Webhook URL</Text>
          </View>
          {loading ? (
            <Text style={styles.loadingText}>Loading webhook info...</Text>
          ) : error ? (
            <View style={styles.errorRow}>
              <Ionicons name="warning-outline" size={16} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : webhookUrl ? (
            <>
              <View style={styles.urlRow}>
                <Text style={styles.urlText} numberOfLines={2}>{webhookUrl}</Text>
                <TouchableOpacity style={styles.copyBtn} onPress={copyUrl} activeOpacity={0.8}>
                  <Ionicons name={copiedUrl ? "checkmark" : "copy-outline"} size={16} color="#0A0A0F" />
                  <Text style={styles.copyBtnText}>{copiedUrl ? "Copied!" : "Copy"}</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.warningRow}>
                <Ionicons name="warning-outline" size={14} color="#F59E0B" />
                <Text style={styles.warningText}>
                  Keep this URL private. Anyone with it can create draft trades in your journal.
                </Text>
              </View>
            </>
          ) : null}
        </View>

        {/* Setup Guide */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle-outline" size={16} color={C.accent} />
            <Text style={styles.cardTitle}>Setup Guide</Text>
          </View>
          {SETUP_STEPS.map((s) => (
            <View key={s.step} style={styles.stepItem}>
              <TouchableOpacity
                style={styles.stepHeader}
                onPress={() => setExpandedStep(expandedStep === s.step ? null : s.step)}
                activeOpacity={0.8}
              >
                <View style={styles.stepNum}>
                  <Text style={styles.stepNumText}>{s.step}</Text>
                </View>
                <Text style={styles.stepTitle}>{s.title}</Text>
                <Ionicons
                  name={expandedStep === s.step ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={C.textSecondary}
                />
              </TouchableOpacity>
              {expandedStep === s.step && (
                <Text style={styles.stepDesc}>{s.desc}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Alert Examples */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="code-slash-outline" size={16} color={C.accent} />
            <Text style={styles.cardTitle}>Alert Message Examples</Text>
          </View>
          <Text style={styles.helperText}>
            Paste one of these into the TradingView alert message field. Optional fields (sl, tp, session) enable smarter pre-filling.
          </Text>
          {ALERT_EXAMPLES.map((ex, i) => (
            <View key={i} style={styles.exampleCard}>
              <View style={styles.exampleHeader}>
                <Text style={styles.exampleLabel}>{ex.label}</Text>
                <TouchableOpacity
                  onPress={() => copyExample(i, ex.payload)}
                  style={styles.copySmallBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={copiedExample === i ? "checkmark" : "copy-outline"}
                    size={14}
                    color={copiedExample === i ? C.accent : C.textSecondary}
                  />
                  <Text style={[styles.copySmallText, copiedExample === i && { color: C.accent }]}>
                    {copiedExample === i ? "Copied" : "Copy"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.codeText}>{ex.payload}</Text>
            </View>
          ))}
        </View>

        {/* Field Reference */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="list-outline" size={16} color={C.accent} />
            <Text style={styles.cardTitle}>Payload Field Reference</Text>
          </View>
          {FIELD_NOTES.map((f) => (
            <View key={f.field} style={styles.fieldRow}>
              <View style={styles.fieldLeft}>
                <Text style={styles.fieldName}>{f.field}</Text>
                <View style={[styles.fieldBadge, f.required ? styles.fieldBadgeRequired : styles.fieldBadgeOptional]}>
                  <Text style={[styles.fieldBadgeText, f.required ? styles.fieldBadgeTextRequired : styles.fieldBadgeTextOptional]}>
                    {f.required ? "required" : "optional"}
                  </Text>
                </View>
              </View>
              <Text style={styles.fieldDesc}>{f.desc}</Text>
            </View>
          ))}
        </View>

        {/* How it works */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>How it works</Text>
          {[
            "When TradingView fires an alert with your webhook URL, our server receives the payload",
            "A draft trade is auto-created in your Smart Journal with ticker, side, price, and session",
            "If sl (stop loss) is provided, risk % is calculated automatically",
            "If session is not sent, it's detected from the alert timestamp using ICT kill zone windows",
            "Open the draft in your journal, review, add your notes and behavior tag, then confirm",
          ].map((point, i) => (
            <View key={i} style={styles.howRow}>
              <View style={styles.howNum}>
                <Text style={styles.howNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.howText}>{point}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: Platform.OS === "ios" ? 100 : 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  title: { fontSize: 22, fontFamily: "Inter_700Bold", color: C.text },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", color: C.textSecondary, marginTop: 2 },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    gap: 12,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: C.text },
  loadingText: { fontSize: 13, color: C.textSecondary },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  errorText: { fontSize: 13, color: "#EF4444", flex: 1 },
  urlRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  urlText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular", color: C.textSecondary, backgroundColor: C.backgroundSecondary, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: C.cardBorder },
  copyBtn: { backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 6 },
  copyBtnText: { fontSize: 13, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
  warningRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#F59E0B15", borderRadius: 10, padding: 10, borderWidth: 1, borderColor: "#F59E0B30" },
  warningText: { fontSize: 12, color: "#F59E0B", flex: 1, fontFamily: "Inter_400Regular" },
  stepItem: { borderWidth: 1, borderColor: C.cardBorder, borderRadius: 12, overflow: "hidden" },
  stepHeader: { flexDirection: "row", alignItems: "center", gap: 10, padding: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 12, backgroundColor: C.accent + "20", alignItems: "center", justifyContent: "center" },
  stepNumText: { fontSize: 11, fontFamily: "Inter_700Bold", color: C.accent },
  stepTitle: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text },
  stepDesc: { fontSize: 13, color: C.textSecondary, lineHeight: 19, paddingHorizontal: 12, paddingBottom: 12, paddingLeft: 46 },
  helperText: { fontSize: 12, color: C.textSecondary, lineHeight: 17 },
  exampleCard: { borderWidth: 1, borderColor: C.cardBorder, borderRadius: 12, overflow: "hidden" },
  exampleHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 10, backgroundColor: C.backgroundSecondary, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  exampleLabel: { fontSize: 12, fontFamily: "Inter_700Bold", color: C.text },
  copySmallBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  copySmallText: { fontSize: 12, color: C.textSecondary },
  codeText: { fontFamily: "Inter_400Regular", fontSize: 11, color: C.textSecondary, padding: 12, lineHeight: 18 },
  fieldRow: { gap: 4 },
  fieldLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  fieldName: { fontSize: 13, fontFamily: "Inter_700Bold", color: C.text },
  fieldBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  fieldBadgeRequired: { backgroundColor: "#EF444420" },
  fieldBadgeOptional: { backgroundColor: C.accent + "15" },
  fieldBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  fieldBadgeTextRequired: { color: "#EF4444" },
  fieldBadgeTextOptional: { color: C.accent },
  fieldDesc: { fontSize: 12, color: C.textSecondary, lineHeight: 17 },
  howRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  howNum: { width: 20, height: 20, borderRadius: 10, backgroundColor: C.accent + "15", alignItems: "center", justifyContent: "center", marginTop: 1 },
  howNumText: { fontSize: 10, fontFamily: "Inter_700Bold", color: C.accent },
  howText: { flex: 1, fontSize: 13, color: C.textSecondary, lineHeight: 19 },
  lockedCenter: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  lockedTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: C.text, textAlign: "center" },
  lockedSubtitle: { fontSize: 14, color: C.textSecondary, textAlign: "center", lineHeight: 20 },
  lockedBtn: { backgroundColor: C.accent, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, marginTop: 8 },
  lockedBtnText: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#0A0A0F" },
});
