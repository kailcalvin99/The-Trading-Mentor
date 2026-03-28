import { useNavigate } from "react-router-dom";
import { Activity, BookOpen } from "lucide-react";
import { useOpenTrades, usePrices } from "@/hooks/useLiveMarket";
import { useGetPropAccount } from "@workspace/api-client-react";
import { SingleOpenTradeCard } from "@/components/LiveMarketWidgets";

export default function OpenPositionsPage() {
  const { trades, loading } = useOpenTrades();
  const { prices } = usePrices();
  const { data: account } = useGetPropAccount();
  const navigate = useNavigate();

  const accountBalance = account?.startingBalance ?? 0;
  const dailyLoss = Math.abs(account?.dailyLoss ?? 0);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Open Positions</h1>
          <p className="text-xs text-muted-foreground">Live monitoring of your active trades</p>
        </div>
        {!loading && trades.length > 0 && (
          <span className="ml-auto text-xs font-semibold bg-primary/10 text-primary border border-primary/20 px-3 py-1 rounded-full">
            {trades.length} active
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5 rounded bg-secondary/40 animate-pulse" />
                <div className="h-4 flex-1 rounded bg-secondary/40 animate-pulse" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((j) => (
                  <div key={j} className="h-10 rounded-lg bg-secondary/40 animate-pulse" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : trades.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="h-16 w-16 rounded-2xl bg-secondary/40 flex items-center justify-center mb-5">
            <Activity className="h-8 w-8 text-muted-foreground/40" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">No Open Positions</h2>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            You don't have any active trades right now. Head to the Smart Journal to log a new trade and start tracking it here.
          </p>
          <button
            onClick={() => navigate("/journal")}
            className="flex items-center gap-2 bg-primary text-primary-foreground font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            <BookOpen className="h-4 w-4" />
            Log a Trade
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trades.map((trade) => (
            <SingleOpenTradeCard
              key={trade.id}
              trade={trade}
              prices={prices}
              accountBalance={accountBalance}
              dailyLoss={dailyLoss}
              maxDailyLossPct={account?.maxDailyLossPct}
            />
          ))}
        </div>
      )}
    </div>
  );
}
