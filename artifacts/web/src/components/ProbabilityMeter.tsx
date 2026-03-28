import { useEffect, useRef } from "react";

interface ProbabilityMeterProps {
  score: number;
}

export default function ProbabilityMeter({ score }: ProbabilityMeterProps) {
  const chimed = useRef(false);

  useEffect(() => {
    if (score === 100 && !chimed.current) {
      chimed.current = true;
      try {
        const audio = new Audio("/sounds/chime.mp3");
        audio.volume = 0.6;
        audio.play().catch(() => {});
      } catch {}
    }
    if (score < 100) {
      chimed.current = false;
    }
  }, [score]);

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score === 100
      ? "#00ff88"
      : score >= 80
      ? "#00C896"
      : score >= 60
      ? "#F59E0B"
      : "#EF4444";

  const glowStyle =
    score === 100
      ? { filter: "drop-shadow(0 0 8px #00ff8888)" }
      : {};

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        width="128"
        height="128"
        viewBox="0 0 128 128"
        style={glowStyle}
      >
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="hsl(var(--border))"
          strokeWidth="10"
        />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 64 64)"
          style={{ transition: "stroke-dashoffset 0.5s ease, stroke 0.5s ease" }}
        />
        <text
          x="64"
          y={score === 100 ? "58" : "68"}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={color}
          fontSize={score === 100 ? "20" : "24"}
          fontWeight="700"
          fontFamily="Inter, sans-serif"
          style={{ transition: "fill 0.5s ease" }}
        >
          {score}%
        </text>
        {score === 100 && (
          <text
            x="64"
            y="76"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#00ff88"
            fontSize="10"
            fontWeight="700"
            fontFamily="Inter, sans-serif"
            letterSpacing="1"
          >
            A+ SETUP
          </text>
        )}
      </svg>
      <div className="text-center">
        <p className="text-xs font-semibold" style={{ color }}>
          {score === 100
            ? "Perfect Setup"
            : score >= 80
            ? "High Confidence"
            : score >= 60
            ? "Moderate Setup"
            : "Incomplete Setup"}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">Setup Probability</p>
      </div>
    </div>
  );
}
