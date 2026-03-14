import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PlannerProvider } from "@/contexts/PlannerContext";
import Layout from "@/components/Layout";
import Welcome from "@/pages/Welcome";
import DailyPlanner from "@/pages/DailyPlanner";
import IctAcademy from "@/pages/IctAcademy";
import RiskShield from "@/pages/RiskShield";
import SmartJournal from "@/pages/SmartJournal";
import Analytics from "@/pages/Analytics";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

function ResetApp() {
  localStorage.clear();
  window.location.href = import.meta.env.BASE_URL + "welcome";
  return null;
}

function IndexRedirect() {
  const seen = localStorage.getItem("ict-welcome-seen");
  if (!seen) return <Navigate to="/welcome" replace />;
  return <IctAcademy />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <PlannerProvider>
          <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Routes>
              <Route path="welcome" element={<Welcome />} />
              <Route path="reset" element={<ResetApp />} />
              <Route element={<Layout />}>
                <Route index element={<IndexRedirect />} />
                <Route path="planner" element={<DailyPlanner />} />
                <Route path="risk-shield" element={<RiskShield />} />
                <Route path="journal" element={<SmartJournal />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </BrowserRouter>
          <Toaster />
        </PlannerProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
