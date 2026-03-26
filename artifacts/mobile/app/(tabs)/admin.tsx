import React, { useState, useEffect, useCallback } from "react";
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
import { Href, useRouter } from "expo-router";
import { apiGet, apiPut, isSessionExpiredError } from "@/lib/api";
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

interface MonteCarloResult {
  buckets: number[];
  bucketMin: number;
  bucketRange: number;
  median: number;
  p10: number;
  p90: number;
  ruinPct: number;
  maxGain: number;
  expectancy: number;
  breakevenWR: number;
  avgMaxDrawdown: number;
  consecLosses: number;
  winRate: number;
  rr: number;
}

function computeMobileMaxDrawdown(equity: number[]): number {
  let peak = equity[0];
  let maxDD = 0;
  for (const v of equity) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

function runMonteCarlo(
  winRate: number,
  rr: number,
  riskPct: number,
  numTrades: number,
  numSims: number
): MonteCarloResult {
  const finalEquities: number[] = [];
  const maxDrawdowns: number[] = [];
  let ruinCount = 0;

  for (let s = 0; s < numSims; s++) {
    let equity = 100;
    let ruined = false;
    const path: number[] = [100];
    for (let t = 0; t < numTrades; t++) {
      const win = Math.random() < winRate;
      const change = win ? equity * (riskPct / 100) * rr : -equity * (riskPct / 100);
      equity += change;
      if (equity <= 10) { ruined = true; path.push(equity); break; }
      path.push(equity);
    }
    finalEquities.push(ruined ? 0 : equity);
    maxDrawdowns.push(computeMobileMaxDrawdown(path));
    if (ruined) ruinCount++;
  }

  finalEquities.sort((a, b) => a - b);
  const p10 = finalEquities[Math.floor(numSims * 0.1)];
  const p90 = finalEquities[Math.floor(numSims * 0.9)];
  const median = finalEquities[Math.floor(numSims * 0.5)];
  const maxGain = finalEquities[numSims - 1];

  const min = finalEquities[0];
  const max = maxGain;
  const range = max - min || 1;
  const NUM_BUCKETS = 20;
  const buckets = new Array(NUM_BUCKETS).fill(0);
  for (const v of finalEquities) {
    const bi = Math.min(NUM_BUCKETS - 1, Math.floor(((v - min) / range) * NUM_BUCKETS));
    buckets[bi]++;
  }

  const avgMaxDrawdown = maxDrawdowns.reduce((a, b) => a + b, 0) / maxDrawdowns.length;
  const expectancy = winRate * rr - (1 - winRate);
  const breakevenWR = 1 / (1 + rr);
  const lossRate = 1 - winRate;
  const consecLosses = lossRate > 0 ? Math.log(numTrades) / Math.log(1 / lossRate) : 0;

  return {
    buckets, bucketMin: min, bucketRange: range,
    median, p10, p90,
    ruinPct: (ruinCount / numSims) * 100,
    maxGain,
    expectancy,
    breakevenWR,
    avgMaxDrawdown,
    consecLosses,
    winRate,
    rr,
  };
}

function MonteCarloSimulator() {
  const [winRate, setWinRate] = useState("45");
  const [rr, setRR] = useState("2.5");
  const [riskPct, setRiskPct] = useState("1");
  const [numTrades, setNumTrades] = useState("1000");
  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [running, setRunning] = useState(false);
  const [chartWidth, setChartWidth] = useState(0);

  const run = useCallback(() => {
    setRunning(true);
    setTimeout(() => {
      const wr = Math.min(0.99, Math.max(0.01, parseFloat(winRate) / 100 || 0.45));
      const r = Math.max(0.1, parseFloat(rr) || 2.5);
      const rp = Math.min(10, Math.max(0.1, parseFloat(riskPct) || 1));
      const nt = Math.min(2000, Math.max(10, parseInt(numTrades) || 1000));
      setResult(runMonteCarlo(wr, r, rp, nt, 1000));
      setRunning(false);
    }, 50);
  }, [winRate, rr, riskPct, numTrades]);

  const maxBucket = result ? Math.max(...result.buckets, 1) : 1;
  const chartH = 80;

  const breakevenBucketIdx = result
    ? Math.max(0, Math.min(result.buckets.length - 1, Math.floor(((100 - result.bucketMin) / result.bucketRange) * result.buckets.length)))
    : -1;

  const breakevenMarkerLeft = result && chartWidth > 0
    ? Math.max(0, Math.min(chartWidth - 2, (breakevenBucketIdx / result.buckets.length) * chartWidth))
    : -1;

  return (
    <View style={mc.container}>
      <View style={mc.inputGrid}>
        <View style={mc.inputCol}>
          <Text style={mc.inputLabel}>Win Rate (%)</Text>
          <TextInput style={mc.input} value={winRate} onChangeText={setWinRate} keyboardType="decimal-pad" placeholderTextColor={C.textSecondary} />
        </View>
        <View style={mc.inputCol}>
          <Text style={mc.inputLabel}>Risk:Reward</Text>
          <TextInput style={mc.input} value={rr} onChangeText={setRR} keyboardType="decimal-pad" placeholderTextColor={C.textSecondary} />
        </View>
        <View style={mc.inputCol}>
          <Text style={mc.inputLabel}>Risk/Trade (%)</Text>
          <TextInput style={mc.input} value={riskPct} onChangeText={setRiskPct} keyboardType="decimal-pad" placeholderTextColor={C.textSecondary} />
        </View>
        <View style={mc.inputCol}>
          <Text style={mc.inputLabel}>Num Trades</Text>
          <TextInput style={mc.input} value={numTrades} onChangeText={setNumTrades} keyboardType="number-pad" placeholderTextColor={C.textSecondary} />
        </View>
      </View>

      <TouchableOpacity style={mc.runBtn} onPress={run} disabled={running} activeOpacity={0.85}>
        {running
          ? <ActivityIndicator size="small" color="#0A0A0F" />
          : <><Ionicons name="flash" size={14} color="#0A0A0F" /><Text style={mc.runBtnText}>Run 1000 Simulations</Text></>
        }
      </TouchableOpacity>

      {result && (
        <View style={mc.results}>
          <Text style={mc.chartTitle}>Final Equity Distribution (1000 runs)</Text>
          <View
            style={{ position: "relative" }}
            onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
          >
            <View style={[mc.chartArea, { height: chartH + 16 }]}>
              {result.buckets.map((count, i) => {
                const h = Math.max(2, (count / maxBucket) * chartH);
                const isRuin = i === 0 && result.ruinPct > 5;
                return (
                  <View key={i} style={[mc.bar, { height: h, backgroundColor: isRuin ? "#FF4444" : C.accent + "CC" }]} />
                );
              })}
            </View>
            {breakevenMarkerLeft >= 0 && (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  top: 8,
                  bottom: 8,
                  left: breakevenMarkerLeft,
                  width: 2,
                  backgroundColor: "#F59E0B",
                  opacity: 0.85,
                }}
              />
            )}
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
            <View style={{ width: 10, height: 2, backgroundColor: "#F59E0B" }} />
            <Text style={{ fontSize: 9, color: C.textSecondary }}>Breakeven line (100% equity)</Text>
          </View>

          <View style={mc.statsRow}>
            <View style={mc.statBox}>
              <Text style={mc.statLabel}>P10</Text>
              <Text style={[mc.statVal, { color: result.p10 < 100 ? "#FF4444" : C.accent }]}>{result.p10.toFixed(0)}%</Text>
            </View>
            <View style={mc.statBox}>
              <Text style={mc.statLabel}>Median</Text>
              <Text style={[mc.statVal, { color: result.median < 100 ? "#F59E0B" : C.accent }]}>{result.median.toFixed(0)}%</Text>
            </View>
            <View style={mc.statBox}>
              <Text style={mc.statLabel}>P90</Text>
              <Text style={[mc.statVal, { color: C.accent }]}>{result.p90.toFixed(0)}%</Text>
            </View>
            <View style={mc.statBox}>
              <Text style={mc.statLabel}>Ruin %</Text>
              <Text style={[mc.statVal, { color: result.ruinPct > 20 ? "#FF4444" : result.ruinPct > 5 ? "#F59E0B" : C.accent }]}>{result.ruinPct.toFixed(1)}%</Text>
            </View>
          </View>

          <View style={mc.statsRow}>
            <View style={mc.statBox}>
              <Text style={mc.statLabel}>Expectancy</Text>
              <Text style={[mc.statVal, { fontSize: 15, color: result.expectancy >= 0 ? C.accent : "#FF4444" }]}>
                {result.expectancy >= 0 ? "+" : ""}{result.expectancy.toFixed(2)}R
              </Text>
            </View>
            <View style={mc.statBox}>
              <Text style={mc.statLabel}>Breakeven WR</Text>
              <Text style={[mc.statVal, { fontSize: 15, color: result.winRate >= result.breakevenWR ? C.accent : "#FF4444" }]}>
                {(result.breakevenWR * 100).toFixed(1)}%
              </Text>
            </View>
            <View style={mc.statBox}>
              <Text style={mc.statLabel}>Avg Max DD</Text>
              <Text style={[mc.statVal, { fontSize: 15, color: "#F59E0B" }]}>
                {(result.avgMaxDrawdown * 100).toFixed(1)}%
              </Text>
            </View>
            <View style={mc.statBox}>
              <Text style={mc.statLabel}>Max Loss Run</Text>
              <Text style={[mc.statVal, { fontSize: 15, color: C.text }]}>
                {result.consecLosses.toFixed(1)}
              </Text>
            </View>
          </View>

          <Text style={mc.note}>
            Starting equity = 100. Values show final equity as % of start. Ruin = below 10%. Breakeven WR = 1/(1+RR).
          </Text>
        </View>
      )}
    </View>
  );
}

