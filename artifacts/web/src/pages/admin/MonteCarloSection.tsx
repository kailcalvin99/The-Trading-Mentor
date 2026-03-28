import { useMemo, useState } from "react";
import { ResponsiveContainer } from "recharts";

export const MC_PROFILES = {
  Perfect: { winRate: 0.75, risk: 0.01, rewardRatio: 2.5, label: "Perfect Trader", color: "hsl(142, 76%, 36%)" },
  Median:  { winRate: 0.50, risk: 0.02, rewardRatio: 1.5, label: "Median Trader",  color: "hsl(217, 91%, 60%)" },
  Lousy:   { winRate: 0.28, risk: 0.05, rewardRatio: 1.2, label: "Lousy Trader",   color: "hsl(0, 84%, 60%)"   },
} as const;
export type MCProfile = keyof typeof MC_PROFILES;

export const MC_START = 10_000;
export const MC_RUIN = 1;

export interface MCCustomInputs {
  winRate: number;
  risk: number;
  rewardRatio: number;
  startBalance: number;
}

function computeMaxDrawdown(history: number[]): number {
  let peak = history[0];
  let maxDD = 0;
  for (const v of history) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

export function expectedMaxConsecLosses(winRate: number, trades: number): number {
  const lossRate = 1 - winRate;
  if (lossRate <= 0) return 0;
  return Math.log(trades) / Math.log(1 / lossRate);
}

export function runMonteCarloCustom(inputs: MCCustomInputs): { paths: number[][], maxDrawdowns: number[] } {
  const { winRate, risk, rewardRatio, startBalance } = inputs;
  const TRADES = 1000;
  const PATHS = 100;
  const paths: number[][] = [];
  const maxDrawdowns: number[] = [];
  for (let p = 0; p < PATHS; p++) {
    const history: number[] = [startBalance];
    let balance = startBalance;
    for (let t = 0; t < TRADES; t++) {
      const riskAmt = balance * risk;
      if (Math.random() < winRate) {
        balance += riskAmt * rewardRatio;
      } else {
        balance -= riskAmt;
      }
      if (balance <= MC_RUIN) {
        history.push(balance);
        break;
      }
      history.push(balance);
    }
    paths.push(history);
    maxDrawdowns.push(computeMaxDrawdown(history));
  }
  return { paths, maxDrawdowns };
}

export function runMonteCarlo(profile: MCProfile): { paths: number[][], maxDrawdowns: number[] } {
  const { winRate, risk, rewardRatio } = MC_PROFILES[profile];
  return runMonteCarloCustom({ winRate, risk, rewardRatio, startBalance: MC_START });
}

export function fmt(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

function getPercentileAtIndex(sorted: number[], frac: number): number {
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * frac))];
}


