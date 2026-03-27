import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { PremiumTeaser } from "@/components/CasinoElements";
import { TradingCalendarModal, TradingCalendarIconButton } from "./dashboard/TradingCalendarModal";
import { CumulativePnLChart } from "./dashboard/CumulativePnLChart";
import { LastTradeGradeCard } from "./dashboard/LastTradeGradeCard";
import { FvgAlertPopup, CommunityBanner } from "./dashboard/LiveSignalWidgets";
import { LiveMarketPopover } from "./dashboard/LiveMarketPopover";
import { RoutineWidgetConditional } from "./dashboard/RoutineWidgetConditional";
import MorningBriefingWidget from "@/components/MorningBriefingWidget";
import UpNextWidget from "@/components/UpNextWidget";

export default function Dashboard() {
  const { tierLevel } = useAuth();
  const isFreeUser = tierLevel === 0;
  const navigate = useNavigate();
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("dashboard-visited")) {
      localStorage.setItem("dashboard-visited", "true");
    }
  }, []);

  return (
    <>
      <LiveMarketPopover />

      {showCalendar && <TradingCalendarModal onClose={() => setShowCalendar(false)} />}

      <FvgAlertPopup />
      <CommunityBanner tierLevel={tierLevel} />

      <div className="max-w-6xl mx-auto p-4 md:p-6 pb-28">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <TradingCalendarIconButton onClick={() => setShowCalendar(true)} />
            <button
              onClick={() => navigate("/journal?new=1")}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl px-3 py-2 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Log Trade
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MorningBriefingWidget />
            <UpNextWidget />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <CumulativePnLChart />
            <LastTradeGradeCard />
          </div>

          <RoutineWidgetConditional />
        </div>

        {isFreeUser && (
          <div className="mt-4">
            <PremiumTeaser
              title="UNLOCK PREMIUM TOOLS"
              description="Upgrade to access the <strong>Smart Journal</strong> to log and analyze every trade, plus <strong>Analytics</strong> with performance charts, win-rate tracking, and AI-powered insights."
              buttonText="See Plans"
            />
          </div>
        )}
      </div>
    </>
  );
}
