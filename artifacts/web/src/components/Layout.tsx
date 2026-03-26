import { useState, useEffect, useContext, useCallback, useRef } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../contexts/AuthContext";
import { useMediaQuery } from "react-responsive";
import {
  Bell,
  Home,
  BookOpen,
  ClipboardList,
  BarChartBig,
  Sparkles,
  Award,
  Wallet,
  Settings,
  Menu,
  X,
  Bot,
  Gauge,
  Users,
  CodeXml,
  Video,
  LifeBuoy,
  HeartHandshake,
  TrendingUp,
  LineChart,
} from "lucide-react";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "../ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { AppModeToggle } from "../app-mode-toggle";
import { KillZoneStrip } from "../kill-zone-strip";
import { Separator } from "../ui/separator";
import { UserNav } from "../user-nav";
import { useToast } from "../../hooks/use-toast";
import { AppConfigContext } from "../../contexts/AppConfigContext";
import { FrostedGateOverlay } from "../frosted-gate-overlay";
import { TourGuide } from "../tour-guide";
import { TourGuideContext } from "../../contexts/TourGuideContext";
import { NotificationContext } from "../../contexts/NotificationContext";
import { MobileBottomNav } from "../mobile-bottom-nav";
import { useNotificationPolling } from "../../hooks/useNotificationPolling";
import { AIAssistant } from "../ai-assistant";
import { AIAssistantContext } from "../../contexts/AIAssistantContext";
import { cn } from "../../lib/utils";
import { Logo } from "../logo";
import { useListUserTags } from "@workspace/api-client-react";

interface NavItem {
  href: string;
label: string;
icon: React.ReactNode;
minTier?: number;
adminOnly?: boolean;
newFeature?: boolean;
}