export function MonteCarloChart({ paths: pathsRaw, width = 780, height = 320, startBalance = MC_START, goalTarget }: {
  paths: number[][], width?: number, height?: number, startBalance?: number, goalTarget?: number
}) {
  const W = Math.max(width, 200);
  const H = height;
  const PAD = { left: 56, right: 16, top: 16, bottom: 32 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const allFinals = pathsRaw.map((p) => p[p.length - 1]);
  const sorted95 = [...allFinals].sort((a, b) => a - b);
  const p95val = sorted95[Math.floor(sorted95.length * 0.95)];
  const rawMax = Math.max(p95val * 1.2, startBalance * 1.2);

  const logMin = Math.log10(Math.max(MC_RUIN, 1));
  const logMax = Math.log10(rawMax + 1);
  const toY = (v: number) =>
    PAD.top + chartH - ((Math.log10(Math.max(v, MC_RUIN)) - logMin) / (logMax - logMin)) * chartH;

  const STEP = 20;
  const numSteps = Math.ceil(1000 / STEP);
  const bandPaths: { p10: number[], p25: number[], p50: number[], p75: number[], p90: number[] } = {
    p10: [], p25: [], p50: [], p75: [], p90: []
  };
  for (let ti = 0; ti <= numSteps; ti++) {
    const t = Math.min(ti * STEP, 1000);
    const vals: number[] = pathsRaw.map((path) => path[Math.min(t, path.length - 1)]);
    vals.sort((a, b) => a - b);
    bandPaths.p10.push(getPercentileAtIndex(vals, 0.10));
    bandPaths.p25.push(getPercentileAtIndex(vals, 0.25));
    bandPaths.p50.push(getPercentileAtIndex(vals, 0.50));
    bandPaths.p75.push(getPercentileAtIndex(vals, 0.75));
    bandPaths.p90.push(getPercentileAtIndex(vals, 0.90));
  }

  function toSvgPoints(arr: number[]): string {
    return arr.map((v, ti) => {
      const t = Math.min(ti * STEP, 1000);
      const x = PAD.left + (t / 1000) * chartW;
      const y = toY(v);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
  }

  function toAreaPath(topArr: number[], botArr: number[]): string {
    const topPts = topArr.map((v, ti) => {
      const t = Math.min(ti * STEP, 1000);
      const x = PAD.left + (t / 1000) * chartW;
      return `${x.toFixed(1)},${toY(v).toFixed(1)}`;
    });
    const botPts = [...botArr].reverse().map((v, ri) => {
      const ti = botArr.length - 1 - ri;
      const t = Math.min(ti * STEP, 1000);
      const x = PAD.left + (t / 1000) * chartW;
      return `${x.toFixed(1)},${toY(v).toFixed(1)}`;
    });
    return `M ${topPts[0]} L ${topPts.join(" L ")} L ${botPts.join(" L ")} Z`;
  }

  const startY = toY(startBalance);
  const yLabels = [1_000, 10_000, 100_000, 1_000_000].filter((v) => v <= rawMax * 1.1);

  const goalY = goalTarget && goalTarget > 0 ? toY(goalTarget) : null;

  return (
    <svg width={W} height={H}>
      {yLabels.map((v) => {
        const y = toY(v);
        return (
          <g key={v}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="currentColor" strokeOpacity={0.08} strokeWidth={1} />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={10} fill="currentColor" fillOpacity={0.5}>{fmt(v)}</text>
          </g>
        );
      })}
      {[0, 250, 500, 750, 1000].map((t) => (
        <text key={t} x={PAD.left + (t / 1000) * chartW} y={H - 4} textAnchor="middle" fontSize={10} fill="currentColor" fillOpacity={0.4}>{t}</text>
      ))}

      <path d={toAreaPath(bandPaths.p90, bandPaths.p75)} fill="rgba(34,197,94,0.08)" />
      <path d={toAreaPath(bandPaths.p75, bandPaths.p25)} fill="rgba(34,197,94,0.15)" />
      <path d={toAreaPath(bandPaths.p25, bandPaths.p10)} fill="rgba(34,197,94,0.08)" />

      <polyline points={toSvgPoints(bandPaths.p90)} fill="none" stroke="rgba(34,197,94,0.25)" strokeWidth={1} />
      <polyline points={toSvgPoints(bandPaths.p10)} fill="none" stroke="rgba(34,197,94,0.25)" strokeWidth={1} />
      <polyline points={toSvgPoints(bandPaths.p75)} fill="none" stroke="rgba(34,197,94,0.3)" strokeWidth={1} strokeDasharray="3 3" />
      <polyline points={toSvgPoints(bandPaths.p25)} fill="none" stroke="rgba(34,197,94,0.3)" strokeWidth={1} strokeDasharray="3 3" />
      <polyline points={toSvgPoints(bandPaths.p50)} fill="none" stroke="#22c55e" strokeWidth={2} />

      <line x1={PAD.left} y1={startY} x2={W - PAD.right} y2={startY} stroke="#ef4444" strokeWidth={1.5} strokeDasharray="6 4" />
      <text x={PAD.left + 4} y={startY - 4} fontSize={9} fill="#ef4444" fillOpacity={0.8}>{fmt(startBalance)} start</text>

      {goalY !== null && goalTarget! > 0 && (
        <>
          <line x1={PAD.left} y1={goalY} x2={W - PAD.right} y2={goalY} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="8 4" />
          <text x={W - PAD.right - 4} y={goalY - 4} textAnchor="end" fontSize={9} fill="#f59e0b" fillOpacity={0.9}>Goal {fmt(goalTarget!)}</text>
        </>
      )}
    </svg>
  );
}


