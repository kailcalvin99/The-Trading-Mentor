import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, ZoomIn } from "lucide-react";

export function FVGDiagram({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" className={className} role="img" aria-label="Fair Value Gap diagram">
      <rect width="400" height="260" fill="#0f1117" rx="8" />
      <text x="200" y="22" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="sans-serif" fontWeight="600" style={{ textTransform: "uppercase", letterSpacing: "1px" }}>FAIR VALUE GAP (FVG)</text>

      <line x1="20" y1="240" x2="20" y2="30" stroke="#374151" strokeWidth="1" />
      <line x1="20" y1="240" x2="380" y2="240" stroke="#374151" strokeWidth="1" />

      {[40, 80, 120, 160, 200].map((y, i) => (
        <line key={i} x1="20" y1={y} x2="380" y2={y} stroke="#1f2937" strokeWidth="0.5" strokeDasharray="3,3" />
      ))}

      {[
        { x: 40, o: 200, c: 180, h: 175, l: 210 },
        { x: 80, o: 180, c: 170, h: 165, l: 188 },
        { x: 120, o: 170, c: 100, h: 95, l: 175 },
        { x: 160, o: 100, c: 115, h: 98, l: 120 },
        { x: 200, o: 115, c: 130, h: 112, l: 135 },
        { x: 240, o: 130, c: 125, h: 125, l: 140 },
        { x: 280, o: 125, c: 90, h: 85, l: 130 },
        { x: 320, o: 90, c: 100, h: 87, l: 105 },
      ].map((bar, i) => {
        const bull = bar.c <= bar.o;
        const top = Math.min(bar.o, bar.c);
        const ht = Math.abs(bar.o - bar.c);
        return (
          <g key={i}>
            <line x1={bar.x} y1={bar.h} x2={bar.x} y2={bar.l} stroke={bull ? "#00C896" : "#EF4444"} strokeWidth="1.5" />
            <rect x={bar.x - 12} y={top} width="24" height={Math.max(ht, 2)} fill={bull ? "#00C896" : "#EF4444"} fillOpacity="0.9" rx="1" />
          </g>
        );
      })}

      <rect x="80" y="120" width="80" height="45" fill="#818cf8" fillOpacity="0.15" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="4,2" rx="3" />
      <text x="120" y="140" textAnchor="middle" fill="#818cf8" fontSize="11" fontFamily="sans-serif" fontWeight="700">FVG</text>
      <text x="120" y="155" textAnchor="middle" fill="#818cf8" fontSize="9" fontFamily="sans-serif">Imbalance Zone</text>

      <line x1="80" y1="120" x2="55" y2="108" stroke="#818cf8" strokeWidth="1" strokeDasharray="2,2" />
      <text x="48" y="103" textAnchor="middle" fill="#818cf8" fontSize="9" fontFamily="sans-serif">Low of C3</text>

      <line x1="80" y1="165" x2="55" y2="177" stroke="#818cf8" strokeWidth="1" strokeDasharray="2,2" />
      <text x="48" y="187" textAnchor="middle" fill="#818cf8" fontSize="9" fontFamily="sans-serif">High of C1</text>

      <line x1="280" y1="86" x2="260" y2="70" stroke="#00C896" strokeWidth="1.5" strokeDasharray="3,2" />
      <text x="248" y="65" textAnchor="middle" fill="#00C896" fontSize="9" fontFamily="sans-serif">Price mitigates FVG</text>
      <text x="248" y="76" textAnchor="middle" fill="#00C896" fontSize="9" fontFamily="sans-serif">→ entry signal</text>

      <rect x="100" y="245" width="10" height="8" fill="#818cf8" fillOpacity="0.3" stroke="#818cf8" strokeWidth="1" />
      <text x="116" y="252" fill="#9ca3af" fontSize="9" fontFamily="sans-serif">FVG Zone</text>
      <circle cx="180" cy="249" r="4" fill="#00C896" />
      <text x="188" y="252" fill="#9ca3af" fontSize="9" fontFamily="sans-serif">Bullish bar</text>
      <circle cx="230" cy="249" r="4" fill="#EF4444" />
      <text x="238" y="252" fill="#9ca3af" fontSize="9" fontFamily="sans-serif">Bearish bar</text>
    </svg>
  );
}

