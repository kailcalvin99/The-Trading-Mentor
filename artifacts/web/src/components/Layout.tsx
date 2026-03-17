import { useState, useEffect } from "react";
import { NavLink, Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Calendar, GraduationCap, Shield, BookOpen, BarChart3, HelpCircle, Lock, Crown, Settings, LogOut, CreditCard, User, ChevronDown, LayoutDashboard, Users, Share2, X } from "lucide-react";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { FreeSidebar, LockedFeatureOverlay, SpinWheelFloatingTrigger } from "@/components/CasinoElements";
import AIAssistant from "@/components/AIAssistant";

const navItems = [
  { to: "/dashboard", label: "Dashboard", mobileLabel: "Home", icon: LayoutDashboard, requiredTier: 0 },
  { to: "/academy", label: "ICT Academy", mobileLabel: "Academy", icon: GraduationCap, requiredTier: 0 },
  { to: "/planner", label: "Daily Planner", mobileLabel: "Planner", icon: Calendar, requiredTier: 0 },
  { to: "/risk-shield", label: "Risk Shield", mobileLabel: "Risk", icon: Shield, requiredTier: 1 },
  { to: "/journal", label: "Smart Journal", mobileLabel: "Journal", icon: BookOpen, requiredTier: 2 },
  { to: "/analytics", label: "Analytics", mobileLabel: "Stats", icon: BarChart3, requiredTier: 2 },
  { to: "/community", label: "Community", mobileLabel: "Community", icon: Users, requiredTier: 0 },
];

function NavItem({
  to,
  label,
  icon: Icon,
  requiredTier,
  userTier,
  onLockedClick,
}: {
  to: string;
  label: string;
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
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground/40 cursor-not-allowed w-full text-left group relative"
      >
        <div className="relative">
          <Icon className="h-5 w-5 shrink-0 opacity-40" />
          <Lock className="h-3 w-3 absolute -bottom-1 -right-1 text-muted-foreground/60" />
        </div>
        <span className="hidden lg:inline opacity-40">{label}</span>
        <Crown className="h-3 w-3 text-amber-500 hidden lg:block ml-auto opacity-60" />
      </button>
    );
  }

  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary"
        }`
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      <span className="hidden lg:inline">{label}</span>
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

export default function Layout() {
  const { user, subscription, tierLevel, isAdmin, logout } = useAuth();
  const { config } = useAppConfig();
  const [showLockToast, setShowLockToast] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCasinoSidebar, setShowCasinoSidebar] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const isFreeUser = tierLevel === 0;

  useEffect(() => {
    const lockedPaths: Record<string, number> = {
      "/risk-shield": 1,
      "/journal": 2,
      "/analytics": 2,
    };
    for (const [path, required] of Object.entries(lockedPaths)) {
      if (location.pathname.startsWith(path) && tierLevel < required) {
        navigate("/", { replace: true });
        break;
      }
    }
  }, [location.pathname, tierLevel, navigate]);

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
      <aside className="hidden md:flex flex-col w-16 lg:w-56 border-r border-sidebar-border bg-sidebar shrink-0">
        <Link to="/" className="flex items-center justify-center lg:justify-start gap-2 px-2 lg:px-3 h-14 border-b border-sidebar-border hover:bg-secondary/50 transition-colors">
          <Logo size={40} />
          <span className="hidden lg:block text-sm font-semibold text-sidebar-foreground truncate">
            {config.app_name || "ICT AI Trading Mentor"}
          </span>
        </Link>

        <nav className="flex flex-col gap-1 p-2 flex-1">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              {...item}
              userTier={tierLevel}
              onLockedClick={handleLockedClick}
            />
          ))}
        </nav>

        <div className="p-2 border-t border-sidebar-border space-y-1">
          <Link
            to="/pricing"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <CreditCard className="h-5 w-5 shrink-0" />
            <span className="hidden lg:inline">Subscription</span>
          </Link>

          <Link
            to="/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Settings className="h-5 w-5 shrink-0" />
            <span className="hidden lg:inline">Settings</span>
          </Link>

          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <Lock className="h-5 w-5 shrink-0" />
              <span className="hidden lg:inline">Admin</span>
            </Link>
          )}

          <Link
            to="/welcome"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <HelpCircle className="h-5 w-5 shrink-0" />
            <span className="hidden lg:inline">Help & Tour</span>
          </Link>

          <button
            onClick={() => setShowShare(true)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full text-left"
          >
            <Share2 className="h-5 w-5 shrink-0" />
            <span className="hidden lg:inline">Invite Friends</span>
          </button>

          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full text-left"
            >
              <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                <User className="h-3 w-3 text-primary" />
              </div>
              <span className="hidden lg:inline truncate flex-1">{user?.name}</span>
              {user?.isFounder && <Crown className="h-3 w-3 text-amber-500 hidden lg:block" />}
              <ChevronDown className="h-3 w-3 hidden lg:block" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Share2 className="h-5 w-5 text-primary" />
                <h2 className="text-base font-bold text-foreground">Invite Friends</h2>
              </div>
              <button onClick={() => { setShowShare(false); setShareCopied(false); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-muted-foreground mb-4">
              Know someone who wants to learn ICT trading? The first 20 members get founder pricing. Share this message:
            </p>

            <div className="bg-secondary/50 border border-border rounded-xl p-4 mb-4">
              <p className="text-sm text-foreground leading-relaxed">
                🚀 I've been using <strong>ICT AI Trading Mentor</strong> — it's an AI-powered app that teaches you the ICT methodology step by step. They're in their Founder phase so the first 20 members get a special discount. Check it out: <span className="text-primary">ictmentor.com</span>
              </p>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText("🚀 I've been using ICT AI Trading Mentor — it's an AI-powered app that teaches you the ICT methodology step by step. They're in their Founder phase so the first 20 members get a special discount. Check it out: ictmentor.com");
                setShareCopied(true);
                setTimeout(() => setShareCopied(false), 3000);
              }}
              className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-xl hover:opacity-90 transition-opacity text-sm"
            >
              {shareCopied ? "✓ Copied to Clipboard!" : "Copy Message"}
            </button>

            <div className="flex items-center justify-center gap-3 mt-4">
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent("🚀 I've been using ICT AI Trading Mentor — an AI-powered app that teaches ICT methodology step by step. First 20 members get founder pricing. Check it out: ictmentor.com")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center border border-border rounded-xl py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                Share on X
              </a>
              <a
                href={`https://wa.me/?text=${encodeURIComponent("🚀 I've been using ICT AI Trading Mentor — an AI-powered app that teaches ICT methodology step by step. First 20 members get founder pricing! ictmentor.com")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center border border-border rounded-xl py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              >
                Share on WhatsApp
              </a>
            </div>
          </div>
        </div>
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
    </div>
  );
}
