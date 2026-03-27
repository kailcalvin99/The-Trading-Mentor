import { useState, useMemo } from "react";
import {
  MC_PROFILES, type MCProfile, MC_START, MC_RUIN,
  type MCCustomInputs, runMonteCarloCustom, runMonteCarlo,
  expectedMaxConsecLosses,
} from "./MonteCarloSection";

export function useMonteCarlo() {
  const [mcProfile, setMcProfile] = useState<MCProfile | "Custom">("Median");
  const [mcRerunKey, setMcRerunKey] = useState(0);
  const [mcCustomWinRate, setMcCustomWinRate] = useState("50");
  const [mcCustomRisk, setMcCustomRisk] = useState("2");
  const [mcCustomRR, setMcCustomRR] = useState("1.5");
  const [mcCustomBalance, setMcCustomBalance] = useState("10000");
  const [mcGoalTarget, setMcGoalTarget] = useState("");
  const [mcInputsDirty, setMcInputsDirty] = useState(false);

  function setMcCustomWinRateDirty(v: string) { setMcCustomWinRate(v); if (mcProfile === "Custom") setMcInputsDirty(true); }
  function setMcCustomRiskDirty(v: string) { setMcCustomRisk(v); if (mcProfile === "Custom") setMcInputsDirty(true); }
  function setMcCustomRRDirty(v: string) { setMcCustomRR(v); if (mcProfile === "Custom") setMcInputsDirty(true); }
  function setMcCustomBalanceDirty(v: string) { setMcCustomBalance(v); if (mcProfile === "Custom") setMcInputsDirty(true); }

  const mcSimResult = useMemo(() => {
    if (mcProfile === "Custom") {
      const wr = Math.min(0.99, Math.max(0.01, parseFloat(mcCustomWinRate) / 100 || 0.5));
      const risk = Math.min(0.5, Math.max(0.001, parseFloat(mcCustomRisk) / 100 || 0.02));
      const rr = Math.max(0.1, parseFloat(mcCustomRR) || 1.5);
      const bal = Math.max(100, parseFloat(mcCustomBalance) || MC_START);
      return runMonteCarloCustom({ winRate: wr, risk, rewardRatio: rr, startBalance: bal });
    }
    return runMonteCarlo(mcProfile as MCProfile);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mcProfile, mcRerunKey]);

  const mcPaths = mcSimResult.paths;
  const mcMaxDrawdowns = mcSimResult.maxDrawdowns;

  const mcStartBalance = useMemo(() => {
    if (mcProfile === "Custom") return Math.max(100, parseFloat(mcCustomBalance) || MC_START);
    return MC_START;
  }, [mcProfile, mcCustomBalance, mcRerunKey]);

  const mcInputs = useMemo((): MCCustomInputs => {
    if (mcProfile !== "Custom") {
      const p = MC_PROFILES[mcProfile as MCProfile];
      return { winRate: p.winRate, risk: p.risk, rewardRatio: p.rewardRatio, startBalance: MC_START };
    }
    return {
      winRate: Math.min(0.99, Math.max(0.01, parseFloat(mcCustomWinRate) / 100 || 0.5)),
      risk: Math.min(0.5, Math.max(0.001, parseFloat(mcCustomRisk) / 100 || 0.02)),
      rewardRatio: Math.max(0.1, parseFloat(mcCustomRR) || 1.5),
      startBalance: Math.max(100, parseFloat(mcCustomBalance) || MC_START),
    };
  }, [mcProfile, mcCustomWinRate, mcCustomRisk, mcCustomRR, mcCustomBalance, mcRerunKey]);

  const mcStats = useMemo(() => {
    const finals = mcPaths.map((p) => p[p.length - 1]);
    const total = finals.length;
    const blown = Math.round((finals.filter((f) => f <= MC_RUIN).length / total) * 100);
    const profitable = Math.round((finals.filter((f) => f > mcStartBalance).length / total) * 100);
    const sorted = [...finals].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    const best = Math.max(...finals);
    const worst = Math.min(...finals);
    const avgMaxDD = mcMaxDrawdowns.reduce((a, b) => a + b, 0) / mcMaxDrawdowns.length;
    const expectancy = mcInputs.winRate * mcInputs.rewardRatio - (1 - mcInputs.winRate);
    const breakevenWR = 1 / (1 + mcInputs.rewardRatio);
    const consecLosses = expectedMaxConsecLosses(mcInputs.winRate, 1000);
    const goalVal = parseFloat(mcGoalTarget);
    const goalReached = goalVal > 0
      ? Math.round((mcPaths.filter((path) => path.some((v) => v >= goalVal)).length / total) * 100)
      : null;
    return { blown, profitable, median, best, worst, avgMaxDD, expectancy, breakevenWR, consecLosses, goalReached };
  }, [mcPaths, mcMaxDrawdowns, mcInputs, mcStartBalance, mcGoalTarget]);

  return {
    mcProfile, setMcProfile,
    mcRerunKey, setMcRerunKey,
    mcCustomWinRate, mcCustomRisk, mcCustomRR, mcCustomBalance,
    setMcCustomWinRateDirty, setMcCustomRiskDirty, setMcCustomRRDirty, setMcCustomBalanceDirty,
    mcGoalTarget, setMcGoalTarget,
    mcInputsDirty, setMcInputsDirty,
    mcPaths, mcStartBalance, mcInputs, mcStats,
  };
}

export type UseMonteCarlo = ReturnType<typeof useMonteCarlo>;