export function OTEDiagram({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" className={className} role="img" aria-label="OTE diagram">
      <rect width="400" height="260" fill="#0f1117" rx="8" />
      <text x="200" y="22" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="sans-serif" fontWeight="600">OPTIMAL TRADE ENTRY (OTE)</text>

      <line x1="20" y1="240" x2="20" y2="30" stroke="#374151" strokeWidth="1" />
      <line x1="20" y1="240" x2="380" y2="240" stroke="#374151" strokeWidth="1" />

      <line x1="20" y1="60" x2="380" y2="60" stroke="#EF4444" strokeWidth="1" strokeDasharray="4,3" />
      <text x="375" y="58" textAnchor="end" fill="#EF4444" fontSize="9" fontFamily="sans-serif">Swing High</text>

      <line x1="20" y1="210" x2="380" y2="210" stroke="#00C896" strokeWidth="1" strokeDasharray="4,3" />
      <text x="375" y="208" textAnchor="end" fill="#00C896" fontSize="9" fontFamily="sans-serif">Swing Low</text>

      <line x1="20" y1="123" x2="380" y2="123" stroke="#F59E0B" strokeWidth="1" strokeDasharray="2,2" />
      <text x="375" y="121" textAnchor="end" fill="#F59E0B" fontSize="9" fontFamily="sans-serif">50%</text>

      <rect x="20" y="123" width="360" height="42" fill="#F59E0B" fillOpacity="0.08" />
      <rect x="20" y="141" width="360" height="24" fill="#00C896" fillOpacity="0.12" stroke="#00C896" strokeWidth="0.5" strokeDasharray="3,2" />
      <text x="200" y="156" textAnchor="middle" fill="#00C896" fontSize="10" fontFamily="sans-serif" fontWeight="700">OTE Zone: 61.8% – 78.6%</text>

      <line x1="20" y1="141" x2="380" y2="141" stroke="#00C896" strokeWidth="0.8" strokeDasharray="2,2" />
      <text x="375" y="139" textAnchor="end" fill="#00C896" fontSize="9" fontFamily="sans-serif">61.8%</text>
      <line x1="20" y1="165" x2="380" y2="165" stroke="#00C896" strokeWidth="0.8" strokeDasharray="2,2" />
      <text x="375" y="163" textAnchor="end" fill="#00C896" fontSize="9" fontFamily="sans-serif">78.6%</text>

      {[
        [60, 60, 210, 210],
        [100, 210, 60, 60],
        [160, 60, 165, 165],
      ].map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={y2 > y1 ? "#EF4444" : "#00C896"} strokeWidth="1.5" />
      ))}

      <circle cx="215" cy="155" r="8" fill="#00C896" fillOpacity="0.3" stroke="#00C896" strokeWidth="2" />
      <text x="215" y="158" textAnchor="middle" fill="#00C896" fontSize="9" fontFamily="sans-serif" fontWeight="700">BUY</text>

      <line x1="215" y1="147" x2="215" y2="120" stroke="#00C896" strokeWidth="1.5" />
      <polygon points="210,120 220,120 215,110" fill="#00C896" />

      <text x="215" y="100" textAnchor="middle" fill="#00C896" fontSize="9" fontFamily="sans-serif">Price continues</text>
      <text x="215" y="112" textAnchor="middle" fill="#00C896" fontSize="9" fontFamily="sans-serif">higher after OTE</text>
    </svg>
  );
}

