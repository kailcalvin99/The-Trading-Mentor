import { useState, useEffect } from "react";
import { NavLink, Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Calendar, GraduationCap, Shield, BookOpen, BarChart3, HelpCircle, Lock } from "lucide-react";
import Logo from "@/components/Logo";

const UNLOCK_KEY = "ict-academy-unlocked";

function isUnlocked(): boolean {
  try {
    return localStorage.getItem(UNLOCK_KEY) === "true";
  } catch {
    return false;
  }
}

const navItems = [
  { to: "/", label: "ICT Academy", mobileLabel: "Academy", icon: GraduationCap, locked: false },
  { to: "/planner", label: "Daily Planner", mobileLabel: "Planner", icon: Calendar, locked: false },
  { to: "/risk-shield", label: "Risk Shield", mobileLabel: "Risk", icon: Shield, locked: true },
  { to: "/journal", label: "Smart Journal", mobileLabel: "Journal", icon: BookOpen, locked: true },
  { to: "/analytics", label: "Analytics", mobileLabel: "Stats", icon: BarChart3, locked: true },
];

function NavItem({
  to,
  label,
  icon: Icon,
  locked,
  unlocked,
  onLockedClick,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  locked: boolean;
  unlocked: boolean;
  onLockedClick: () => void;
}) {
  const isLocked = locked && !unlocked;

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
      </button>
    );
  }

  return (
    <NavLink
      to={to}
      end={to === "/"}
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
  locked,
  unlocked,
  onLockedClick,
}: {
  to: string;
  mobileLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  locked: boolean;
  unlocked: boolean;
  onLockedClick: () => void;
}) {
  const isLocked = locked && !unlocked;

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
      end={to === "/"}
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
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [showLockToast, setShowLockToast] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const interval = setInterval(() => {
      const current = isUnlocked();
      if (current !== unlocked) setUnlocked(current);
    }, 1000);
    return () => clearInterval(interval);
  }, [unlocked]);

  useEffect(() => {
    if (!unlocked) {
      const lockedPaths = ["/risk-shield", "/journal", "/analytics"];
      if (lockedPaths.some((p) => location.pathname.startsWith(p))) {
        navigate("/", { replace: true });
      }
    }
  }, [location.pathname, unlocked, navigate]);

  function handleLockedClick() {
    setShowLockToast(true);
    setTimeout(() => setShowLockToast(false), 3000);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden md:flex flex-col w-16 lg:w-56 border-r border-sidebar-border bg-sidebar shrink-0">
        <div className="flex items-center gap-2 px-3 h-14 border-b border-sidebar-border">
          <Logo size={32} />
          <span className="hidden lg:block text-sm font-semibold text-sidebar-foreground truncate">
            Trading Mentor
          </span>
        </div>

        <nav className="flex flex-col gap-1 p-2 flex-1">
          {navItems.map((item) => (
            <NavItem
              key={item.to}
              {...item}
              unlocked={unlocked}
              onLockedClick={handleLockedClick}
            />
          ))}
        </nav>

        <div className="p-2 border-t border-sidebar-border">
          <Link
            to="/welcome"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <HelpCircle className="h-5 w-5 shrink-0" />
            <span className="hidden lg:inline">Help & Tour</span>
          </Link>
        </div>
      </aside>

      <div className="flex flex-col flex-1 min-w-0">
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>

        <nav className="md:hidden flex items-center border-t border-border bg-sidebar shrink-0" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
          {navItems.map((item) => (
            <MobileNavItem
              key={item.to}
              {...item}
              unlocked={unlocked}
              onLockedClick={handleLockedClick}
            />
          ))}
        </nav>
      </div>

      {showLockToast && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-card border border-border rounded-xl px-5 py-3 shadow-2xl flex items-center gap-3 max-w-sm">
            <Lock className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-foreground">Complete the Academy First</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Finish all 39 lessons and pass the quiz to unlock this feature.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
