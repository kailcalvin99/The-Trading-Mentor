import { useEffect } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
} from "react-router-dom";
import { Toaster } from "sonner";
import { useAuth } from "./contexts/AuthContext";
import { AppConfigProvider } from "./contexts/AppConfigContext"; // Import AppConfigProvider
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import SmartJournal from "./pages/SmartJournal";
import RiskShield from "./pages/RiskShield"; // Not actively used for /risk-shield route
import DailyPlanner from "./pages/DailyPlanner";
import IctAcademy from "./pages/IctAcademy";
import Analytics from "./pages/Analytics";
import PropTracker from "./pages/PropTracker";
import Community from "./pages/Community";
import Leaderboard from "./pages/Leaderboard";
import Admin from "./pages/Admin";
import Pricing from "./pages/Pricing";
import VideoLibrary from "./pages/VideoLibrary";
import TradingViewWebhooks from "./pages/TradingViewWebhooks";
import Settings from "./pages/Settings";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Welcome from "./pages/Welcome";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VideoTourPage from "./pages/VideoTourPage";
import RefundPolicy from "./pages/RefundPolicy";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RiskDisclosure from "./pages/RiskDisclosure";
import NotFound from "./pages/not-found";
import { AuthGuard, AdminGuard, TierGuard } from "./components/AuthGuard";
import { TourGuideProvider } from "./contexts/TourGuideContext";
import { PlannerProvider } from "./contexts/PlannerContext";
import { useMobile } from "./hooks/use-mobile";
import { AIAssistant } from "./components/AIAssistant";
import { ThemeProvider } from "./components/ThemeProvider";

function IndexRoute() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // If user is authenticated, redirect to / (which will now render Dashboard via Layout's index route)
  if (user) return <Navigate to="/" replace />;
  return <Welcome />;
}

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

function App() {
  const isMobile = useMobile();

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <AppConfigProvider>
        <TourGuideProvider>
          <PlannerProvider>
            <Router>
              <ScrollToTop />
              <Routes>
                <Route path="/" element={<IndexRoute />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/welcome" element={<Welcome />} /> {/* Added for explicit welcome access */}
                <Route path="/video-tour" element={<VideoTourPage />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/risk-disclosure" element={<RiskDisclosure />} />
                <Route path="/pricing" element={<Pricing />} />

                <Route element={<AuthGuard />}>
                  <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} /> {/* Dashboard as the default route for authenticated users */}
                    <Route path="/academy" element={<IctAcademy />} />
                    <Route path="/videos" element={<VideoLibrary />} />
                    <Route path="/planner" element={<DailyPlanner />} />
                    <Route path="/risk-shield" element={<Navigate to="/planner" replace />} /> {/* Redirect to planner for now */}
                    <Route path="/prop-tracker" element={<TierGuard requiredTier={1}><PropTracker /></TierGuard>} />
                    <Route path="/journal" element={<TierGuard requiredTier={2}><SmartJournal /></TierGuard>} />
                    <Route path="/analytics" element={<TierGuard requiredTier={2}><Analytics /></TierGuard>} />
                    <Route path="/leaderboard" element={<TierGuard requiredTier={2}><Leaderboard /></TierGuard>} />
                    <Route path="/webhooks" element={<TierGuard requiredTier={2}><TradingViewWebhooks /></TierGuard>} />
                    <Route path="/community" element={<Community />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/admin" element={<AdminGuard><Admin /></AdminGuard>} />
                  </Route>
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
              {!isMobile && <AIAssistant />}
              <Toaster richColors position="top-right" />
            </Router>
          </PlannerProvider>
        </TourGuideProvider>
      </AppConfigProvider>
    </ThemeProvider>
  );
}

export default App;