export function MSSDiagram({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" className={className} role="img" aria-label="Market Structure Shift diagram">
      <rect width="400" height="260" fill="#0f1117" rx="8" />
      <text x="200" y="22" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="sans-serif" fontWeight="600">MARKET STRUCTURE SHIFT (MSS)</text>

      <line x1="20" y1="240" x2="20" y2="30" stroke="#374151" strokeWidth="1" />
      <line x1="20" y1="240" x2="380" y2="240" stroke="#374151" strokeWidth="1" />

      {[60, 90, 120, 150, 180, 210].map((y, i) => (
        <line key={i} x1="20" y1={y} x2="380" y2={y} stroke="#1f2937" strokeWidth="0.5" strokeDasharray="3,3" />
      ))}

      <polyline points="40,200 80,170 120,140 160,115 200,140 240,90 250,120" fill="none" stroke="#EF4444" strokeWidth="2" />

      <line x1="240" y1="90" x2="240" y2="90" stroke="#EF4444" strokeWidth="3" />
      <circle cx="240" cy="90" r="5" fill="#EF4444" />
      <text x="240" y="80" textAnchor="middle" fill="#EF4444" fontSize="9" fontFamily="sans-serif" fontWeight="700">HH</text>

      <line x1="200" y1="90" x2="380" y2="90" stroke="#EF4444" strokeWidth="1" strokeDasharray="3,2" />
      <text x="375" y="88" textAnchor="end" fill="#EF4444" fontSize="9" fontFamily="sans-serif">Last HH</text>

      <polyline points="250,120 270,200 310,140 350,210" fill="none" stroke="#00C896" strokeWidth="2" />

      <circle cx="270" cy="200" r="5" fill="#00C896" />
      <text x="270" y="215" textAnchor="middle" fill="#00C896" fontSize="9" fontFamily="sans-serif" fontWeight="700">LL</text>

      <rect x="240" y="88" width="30" height="35" fill="#F59E0B" fillOpacity="0.2" stroke="#F59E0B" strokeWidth="1.5" rx="2" />
      <text x="255" y="108" textAnchor="middle" fill="#F59E0B" fontSize="9" fontFamily="sans-serif" fontWeight="700">MSS</text>

      <line x1="255" y1="88" x2="255" y2="65" stroke="#F59E0B" strokeWidth="1.5" />
      <text x="255" y="58" textAnchor="middle" fill="#F59E0B" fontSize="10" fontFamily="sans-serif" fontWeight="700">Bearish Shift</text>
      <text x="255" y="70" textAnchor="middle" fill="#F59E0B" fontSize="9" fontFamily="sans-serif">Uptrend → Downtrend</text>

      <rect x="22" y="245" width="70" height="10" rx="2" fill="none" />
      <line x1="22" y1="250" x2="40" y2="250" stroke="#EF4444" strokeWidth="2" />
      <text x="44" y="253" fill="#9ca3af" fontSize="9" fontFamily="sans-serif">Bearish trend</text>
      <line x1="110" y1="250" x2="128" y2="250" stroke="#00C896" strokeWidth="2" />
      <text x="132" y="253" fill="#9ca3af" fontSize="9" fontFamily="sans-serif">New bearish impulse</text>
    </svg>
  );
}

