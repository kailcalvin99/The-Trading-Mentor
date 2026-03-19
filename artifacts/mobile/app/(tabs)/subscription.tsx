import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiGet, apiPost } from "@/lib/api";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";

const C = Colors.dark;

interface Tier {
  id: number;
  name: string;
  level: number;
  monthlyPrice: string;
  annualPrice: string;
  annualDiscountPct: number;
  features: string[];
  description: string;
}

interface TiersResponse {
  tiers: Tier[];
  founderSpotsLeft: number;
  founderLimit: number;
  founderDiscountPct: number;
}

interface CheckoutResponse {
  url?: string;
}

const TIER_ACCENT_COLORS: Record<number, string> = {
  0: C.textSecondary,
  1: C.accent,
  2: "#E53E3E",
  3: "#8B5CF6",
  4: "#EC4899",
};

function TierIcon({ level }: { level: number }) {
  const iconName =
    level === 0
      ? "person-outline"
      : level === 1
      ? "flash-outline"
      : level === 2
      ? "star-outline"
      : level === 3
      ? "diamond-outline"
      : "crown-outline";
  const color = TIER_ACCENT_COLORS[level] ?? C.accent;
  return <Ionicons name={iconName} size={18} color={color} />;
}

export default function SubscriptionScreen() {
  const { user, subscription, refresh } = useAuth();

  const [tiers, setTiers] = useState<Tier[]>([]);
  const [founderDiscountPct, setFounderDiscountPct] = useState(50);
  const [founderSpotsLeft, setFounderSpotsLeft] = useState(0);
  const [founderLimit, setFounderLimit] = useState(20);
  const [annual, setAnnual] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiGet<TiersResponse>("subscriptions/tiers");
      setTiers(data.tiers || []);
      setFounderDiscountPct(data.founderDiscountPct ?? 50);
      setFounderSpotsLeft(data.founderSpotsLeft ?? 0);
      setFounderLimit(data.founderLimit ?? 20);
    } catch {
      Alert.alert("Error", "Failed to load subscription plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleUpgrade(tier: Tier) {
    if (tier.level === 0) {
      setSubscribing(tier.id);
      try {
        await apiPost("subscriptions/subscribe", {
          tierId: tier.id,
          billingCycle: annual ? "annual" : "monthly",
        });
        await refresh();
        Alert.alert("Done", "Switched to Free plan");
      } catch {
        Alert.alert("Error", "Failed to switch plan");
      }
      setSubscribing(null);
      return;
    }

    setSubscribing(tier.id);
    try {
      const data = await apiPost<CheckoutResponse>(
        "subscriptions/create-checkout-session",
        { tierId: tier.id, billingCycle: annual ? "annual" : "monthly" }
      );
      if (data.url) {
        await Linking.openURL(data.url);
      } else {
        Alert.alert("Error", "No checkout URL returned");
      }
    } catch {
      Alert.alert("Error", "Failed to start checkout");
    }
    setSubscribing(null);
  }

  const currentTierLevel = subscription?.tierLevel ?? 0;

  function getDisplayPrice(tier: Tier): number {
    const base = annual
      ? parseFloat(tier.annualPrice) / 12
      : parseFloat(tier.monthlyPrice);
    if (user?.isFounder && tier.level > 0) {
      return base * (1 - founderDiscountPct / 100);
    }
    return base;
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
      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>Subscription</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Plan Banner */}
        <View style={s.currentBanner}>
          <View style={s.currentLeft}>
            <TierIcon level={currentTierLevel} />
            <View style={s.currentInfo}>
              <Text style={s.currentLabel}>Current Plan</Text>
              <Text style={s.currentName}>
                {subscription?.tierName ?? "Free"}
                {user?.isFounder ? " · Founder" : ""}
              </Text>
            </View>
          </View>
          {user?.isFounder && (
            <View style={s.founderBadge}>
              <Ionicons name="crown" size={11} color="#E53E3E" />
              <Text style={s.founderBadgeText}>Founder #{user.founderNumber}</Text>
            </View>
          )}
        </View>

        {/* Founder discount notice */}
        {user?.isFounder && (
          <View style={s.founderNotice}>
            <Ionicons name="gift-outline" size={16} color="#E53E3E" />
            <Text style={s.founderNoticeText}>
              You receive {founderDiscountPct}% founder discount on all paid plans!
            </Text>
          </View>
        )}

        {/* Founder spots remaining */}
        {founderSpotsLeft > 0 && !user?.isFounder && (
          <View style={s.founderSpots}>
            <Ionicons name="people-outline" size={14} color="#E53E3E" />
            <Text style={s.founderSpotsText}>
              {founderSpotsLeft} of {founderLimit} founder spots remaining — lock in lifetime discount!
            </Text>
          </View>
        )}

        {/* Billing toggle */}
        <View style={s.toggleRow}>
          <Text style={[s.toggleLabel, !annual && s.toggleActive]}>Monthly</Text>
          <TouchableOpacity
            style={[s.toggleTrack, annual && s.toggleTrackOn]}
            onPress={() => setAnnual(!annual)}
            activeOpacity={0.8}
          >
            <View style={[s.toggleThumb, annual && s.toggleThumbOn]} />
          </TouchableOpacity>
          <Text style={[s.toggleLabel, annual && s.toggleActive]}>
            Annual{" "}
            <Text style={s.toggleSavings}>Save 17%</Text>
          </Text>
        </View>

        {/* Plan cards */}
        {tiers.map((tier) => {
          const isCurrent = tier.level === currentTierLevel;
          const price = getDisplayPrice(tier);
          const accentColor = TIER_ACCENT_COLORS[tier.level] ?? C.accent;
          const isLoading = subscribing === tier.id;

          return (
            <View
              key={tier.id}
              style={[s.planCard, isCurrent && { borderColor: accentColor }]}
            >
              {isCurrent && (
                <View style={[s.currentBadge, { backgroundColor: accentColor + "20", borderColor: accentColor + "50" }]}>
                  <Text style={[s.currentBadgeText, { color: accentColor }]}>Current Plan</Text>
                </View>
              )}

              <View style={s.planHeader}>
                <TierIcon level={tier.level} />
                <Text style={[s.planName, { color: accentColor }]}>{tier.name}</Text>
              </View>

              <Text style={s.planDesc}>{tier.description}</Text>

              {tier.level > 0 ? (
                <View style={s.priceRow}>
                  <Text style={s.priceMain}>${price.toFixed(2)}</Text>
                  <Text style={s.pricePer}>/mo</Text>
                  {annual && (
                    <Text style={s.priceBilled}>
                      {" "}· billed ${(price * 12).toFixed(2)}/yr
                    </Text>
                  )}
                </View>
              ) : (
                <View style={s.priceRow}>
                  <Text style={s.priceMain}>Free</Text>
                </View>
              )}

              <View style={s.featureList}>
                {(tier.features as string[]).map((feature, idx) => (
                  <View key={idx} style={s.featureRow}>
                    <Ionicons name="checkmark-circle" size={14} color={accentColor} />
                    <Text style={s.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              {!isCurrent && (
                <TouchableOpacity
                  style={[s.upgradeBtn, { backgroundColor: accentColor }]}
                  onPress={() => handleUpgrade(tier)}
                  disabled={isLoading}
                  activeOpacity={0.85}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#0A0A0F" />
                  ) : (
                    <Text style={s.upgradeBtnText}>
                      {tier.level === 0 ? "Downgrade to Free" : `Upgrade to ${tier.name}`}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <Text style={s.disclaimer}>
          ICT Trading Mentor is an educational platform. Content is for informational purposes only and does not constitute financial advice. Trading involves substantial risk.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  pageHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  pageTitle: { fontSize: 22, fontWeight: "800", color: C.text },
  scroll: { flex: 1 },
  content: { padding: 14, paddingBottom: 100, gap: 12 },

  currentBanner: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  currentLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  currentInfo: { gap: 2 },
  currentLabel: { fontSize: 11, color: C.textSecondary, fontWeight: "600" },
  currentName: { fontSize: 16, fontWeight: "800", color: C.text },

  founderBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#E53E3E20",
    borderWidth: 1,
    borderColor: "#E53E3E50",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  founderBadgeText: { fontSize: 11, fontWeight: "700", color: "#E53E3E" },

  founderNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E53E3E10",
    borderWidth: 1,
    borderColor: "#E53E3E30",
    borderRadius: 10,
    padding: 12,
  },
  founderNoticeText: { flex: 1, fontSize: 13, color: "#E53E3E", fontWeight: "600" },

  founderSpots: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#E53E3E08",
    borderWidth: 1,
    borderColor: "#E53E3E30",
    borderRadius: 10,
    padding: 10,
  },
  founderSpotsText: { flex: 1, fontSize: 12, color: C.textSecondary },

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 4,
  },
  toggleLabel: { fontSize: 13, fontWeight: "600", color: C.textSecondary },
  toggleActive: { color: C.text },
  toggleSavings: { color: C.accent, fontSize: 12 },
  toggleTrack: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.cardBorder,
    justifyContent: "center",
    paddingHorizontal: 2,
  },
  toggleTrackOn: { backgroundColor: C.accent + "70" },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.textSecondary,
    alignSelf: "flex-start",
  },
  toggleThumbOn: {
    backgroundColor: C.accent,
    alignSelf: "flex-end",
  },

  planCard: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    position: "relative",
    overflow: "hidden",
  },
  currentBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  currentBadgeText: { fontSize: 10, fontWeight: "700" },
  planHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  planName: { fontSize: 16, fontWeight: "800" },
  planDesc: { fontSize: 12, color: C.textSecondary, lineHeight: 18 },

  priceRow: { flexDirection: "row", alignItems: "baseline", gap: 2 },
  priceMain: { fontSize: 28, fontWeight: "800", color: C.text },
  pricePer: { fontSize: 13, color: C.textSecondary },
  priceBilled: { fontSize: 11, color: C.textSecondary },

  featureList: { gap: 6 },
  featureRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  featureText: { flex: 1, fontSize: 13, color: C.text, lineHeight: 18 },

  upgradeBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 4,
  },
  upgradeBtnText: { fontSize: 14, fontWeight: "700", color: "#0A0A0F" },

  disclaimer: {
    fontSize: 11,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 16,
    marginTop: 4,
  },
});
