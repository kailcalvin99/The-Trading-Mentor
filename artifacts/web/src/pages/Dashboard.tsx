import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { PremiumTeaser } from "@/components/CasinoElements";
import { CumulativePnLChart } from "./dashboard/CumulativePnLChart";
import { LastTradeGradeCard } from "./dashboard/LastTradeGradeCard";
import { CommunityBanner } from "./dashboard/LiveSignalWidgets";
import { RoutineWidgetConditional } from "./dashboard/RoutineWidgetConditional";
import MorningBriefingWidget from "@/components/MorningBriefingWidget";
import UpNextWidget from "@/components/UpNextWidget";

export default function Dashboard() {
  const { tierLevel } = useAuth();
  const { config } = useAppConfig();
  const isFreeUser = tierLevel === 0;

  useEffect(() => {
    if (!localStorage.getItem("dashboard-visited")) {
      localStorage.setItem("dashboard-visited", "true");
    }
  }, []);

  return (
    <>
      <CommunityBanner tierLevel={tierLevel} />

      {/* ── Hero Banner ── */}
      <section
        className="relative overflow-hidden flex flex-col items-center justify-center text-center hidden md:flex"
        style={{
          background: "linear-gradient(180deg, hsl(240 20% 3%) 0%, hsl(240 20% 5%) 100%)",
          minHeight: "clamp(160px, 18vw, 220px)",
          padding: "clamp(1.5rem, 3vw, 2.5rem) 1.5rem",
        }}
      >
        <div className="glowing-3d-title-radial" />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <h1
            className="glowing-3d-title"
            style={{ fontSize: "clamp(1.8rem, 4vw, 3.5rem)", lineHeight: 1.05 }}
          >
            {config.app_name}
          </h1>
          <p
            className="text-sm sm:text-base font-medium tracking-widest uppercase"
            style={{
              color: "rgba(200,245,232,0.75)",
              letterSpacing: "0.3em",
              textShadow: "0 0 12px rgba(0,200,150,0.4)",
              maxWidth: "50ch",
            }}
          >
            {config.app_tagline}
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto p-4 md:p-6 pb-28">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <MorningBriefingWidget />
          </div>

          <div className="w-full">
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