export function LiquiditySweepDiagram({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" className={className} role="img" aria-label="Liquidity Sweep diagram">
      <rect width="400" height="260" fill="#0f1117" rx="8" />
      <text x="200" y="22" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="sans-serif" fontWeight="600">LIQUIDITY SWEEP</text>

      <line x1="20" y1="240" x2="20" y2="30" stroke="#374151" strokeWidth="1" />
      <line x1="20" y1="240" x2="380" y2="240" stroke="#374151" strokeWidth="1" />

      <line x1="20" y1="80" x2="380" y2="80" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="5,3" />
      <text x="375" y="78" textAnchor="end" fill="#EF4444" fontSize="9" fontFamily="sans-serif">Buy-side Liquidity</text>
      <text x="375" y="88" textAnchor="end" fill="#EF4444" fontSize="8" fontFamily="sans-serif">(stops above highs)</text>

      <line x1="20" y1="185" x2="380" y2="185" stroke="#00C896" strokeWidth="1.5" strokeDasharray="5,3" />
      <text x="375" y="183" textAnchor="end" fill="#00C896" fontSize="9" fontFamily="sans-serif">Sell-side Liquidity</text>
      <text x="375" y="193" textAnchor="end" fill="#00C896" fontSize="8" fontFamily="sans-serif">(stops below lows)</text>

      <polyline points="40,140 80,130 120,120 160,110 200,85 210,60 220,78 240,130 260,110 290,155 310,175 330,195 340,175 360,130" fill="none" stroke="#818cf8" strokeWidth="2.5" />

      <circle cx="210" cy="60" r="7" fill="#EF4444" fillOpacity="0.3" stroke="#EF4444" strokeWidth="2" />
      <text x="210" y="50" textAnchor="middle" fill="#EF4444" fontSize="9" fontFamily="sans-serif" fontWeight="700">SWEEP</text>
      <text x="210" y="42" textAnchor="middle" fill="#EF4444" fontSize="8" fontFamily="sans-serif">Grabs stops</text>

      <circle cx="330" cy="195" r="7" fill="#00C896" fillOpacity="0.3" stroke="#00C896" strokeWidth="2" />
      <text x="330" y="210" textAnchor="middle" fill="#00C896" fontSize="9" fontFamily="sans-serif" fontWeight="700">SWEEP</text>
      <text x="330" y="220" textAnchor="middle" fill="#00C896" fontSize="8" fontFamily="sans-serif">Grabs stops</text>

      <text x="260" y="105" textAnchor="middle" fill="#818cf8" fontSize="10" fontFamily="sans-serif" fontWeight="700">Reversal</text>
      <line x1="255" y1="108" x2="250" y2="125" stroke="#818cf8" strokeWidth="1.5" />
      <polygon points="246,125 254,125 250,132" fill="#818cf8" />
    </svg>
  );
}

export function KillZoneDiagram({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" className={className} role="img" aria-label="Kill Zone diagram">
      <rect width="400" height="260" fill="#0f1117" rx="8" />
      <text x="200" y="22" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="sans-serif" fontWeight="600">KILL ZONES (HIGH-PROBABILITY WINDOWS)</text>

      <rect x="35" y="35" width="80" height="195" fill="#818cf8" fillOpacity="0.08" stroke="#818cf8" strokeWidth="1" strokeDasharray="3,2" rx="3" />
      <text x="75" y="55" textAnchor="middle" fill="#818cf8" fontSize="9" fontFamily="sans-serif" fontWeight="700">London</text>
      <text x="75" y="66" textAnchor="middle" fill="#818cf8" fontSize="8" fontFamily="sans-serif">02:00–05:00</text>

      <rect x="135" y="35" width="80" height="195" fill="#F59E0B" fillOpacity="0.08" stroke="#F59E0B" strokeWidth="1" strokeDasharray="3,2" rx="3" />
      <text x="175" y="55" textAnchor="middle" fill="#F59E0B" fontSize="9" fontFamily="sans-serif" fontWeight="700">NY AM</text>
      <text x="175" y="66" textAnchor="middle" fill="#F59E0B" fontSize="8" fontFamily="sans-serif">09:30–11:00</text>

      <rect x="235" y="35" width="80" height="195" fill="#00C896" fillOpacity="0.08" stroke="#00C896" strokeWidth="1" strokeDasharray="3,2" rx="3" />
      <text x="275" y="55" textAnchor="middle" fill="#00C896" fontSize="9" fontFamily="sans-serif" fontWeight="700">NY PM</text>
      <text x="275" y="66" textAnchor="middle" fill="#00C896" fontSize="8" fontFamily="sans-serif">13:30–15:00</text>

      <polyline
        points="20,160 35,162 75,90 115,80 135,140 175,120 215,180 235,170 275,100 315,90 355,140 380,145"
        fill="none"
        stroke="#9ca3af"
        strokeWidth="1.5"
      />

      {[
        { x: 75, y: 90, c: "#818cf8", label: "↑ London" },
        { x: 175, y: 120, c: "#F59E0B", label: "↓ NY AM" },
        { x: 275, y: 100, c: "#00C896", label: "↑ NY PM" },
      ].map((pt, i) => (
        <g key={i}>
          <circle cx={pt.x} cy={pt.y} r="6" fill={pt.c} fillOpacity="0.4" stroke={pt.c} strokeWidth="1.5" />
          <text x={pt.x} y={pt.y - 12} textAnchor="middle" fill={pt.c} fontSize="9" fontFamily="sans-serif" fontWeight="700">{pt.label}</text>
        </g>
      ))}

      <text x="340" y="160" textAnchor="middle" fill="#6b7280" fontSize="9" fontFamily="sans-serif">Avoid</text>
      <rect x="320" y="35" width="60" height="195" fill="#6b7280" fillOpacity="0.05" />
      <text x="350" y="55" textAnchor="middle" fill="#6b7280" fontSize="8" fontFamily="sans-serif">15:00+</text>
    </svg>
  );
}