const mc = StyleSheet.create({
  container: { gap: 10 },
  inputGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  inputCol: { flex: 1, minWidth: 80, gap: 4 },
  inputLabel: { fontSize: 10, fontWeight: "600", color: C.textSecondary, textTransform: "uppercase" },
  input: { backgroundColor: C.backgroundSecondary, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: C.text },
  runBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: C.accent, borderRadius: 10, paddingVertical: 11 },
  runBtnText: { fontSize: 13, fontWeight: "700", color: "#0A0A0F" },
  results: { gap: 8 },
  chartTitle: { fontSize: 11, fontWeight: "600", color: C.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 },
  chartArea: { flexDirection: "row", alignItems: "flex-end", gap: 2, paddingVertical: 8 },
  bar: { flex: 1, borderRadius: 2 },
  statsRow: { flexDirection: "row", gap: 8 },
  statBox: { flex: 1, backgroundColor: C.backgroundSecondary, borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: C.cardBorder },
  statLabel: { fontSize: 9, color: C.textSecondary, fontWeight: "600", textTransform: "uppercase" },
  statVal: { fontSize: 18, fontWeight: "800", marginTop: 2 },
  note: { fontSize: 10, color: C.textSecondary, lineHeight: 14 },
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
    } catch (err: unknown) {
      if (isSessionExpiredError(err)) return;
      Alert.alert("Error", "Failed to save settings");
    }
    setSaving(false);
  }

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
            placeholder="The Trading Mentor"
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

        {/* AI Code Editor */}
        <SectionCard icon="code-slash-outline" title="AI Code Editor">
          <TouchableOpacity
            style={ce.row}
            onPress={() => router.navigate("/code-editor" as Href)}
            activeOpacity={0.8}
          >
            <View style={ce.iconBox}>
              <Ionicons name="code-slash-outline" size={20} color={C.accent} />
            </View>
            <View style={ce.info}>
              <Text style={ce.label}>Open Code Editor</Text>
              <Text style={ce.desc}>Browse source files and ask the AI to make changes</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={C.textTertiary} />
          </TouchableOpacity>
        </SectionCard>

        {/* Monte Carlo Simulator */}
        <SectionCard icon="stats-chart-outline" title="Monte Carlo Simulator">
          <MonteCarloSimulator />
        </SectionCard>

        <Text style={s.note}>
          Changes are applied to all users immediately after saving.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const ce = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.accent + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  info: { flex: 1 },
  label: { fontSize: 14, fontWeight: "600", color: C.text },
  desc: { fontSize: 11, color: C.textSecondary, marginTop: 2 },
});

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
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