export const Layout = () => {
  const { user, isAuthenticated, hasRequiredTier, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const { toast } = useToast();
  const { appConfig } = useContext(AppConfigContext);
  const { showTour, currentStep } = useContext(TourGuideContext);
  const { notificationCount } = useContext(NotificationContext);
  const {
    isAIAssistantOpen,
    openAIAssistant,
    closeAIAssistant,
    aiAssistantVisibility,
    toggleAIAssistantVisibility,
  } = useContext(AIAssistantContext);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const mobileMenuTriggerRef = useRef<HTMLButtonElement>(null);

  // Poll for notifications
  useNotificationPolling(isAuthenticated);

  const getNavItemClass = (href: string) => {
    const isActive = location.pathname === href || (href !== "/" && location.pathname.startsWith(href));
    return cn(
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
      isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
      {
        "relative before:absolute before:-right-3 before:top-1/2 before:-translate-y-1/2 before:h-2 before:w-2 before:rounded-full before:bg-primary":
          href === "/community" && notificationCount > 0,
      }
    );
  };

  const navItems: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: <Home className="h-4 w-4" />, minTier: 0 },
    { href: "/academy", label: "Academy", icon: <BookOpen className="h-4 w-4" />, minTier: 0 },
    { href: "/videos", label: "Video Library", icon: <Video className="h-4 w-4" />, minTier: 0 },
    { href: "/planner", label: "Planner", icon: <ClipboardList className="h-4 w-4" />, minTier: 0 },
    { href: "/prop-tracker", label: "Prop Tracker", icon: <Gauge className="h-4 w-4" />, minTier: 1 },
    { href: "/journal", label: "Smart Journal", icon: <Sparkles className="h-4 w-4" />, minTier: 2 },
    { href: "/analytics", label: "Analytics", icon: <BarChartBig className="h-4 w-4" />, minTier: 2 },
    { href: "/webhooks", label: "Webhooks", icon: <CodeXml className="h-4 w-4" />, minTier: 2 },
    { href: "/community", label: "Community", icon: <HeartHandshake className="h-4 w-4" />, minTier: 0 },
    { href: "/leaderboard", label: "Leaderboard", icon: <Award className="h-4 w-4" />, minTier: 2 },
    { href: "/pricing", label: "Pricing", icon: <Wallet className="h-4 w-4" />, minTier: 0 },
    { href: "/settings", label: "Settings", icon: <Settings className="h-4 w-4" />, minTier: 0 },
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: <Users className="h-4 w-4" />, adminOnly: true }] : []),
    { href: "/signals", label: "Signals", icon: <TrendingUp className="h-4 w-4" />, minTier: 2, newFeature: true }, // Example new feature
  ];

  const filteredNavItems = navItems.filter((item) => {
    if (item.adminOnly && !isAdmin) {
      return false;
    }
    return item.minTier === undefined || hasRequiredTier(item.minTier);
  });

  const handleNavClick = useCallback(
    (item: NavItem, e: React.MouseEvent<HTMLAnchorElement>) => {
      if (item.minTier !== undefined && !hasRequiredTier(item.minTier)) {
        e.preventDefault();
        toast({
          title: "Upgrade Required",
          description: `This feature requires a Tier ${item.minTier} subscription. Please upgrade to access.`,
          variant: "destructive",
        });
        navigate("/pricing");
      } else {
        setMobileMenuOpen(false); // Close mobile menu on navigation
      }
    },
    [hasRequiredTier, toast, navigate]
  );

  const renderNavLinks = (items: NavItem[]) => (
    <>
      {items.map((item) => (
        <TooltipProvider key={item.href}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link to={item.href} className={getNavItemClass(item.href)} onClick={(e) => handleNavClick(item, e)}>
                {item.icon}
                <span className="sr-only lg:not-sr-only lg:whitespace-nowrap">{item.label}</span>
                {item.newFeature && (
                  <span className="ml-auto inline-flex items-center rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
                    New
                  </span>
                )}
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              {item.label}
              {item.newFeature && <span className="ml-2 text-emerald-400">(New)</span>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </>
  );

  const getPageTitle = useCallback(() => {
    const currentItem = navItems.find((item) => {
      // Handle special case for root path and dashboard
      if (item.href === "/dashboard" && location.pathname === "/") {
        return true;
      }
      return location.pathname.startsWith(item.href);
    });

    if (currentItem) {
      return currentItem.label;
    }

    // Fallback for dynamic routes or unknown paths
    if (location.pathname.startsWith("/journal/")) return "Trade Details";
    if (location.pathname.startsWith("/admin/")) return "Admin Panel";
    if (location.pathname.startsWith("/settings/")) return "Settings";
    if (location.pathname.startsWith("/videos/")) return "Video Library";
    if (location.pathname.startsWith("/community/")) return "Community";

    // Default or welcome page logic
    if (location.pathname === "/" && !isAuthenticated) {
      return "Welcome";
    }

    return "Dashboard"; // Default title
  }, [location.pathname, navItems, isAuthenticated]);

  useEffect(() => {
    if (mobileMenuOpen && mobileMenuTriggerRef.current) {
      mobileMenuTriggerRef.current.focus();
    }
  }, [mobileMenuOpen]);

  const { data: userTags } = useListUserTags({ query: { userId: user?.id || "" } });

  const aiMentorButton = (
    <Button
      variant="outline"
      size="sm"
      className={cn(
        "relative flex items-center justify-center gap-2",
        aiAssistantVisibility === "minimized" ? "w-10 h-10 rounded-full p-0" : "w-full"
      )}
      onClick={openAIAssistant}
    >
      {aiAssistantVisibility === "minimized" ? (
        <Bot className="h-5 w-5" />
      ) : (
        <>
          <Bot className="h-4 w-4" />
          <span>AI Mentor</span>
        </>
      )}
      {/* Optional: Add a badge for new messages or activity */}
      {/* <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">2</span> */}
    </Button>
  );

  return (
    <TooltipProvider delayDuration={100}>
      <div className="flex min-h-screen w-full flex-col bg-background">
        {showTour && <TourGuide />}
        {user && !hasRequiredTier(appConfig.min_tier_full_mode || 0) && user.appMode === "full" && (
          <FrostedGateOverlay />
        )}
        <div className="flex-1 overflow-hidden">
          <div className="grid h-full w-full lg:grid-cols-[220px_1fr] xl:grid-cols-[280px_1fr]">
            {/* Sidebar for Desktop */}
            <div className="hidden border-r bg-muted/40 lg:block">
              <div className="flex h-full max-h-screen flex-col gap-4 px-4 py-6">
                <div className="flex h-12 items-center justify-between">
                  <Link to="/" className="flex items-center gap-2 font-semibold">
                    <Logo className="h-6 w-6 text-primary" />
                    {/* <span className="text-lg font-bold text-primary">The Trading Mentor</span> */}
                  </Link>
                  <AppModeToggle />
                </div>
                <ScrollArea className="flex-1">
                  <nav className="grid items-start gap-2">{renderNavLinks(filteredNavItems)}</nav>
                </ScrollArea>
                <div className="mt-auto flex flex-col gap-2">
                  <Separator />
                  {aiMentorButton}
                  <UserNav />
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex flex-col">
              {/* Top Header */}
              <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6">
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0 lg:hidden"
                      ref={mobileMenuTriggerRef}
                      aria-label="Toggle navigation menu"
                    >
                      <Menu className="h-5 w-5" />
                      <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="flex flex-col">
                    <nav className="grid gap-2 text-lg font-medium">
                      <Link
                        to="/"
                        className="flex items-center gap-2 text-lg font-semibold mb-4"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Logo className="h-6 w-6 text-primary" />
                        <span className="sr-only">The Trading Mentor</span>
                      </Link>
                      {renderNavLinks(filteredNavItems)}
                    </nav>
                    <div className="mt-auto flex flex-col gap-2">
                      <Separator />
                      {aiMentorButton}
                      <UserNav />
                    </div>
                  </SheetContent>
                </Sheet>
                <div className="flex w-full items-center justify-between">
                  <h1 className="text-lg font-semibold md:text-xl">{getPageTitle()}</h1>
                  <div className="flex items-center gap-2">
                    <KillZoneStrip />
                    {!isMobile && (
                      <Button variant="outline" size="sm" onClick={toggleAIAssistantVisibility}>
                        {aiAssistantVisibility === "full" ? "Minimize AI" : "Maximize AI"}
                      </Button>
                    )}
                  </div>
                </div>
              </header>

              {/* Page Content */}
              <main className="flex flex-1 flex-col gap-4 overflow-auto p-4 md:gap-6 md:p-6">
                <Outlet /> {/* Renders the current page content */}
              </main>
            </div>
          </div>
        </div>

        {isMobile && <MobileBottomNav navItems={filteredNavItems} handleNavClick={handleNavClick} />}

        <AnimatePresence>
          {isAIAssistantOpen && (
            <motion.div
              initial={{ opacity: 0, x: aiAssistantVisibility === "minimized" ? "100%" : "100%" }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: aiAssistantVisibility === "minimized" ? "100%" : "100%" }}
              transition={{ duration: 0.2 }}
              className={cn(
                "fixed bottom-0 right-0 top-0 z-50 flex h-full max-h-screen flex-col overflow-hidden rounded-l-lg border-l bg-card shadow-lg",
                aiAssistantVisibility === "minimized"
                  ? "w-[calc(100vw-40px)] md:w-96 lg:w-80"
                  : "w-full md:w-96 lg:w-80"
              )}
            >
              <AIAssistant onClose={closeAIAssistant} onToggleVisibility={toggleAIAssistantVisibility} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
};