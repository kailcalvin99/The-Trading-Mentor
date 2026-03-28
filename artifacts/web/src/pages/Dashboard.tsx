import { useEffect, useRef, useState } from "react";
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

  const mantraSlotRef = useRef<HTMLDivElement>(null);
  const [isFloating, setIsFloating] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("dashboard-visited")) {
      localStorage.setItem("dashboard-visited", "true");
    }
  }, []);

  useEffect(() => {
    const el = mantraSlotRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsFloating(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-60px 0px 0px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
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
            <div ref={mantraSlotRef} className="lg:col-span-3">
              {!isFloating && <DailyMantraWidget />}
            </div>
            <MorningBriefingWidget />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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

      {isFloating && (
        <div
          className="hidden lg:block fixed z-40"
          style={{
            right: "max(1.5rem, calc(50% - 48rem + 1.5rem))",
            top: 80,
            width: 300,
          }}
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "rgba(10, 10, 15, 0.82)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
            }}
          >
            <DailyMantraWidget />
          </div>
        </div>
      )}
    </>
  );
}
