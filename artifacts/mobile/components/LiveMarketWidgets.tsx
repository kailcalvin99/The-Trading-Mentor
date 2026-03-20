import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Colors from "@/constants/colors";
import { useGetPropAccount } from "@workspace/api-client-react";
import { apiGet } from "@/lib/api";

const C = Colors.dark;
const REFRESH_INTERVAL = 15000;

interface PriceItem {
  symbol: string;
  label: string;
  type: string;
  approx: boolean;
  price: number | null;
  changePct: number | null;
  delayed: boolean;
}

interface CalendarEvent {
  time: string;
  event: string;
  country: string;
  impact: string;
  actual: string | null;
  estimate: string | null;
}

interface OpenTrade {
  id: number;
  instrument: string;
  side: string;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  session: string | null;
  createdAt: string;
  riskPct: number;
}

function usePrices() {
  const [prices, setPrices] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [hasKey, setHasKey] = useState(true);

  const fetchPrices = useCallback(async () => {
    try {
      const data = await apiGet<{ prices: PriceItem[]; hasKey: boolean }>("/prices");
      if (data?.prices) {
        setPrices(data.prices);
        setLastUpdated(Date.now());
        setHasKey(data.hasKey !== false);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const id = setInterval(fetchPrices, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchPrices]);

  return { prices, loading, lastUpdated, hasKey };
}

function useCalendarEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const doFetch = async () => {
      try {
        const data = await apiGet<{ events: CalendarEvent[] }>("/calendar/today");
        if (data?.events) setEvents(data.events);
      } catch {
      } finally {
        setLoading(false);
      }
    };

    doFetch();
    const id = setInterval(doFetch, 60 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return { events, loading };
}

function useOpenTrades() {
  const [trades, setTrades] = useState<OpenTrade[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrades = useCallback(async () => {
    try {
      const data = await apiGet<OpenTrade[]>("/trades/open");
      if (Array.isArray(data)) setTrades(data);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrades();
    const id = setInterval(fetchTrades, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [fetchTrades]);

  return { trades, loading };
}

function formatPrice(p: number, sym: string): string {
  if (sym === "USDJPY") return p.toFixed(3);
  if (["EURUSD", "GBPUSD"].includes(sym)) return p.toFixed(5);
  return p.toFixed(2);
}

function LiveBadge({ delayed }: { delayed: boolean }) {
  return (
    <View style={[lmStyles.badge, { backgroundColor: delayed ? "#F59E0B20" : "#00C89620" }]}>
      <View style={[lmStyles.badgeDot, { backgroundColor: delayed ? "#F59E0B" : "#00C896" }]} />
      <Text style={[lmStyles.badgeText, { color: delayed ? "#F59E0B" : "#00C896" }]}>
        {delayed ? "DELAYED" : "LIVE"}
      </Text>
    </View>
  );
}

export function LivePriceStripWidget() {
  const { prices, loading, lastUpdated, hasKey } = usePrices();
  const hasData = prices.some((p) => p.price !== null);

  if (!hasKey) {
    return (
      <View style={[lmStyles.card, { flexDirection: "row", alignItems: "center", gap: 10 }]}>
        <Ionicons name="warning-outline" size={16} color="#F59E0B" />
        <Text style={{ fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular", flex: 1 }}>
          Live prices unavailable — API key not configured.
        </Text>
      </View>
    );
  }

  const anyDelayed = prices.some((p) => p.delayed);

  return (
    <View style={lmStyles.card}>
      <View style={lmStyles.headerRow}>
        <Ionicons name="pulse-outline" size={14} color="#00C896" />
        <Text style={lmStyles.headerLabel}>Live Market</Text>
        <LiveBadge delayed={anyDelayed} />
        {lastUpdated && (
          <Text style={lmStyles.timeLabel}>
            {new Date(lastUpdated).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 12, gap: 8 }}
      >
        {loading && prices.length === 0 ? (
          <ActivityIndicator color={C.accent} style={{ marginVertical: 12 }} />
        ) : !hasData ? (
          <Text style={{ fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular", paddingVertical: 8 }}>
            No price data available.
          </Text>
        ) : (
          prices.map((item) => {
            const isPos = (item.changePct ?? 0) >= 0;
            return (
              <View key={item.symbol} style={lmStyles.pill}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                  <Text style={lmStyles.pillLabel}>{item.label}</Text>
                  {item.approx && <Text style={{ fontSize: 9, color: "#F59E0B" }}>~</Text>}
                </View>
                {item.price !== null ? (
                  <>
                    <Text style={lmStyles.pillPrice}>{formatPrice(item.price, item.symbol)}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                      <Ionicons
                        name={isPos ? "trending-up" : "trending-down"}
                        size={10}
                        color={isPos ? "#00C896" : "#EF4444"}
                      />
                      <Text style={[lmStyles.pillChange, { color: isPos ? "#00C896" : "#EF4444" }]}>
                        {isPos ? "+" : ""}{(item.changePct ?? 0).toFixed(2)}%
                      </Text>
                    </View>
                  </>
                ) : (
                  <Text style={lmStyles.pillPrice}>—</Text>
                )}
              </View>
            );
          })
        )}
      </ScrollView>

      {prices.some((p) => p.approx) && (
        <Text style={{ fontSize: 10, color: C.textTertiary, fontFamily: "Inter_400Regular", paddingHorizontal: 14, paddingBottom: 10 }}>
          ~ Futures use ETF proxy prices (QQQ≈NQ, SPY≈ES, DIA≈YM)
        </Text>
      )}
    </View>
  );
}

export function OpenTradeCardWidget() {
  const { trades, loading } = useOpenTrades();
  const { prices } = usePrices();
  const { data: account } = useGetPropAccount();
  const router = useRouter();

  const trade = trades[0] ?? null;
  const matchedPrice = trade?.entryPrice
    ? prices.find((p) => {
        const sym = (trade.instrument ?? "").toUpperCase();
        return p.symbol === sym || p.label.replace("/", "") === sym;
      })
    : null;

  if (loading) {
    return (
      <View style={lmStyles.card}>
        <View style={lmStyles.headerRow}>
          <Ionicons name="analytics-outline" size={14} color={C.textSecondary} />
          <Text style={lmStyles.headerLabel}>Open Position</Text>
        </View>
        <View style={{ padding: 14 }}>
          <View style={{ height: 24, borderRadius: 6, backgroundColor: C.cardBorder }} />
        </View>
      </View>
    );
  }

  if (!trade) {
    return (
      <View style={lmStyles.card}>
        <View style={lmStyles.headerRow}>
          <Ionicons name="analytics-outline" size={14} color={C.textSecondary} />
          <Text style={lmStyles.headerLabel}>Open Position</Text>
        </View>
        <View style={{ padding: 14 }}>
          <Text style={{ fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular" }}>No open positions.</Text>
        </View>
      </View>
    );
  }

  const livePrice = matchedPrice?.price ?? null;
  const entryPrice = trade.entryPrice;
  let pnlPoints = 0;
  let pnlDir = 0;

  if (entryPrice && livePrice) {
    pnlPoints = trade.side === "BUY" ? livePrice - entryPrice : entryPrice - livePrice;
    pnlDir = pnlPoints > 0 ? 1 : pnlPoints < 0 ? -1 : 0;
  }

  const accountBalance = account?.startingBalance ?? 0;
  const riskDollars = accountBalance > 0 && trade.riskPct > 0
    ? (accountBalance * trade.riskPct) / 100
    : null;

  let pnlDollars: number | null = null;
  let rMultiple: number | null = null;

  if (pnlPoints !== 0 && entryPrice && entryPrice > 0) {
    const pnlPct = (pnlPoints / entryPrice) * 100;
    if (accountBalance > 0) {
      pnlDollars = (accountBalance * pnlPct) / 100;
    }
    if (riskDollars && riskDollars > 0 && pnlDollars !== null) {
      rMultiple = pnlDollars / riskDollars;
    }
  }

  const isBuy = trade.side === "BUY";

  // Pulse indicator: losing trade pushing total drawdown to danger zone (>= 80% of max allowed)
  const currentBalance = account?.currentBalance ?? 0;
  const maxDrawdownAmt = accountBalance > 0 && account?.maxTotalDrawdownPct
    ? (accountBalance * account.maxTotalDrawdownPct) / 100
    : null;
  const existingDrawdown = accountBalance > 0 && currentBalance > 0 ? accountBalance - currentBalance : 0;
  const projectedLoss = pnlDollars !== null && pnlDollars < 0 ? Math.abs(pnlDollars) : 0;
  const drawdownDanger = maxDrawdownAmt && maxDrawdownAmt > 0
    ? (existingDrawdown + projectedLoss) / maxDrawdownAmt >= 0.8
    : false;

  const cardBorderColor = drawdownDanger
    ? "#EF4444"
    : pnlDir > 0
    ? "#00C89640"
    : pnlDir < 0
    ? "#EF444440"
    : C.cardBorder;

  return (
    <View style={[lmStyles.card, { borderColor: cardBorderColor, borderWidth: drawdownDanger ? 1.5 : 1 }]}>
      <View style={lmStyles.headerRow}>
        <Ionicons name="analytics-outline" size={14} color={C.accent} />
        <Text style={lmStyles.headerLabel}>Open Position</Text>
        <View style={[lmStyles.sideBadge, { backgroundColor: isBuy ? "#00C89620" : "#EF444420" }]}>
          <Text style={[lmStyles.sideBadgeText, { color: isBuy ? "#00C896" : "#EF4444" }]}>{trade.side}</Text>
        </View>
        <LiveBadge delayed={matchedPrice?.delayed ?? true} />
        <TouchableOpacity onPress={() => router.navigate({ pathname: "/(tabs)/journal" })} activeOpacity={0.7}>
          <Text style={{ fontSize: 11, color: C.accent, fontFamily: "Inter_600SemiBold" }}>Complete ↗</Text>
        </TouchableOpacity>
      </View>

      <View style={lmStyles.tradeGrid}>
        <View style={lmStyles.tradeCell}>
          <Text style={lmStyles.tradeCellLabel}>Instrument</Text>
          <Text style={lmStyles.tradeCellValue}>{trade.instrument}</Text>
        </View>
        <View style={lmStyles.tradeCell}>
          <Text style={lmStyles.tradeCellLabel}>Entry</Text>
          <Text style={[lmStyles.tradeCellValue, { fontFamily: "Inter_700Bold" }]}>
            {entryPrice ? (entryPrice < 100 ? entryPrice.toFixed(5) : entryPrice.toFixed(2)) : "—"}
          </Text>
        </View>
        {livePrice !== null && (
          <>
            <View style={lmStyles.tradeCell}>
              <Text style={lmStyles.tradeCellLabel}>Live Price</Text>
              <Text style={[lmStyles.tradeCellValue, { fontFamily: "Inter_700Bold" }]}>
                {livePrice < 100 ? livePrice.toFixed(5) : livePrice.toFixed(2)}
              </Text>
            </View>
            <View style={lmStyles.tradeCell}>
              <Text style={lmStyles.tradeCellLabel}>Running P&L</Text>
              <Text style={[lmStyles.tradeCellValue, {
                color: pnlDir > 0 ? "#00C896" : pnlDir < 0 ? "#EF4444" : C.textSecondary,
                fontFamily: "Inter_700Bold",
              }]}>
                {pnlDollars !== null
                  ? `${pnlDir >= 0 ? "+" : ""}$${Math.abs(pnlDollars).toFixed(2)}`
                  : `${pnlDir >= 0 ? "+" : ""}${pnlPoints.toFixed(livePrice < 100 ? 5 : 1)} pts`}
              </Text>
            </View>
            {rMultiple !== null && (
              <View style={lmStyles.tradeCell}>
                <Text style={lmStyles.tradeCellLabel}>R-Multiple</Text>
                <Text style={[lmStyles.tradeCellValue, {
                  color: pnlDir > 0 ? "#00C896" : pnlDir < 0 ? "#EF4444" : C.textSecondary,
                  fontFamily: "Inter_700Bold",
                }]}>
                  {rMultiple >= 0 ? "+" : ""}{rMultiple.toFixed(2)}R
                </Text>
              </View>
            )}
            {trade.stopLoss !== null && (
              <View style={lmStyles.tradeCell}>
                <Text style={lmStyles.tradeCellLabel}>SL Distance</Text>
                <Text style={[lmStyles.tradeCellValue, { color: "#EF4444", fontFamily: "Inter_700Bold" }]}>
                  {Math.abs(livePrice - trade.stopLoss).toFixed(livePrice < 100 ? 5 : 1)} pts
                </Text>
              </View>
            )}
            {trade.takeProfit !== null && (
              <View style={lmStyles.tradeCell}>
                <Text style={lmStyles.tradeCellLabel}>TP Distance</Text>
                <Text style={[lmStyles.tradeCellValue, { color: "#00C896", fontFamily: "Inter_700Bold" }]}>
                  {Math.abs(trade.takeProfit - livePrice).toFixed(livePrice < 100 ? 5 : 1)} pts
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      {trades.length > 1 && (
        <Text style={{ fontSize: 10, color: C.textTertiary, fontFamily: "Inter_400Regular", paddingHorizontal: 14, paddingBottom: 10 }}>
          +{trades.length - 1} more open trade{trades.length > 2 ? "s" : ""}
        </Text>
      )}
    </View>
  );
}

function formatEventTime(timeStr: string): string {
  try {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return timeStr;
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return timeStr;
  }
}

function isEventPast(timeStr: string): boolean {
  try { return new Date(timeStr).getTime() < Date.now(); } catch { return false; }
}

function isEventSoon(timeStr: string): boolean {
  try {
    const diff = new Date(timeStr).getTime() - Date.now();
    return diff > 0 && diff < 60 * 60 * 1000;
  } catch { return false; }
}

export function EconomicCalendarWidget() {
  const { events, loading } = useCalendarEvents();

  return (
    <View style={lmStyles.card}>
      <View style={lmStyles.headerRow}>
        <Ionicons name="calendar-outline" size={14} color={C.accent} />
        <Text style={lmStyles.headerLabel}>Today's Events</Text>
        <Text style={{ fontSize: 10, color: C.textTertiary, fontFamily: "Inter_400Regular" }}>High/Med impact</Text>
      </View>

      <View style={{ paddingHorizontal: 14, paddingBottom: 12 }}>
        {loading ? (
          <ActivityIndicator color={C.accent} style={{ marginVertical: 8 }} />
        ) : events.length === 0 ? (
          <Text style={{ fontSize: 12, color: C.textSecondary, fontFamily: "Inter_400Regular" }}>
            No major events today.
          </Text>
        ) : (
          events.slice(0, 6).map((ev, i) => {
            const past = isEventPast(ev.time);
            const soon = !past && isEventSoon(ev.time);
            const isHigh = ev.impact?.toLowerCase() === "high";

            return (
              <View
                key={i}
                style={[
                  lmStyles.eventRow,
                  past && lmStyles.eventRowPast,
                  soon && lmStyles.eventRowSoon,
                ]}
              >
                <View style={[lmStyles.eventDot, { backgroundColor: isHigh ? "#EF4444" : "#F59E0B" }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[lmStyles.eventName, past && { color: C.textSecondary }]} numberOfLines={1}>
                    {ev.event}
                  </Text>
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 2 }}>
                    <Text style={lmStyles.eventMeta}>{formatEventTime(ev.time)}</Text>
                    <Text style={lmStyles.eventMeta}>{ev.country}</Text>
                    {ev.actual && <Text style={{ fontSize: 10, color: "#00C896", fontFamily: "Inter_600SemiBold" }}>A: {ev.actual}</Text>}
                    {!ev.actual && ev.estimate && <Text style={{ fontSize: 10, color: "#F59E0B", fontFamily: "Inter_500Medium" }}>E: {ev.estimate}</Text>}
                  </View>
                </View>
                {soon && <Text style={{ fontSize: 10, color: "#F59E0B", fontFamily: "Inter_700Bold" }}>SOON</Text>}
              </View>
            );
          })
        )}
      </View>
    </View>
  );
}

export function DailyRiskGaugeWidget() {
  const { data: account } = useGetPropAccount();

  if (!account) {
    return (
      <View style={[lmStyles.card, { flexDirection: "row", alignItems: "center", padding: 14, gap: 10 }]}>
        <Ionicons name="shield-outline" size={16} color={C.textSecondary} />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: C.text }}>Daily Risk Gauge</Text>
          <Text style={{ fontSize: 11, color: C.textSecondary, fontFamily: "Inter_400Regular", marginTop: 2 }}>
            Set up your prop account to track drawdown.
          </Text>
        </View>
      </View>
    );
  }

  const startingBalance = account.startingBalance ?? 0;
  const dailyLoss = Math.abs(account.dailyLoss ?? 0);
  const maxDailyLossPct = account.maxDailyLossPct ?? 2;
  const maxDailyLossDollars = (startingBalance * maxDailyLossPct) / 100;
  const usedPct = maxDailyLossDollars > 0 ? Math.min((dailyLoss / maxDailyLossDollars) * 100, 100) : 0;

  const barColor = usedPct >= 80 ? "#EF4444" : usedPct >= 50 ? "#F59E0B" : "#00C896";
  const statusLabel = usedPct >= 80 ? "DANGER" : usedPct >= 50 ? "CAUTION" : "SAFE";

  return (
    <View style={lmStyles.card}>
      <View style={lmStyles.headerRow}>
        <Ionicons name="shield-outline" size={14} color={C.accent} />
        <Text style={lmStyles.headerLabel}>Daily Risk Gauge</Text>
        <Text style={[lmStyles.statusBadge, { color: barColor }]}>{statusLabel}</Text>
      </View>

      <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ fontSize: 11, color: C.textSecondary, fontFamily: "Inter_400Regular" }}>
            Used: <Text style={{ fontFamily: "Inter_700Bold", color: C.text }}>${dailyLoss.toFixed(2)}</Text>
          </Text>
          <Text style={{ fontSize: 11, color: C.textSecondary, fontFamily: "Inter_400Regular" }}>
            Limit: <Text style={{ fontFamily: "Inter_600SemiBold" }}>${maxDailyLossDollars.toFixed(2)}</Text>
          </Text>
        </View>

        <View style={lmStyles.gaugeTrack}>
          <View style={[lmStyles.gaugeFill, { width: `${usedPct}%`, backgroundColor: barColor }]} />
        </View>

        <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 4 }}>
          <Text style={{ fontSize: 10, color: C.textTertiary, fontFamily: "Inter_400Regular" }}>0%</Text>
          <Text style={{ fontSize: 10, fontFamily: "Inter_700Bold", color: barColor }}>{usedPct.toFixed(1)}% used</Text>
          <Text style={{ fontSize: 10, color: C.textTertiary, fontFamily: "Inter_400Regular" }}>{maxDailyLossPct}% max</Text>
        </View>

        {usedPct >= 80 && (
          <View style={lmStyles.dangerBanner}>
            <Ionicons name="warning-outline" size={13} color="#EF4444" />
            <Text style={lmStyles.dangerBannerText}>Approaching daily loss limit — consider stopping</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const KILL_ZONES = [
  { name: "Asian", startH: 20, startM: 0, endH: 0, endM: 0, color: "#818CF8" },
  { name: "London", startH: 2, startM: 0, endH: 5, endM: 0, color: "#F59E0B" },
  { name: "NY Open", startH: 9, startM: 30, endH: 10, endM: 0, color: "#00C896" },
  { name: "NY PM", startH: 13, startM: 30, endH: 16, endM: 0, color: "#6B7280" },
];

function getESTNow(): { h: number; m: number; s: number } {
  const now = new Date();
  const est = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  return { h: est.getHours(), m: est.getMinutes(), s: est.getSeconds() };
}

function minsFromMidnight(h: number, m: number) {
  return h * 60 + m;
}

function getKillZoneInfo(kz: typeof KILL_ZONES[0], now: { h: number; m: number; s: number }) {
  const nowMins = minsFromMidnight(now.h, now.m);
  let startMins = minsFromMidnight(kz.startH, kz.startM);
  let endMins = minsFromMidnight(kz.endH, kz.endM);
  if (endMins <= startMins) endMins += 24 * 60;

  const isActive = startMins <= nowMins && nowMins < endMins;

  if (isActive) {
    const remainSecs = (endMins - nowMins) * 60 - now.s;
    const rh = Math.floor(remainSecs / 3600);
    const rm = Math.floor((remainSecs % 3600) / 60);
    const rs = remainSecs % 60;
    const label = `${String(rh).padStart(2, "0")}:${String(rm).padStart(2, "0")}:${String(rs).padStart(2, "0")}`;
    return { isActive: true, label, status: "ACTIVE" };
  }

  let diffMins = startMins - nowMins;
  if (diffMins < 0) diffMins += 24 * 60;
  const diffH = Math.floor(diffMins / 60);
  const diffM = diffMins % 60;
  const label = diffH > 0 ? `${diffH}h ${diffM}m` : `${diffM}m`;
  return { isActive: false, label, status: "NEXT" };
}

export function KillZoneCountdownWidget() {
  const [now, setNow] = useState(getESTNow());

  useEffect(() => {
    const id = setInterval(() => setNow(getESTNow()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={lmStyles.card}>
      <View style={lmStyles.headerRow}>
        <Ionicons name="time-outline" size={14} color={C.accent} />
        <Text style={lmStyles.headerLabel}>Kill Zones</Text>
        <Text style={lmStyles.timeLabel}>EST</Text>
      </View>
      <View style={{ padding: 12, gap: 8 }}>
        {KILL_ZONES.map((kz) => {
          const info = getKillZoneInfo(kz, now);
          return (
            <View key={kz.name} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: info.isActive ? kz.color : C.cardBorder }} />
              <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color: info.isActive ? kz.color : C.text, flex: 1 }}>
                {kz.name}
              </Text>
              <Text style={{ fontSize: 11, fontFamily: "Inter_400Regular", color: info.isActive ? kz.color : C.textSecondary }}>
                {info.isActive ? "ACTIVE" : "in"} {info.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const lmStyles = StyleSheet.create({
  card: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  headerLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
    flex: 1,
  },
  timeLabel: {
    fontSize: 10,
    color: C.textTertiary,
    fontFamily: "Inter_400Regular",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 20,
  },
  badgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
  },
  pill: {
    alignItems: "center",
    backgroundColor: C.backgroundTertiary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 80,
    gap: 2,
  },
  pillLabel: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    color: C.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pillPrice: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  pillChange: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  sideBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 20,
  },
  sideBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  tradeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 14,
    gap: 12,
  },
  tradeCell: {
    minWidth: "45%",
    flex: 1,
  },
  tradeCellLabel: {
    fontSize: 10,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  tradeCellValue: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  eventRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder + "60",
  },
  eventRowPast: {
    opacity: 0.55,
  },
  eventRowSoon: {
    backgroundColor: "#F59E0B10",
    borderRadius: 8,
    paddingHorizontal: 6,
    marginHorizontal: -6,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 5,
    flexShrink: 0,
  },
  eventName: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: C.text,
  },
  eventMeta: {
    fontSize: 10,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  gaugeTrack: {
    height: 10,
    backgroundColor: C.backgroundTertiary,
    borderRadius: 5,
    overflow: "hidden",
  },
  gaugeFill: {
    height: 10,
    borderRadius: 5,
  },
  dangerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EF444415",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EF444430",
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 10,
  },
  dangerBannerText: {
    fontSize: 11,
    color: "#EF4444",
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  statusBadge: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
});
