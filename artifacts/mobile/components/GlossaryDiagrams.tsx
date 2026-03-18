import React from "react";
import { View, Text, StyleSheet } from "react-native";

const GRID_COLOR = "rgba(255,255,255,0.05)";
const BOX_BG = "#0D1117";
const BOX_H = 148;

function ChartBox({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.wrapper}>
      <Text style={s.title}>{title}</Text>
      <View style={s.box}>
        <View style={[s.grid, { bottom: 36 }]} />
        <View style={[s.grid, { bottom: 72 }]} />
        <View style={[s.grid, { bottom: 108 }]} />
        {children}
      </View>
    </View>
  );
}

function Bar({
  left,
  bottom,
  height,
  color,
  width = 14,
  border = false,
}: {
  left: number;
  bottom: number;
  height: number;
  color: string;
  width?: number;
  border?: boolean;
}) {
  return (
    <View
      style={{
        position: "absolute",
        left,
        bottom,
        width,
        height,
        backgroundColor: color,
        borderRadius: 2,
        borderWidth: border ? 1.5 : 0,
        borderColor: border ? color : "transparent",
        opacity: border ? 1 : 0.85,
      }}
    />
  );
}

function Wick({ left, bottom, height, color }: { left: number; bottom: number; height: number; color: string }) {
  return (
    <View
      style={{
        position: "absolute",
        left,
        bottom,
        width: 2,
        height,
        backgroundColor: color,
        opacity: 0.7,
      }}
    />
  );
}

function Zone({
  left,
  bottom,
  right,
  height,
  color,
  dashed = false,
}: {
  left: number;
  bottom: number;
  right?: number;
  height: number;
  color: string;
  dashed?: boolean;
}) {
  return (
    <View
      style={{
        position: "absolute",
        left,
        bottom,
        right: right ?? 4,
        height,
        backgroundColor: color,
        opacity: 0.2,
        borderRadius: 4,
      }}
    />
  );
}

function Label({ left, bottom, text, color, size = 9 }: { left?: number; bottom: number; text: string; color: string; size?: number; right?: number }) {
  return (
    <Text style={{ position: "absolute", left: left ?? 4, bottom, fontSize: size, color, fontFamily: "Inter_600SemiBold" }}>
      {text}
    </Text>
  );
}

export function FairValueGapDiagram() {
  const bull = "#00C896";
  const bear = "#EF4444";
  return (
    <ChartBox title="Fair Value Gap">
      <Bar left={14} bottom={44} height={26} color={bear} />
      <Wick left={20} bottom={70} height={14} color={bear} />
      <Bar left={34} bottom={72} height={38} color={bull} />
      <Wick left={40} bottom={110} height={16} color={bull} />
      <Bar left={54} bottom={100} height={22} color={bull} />
      <Wick left={60} bottom={122} height={12} color={bull} />
      <Zone left={34} bottom={70} height={14} color={bull} />
      <View style={{ position: "absolute", left: 34, bottom: 70, right: 110, height: 14, borderWidth: 1, borderColor: bull, borderRadius: 3 }} />
      <Label left={76} bottom={70} text="FVG" color={bull} size={10} />
      <Bar left={88} bottom={64} height={20} color={bear} />
      <Bar left={108} bottom={58} height={18} color={bear} />
      <Label left={4} bottom={4} text="Price returns to fill the FVG = entry zone" color="rgba(255,255,255,0.35)" />
    </ChartBox>
  );
}

export function OrderBlockDiagram() {
  const bear = "#EF4444";
  const ob = "#F59E0B";
  const bull = "#00C896";
  return (
    <ChartBox title="Order Block (OB)">
      <Bar left={14} bottom={68} height={20} color={bear} />
      <Wick left={20} bottom={88} height={12} color={bear} />
      <Bar left={34} bottom={54} height={26} color={bear} />
      <Wick left={40} bottom={80} height={10} color={bear} />
      <Bar left={54} bottom={38} height={28} color={bear} border />
      <Wick left={60} bottom={66} height={12} color={ob} />
      <Zone left={52} bottom={34} right={100} height={32} color={ob} />
      <View style={{ position: "absolute", left: 52, bottom: 34, right: 100, height: 32, borderWidth: 1, borderColor: ob, borderRadius: 3, borderStyle: "dashed" as any }} />
      <Label left={136} bottom={42} text="OB" color={ob} size={10} />
      <Bar left={78} bottom={24} height={22} color={bear} />
      <Bar left={98} bottom={14} height={20} color={bear} />
      <Bar left={126} bottom={52} height={36} color={bull} />
      <Wick left={132} bottom={88} height={18} color={bull} />
      <Label left={4} bottom={4} text="Last bearish candle before drop = Order Block" color="rgba(255,255,255,0.35)" />
    </ChartBox>
  );
}

export function BreakerBlockDiagram() {
  const bear = "#EF4444";
  const bull = "#00C896";
  const pb = "#A855F7";
  return (
    <ChartBox title="Breaker Block">
      <Bar left={14} bottom={28} height={22} color={bear} />
      <Wick left={20} bottom={50} height={12} color={bear} />
      <Bar left={34} bottom={16} height={24} color={bear} border />
      <Wick left={40} bottom={40} height={10} color={pb} />
      <Zone left={32} bottom={12} right={96} height={28} color={pb} />
      <Label left={4} bottom={42} text="Old OB (now Breaker)" color={pb} size={9} />
      <Bar left={54} bottom={10} height={18} color={bear} />
      <Bar left={74} bottom={6} height={16} color={bear} />
      <Bar left={94} bottom={20} height={34} color={bull} />
      <Wick left={100} bottom={54} height={16} color={bull} />
      <Bar left={114} bottom={46} height={30} color={bull} />
      <Wick left={120} bottom={76} height={14} color={bull} />
      <Bar left={134} bottom={68} height={22} color={bear} />
      <Wick left={140} bottom={90} height={10} color={bear} />
      <Label left={4} bottom={4} text="Swept OB flips to Breaker resistance" color="rgba(255,255,255,0.35)" />
    </ChartBox>
  );
}