export function SilverBulletDiagram({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" className={className} role="img" aria-label="Silver Bullet diagram">
      <rect width="400" height="260" fill="#0f1117" rx="8" />
      <text x="200" y="22" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="sans-serif" fontWeight="600">SILVER BULLET (10:00–11:00 AM)</text>

      <line x1="20" y1="240" x2="20" y2="30" stroke="#374151" strokeWidth="1" />
      <line x1="20" y1="240" x2="380" y2="240" stroke="#374151" strokeWidth="1" />

      {[70, 110, 150, 190, 230].map((y, i) => (
        <line key={i} x1="20" y1={y} x2="380" y2={y} stroke="#1f2937" strokeWidth="0.5" strokeDasharray="3,3" />
      ))}

      <rect x="180" y="35" width="120" height="200" fill="#F59E0B" fillOpacity="0.07" stroke="#F59E0B" strokeWidth="1" strokeDasharray="3,2" rx="2" />
      <text x="240" y="50" textAnchor="middle" fill="#F59E0B" fontSize="9" fontFamily="sans-serif" fontWeight="700">10:00 – 11:00 AM</text>
      <text x="240" y="62" textAnchor="middle" fill="#F59E0B" fontSize="8" fontFamily="sans-serif">Silver Bullet Window</text>

      {[
        { x: 50, o: 150, c: 130, h: 125, l: 155 },
        { x: 90, o: 130, c: 110, h: 105, l: 135 },
        { x: 130, o: 110, c: 125, h: 105, l: 130 },
        { x: 170, o: 125, c: 115, h: 112, l: 130 },
        { x: 210, o: 115, c: 85, h: 78, l: 120 },
        { x: 250, o: 85, c: 80, h: 78, l: 92 },
        { x: 290, o: 80, c: 110, h: 75, l: 115 },
        { x: 330, o: 110, c: 130, h: 108, l: 135 },
      ].map((bar, i) => {
        const bull = bar.c <= bar.o;
        const top = Math.min(bar.o, bar.c);
        const ht = Math.abs(bar.o - bar.c);
        return (
          <g key={i}>
            <line x1={bar.x} y1={bar.h} x2={bar.x} y2={bar.l} stroke={bull ? "#00C896" : "#EF4444"} strokeWidth="1.5" />
            <rect x={bar.x - 14} y={top} width="28" height={Math.max(ht, 2)} fill={bull ? "#00C896" : "#EF4444"} fillOpacity="0.9" rx="1" />
          </g>
        );
      })}

      <rect x="210" y="78" width="40" height="44" fill="#818cf8" fillOpacity="0.2" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="3,2" rx="3" />
      <text x="230" y="103" textAnchor="middle" fill="#818cf8" fontSize="9" fontFamily="sans-serif" fontWeight="700">FVG</text>

      <line x1="290" y1="75" x2="310" y2="55" stroke="#00C896" strokeWidth="1.5" />
      <text x="320" y="50" textAnchor="middle" fill="#00C896" fontSize="9" fontFamily="sans-serif" fontWeight="700">↑ Reversal</text>
      <text x="320" y="62" textAnchor="middle" fill="#00C896" fontSize="9" fontFamily="sans-serif">Entry on FVG</text>
    </svg>
  );
}

