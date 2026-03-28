import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { RECOMMENDED_INDICATORS, type IndicatorItem } from "../../data/academy-data";
import { CATEGORY_META } from "./PlanView";

export function ToolsView() {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | "core" | "supporting" | "optional">("all");

  const filtered = filter === "all" ? RECOMMENDED_INDICATORS : RECOMMENDED_INDICATORS.filter((i) => i.category === filter);
  const categories = filter === "all" ? (["core", "supporting", "optional"] as const) : [filter] as const;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-1">TradingView Indicators</h2>
      <p className="text-sm text-muted-foreground mb-5">
        Recommended indicators for ICT methodology on TradingView. Search each name in TradingView's indicator panel to add them to your chart.
      </p>

      <div className="flex gap-2 mb-6 flex-wrap">
        {(["all", "core", "supporting", "optional"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f === "all" ? "All" : f === "core" ? "Core" : f === "supporting" ? "Supporting" : "Optional"}
          </button>
        ))}
      </div>

      {categories.map((cat) => {
        const items = filtered.filter((i) => i.category === cat);
        if (items.length === 0) return null;
        const meta = CATEGORY_META[cat];
        return (
          <div key={cat} className="mb-8">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }} />
              <h3 className="text-sm font-bold" style={{ color: meta.color }}>{meta.label}</h3>
            </div>
            <p className="text-xs text-muted-foreground mb-3 ml-4">{meta.description}</p>
            <div className="space-y-2">
              {items.map((indicator) => {
                const globalIdx = RECOMMENDED_INDICATORS.indexOf(indicator);
                const isExpanded = expandedIdx === globalIdx;
                return (
                  <div
                    key={indicator.name}
                    className="bg-card border rounded-xl overflow-hidden transition-all"
                  >
                    <button
                      onClick={() => setExpandedIdx(isExpanded ? null : globalIdx)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary/50 transition-colors"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-white text-xs font-bold"
                        style={{ backgroundColor: indicator.color }}
                      >
                        {indicator.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{indicator.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{indicator.ictConcept}</p>
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 border-t space-y-3">
                        <p className="text-sm text-foreground/90">{indicator.description}</p>
                        <div className="bg-secondary/50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-foreground mb-1">How to Set Up</p>
                          <p className="text-xs text-muted-foreground">{indicator.setup}</p>
                        </div>
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                          <p className="text-xs font-semibold text-primary mb-1">Search in TradingView</p>
                          <code className="text-xs text-primary/80 font-mono">{indicator.tradingViewSearch}</code>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="mt-6 bg-card border rounded-xl p-5">
        <h3 className="text-sm font-bold mb-2">Recommended Starter Setup</h3>
        <p className="text-xs text-muted-foreground mb-3">
          If you're just getting started, add these 3 indicators for maximum coverage with minimal chart clutter:
        </p>
        <ol className="space-y-2">
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
            <div>
              <span className="text-xs font-semibold">Smart Money Concepts (LuxAlgo)</span>
              <span className="text-xs text-muted-foreground ml-1">— FVGs + Order Blocks + Market Structure in one</span>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
            <div>
              <span className="text-xs font-semibold">ICT Kill Zones</span>
              <span className="text-xs text-muted-foreground ml-1">— Know exactly when to trade</span>
            </div>
          </li>
          <li className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
            <div>
              <span className="text-xs font-semibold">Fibonacci Retracement</span>
              <span className="text-xs text-muted-foreground ml-1">— Mark OTE zones with custom 0.62 / 0.705 / 0.79 levels</span>
            </div>
          </li>
        </ol>
      </div>
    </div>
  );
}

