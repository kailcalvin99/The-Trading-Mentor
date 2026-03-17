import { useState, useEffect, useCallback } from "react";
import { NavLink, Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Calendar, GraduationCap, Shield, BookOpen, BarChart3, HelpCircle, Lock, Crown, Settings, LogOut, CreditCard, User, ChevronDown, LayoutDashboard, Users, Share2, X, Trophy, Copy, Check, Webhook, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { FreeSidebar, LockedFeatureOverlay, SpinWheelFloatingTrigger } from "@/components/CasinoElements";
import AIAssistant from "@/components/AIAssistant";
import { TourGuide } from "@/components/TourGuide";
import { useTourGuideContext } from "@/contexts/TourGuideContext";
import { getSkillLevel } from "@/components/OnboardingQuiz";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const SIDEBAR_COLLAPSED_KEY = "ict-sidebar-collapsed";

const ALL_NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", mobileLabel: "Home", icon: LayoutDashboard, requiredTier: 0, minSkill: 0 },
  { to: "/academy", label: "ICT Academy", mobileLabel: "Academy", icon: GraduationCap, requiredTier: 0, minSkill: 0 },
  { to: "/planner", label: "Daily Planner", mobileLabel: "Planner", icon: Calendar, requiredTier: 0, minSkill: 0 },
  { to: "/risk-shield", label: "Risk Shield", mobileLabel: "Risk", icon: Shield, requiredTier: 1, minSkill: 0 },
  { to: "/prop-tracker", label: "Prop Tracker", mobileLabel: "Prop", icon: Trophy, requiredTier: 1, minSkill: 1 },
  { to: "/journal", label: "Smart Journal", mobileLabel: "Journal", icon: BookOpen, requiredTier: 2, minSkill: 1 },
  { to: "/analytics", label: "Analytics", mobileLabel: "Stats", icon: BarChart3, requiredTier: 2, minSkill: 1 },
  { to: "/leaderboard", label: "Leaderboard", mobileLabel: "Rank", icon: Trophy, requiredTier: 2, minSkill: 2 },
  { to: "/webhooks", label: "TV Webhooks", mobileLabel: "Webhooks", icon: Webhook, requiredTier: 2, minSkill: 2 },
  { to: "/community", label: "Community", mobileLabel: "Community", icon: Users, requiredTier: 0, minSkill: 0 },
];

function getSkillNumber(): number {
  const level = getSkillLevel();
  if (level === "advanced") return 2;
  if (level === "intermediate") return 1;
  return 0;
}

function NavItem({
  to,
  label,
  icon: Icon,
  requiredTier,
  userTier,
  onLockedClick,
  collapsed,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredTier: number;
  userTier: number;
  onLockedClick: () => void;
  collapsed: boolean;
}) {
  const isLocked = requiredTier > userTier;

  if (isLocked) {
    return (
      <button
        onClick={onLockedClick}
        title={collapsed ? label : undefined}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground/40 cursor-not-allowed w-full text-left group relative"
      >
        <div className="relative">
          <Icon className="h-5 w-5 shrink-0 opacity-40" />
          <Lock className="h-3 w-3 absolute -bottom-1 -right-1 text-muted-foreground/60" />
        </div>
        {!collapsed && <span className="hidden lg:inline opacity-40">{label}</span>}
        {!collapsed && <Crown className="h-3 w-3 text-amber-500 hidden lg:block ml-auto opacity-60" />}
      </button>
    );
  }

  return (
    <NavLink
      to={to}
      end
      title={collapsed ? label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        }`
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="hidden lg:inline">{label}</span>}
    </NavLink>
  );
}

function MobileNavItem({
  to,
  mobileLabel,
  icon: Icon,
  requiredTier,
  userTier,
  onLockedClick,
}: {
  to: string;
  mobileLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredTier: number;
  userTier: number;
  onLockedClick: () => void;
}) {
  const isLocked = requiredTier > userTier;

  if (isLocked) {
    return (
      <button
        onClick={onLockedClick}
        className="flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-2 text-[10px] font-medium text-muted-foreground/30 cursor-not-allowed"
      >
        <div className="relative">
          <Icon className="h-5 w-5 opacity-40" />
          <Lock className="h-2.5 w-2.5 absolute -bottom-0.5 -right-0.5 text-muted-foreground/50" />
        </div>
        <span className="opacity-40">{mobileLabel}</span>
      </button>
    );
  }

  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-2 text-[10px] font-medium transition-colors ${
          isActive ? "text-primary" : "text-muted-foreground"
        }`
      }
    >
      <Icon className="h-5 w-5" />
      <span>{mobileLabel}</span>
    </NavLink>
  );
}

