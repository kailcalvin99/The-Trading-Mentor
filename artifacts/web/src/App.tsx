import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import DailyPlanner from "@/pages/DailyPlanner";
import IctAcademy from "@/pages/IctAcademy";
import RiskShield from "@/pages/RiskShield";
import SmartJournal from "@/pages/SmartJournal";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DailyPlanner />} />
              <Route path="academy" element={<IctAcademy />} />
              <Route path="risk-shield" element={<RiskShield />} />
              <Route path="journal" element={<SmartJournal />} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
