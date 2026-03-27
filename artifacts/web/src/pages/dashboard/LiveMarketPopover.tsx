import { useState, useEffect, useRef } from "react";
import { Radio, X } from "lucide-react";
import { usePrices } from "@/hooks/useLiveMarket";

const FUTURES_MAP: Record<string, string> = {
  QQQ: "NQ (QQQ proxy)",
  SPY: "ES (SPY proxy)",
  DIA: "YM (DIA proxy)",
  IWM: "RTY (IWM proxy)",
};

function formatPrice(p: number) {
  return p.toFixed(2);
}

export function LiveMarketPopover() {
  const [open, setOpen] = useState(false);
  const { prices, loading } = usePrices();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOut(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOut);
    return () => document.removeEventListener("mousedown", onClickOut);
  }, [open]);

  const futuresPrices = prices.filter(p => ["QQQ", "SPY", "DIA", "IWM"].includes(p.symbol));

  return (
    <div ref={ref} className="fixed right-4 top-16 z-30">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-all border ${
          open
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-primary/50"
        }`}
        title="Live Market"
      >
        <Radio className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-64 bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
            <Radio className="h-3.5 w-3.5 text-emerald-400" />
            <h3 className="text-xs font-bold text-foreground flex-1">Futures (US)</h3>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="p-3 space-y-2">
            {loading && futuresPrices.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-8 rounded-lg bg-secondary/40 animate-pulse" />
              ))
            ) : futuresPrices.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-2">No futures data</p>
            ) : (
              futuresPrices.map((item) => {
                const isPositive = (item.changePct ?? 0) >= 0;
                return (
                  <div
                    key={item.symbol}
                    className="flex items-center justify-between px-3 py-2 rounded-xl bg-secondary/40 border border-border"
                  >
                    <div>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase">{FUTURES_MAP[item.symbol] || item.label}</p>
                      {item.price !== null && (
                        <p className="text-sm font-bold font-mono text-foreground leading-none mt-0.5">
                          {formatPrice(item.price)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <span className={`w-1.5 h-1.5 rounded-full ${item.delayed ? "bg-amber-400" : "bg-emerald-400 animate-pulse"}`} />
                        <span className="text-[9px] font-bold text-muted-foreground">{item.delayed ? "DELAYED" : "LIVE"}</span>
                      </div>
                      {item.changePct !== null && (
                        <p className={`text-xs font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                          {isPositive ? "+" : ""}{(item.changePct ?? 0).toFixed(2)}%
                        </p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <div className="px-4 pb-3">
            <p className="text-[9px] text-muted-foreground">ETF proxies: QQQ≈NQ, SPY≈ES, DIA≈YM, IWM≈RTY</p>
          </div>
        </div>
      )}
    </div>
  );
}
