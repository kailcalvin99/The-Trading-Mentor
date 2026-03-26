import { useEffect } from "react";
import {
  Navigate,
  Route,
  BrowserRouter as Router,
  Routes,
  useLocation,
} from "react-router-dom";
import { Toaster } from "sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "./contexts/AuthContext";
import { AppConfigProvider } from "./contexts/AppConfigContext";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import SmartJournal from "./pages/SmartJournal";
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
import SpotifyCallback from "./pages/SpotifyCallback";
import PaperTradingPage from "./pages/PaperTradingPage";
import NotFound from "./pages/not-found";
import { SpotifyProvider } from "./contexts/SpotifyContext";
import { AuthGuard, AdminGuard, TierGuard } from "./components/AuthGuard";
import { TourGuideProvider } from "./contexts/TourGuideContext";
import { PlannerProvider } from "./contexts/PlannerContext";
import { ThemeProvider } from "./components/ThemeProvider";

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

const queryClient = new QueryClient();

const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <AuthProvider>
          <AppConfigProvider>
            <SpotifyProvider>
              <TourGuideProvider>
                <PlannerProvider>
                  <Router basename={basename}>
                  <ScrollToTop />
                  <Routes>
                    {/* Public routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/welcome" element={<Welcome />} />
                    <Route path="/video-tour" element={<VideoTourPage />} />
                    <Route path="/refund-policy" element={<RefundPolicy />} />
                    <Route path="/terms-of-service" element={<TermsOfService />} />
                    <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                    <Route path="/risk-disclosure" element={<RiskDisclosure />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/spotify-callback" element={<SpotifyCallback />} />

                    {/* Protected routes — AuthGuard is pathless, catches any unmatched path */}
                    <Route element={<AuthGuard />}>
                      <Route path="/" element={<Layout />}>
                        <Route index element={<Dashboard />} />
                        <Route path="academy" element={<IctAcademy />} />
                        <Route path="videos" element={<VideoLibrary />} />
                        <Route path="planner" element={<DailyPlanner />} />
                        <Route path="risk-shield" element={<Navigate to="/planner" replace />} />
                        <Route path="dashboard" element={<Navigate to="/" replace />} />
                        <Route path="prop-tracker" element={<TierGuard requiredTier={1}><PropTracker /></TierGuard>} />
                        <Route path="journal" element={<SmartJournal />} />
                        <Route path="analytics" element={<TierGuard requiredTier={2}><Analytics /></TierGuard>} />
                        <Route path="leaderboard" element={<TierGuard requiredTier={2}><Leaderboard /></TierGuard>} />
                        <Route path="webhooks" element={<TierGuard requiredTier={2}><TradingViewWebhooks /></TierGuard>} />
                        <Route path="paper-trading" element={<TierGuard requiredTier={1}><PaperTradingPage /></TierGuard>} />
                        <Route path="community" element={<Community />} />
                        <Route path="settings" element={<Settings />} />
                        <Route path="admin" element={<AdminGuard><Admin /></AdminGuard>} />
                      </Route>
                    </Route>

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                  <Toaster richColors position="top-right" />
                </Router>
                </PlannerProvider>
              </TourGuideProvider>
            </SpotifyProvider>
          </AppConfigProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