export function SilverBulletDiagram() {
  const bull = "#00C896";
  const bear = "#EF4444";
  const tz = "#F59E0B";
  return (
    <ChartBox title="Silver Bullet (10–11 AM EST)">
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0, backgroundColor: tz, opacity: 0.06 }} />
      <Text style={{ position: "absolute", right: 6, top: 6, fontSize: 9, color: tz, fontFamily: "Inter_700Bold" }}>10–11 AM EST</Text>
      <Bar left={14} bottom={58} height={18} color={bull} />
      <Wick left={20} bottom={76} height={10} color={bull} />
      <Bar left={34} bottom={66} height={20} color={bull} />
      <Wick left={40} bottom={86} height={12} color={bull} />
      <Bar left={54} bottom={76} height={14} color={bull} />
      <Wick left={60} bottom={90} height={20} color={bear} />
      <View style={{ position: "absolute", left: 10, bottom: 90, right: 50, height: 1.5, backgroundColor: bear, opacity: 0.7 }} />
      <Label left={6} bottom={84} text="BSL swept ↑" color={bear} size={9} />
      <Bar left={74} bottom={52} height={38} color={bear} />
      <Wick left={80} bottom={90} height={8} color={bear} />
      <Zone left={72} bottom={48} right={46} height={14} color={bull} />
      <View style={{ position: "absolute", left: 72, bottom: 48, right: 46, height: 14, borderWidth: 1, borderColor: bull, borderRadius: 2 }} />
      <Label left={130} bottom={50} text="FVG" color={bull} size={9} />
      <Bar left={118} bottom={30} height={26} color={bear} />
      <Bar left={138} bottom={16} height={22} color={bear} />
      <Label left={4} bottom={4} text="Sweep → MSS → Enter FVG (Silver Bullet)" color="rgba(255,255,255,0.35)" />
    </ChartBox>
  );
}

export function JudasSwingDiagram() {
  const bull = "#00C896";
  const bear = "#EF4444";
  return (
    <ChartBox title="Judas Swing (False Move)">
      <Bar left={14} bottom={50} height={16} color={bull} />
      <Bar left={30} bottom={60} height={18} color={bull} />
      <Bar left={46} bottom={72} height={20} color={bull} />
      <Bar left={62} bottom={84} height={14} color={bull} />
      <Wick left={68} bottom={98} height={22} color={bear} />
      <View style={{ position: "absolute", left: 4, bottom: 96, width: 68, height: 1.5, backgroundColor: bear, opacity: 0.8 }} />
      <Label left={4} bottom={100} text="BSL ←" color={bear} size={9} />
      <Label left={62} bottom={118} text="Fake ↑" color={bear} size={9} />
      <Bar left={78} bottom={62} height={42} color={bear} />
      <Wick left={84} bottom={104} height={8} color={bear} />
      <Bar left={96} bottom={40} height={34} color={bear} />
      <Bar left={114} bottom={22} height={28} color={bear} />
      <Bar left={132} bottom={10} height={22} color={bear} />
      <Label left={115} bottom={6} text="Real ↓" color={bull} size={9} />
      <Label left={4} bottom={4} text="Fake move up sweeps BSL → real move is down" color="rgba(255,255,255,0.35)" />
    </ChartBox>
  );
}

export function PremiumDiscountDiagram() {
  return (
    <ChartBox title="Premium / Discount Array">
      <View style={{ position: "absolute", left: 0, right: 0, top: 0, height: BOX_H / 2, backgroundColor: "#EF4444", opacity: 0.1 }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: BOX_H / 2, backgroundColor: "#00C896", opacity: 0.1 }} />
      <View style={{ position: "absolute", left: 0, right: 0, bottom: BOX_H / 2 - 1, height: 2, backgroundColor: "#F59E0B" }} />
      <Text style={{ position: "absolute", left: 8, top: 10, fontSize: 13, color: "#EF4444", fontFamily: "Inter_700Bold" }}>PREMIUM</Text>
      <Text style={{ position: "absolute", left: 8, top: 28, fontSize: 10, color: "#EF4444", fontFamily: "Inter_400Regular", opacity: 0.8 }}>Above 50% → look for SELLS</Text>
      <Text style={{ position: "absolute", left: 8, bottom: 10, fontSize: 13, color: "#00C896", fontFamily: "Inter_700Bold" }}>DISCOUNT</Text>
      <Text style={{ position: "absolute", left: 8, bottom: 28, fontSize: 10, color: "#00C896", fontFamily: "Inter_400Regular", opacity: 0.8 }}>Below 50% → look for BUYS</Text>
      <Text style={{ position: "absolute", right: 8, bottom: BOX_H / 2 - 16, fontSize: 10, color: "#F59E0B", fontFamily: "Inter_700Bold" }}>50% EQ</Text>
    </ChartBox>
  );
}

const s = StyleSheet.create({
  wrapper: { marginBottom: 6 },
  title: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  box: {
    width: "100%",
    height: BOX_H,
    backgroundColor: BOX_BG,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  grid: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: GRID_COLOR,
  },
});
