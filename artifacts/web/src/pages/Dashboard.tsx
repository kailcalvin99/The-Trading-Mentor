import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { PremiumTeaser } from "@/components/CasinoElements";
import { CumulativePnLChart } from "./dashboard/CumulativePnLChart";
import { LastTradeGradeCard } from "./dashboard/LastTradeGradeCard";
import { FvgAlertPopup, CommunityBanner } from "./dashboard/LiveSignalWidgets";
import { RoutineWidgetConditional } from "./dashboard/RoutineWidgetConditional";
import MorningBriefingWidget from "@/components/MorningBriefingWidget";
import UpNextWidget from "@/components/UpNextWidget";
import DailyMantraWidget from "@/components/DailyMantraWidget";

export default function Dashboard() {
  const { tierLevel } = useAuth();
  const isFreeUser = tierLevel === 0;

  useEffect(() => {
    if (!localStorage.getItem("dashboard-visited")) {
      localStorage.setItem("dashboard-visited", "true");
    }
  }, []);

  return (
    <>
      <FvgAlertPopup />
      <CommunityBanner tierLevel={tierLevel} />

      <div className="max-w-6xl mx-auto p-4 md:p-6 pb-28">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MorningBriefingWidget />
            <UpNextWidget />
            <DailyMantraWidget />
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
