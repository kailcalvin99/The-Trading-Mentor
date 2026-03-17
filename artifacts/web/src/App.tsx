import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CookieNotice from "@/components/CookieNotice";
import { PlannerProvider } from "@/contexts/PlannerContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppConfigProvider } from "@/contexts/AppConfigContext";
import { TourGuideProvider } from "@/contexts/TourGuideContext";
import Layout from "@/components/Layout";
import Welcome from "@/pages/Welcome";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Pricing from "@/pages/Pricing";
import DailyPlanner from "@/pages/DailyPlanner";
import IctAcademy from "@/pages/IctAcademy";
import RiskShield from "@/pages/RiskShield";
import PropTracker from "@/pages/PropTracker";
import SmartJournal from "@/pages/SmartJournal";
import Analytics from "@/pages/Analytics";
import Admin from "@/pages/Admin";
import Settings from "@/pages/Settings";
import Dashboard from "@/pages/Dashboard";
import Community from "@/pages/Community";
import TradingViewWebhooks from "@/pages/TradingViewWebhooks";
import Leaderboard from "@/pages/Leaderboard";
import RefundPolicy from "@/pages/RefundPolicy";
import TermsOfService from "@/pages/TermsOfService";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import RiskDisclosure from "@/pages/RiskDisclosure";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import VideoTourPage from "@/pages/VideoTourPage";
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

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function OpenRoute({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}

function IndexRedirect() {
  const seen = localStorage.getItem("ict-welcome-seen");
  if (!seen) return <Navigate to="/welcome" replace />;
  return <Navigate to="/dashboard" replace />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppConfigProvider>
          <AuthProvider>
            <PlannerProvider>
            <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Routes>
                <Route path="login" element={<PublicRoute><Login /></PublicRoute>} />
                <Route path="signup" element={<PublicRoute><Signup /></PublicRoute>} />

                <Route path="welcome" element={<OpenRoute><Welcome /></OpenRoute>} />
                <Route path="pricing" element={<OpenRoute><Pricing /></OpenRoute>} />
                <Route path="refund" element={<OpenRoute><RefundPolicy /></OpenRoute>} />
                <Route path="terms" element={<OpenRoute><TermsOfService /></OpenRoute>} />
                <Route path="privacy" element={<OpenRoute><PrivacyPolicy /></OpenRoute>} />
                <Route path="risk-disclosure" element={<OpenRoute><RiskDisclosure /></OpenRoute>} />
                <Route path="forgot-password" element={<OpenRoute><ForgotPassword /></OpenRoute>} />
                <Route path="reset-password" element={<OpenRoute><ResetPassword /></OpenRoute>} />

                <Route element={<ProtectedRoute><TourGuideProvider><Layout /></TourGuideProvider></ProtectedRoute>}>
                  <Route index element={<IndexRedirect />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="academy" element={<IctAcademy />} />
                  <Route path="planner" element={<DailyPlanner />} />
                  <Route path="risk-shield" element={<RiskShield />} />
                  <Route path="prop-tracker" element={<PropTracker />} />
                  <Route path="journal" element={<SmartJournal />} />
                  <Route path="analytics" element={<Analytics />} />
                  <Route path="community" element={<Community />} />
                  <Route path="leaderboard" element={<Leaderboard />} />
                  <Route path="webhooks" element={<TradingViewWebhooks />} />
                  <Route path="admin" element={<Admin />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="*" element={<NotFound />} />
                </Route>

                <Route path="video-tour" element={<ProtectedRoute><VideoTourPage /></ProtectedRoute>} />

                <Route path="reset" element={<ResetApp />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
              <CookieNotice />
            </BrowserRouter>
            <Toaster />
            </PlannerProvider>
          </AuthProvider>
        </AppConfigProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
