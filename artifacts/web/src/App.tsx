import { useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import CookieNotice from "@/components/CookieNotice";
import { PlannerProvider } from "@/contexts/PlannerContext";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppConfigProvider } from "@/contexts/AppConfigContext";
import { TourGuideProvider } from "@/contexts/TourGuideContext";
import Layout from "@/components/Layout";
import OnboardingQuiz, { hasCompletedQuiz, hasExistingAcademyProgress } from "@/components/OnboardingQuiz";
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
import VideoLibrary from "@/pages/VideoLibrary";
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

function QuizGate({ children }: { children: React.ReactNode }) {
  const [showQuiz, setShowQuiz] = useState(() => {
    if (hasCompletedQuiz()) return false;
    if (hasExistingAcademyProgress()) return false;
    return true;
  });

  if (showQuiz) {
    return <OnboardingQuiz onComplete={() => setShowQuiz(false)} />;
  }

  return <>{children}</>;
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

  return <QuizGate>{children}</QuizGate>;
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

function FullModeGate({ children }: { children: React.ReactNode }) {
  const { appMode, setAppMode } = useAuth();
  const navigate = useNavigate();

  if (appMode === "lite") {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground">Full Mode Feature</h2>
          <p className="text-muted-foreground leading-relaxed">
            This section is available in Full Mode. Learning Mode keeps things simple with Dashboard, Academy, and Journal.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setAppMode("full")}
              className="w-full py-3 px-6 rounded-xl bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition-colors"
            >
              Switch to Full Mode
            </button>
            <button
              onClick={() => navigate("/dashboard")}
              className="w-full py-3 px-6 rounded-xl border border-border text-muted-foreground font-medium hover:text-foreground transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function IndexRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (user) return <Navigate to="/dashboard" replace />;
  return <Welcome />;
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
                <Route index element={<IndexRoute />} />

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
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="academy" element={<IctAcademy />} />
                  <Route path="planner" element={<FullModeGate><DailyPlanner /></FullModeGate>} />
                  <Route path="risk-shield" element={<RiskShield />} />
                  <Route path="prop-tracker" element={<FullModeGate><PropTracker /></FullModeGate>} />
                  <Route path="journal" element={<SmartJournal />} />
                  <Route path="analytics" element={<FullModeGate><Analytics /></FullModeGate>} />
                  <Route path="videos" element={<FullModeGate><VideoLibrary /></FullModeGate>} />
                  <Route path="community" element={<Community />} />
                  <Route path="leaderboard" element={<FullModeGate><Leaderboard /></FullModeGate>} />
                  <Route path="webhooks" element={<FullModeGate><TradingViewWebhooks /></FullModeGate>} />
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