export function ConservativeEntryDiagram({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" className={className} role="img" aria-label="Conservative Entry diagram">
      <rect width="400" height="260" fill="#0f1117" rx="8" />
      <text x="200" y="22" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="sans-serif" fontWeight="600">CONSERVATIVE ENTRY</text>

      <line x1="20" y1="240" x2="20" y2="30" stroke="#374151" strokeWidth="1" />
      <line x1="20" y1="240" x2="380" y2="240" stroke="#374151" strokeWidth="1" />

      {[70, 110, 150, 190, 230].map((y, i) => (
        <line key={i} x1="20" y1={y} x2="380" y2={y} stroke="#1f2937" strokeWidth="0.5" strokeDasharray="3,3" />
      ))}

      {[
        { x: 50, o: 200, c: 175, h: 168, l: 205 },
        { x: 90, o: 175, c: 145, h: 140, l: 180 },
        { x: 130, o: 145, c: 115, h: 110, l: 148 },
        { x: 170, o: 115, c: 130, h: 112, l: 135 },
        { x: 210, o: 130, c: 120, h: 118, l: 135 },
        { x: 250, o: 120, c: 90, h: 85, l: 125 },
      ].map((bar, i) => {
        const bull = bar.c <= bar.o;
        const top = Math.min(bar.o, bar.c);
        const ht = Math.abs(bar.o - bar.c);
        return (
          <g key={i}>
            <line x1={bar.x} y1={bar.h} x2={bar.x} y2={bar.l} stroke={bull ? "#00C896" : "#EF4444"} strokeWidth="1.5" />
            <rect x={bar.x - 14} y={top} width="28" height={Math.max(ht, 2)} fill={bull ? "#00C896" : "#EF4444"} fillOpacity="0.9" rx="1" />
          </g>
        );
      })}

      <line x1="170" y1="112" x2="380" y2="112" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="4,3" />
      <text x="375" y="110" textAnchor="end" fill="#EF4444" fontSize="9" fontFamily="sans-serif">Previous Low (BOS Level)</text>

      <circle cx="250" cy="85" r="8" fill="#EF4444" fillOpacity="0.3" stroke="#EF4444" strokeWidth="2" />
      <text x="250" y="89" textAnchor="middle" fill="#EF4444" fontSize="8" fontFamily="sans-serif" fontWeight="700">BOS</text>

      <line x1="250" y1="77" x2="250" y2="58" stroke="#F59E0B" strokeWidth="1.5" />
      <text x="250" y="53" textAnchor="middle" fill="#F59E0B" fontSize="9" fontFamily="sans-serif" fontWeight="700">Wait for retest</text>

      {[
        { x: 290, o: 98, c: 110, h: 95, l: 112 },
        { x: 330, o: 110, c: 130, h: 108, l: 133 },
        { x: 370, o: 130, c: 148, h: 128, l: 150 },
      ].map((bar, i) => {
        const bull = bar.c <= bar.o;
        const top = Math.min(bar.o, bar.c);
        const ht = Math.abs(bar.o - bar.c);
        return (
          <g key={i}>
            <line x1={bar.x} y1={bar.h} x2={bar.x} y2={bar.l} stroke={bull ? "#00C896" : "#EF4444"} strokeWidth="1.5" />
            <rect x={bar.x - 14} y={top} width="28" height={Math.max(ht, 2)} fill={bull ? "#00C896" : "#EF4444"} fillOpacity="0.9" rx="1" />
          </g>
        );
      })}

      <rect x="275" y="105" width="30" height="15" fill="#00C896" fillOpacity="0.2" stroke="#00C896" strokeWidth="1.5" rx="2" />
      <text x="290" y="116" textAnchor="middle" fill="#00C896" fontSize="8" fontFamily="sans-serif" fontWeight="700">ENTRY</text>

      <line x1="290" y1="130" x2="290" y2="175" stroke="#6b7280" strokeWidth="1" strokeDasharray="2,2" />
      <line x1="280" y1="175" x2="300" y2="175" stroke="#EF4444" strokeWidth="2" />
      <text x="320" y="178" fill="#EF4444" fontSize="9" fontFamily="sans-serif">SL: below retest low</text>

      <line x1="290" y1="98" x2="290" y2="55" stroke="#6b7280" strokeWidth="1" strokeDasharray="2,2" />
      <line x1="280" y1="55" x2="300" y2="55" stroke="#00C896" strokeWidth="2" />
      <text x="320" y="58" fill="#00C896" fontSize="9" fontFamily="sans-serif">TP: next HTF target</text>
    </svg>
  );
}

