import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useListTrades } from "@workspace/api-client-react";
import Colors from "@/constants/colors";

const C = Colors.dark;
const SCREEN_WIDTH = Dimensions.get("window").width - 32;

export default function PnLCalendarBottomSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { data: apiTrades } = useListTrades();
  const [viewMonth, setViewMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });

  const trades = (apiTrades || []) as Array<{
    pnl?: string | number | null;
    createdAt?: string | null;
    isDraft?: boolean | null;
  }>;

  const dailyPnl: Record<string, number> = {};
  trades.forEach((t) => {
    if (t.isDraft || !t.createdAt) return;
    const dateStr = new Date(t.createdAt).toISOString().split("T")[0];
    const pnl = parseFloat(String(t.pnl ?? "0"));
    if (!isNaN(pnl)) dailyPnl[dateStr] = (dailyPnl[dateStr] ?? 0) + pnl;
  });

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const { year, month } = viewMonth;
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDow = firstDay.getDay();
  const monthName = firstDay.toLocaleString("en-US", { month: "long" });

  const prevMonth = () =>
    setViewMonth(({ year: y, month: m }) =>
      m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 }
    );
  const nextMonth = () =>
    setViewMonth(({ year: y, month: m }) =>
      m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 }
    );

  const monFirstOffset = (startDow + 6) % 7;
  const cells: (number | null)[] = [];
  for (let i = 0; i < monFirstOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const cellSize = Math.floor((SCREEN_WIDTH - 16) / 7);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={onClose} />
      <View style={[s.sheet, { maxHeight: "80%" }]}>
        <View style={s.handle} />
        <View style={s.headerRow}>
          <Ionicons name="calendar-outline" size={16} color={C.accent} />
          <Text style={s.title}>P&L Calendar</Text>
          <TouchableOpacity onPress={onClose} style={{ marginLeft: "auto" }} activeOpacity={0.7}>
            <Ionicons name="close" size={20} color={C.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={s.navRow}>
          <TouchableOpacity onPress={prevMonth} style={s.navBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-back" size={16} color={C.textSecondary} />
          </TouchableOpacity>
          <Text style={s.monthLabel}>
            {monthName} {year}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={s.navBtn} activeOpacity={0.7}>
            <Ionicons name="chevron-forward" size={16} color={C.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={s.grid}>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <Text key={i} style={[s.dayHeader, { width: cellSize }]}>
              {d}
            </Text>
          ))}
        </View>

        <ScrollView style={{ paddingHorizontal: 8, marginBottom: 16 }}>
          <View style={s.grid}>
            {cells.map((day, i) => {
              if (!day) return <View key={i} style={{ width: cellSize, height: cellSize }} />;
              const mm = String(month + 1).padStart(2, "0");
              const dd = String(day).padStart(2, "0");
              const dateStr = `${year}-${mm}-${dd}`;
              const pnl = dailyPnl[dateStr];
              const hasTrades = pnl !== undefined;
              const isProfit = hasTrades && pnl > 0;
              const isLoss = hasTrades && pnl < 0;
              const isToday = dateStr === todayStr;

              return (
                <TouchableOpacity
                  key={i}
                  style={[
                    s.cell,
                    { width: cellSize, height: cellSize },
                    isProfit && s.cellProfit,
                    isLoss && s.cellLoss,
                    isToday && s.cellToday,
                  ]}
                  onPress={() =>
                    hasTrades ? router.navigate({ pathname: "/(tabs)/journal" }) : undefined
                  }
                  activeOpacity={hasTrades ? 0.75 : 1}
                >
                  <Text
                    style={[
                      s.cellText,
                      isProfit && s.cellTextProfit,
                      isLoss && s.cellTextLoss,
                      isToday && s.cellTextToday,
                    ]}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={s.legend}>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: "#00C89675" }]} />
              <Text style={s.legendText}>Profit</Text>
            </View>
            <View style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: "#EF444475" }]} />
              <Text style={s.legendText}>Loss</Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    backgroundColor: C.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    borderTopWidth: 1,
    borderColor: C.cardBorder,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: C.cardBorder,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: C.text,
    marginBottom: 4,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  navBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: C.backgroundTertiary,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  monthLabel: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 8,
  },
  dayHeader: {
    textAlign: "center",
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
    paddingVertical: 4,
  },
  cell: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    margin: 1,
  },
  cellText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: C.textSecondary,
  },
  cellProfit: { backgroundColor: "#00C89625" },
  cellLoss: { backgroundColor: "#EF444425" },
  cellToday: { borderWidth: 1.5, borderColor: C.accent },
  cellTextProfit: { color: "#00C896", fontFamily: "Inter_700Bold" },
  cellTextLoss: { color: "#EF4444", fontFamily: "Inter_700Bold" },
  cellTextToday: { color: C.accent, fontFamily: "Inter_700Bold" },
  legend: {
    flexDirection: "row",
    gap: 16,
    marginTop: 12,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: {
    fontSize: 10,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
  },
});