function ShareModal({
  founderSpotsLeft,
  shareCopied,
  setShareCopied,
  onClose,
}: {
  founderSpotsLeft: number | null;
  shareCopied: boolean;
  setShareCopied: (v: boolean) => void;
  onClose: () => void;
}) {
  const appUrl = import.meta.env.VITE_APP_URL || window.location.origin;
  const defaultMessage = `Hey! I've been using this app to learn how to trade like the big banks. It's an all-in-one trading tool — from learning ICT concepts, to daily planning, risk calculating, journaling, smart analytics, and even an AI mentor and coach. Get started trading just like me 👉 ${appUrl}`;
  const [editableMessage, setEditableMessage] = useState(defaultMessage);
  const canNativeShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Invite Friends</h2>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {founderSpotsLeft !== null && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
            <span className="text-base">🔥</span>
            <p className="text-xs font-semibold text-amber-500">
              {founderSpotsLeft > 0
                ? `Only ${founderSpotsLeft} Founder spot${founderSpotsLeft !== 1 ? "s" : ""} left — share now to help your friends save 50%!`
                : "Founder spots are full — but sharing is still appreciated!"}
            </p>
          </div>
        )}

        <p className="text-sm text-muted-foreground mb-2">
          Edit your message before sharing:
        </p>

        <textarea
          value={editableMessage}
          onChange={(e) => setEditableMessage(e.target.value)}
          rows={5}
          className="w-full bg-secondary/50 border border-border rounded-xl p-3 text-sm text-foreground leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-primary mb-4"
        />

        <div className="flex gap-2 mb-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(appUrl);
              setShareCopied(true);
              setTimeout(() => setShareCopied(false), 3000);
            }}
            className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold py-2.5 rounded-xl hover:opacity-90 transition-opacity text-sm"
          >
            {shareCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {shareCopied ? "Copied!" : "Copy Link"}
          </button>
          {canNativeShare && (
            <button
              onClick={() => {
                navigator.share({ title: "ICT AI Trading Mentor", text: editableMessage, url: appUrl }).catch(() => {});
              }}
              className="flex-1 flex items-center justify-center gap-2 border border-border rounded-xl py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <Share2 className="h-4 w-4" />
              Share
            </button>
          )}
        </div>

        <div className="flex items-center justify-center gap-3">
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(editableMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center border border-border rounded-xl py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Share on X
          </a>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(editableMessage)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 text-center border border-border rounded-xl py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            Share on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

export default function Layout() {
  const { user, subscription, tierLevel, isAdmin, logout } = useAuth();
  const { config } = useAppConfig();
  const [showLockToast, setShowLockToast] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCasinoSidebar, setShowCasinoSidebar] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [founderSpotsLeft, setFounderSpotsLeft] = useState<number | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });
  const navigate = useNavigate();
  const location = useLocation();
  const { state: tourState, dispatch: tourDispatch, closeTour } = useTourGuideContext();

  const isFreeUser = tierLevel === 0;
  const skillNum = getSkillNumber();
  const navItems = ALL_NAV_ITEMS.filter((item) => item.minSkill <= skillNum);

  function toggleSidebar() {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  useEffect(() => {
    if (isAdmin) return;
    const lockedPaths: Record<string, number> = {
      "/risk-shield": 1,
      "/prop-tracker": 1,
      "/journal": 2,
      "/analytics": 2,
      "/leaderboard": 2,
      "/webhooks": 2,
    };
    for (const [path, required] of Object.entries(lockedPaths)) {
      if (location.pathname.startsWith(path) && tierLevel < required) {
        navigate("/", { replace: true });
        break;
      }
    }
  }, [location.pathname, tierLevel, isAdmin, navigate]);

  const handleOpenShare = useCallback(() => {
    setShowShare(true);
    fetch(`${API_BASE}/subscriptions/tiers`)
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.founderSpotsLeft === "number") {
          setFounderSpotsLeft(data.founderSpotsLeft);
        }
      })
      .catch(() => {});
  }, []);

  function handleLockedClick() {
    setShowLockToast(true);
    setTimeout(() => setShowLockToast(false), 3000);
  }

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className={`hidden md:flex flex-col border-r border-sidebar-border bg-sidebar shrink-0 h-screen overflow-y-auto transition-all duration-200 ${sidebarCollapsed ? "w-16" : "w-16 lg:w-56"}`}>
        <div className="flex items-center justify-between h-14 border-b border-sidebar-border px-2">
          <Link to="/" className={`flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity ${sidebarCollapsed ? "justify-center w-full" : "lg:justify-start"}`}>
            <Logo size={36} />
            {!sidebarCollapsed && (
              <span className="hidden lg:block text-xs font-semibold text-sidebar-foreground truncate">
                {config.app_name || "ICT AI Trading Mentor"}
              </span>
            )}
          </Link>
          {!sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              title="Collapse sidebar"
              className="hidden lg:flex p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
          {sidebarCollapsed && (
            <button
              onClick={toggleSidebar}
              title="Expand sidebar"
              className="hidden lg:flex p-1 rounded text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors absolute top-3.5 left-10"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          )}
        </div>

        <nav className="flex flex-col gap-1 p-2 flex-1">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              {...item}
              userTier={tierLevel}
              onLockedClick={handleLockedClick}
              collapsed={sidebarCollapsed}
            />
          ))}
        </nav>

        <div className="p-2 border-t border-sidebar-border space-y-1">
          <Link
            to="/pricing"
            title={sidebarCollapsed ? "Subscription" : undefined}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <CreditCard className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span className="hidden lg:inline">Subscription</span>}
          </Link>

          <Link
            to="/settings"
            title={sidebarCollapsed ? "Settings" : undefined}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Settings className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span className="hidden lg:inline">Settings</span>}
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              title={sidebarCollapsed ? "Admin" : undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <Lock className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span className="hidden lg:inline">Admin</span>}
            </Link>
          )}

          <Link
            to="/welcome"
            title={sidebarCollapsed ? "Help & Tour" : undefined}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <HelpCircle className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span className="hidden lg:inline">Help & Tour</span>}
          </Link>

          <button
            onClick={handleOpenShare}
            title={sidebarCollapsed ? "Invite Friends" : undefined}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full text-left"
          >
            <Share2 className="h-5 w-5 shrink-0" />
            {!sidebarCollapsed && <span className="hidden lg:inline">Invite Friends</span>}
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full text-left"
            >
              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <User className="h-3 w-3 text-primary" />
              </div>
              {!sidebarCollapsed && <span className="hidden lg:inline truncate flex-1">{user?.name}</span>}
              {!sidebarCollapsed && user?.isFounder && <Crown className="h-3 w-3 text-amber-500 hidden lg:block" />}
              {!sidebarCollapsed && <ChevronDown className="h-3 w-3 hidden lg:block" />}
            </button>

            {showUserMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
                <div className="absolute bottom-full left-0 mb-1 w-full bg-card border border-border rounded-lg shadow-xl z-50 py-1">
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs font-medium text-foreground">{user?.name}</p>
                    <p className="text-[10px] text-muted-foreground">{user?.email}</p>
                    {user?.isFounder && (
                      <span className="inline-flex items-center gap-1 bg-amber-500/10 border border-amber-500/30 rounded-full px-2 py-0.5 mt-1">
                        <Crown className="h-2.5 w-2.5 text-amber-500" />
                        <span className="text-[9px] font-bold text-amber-500">FOUNDER #{user.founderNumber}</span>
                      </span>
                    )}
                    <p className="text-[10px] text-primary mt-1 font-medium">
                      {subscription?.tierName || "Free"} Plan
                    </p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 w-full text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <div className="hidden md:flex items-center gap-3 px-4 py-2 border-b border-border bg-sidebar shrink-0">
          <AIAssistant />
        </div>

        <main className="flex-1 overflow-auto relative">
          <div className="flex h-full">
            <div className="flex-1 overflow-auto">
              <Outlet />
            </div>

            {isFreeUser && (
              <div className="hidden xl:block w-72 border-l border-border bg-sidebar overflow-auto shrink-0">
                <FreeSidebar />
              </div>
            )}
            <SpinWheelFloatingTrigger hasSidebar={isFreeUser} />
          </div>
        </main>

        <div className="md:hidden">
          <AIAssistant />
        </div>

        <nav className="md:hidden flex items-center border-t border-border bg-sidebar shrink-0" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {navItems.map((item) => (
            <MobileNavItem
              key={item.to}
              {...item}
              userTier={tierLevel}
              onLockedClick={handleLockedClick}
            />
          ))}
        </nav>
      </div>

      {showShare && (
        <ShareModal
          founderSpotsLeft={founderSpotsLeft}
          shareCopied={shareCopied}
          setShareCopied={setShareCopied}
          onClose={() => { setShowShare(false); setShareCopied(false); setFounderSpotsLeft(null); }}
        />
      )}

      {showLockToast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-card border border-border rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3 max-w-sm">
            <Crown className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Premium Feature</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Upgrade your plan to unlock this feature.
              </p>
            </div>
            <button
              onClick={() => navigate("/pricing")}
              className="text-xs text-primary font-bold shrink-0 hover:underline"
            >
              Upgrade
            </button>
          </div>
        </div>
      )}

      {tourState.visible && (
        <TourGuide
          onClose={closeTour}
          state={tourState}
          dispatch={tourDispatch}
        />
      )}
    </div>
  );
}