export function ExitCriteriaDiagram({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" className={className} role="img" aria-label="Exit Criteria diagram">
      <rect width="400" height="260" fill="#0f1117" rx="8" />
      <text x="200" y="22" textAnchor="middle" fill="#9ca3af" fontSize="11" fontFamily="sans-serif" fontWeight="600">EXIT CRITERIA</text>

      <line x1="20" y1="240" x2="20" y2="30" stroke="#374151" strokeWidth="1" />
      <line x1="20" y1="240" x2="380" y2="240" stroke="#374151" strokeWidth="1" />

      {[70, 110, 150, 190, 230].map((y, i) => (
        <line key={i} x1="20" y1={y} x2="380" y2={y} stroke="#1f2937" strokeWidth="0.5" strokeDasharray="3,3" />
      ))}

      {[
        { x: 50, o: 190, c: 175, h: 170, l: 195 },
        { x: 90, o: 175, c: 155, h: 148, l: 178 },
        { x: 130, o: 155, c: 140, h: 132, l: 157 },
        { x: 170, o: 140, c: 110, h: 105, l: 143 },
        { x: 210, o: 110, c: 90, h: 85, l: 115 },
      ].map((bar, i) => {
        const bull = bar.c <= bar.o;
        const top = Math.min(bar.o, bar.c);
        const ht = Math.abs(bar.o - bar.c);
        return (
          <g key={i}>
            <line x1={bar.x} y1={bar.h} x2={bar.x} y2={bar.l} stroke={bull ? "#00C896" : "#EF4444"} strokeWidth="1.5" />
            <rect x={bar.x - 14} y={top} width="28" height={Math.max(ht, 2)} fill={bull ? "#00C896" : "#EF4444"} fillOpacity="0.9" rx="1" />
          </g>
        );
      })}

      <line x1="130" y1="148" x2="380" y2="148" stroke="#00C896" strokeWidth="1.5" strokeDasharray="4,3" />
      <text x="375" y="146" textAnchor="end" fill="#00C896" fontSize="9" fontFamily="sans-serif">TP 1 — 50% of range</text>

      <line x1="50" y1="195" x2="380" y2="195" stroke="#00C896" strokeWidth="1.5" strokeDasharray="4,3" />
      <text x="375" y="208" textAnchor="end" fill="#00C896" fontSize="9" fontFamily="sans-serif">TP 2 — HTF Target</text>

      <line x1="50" y1="170" x2="380" y2="170" stroke="#EF4444" strokeWidth="1.5" strokeDasharray="4,3" />
      <text x="375" y="167" textAnchor="end" fill="#EF4444" fontSize="9" fontFamily="sans-serif">Stop Loss</text>

      <rect x="200" y="83" width="60" height="22" fill="#00C896" fillOpacity="0.15" stroke="#00C896" strokeWidth="1.5" rx="3" />
      <text x="230" y="98" textAnchor="middle" fill="#00C896" fontSize="10" fontFamily="sans-serif" fontWeight="700">ENTRY</text>

      {[
        { x: 250, o: 92, c: 75, h: 70, l: 95 },
        { x: 290, o: 75, c: 55, h: 50, l: 78 },
        { x: 330, o: 55, c: 45, h: 40, l: 58 },
      ].map((bar, i) => {
        const bull = bar.c <= bar.o;
        const top = Math.min(bar.o, bar.c);
        const ht = Math.abs(bar.o - bar.c);
        return (
          <g key={i}>
            <line x1={bar.x} y1={bar.h} x2={bar.x} y2={bar.l} stroke={bull ? "#00C896" : "#EF4444"} strokeWidth="1.5" />
            <rect x={bar.x - 14} y={top} width="28" height={Math.max(ht, 2)} fill={bull ? "#00C896" : "#EF4444"} fillOpacity="0.9" rx="1" />
          </g>
        );
      })}

      <circle cx="280" cy="148" r="5" fill="#00C896" />
      <text x="265" y="143" textAnchor="middle" fill="#00C896" fontSize="9" fontFamily="sans-serif" fontWeight="700">½ Close</text>

      <text x="200" y="235" fill="#F59E0B" fontSize="9" fontFamily="sans-serif">Move SL to BE after TP1 hit → free ride to TP2</text>
    </svg>
  );
}

