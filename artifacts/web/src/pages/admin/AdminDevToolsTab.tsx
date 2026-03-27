import { ResponsiveContainer } from "recharts";
import { Code2, TrendingUp, RefreshCw, Target } from "lucide-react";
import { SettingsSection } from "./AdminSettingsUI";
import { MonteCarloChart, MC_PROFILES, type MCProfile, fmt } from "./MonteCarloSection";
import { AdminCodeEditorPanel } from "./AdminCodeEditorPanel";
import type { UseMonteCarlo } from "./useMonteCarlo";

interface Props {
  mc: UseMonteCarlo;
}

export function AdminDevToolsTab({ mc }: Props) {
  const {
    mcProfile, setMcProfile, setMcRerunKey,
    mcCustomWinRate, mcCustomRisk, mcCustomRR, mcCustomBalance,
    setMcCustomWinRateDirty, setMcCustomRiskDirty, setMcCustomRRDirty, setMcCustomBalanceDirty,
    mcGoalTarget, setMcGoalTarget, mcInputsDirty, setMcInputsDirty,
    mcPaths, mcStartBalance, mcStats,
  } = mc;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Code2 className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-base font-bold text-foreground">Developer Tools</h2>
          <p className="text-xs text-muted-foreground">Advanced tools for platform analysis and development. Use with care.</p>
        </div>
      </div>

      <SettingsSection title="Monte Carlo Simulator" icon={TrendingUp} defaultOpen>
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            100 random paths · 1000 trades each · percentile fan chart (P10/P25/median/P75/P90) · log scale
          </p>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex gap-2 flex-wrap">
              {(["Perfect", "Median", "Lousy"] as MCProfile[]).map((p) => (
                <button
                  key={p}
                  onClick={() => { setMcProfile(p); setMcInputsDirty(false); }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
                    mcProfile === p
                      ? "bg-primary/10 border-primary/40 text-primary"
                      : "bg-card border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {MC_PROFILES[p].label}
                  <span className="ml-2 text-xs opacity-60">
                    {(MC_PROFILES[p].winRate * 100).toFixed(0)}% WR · {(MC_PROFILES[p].risk * 100).toFixed(0)}% risk · {MC_PROFILES[p].rewardRatio}× RR
                  </span>
                </button>
              ))}
              <button
                onClick={() => { setMcProfile("Custom"); setMcInputsDirty(false); }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
                  mcProfile === "Custom"
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-card border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                Custom
              </button>
            </div>
            <div className="flex items-center gap-2">
              {mcInputsDirty && (
                <span className="text-xs text-amber-500 font-medium">inputs changed</span>
              )}
              <button
                onClick={() => { setMcRerunKey((k) => k + 1); setMcInputsDirty(false); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  mcInputsDirty
                    ? "bg-amber-500/20 border border-amber-500/40 text-amber-500 hover:bg-amber-500/30"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <RefreshCw className="h-4 w-4" />
                Re-run
              </button>
            </div>
          </div>

          <div className={`grid gap-3 p-4 bg-muted/30 border border-border rounded-xl ${mcProfile === "Custom" ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-3"}`}>
            {mcProfile === "Custom" && (
              <>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Win Rate (%)</label>
                  <input
                    type="number" min="1" max="99" step="1"
                    value={mcCustomWinRate}
                    onChange={(e) => setMcCustomWinRateDirty(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm"
                    placeholder="50"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Risk/Trade (%)</label>
                  <input
                    type="number" min="0.1" max="50" step="0.1"
                    value={mcCustomRisk}
                    onChange={(e) => setMcCustomRiskDirty(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm"
                    placeholder="2"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Risk:Reward</label>
                  <input
                    type="number" min="0.1" max="20" step="0.1"
                    value={mcCustomRR}
                    onChange={(e) => setMcCustomRRDirty(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm"
                    placeholder="1.5"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Starting Balance ($)</label>
                  <input
                    type="number" min="100" step="100"
                    value={mcCustomBalance}
                    onChange={(e) => setMcCustomBalanceDirty(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm"
                    placeholder="10000"
                  />
                </div>
              </>
            )}
            <div>
              <label className="text-xs font-semibold text-muted-foreground mb-1 block">Goal Target ($)</label>
              <input
                type="number" min="0" step="1000"
                value={mcGoalTarget}
                onChange={(e) => setMcGoalTarget(e.target.value)}
                className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm"
                placeholder="optional"
              />
            </div>
            {mcProfile !== "Custom" && <div />}
            {mcProfile !== "Custom" && <div />}
          </div>

          <div className="bg-background border border-border rounded-lg overflow-hidden">
            <ResponsiveContainer width="100%" height={320}>
              <MonteCarloChart
                paths={mcPaths}
                startBalance={mcStartBalance}
                goalTarget={parseFloat(mcGoalTarget) || undefined}
              />
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-4 px-4 pb-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-8 h-3 inline-block rounded" style={{ background: "rgba(34,197,94,0.15)" }} />
                P25–P75 (middle half)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-8 h-3 inline-block rounded" style={{ background: "rgba(34,197,94,0.08)" }} />
                P10–P90 (outer range)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-0.5 bg-green-500 inline-block rounded" />
                Median (P50)
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-5 border-t-2 border-red-500 border-dashed" />
                Start balance
              </span>
              {mcGoalTarget && parseFloat(mcGoalTarget) > 0 && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-5 border-t-2 border-amber-500 border-dashed" />
                  Goal target
                </span>
              )}
            </div>
          </div>

          {mcInputsDirty && (
            <p className="text-xs text-amber-500/80 italic">Chart and path stats below reflect the last run — click Re-run to update with new inputs.</p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Profitable", value: `${mcStats.profitable}%`, sub: `above ${fmt(mcStartBalance)}`, color: "text-green-500" },
              { label: "Blown", value: `${mcStats.blown}%`, sub: "of paths ruined", color: "text-red-500" },
              { label: "Median Outcome", value: fmt(mcStats.median), sub: "middle path final", color: "text-foreground" },
              { label: "Best Path", value: fmt(mcStats.best), sub: "top outcome", color: "text-primary" },
            ].map(({ label, value, sub, color }) => (
              <div key={label} className="bg-card border border-border rounded-xl p-4">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
            ))}
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground">Worst Streak</p>
              <p className="text-xl font-bold text-orange-400">{mcStats.consecLosses}</p>
              <p className="text-xs text-muted-foreground">expected worst streak in 1000 trades</p>
            </div>
            {mcStats.goalReached !== null && (
              <div className="bg-card border border-amber-500/30 rounded-xl p-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Target className="h-3 w-3 text-amber-500" />
                  Goal Touched
                </p>
                <p className="text-xl font-bold text-amber-500">{mcStats.goalReached}%</p>
                <p className="text-xs text-muted-foreground">paths touched {fmt(parseFloat(mcGoalTarget))}</p>
              </div>
            )}
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-foreground">What this means</h3>
            <div className="grid sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
              <div>
                <p className="font-semibold text-foreground mb-1">Perfect Trader (75% WR · 1% risk · 2.5× RR)</p>
                <p>Mathematically explosive growth. Nearly all 100 paths finish well above $10k. The compounding of a positive expected value at low risk means even unlucky paths rarely blow. This is the power of genuine edge + discipline.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Median Trader (50% WR · 2% risk · 1.5× RR)</p>
                <p>Barely positive expected value but 2× the risk. Some paths grow, many drift sideways or slowly decline. A few blow. This is most retail traders — they have a slight edge but risk too much and give it back over time.</p>
              </div>
              <div>
                <p className="font-semibold text-foreground mb-1">Lousy Trader (28% WR · 5% risk · 1.2× RR)</p>
                <p>Negative expected value with massive risk. Almost all paths blow the account. The 1.2× reward ratio doesn't come close to compensating for the 72% loss rate. High risk accelerates the inevitable to zero.</p>
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Key insight:</span> Risk size matters as much as win rate. The Median Trader's edge is erased by over-risking. The Perfect Trader wins because of three things working together: a real edge (75% WR), disciplined reward targeting (2.5×), and conservative position sizing (1%). Remove any one of them and the picture changes dramatically.
              </p>
            </div>
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="AI Code Editor" icon={Code2}>
        <p className="text-xs text-muted-foreground mb-3">
          Browse source files and ask the AI to make changes. Advanced — use with caution.
        </p>
        <AdminCodeEditorPanel />
      </SettingsSection>
    </div>
  );
}