const CONCEPT_LABELS: Record<string, string> = {
  fvg: "Fair Value Gap",
  ote: "Optimal Trade Entry",
  mss: "Market Structure Shift",
  "liquidity-sweep": "Liquidity Sweep",
  "kill-zone": "Kill Zone",
  "silver-bullet": "Silver Bullet",
  "conservative-entry": "Conservative Entry",
  "exit-criteria": "Exit Criteria",
};

const DIAGRAM_MAP: Record<string, React.FC<{ className?: string }>> = {
  fvg: FVGDiagram,
  ote: OTEDiagram,
  mss: MSSDiagram,
  "liquidity-sweep": LiquiditySweepDiagram,
  "kill-zone": KillZoneDiagram,
  "silver-bullet": SilverBulletDiagram,
  "conservative-entry": ConservativeEntryDiagram,
  "exit-criteria": ExitCriteriaDiagram,
};

export function chartImageToConceptKey(chartImage: string): string | null {
  const normalized = chartImage.replace(/\.(png|webp)$/, "");
  const map: Record<string, string> = {
    "chart-fvg": "fvg",
    "chart-ote": "ote",
    "chart-mss": "mss",
    "chart-liquidity-sweep": "liquidity-sweep",
    "chart-killzone": "kill-zone",
    "chart-silver-bullet": "silver-bullet",
    "chart-conservative-entry": "conservative-entry",
    "chart-exit-criteria": "exit-criteria",
  };
  return map[normalized] ?? null;
}

export function ChartLightbox({
  conceptKey,
  onClose,
}: {
  conceptKey: string;
  onClose: () => void;
}) {
  const [zoomed, setZoomed] = useState(false);
  const DiagramComp = DIAGRAM_MAP[conceptKey];
  if (!DiagramComp) return null;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-3xl w-full p-0 overflow-hidden bg-[#0f1117] border-border">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">ICT Concept</p>
            <p className="text-base font-bold text-foreground">{CONCEPT_LABELS[conceptKey] ?? conceptKey}</p>
          </div>
          <div className="flex items-center gap-2">
            {!zoomed && (
              <button
                onClick={() => setZoomed(true)}
                className="flex items-center gap-1.5 text-xs bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 rounded-full hover:bg-primary/30 transition-colors"
              >
                <ZoomIn className="h-3.5 w-3.5" />
                Zoom In
              </button>
            )}
            {zoomed && (
              <button
                onClick={() => setZoomed(false)}
                className="flex items-center gap-1.5 text-xs bg-muted text-foreground border border-border px-3 py-1.5 rounded-full hover:bg-muted/80 transition-colors"
              >
                Overview
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-1.5 hover:bg-muted transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div className="p-4">
          {!zoomed ? (
            <div>
              <p className="text-xs text-muted-foreground mb-3 text-center">Overview — tap "Zoom In" to see fine detail</p>
              <DiagramComp className="w-full rounded-lg" />
            </div>
          ) : (
            <div className="overflow-auto max-h-[70vh]">
              <p className="text-xs text-muted-foreground mb-3 text-center">Zoomed detail view</p>
              <div style={{ minWidth: 600 }}>
                <DiagramComp className="w-full rounded-lg" />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
