import { useState, useEffect, useCallback, useMemo, useRef, createContext, useContext } from "react";
import { createPortal } from "react-dom";
import OnboardingQuiz, { getSkillLevel, hasCompletedQuiz, type SkillLevel } from "@/components/OnboardingQuiz";
import { NavLink, Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Calendar, GraduationCap, Shield, BookOpen, BarChart3, HelpCircle, Lock, Crown, Settings, LogOut, CreditCard, User, ChevronDown, LayoutDashboard, Users, Share2, X, Trophy, Copy, Check, Video, Zap, Layers, Flame, Star, Menu, CandlestickChart, Activity } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { FreeSidebar, useDailyStreak } from "@/components/CasinoElements";
import AIAssistant from "@/components/AIAssistant";
import { TourGuide } from "@/components/TourGuide";
import { useTourGuideContext } from "@/contexts/TourGuideContext";
import KillZoneStrip from "@/components/KillZoneStrip";
import SpotifyPlayer from "@/components/SpotifyPlayer";
import FloatingToolkit from "@/components/FloatingToolkit";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";
import { useToast } from "@/hooks/use-toast";

interface DrawerContextValue {
  openDrawer: () => void;
}
export const DrawerContext = createContext<DrawerContextValue>({ openDrawer: () => {} });
export function useDrawer() { return useContext(DrawerContext); }

const RANKS = ["Apprentice", "Student", "Trader", "Pro", "Master", "ICT Legend"];

function HeaderGamificationBadges() {
  const { streak, xp } = useDailyStreak();
  const level = Math.floor(xp / 100) + 1;
  const xpInLevel = xp % 100;
  const rankIdx = Math.min(Math.floor((level - 1) / 2), RANKS.length - 1);
  const rank = RANKS[rankIdx];

  const badgeChecks = [
    true, true,
    streak >= 3,
    localStorage.getItem("dashboard-visited") === "true",
    streak >= 7,
    localStorage.getItem("ict-academy-unlocked") === "true",
    false, false,
  ];
  const earned = badgeChecks.filter(Boolean).length;

  const tooltipText = `Lv ${level} (${rank}) · ${xpInLevel}/100 XP · ${streak}-day streak · ${earned}/8 badges`;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 bg-card border border-border rounded-full px-2 py-0.5 cursor-default select-none">
          <Star className="h-2.5 w-2.5 text-primary shrink-0" />
          <span className="text-[10px] font-bold text-foreground">Lv {level}</span>
          <span className="text-muted-foreground/30 text-[10px]">|</span>
          <Flame className={`h-2.5 w-2.5 shrink-0 ${streak >= 3 ? "text-red-500" : "text-muted-foreground"}`} />
          <span className="text-[10px] font-bold text-foreground">{streak}d</span>
          <span className="text-muted-foreground/30 text-[10px]">|</span>
          <Trophy className="h-2.5 w-2.5 text-red-500 shrink-0" />
          <span className="text-[10px] font-bold text-foreground">{earned}/8</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>{tooltipText}</TooltipContent>
    </Tooltip>
  );
}

const MANTRA_STORAGE_KEY = "ict-daily-mantra";
const DEFAULT_MANTRA = "Welcome to the Inner Circle";
const MANTRA_GLOW = "0 0 40px rgba(255,255,255,0.65), 0 0 16px rgba(255,255,255,0.4), 0 0 6px rgba(255,255,255,0.25)";
const MANTRA_FLIP_MS = 20_000;

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const COMMUNITY_LAST_VISIT_KEY = "community_last_visit";
const COMMUNITY_POLL_INTERVAL = 3 * 60 * 1000;

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, requiredTier: 0, minSkillLevel: 0 },
  { to: "/open-positions", label: "Open Positions", icon: Activity, requiredTier: 0, minSkillLevel: 0 },
  { to: "/academy", label: "ICT Academy", icon: GraduationCap, requiredTier: 0, minSkillLevel: 0 },
  { to: "/videos", label: "Videos", icon: Video, requiredTier: 0, minSkillLevel: 0 },
  { to: "/planner", label: "Mission Control", icon: Calendar, requiredTier: 0, minSkillLevel: 0 },
  { to: "/prop-tracker", label: "Prop Tracker", icon: Trophy, requiredTier: 1, minSkillLevel: 1 },
  { to: "/paper-trading", label: "Chart Lab", icon: CandlestickChart, requiredTier: 1, minSkillLevel: 1 },
  { to: "/journal", label: "Smart Journal", icon: BookOpen, requiredTier: 1, minSkillLevel: 1 },
  { to: "/analytics", label: "Analytics", icon: BarChart3, requiredTier: 2, minSkillLevel: 1 },
  { to: "/leaderboard", label: "Leaderboard", icon: Trophy, requiredTier: 2, minSkillLevel: 2 },
  { to: "/community", label: "Community", icon: Users, requiredTier: 0, minSkillLevel: 0 },
];

const SKILL_LEVEL_NUM: Record<SkillLevel | "none", number> = {
  none: -1,
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

function NavItem({
  to,
  label,
  icon: Icon,
  requiredTier,
  userTier,
  onLockedClick,
  collapsed,
  badge,
  onClick,
}: {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredTier: number;
  userTier: number;
  onLockedClick: () => void;
  collapsed: boolean;
  badge?: boolean | number;
  onClick?: () => void;
}) {
  const isLocked = requiredTier > userTier;

  if (isLocked) {
    const button = (
      <button
        onClick={() => { onLockedClick(); onClick?.(); }}
        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground/40 cursor-not-allowed w-full text-left group relative"
      >
        <div className="relative">
          <Icon className="h-5 w-5 shrink-0 opacity-40" />
          <Lock className="h-3 w-3 absolute -bottom-1 -right-1 text-muted-foreground/60" />
        </div>
        {!collapsed && <span className="opacity-40">{label}</span>}
        {!collapsed && <Crown className="h-3 w-3 text-red-500 ml-auto opacity-60" />}
      </button>
    );
    if (collapsed) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{button}</TooltipTrigger>
          <TooltipContent side="right">{label}</TooltipContent>
        </Tooltip>
      );
    }
    return button;
  }

  const badgeNum = typeof badge === "number" ? badge : badge ? 1 : 0;
  const link = (
    <NavLink
      to={to}
      end
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border-l-2 ${
          isActive
            ? "bg-primary/10 text-primary border-primary"
            : "text-muted-foreground hover:text-foreground hover:bg-secondary border-transparent"
        }`
      }
    >
      <div className="relative shrink-0">
        <Icon className="h-5 w-5" />
        {badgeNum > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-red-500 border border-background text-[9px] font-bold text-white">
            {badgeNum > 99 ? "99+" : badgeNum}
          </span>
        )}
      </div>
      {!collapsed && <span>{label}</span>}
      {!collapsed && badgeNum > 0 && (
        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">
          {badgeNum > 99 ? "99+" : badgeNum}
        </span>
      )}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }
  return link;
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
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 mb-4 flex items-center gap-2">
            <span className="text-base">🔥</span>
            <p className="text-xs font-semibold text-red-500">
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
                navigator.share({ title: "The Trading Mentor", text: editableMessage, url: appUrl }).catch(() => {});
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


function ModeSwitcher({ appMode, setAppMode }: { appMode: "full" | "lite"; setAppMode: (m: "full" | "lite") => Promise<{ success: boolean; error?: string }> }) {
  const { toast } = useToast();
  const isLite = appMode === "lite";

  async function handleToggle() {
    const result = await setAppMode(isLite ? "full" : "lite");
    if (!result.success) {
      toast({
        title: "Could not switch mode",
        description: result.error || "Please try again.",
        variant: "destructive",
      });
    }
  }

  return (
    <button
      onClick={handleToggle}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        isLite
          ? "text-red-500 hover:bg-red-500/10"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      }`}
    >
      {isLite ? <Layers className="h-3.5 w-3.5" /> : <Zap className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{isLite ? "Full Mode" : "Learning Mode"}</span>
    </button>
  );
}

const STOCK_AVATARS = [
  { id: "bull", emoji: "🐂", label: "Bull" },
  { id: "bear", emoji: "🐻", label: "Bear" },
  { id: "chart", emoji: "📈", label: "Chart" },
  { id: "candle", emoji: "🕯️", label: "Candle" },
  { id: "rocket", emoji: "🚀", label: "Rocket" },
  { id: "shield", emoji: "🛡️", label: "Shield" },
  { id: "flame", emoji: "🔥", label: "Flame" },
  { id: "crown", emoji: "👑", label: "Crown" },
];

function resizeImageToBase64(file: File, maxSize = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No canvas context")); return; }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function getAuthHeaders(): Record<string, string> {
  try {
    const token = localStorage.getItem("ICT_TRADING_MENTOR_TOKEN");
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export default function Layout() {
  const { user, loading: authLoading, subscription, tierLevel, isAdmin, logout, appMode, setAppMode, setAvatarUrl } = useAuth();
  const { toast } = useToast();
  const [quizDone, setQuizDone] = useState(() => hasCompletedQuiz());
  useEffect(() => {
    if (!authLoading) {
      setQuizDone(user !== null ? Boolean(user.quizDone) : hasCompletedQuiz());
    }
  }, [authLoading, user]);
  const [showLockToast, setShowLockToast] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const userPillRef = useRef<HTMLButtonElement>(null);
  const [userMenuPos, setUserMenuPos] = useState<{ top: number; right: number } | null>(null);
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const [headerVisible, setHeaderVisible] = useState(true);
  const lastScrollY = useRef(0);

  const recalcUserMenuPos = useCallback(() => {
    if (userPillRef.current) {
      const rect = userPillRef.current.getBoundingClientRect();
      setUserMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
  }, []);

  useEffect(() => {
    if (!showUserMenu) return;
    window.addEventListener("resize", recalcUserMenuPos);
    return () => window.removeEventListener("resize", recalcUserMenuPos);
  }, [showUserMenu, recalcUserMenuPos]);

  const [showShare, setShowShare] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [founderSpotsLeft, setFounderSpotsLeft] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [communityHasNew, setCommunityHasNew] = useState(false);
  const communityPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [journalDraftCount, setJournalDraftCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  const { state: tourState, dispatch: tourDispatch, closeTour, neverShowTour } = useTourGuideContext();

  const skillLevelNum = useMemo(() => {
    const level = getSkillLevel();
    return level ? SKILL_LEVEL_NUM[level] : SKILL_LEVEL_NUM["none"];
  }, []);

  const LITE_MODE_ALLOWED = ["/", "/academy", "/journal"];

  const visibleNavItems = useMemo(() => {
    if (appMode === "lite") {
      const items = skillLevelNum === SKILL_LEVEL_NUM["none"] ? navItems : navItems.filter((item) => item.minSkillLevel <= skillLevelNum);
      return items.filter((item) => LITE_MODE_ALLOWED.includes(item.to));
    }
    return navItems;
  }, [skillLevelNum, appMode]);

  const isFreeUser = tierLevel === 0;

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => {
    if (isAdmin) return;
    const lockedPaths: Record<string, number> = {
      "/risk-shield": 1,
      "/prop-tracker": 1,
      "/paper-trading": 1,
      "/journal": 1,
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

  useEffect(() => {
    if (!user || tierLevel < 2) return;
    const onJournalPage = location.pathname === "/journal";

    async function pollDrafts() {
      if (onJournalPage) return;
      try {
        const res = await fetch(`${API_BASE}/trades?isDraft=true`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setJournalDraftCount(Array.isArray(data) ? data.filter((t: { isDraft?: boolean }) => t.isDraft).length : 0);
        }
      } catch {}
    }

    pollDrafts();
    const pollId = setInterval(pollDrafts, 60 * 1000);
    return () => clearInterval(pollId);
  }, [user, tierLevel, location.pathname]);

  useEffect(() => {
    const onCommunityPage = location.pathname === "/community";

    async function pollCommunityNew() {
      if (onCommunityPage) {
        setCommunityHasNew(false);
        return;
      }
      try {
        const stored = localStorage.getItem(COMMUNITY_LAST_VISIT_KEY);
        const since = stored || new Date(Date.now() - 24 * 3600 * 1000).toISOString();
        const res = await fetch(`${API_BASE}/community/new-count?since=${encodeURIComponent(since)}`, { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setCommunityHasNew((data.count || 0) > 0);
        }
      } catch {}
    }

    pollCommunityNew();
    communityPollRef.current = setInterval(pollCommunityNew, COMMUNITY_POLL_INTERVAL);
    return () => {
      if (communityPollRef.current) clearInterval(communityPollRef.current);
    };
  }, [location.pathname]);

  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
    setHeaderVisible(true);
    lastScrollY.current = 0;
  }, [location.pathname]);

  const isDashboard = location.pathname === "/";

  const [mantraText, setMantraText] = useState<string>(() => {
    try { return localStorage.getItem(MANTRA_STORAGE_KEY) || DEFAULT_MANTRA; } catch { return DEFAULT_MANTRA; }
  });
  const [mantraEditing, setMantraEditing] = useState(false);
  const [mantraVisible, setMantraVisible] = useState(true);
  const mantraInputRef = useRef<HTMLInputElement>(null);
  const mantraTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isDashboard || mantraEditing) {
      if (mantraTimerRef.current) clearTimeout(mantraTimerRef.current);
      setMantraVisible(true);
      return;
    }
    setMantraVisible(true);
    mantraTimerRef.current = setTimeout(() => setMantraVisible(false), MANTRA_FLIP_MS);
    return () => { if (mantraTimerRef.current) clearTimeout(mantraTimerRef.current); };
  }, [isDashboard, mantraEditing]);

  function commitMantra(value: string) {
    const trimmed = value.trim() || DEFAULT_MANTRA;
    setMantraText(trimmed);
    try { localStorage.setItem(MANTRA_STORAGE_KEY, trimmed); } catch {}
    setMantraEditing(false);
  }

  useEffect(() => {
    if (!isDashboard) return;
    const el = mainScrollRef.current;
    if (!el) return;
    function handleScroll() {
      const current = el!.scrollTop;
      if (current <= 0) {
        setHeaderVisible(true);
      } else if (current > lastScrollY.current) {
        setHeaderVisible(false);
      } else {
        setHeaderVisible(true);
      }
      lastScrollY.current = current;
    }
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [isDashboard]);

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
    <DrawerContext.Provider value={{ openDrawer: () => setDrawerOpen(true) }}>
      <TooltipProvider delayDuration={300}>
        {!authLoading && !quizDone && (
          <OnboardingQuiz onComplete={() => {
            setQuizDone(true);
            fetch(`${API_BASE}/auth/user-flags`, {
              method: "POST",
              headers: { "Content-Type": "application/json", ...getAuthHeaders() },
              credentials: "include",
              body: JSON.stringify({ quizDone: true }),
            }).catch(() => {});
          }} />
        )}
        <div className="flex h-screen overflow-hidden">
          {/* Dimming backdrop */}
          <div
            className={`fixed inset-0 z-40 transition-opacity duration-300 bg-black/60 backdrop-blur-[2px] ${drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            onClick={closeDrawer}
          />


          {/* AI glow line + glowing hamburger pill for non-dashboard pages */}
          {!isDashboard && (
            <>
              <div
                className="fixed top-0 left-0 right-0 cursor-pointer"
                style={{ height: 3, zIndex: 60 }}
                onClick={() => window.dispatchEvent(new Event("ict-open-ai"))}
                title="Open AI Assistant"
                role="button"
                aria-label="Open AI Assistant"
              >
                <div
                  className="absolute inset-0"
                  style={{
                    background: "linear-gradient(90deg, transparent 0%, #00C896 25%, #00C896 75%, transparent 100%)",
                    animation: "ai-header-line-pulse 2.5s ease-in-out infinite",
                    boxShadow: "0 0 5px 1px #00C89660",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: "50%",
                    top: "50%",
                    transform: "translateX(-50%) translateY(-50%)",
                    background: "#00C896",
                    borderRadius: 999,
                    padding: "3px 10px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 30,
                    animation: "ai-header-dot-glow 2.5s ease-in-out infinite",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span style={{ color: "#020203", fontSize: 9, fontWeight: 900, letterSpacing: "0.2em", lineHeight: 1 }}>AI</span>
                </div>
              </div>
              <button
                style={{
                  position: "fixed",
                  top: 3,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 59,
                  background: "#00C896",
                  borderRadius: 6,
                  padding: "4px 6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  animation: "ai-header-dot-glow 2.5s ease-in-out infinite",
                  border: "none",
                  cursor: "pointer",
                }}
                onClick={() => setDrawerOpen((prev) => !prev)}
                aria-label="Open navigation"
              >
                <Menu className="h-3 w-3" style={{ color: "#020203" }} />
              </button>
            </>
          )}

          {/* Top-drop drawer — clips and falls from below the AI line (6px) on non-dashboard, or top-0 on dashboard */}
          <div className="fixed left-0 right-0 z-50 overflow-hidden pointer-events-none" style={{ top: 0 }}>
            <div
              className={`bg-sidebar border-b border-sidebar-border shadow-2xl transition-transform duration-300 ease-out pointer-events-auto ${
                drawerOpen ? "translate-y-0" : "-translate-y-full"
              }`}
            >
              {/* Nav grid */}
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 p-3 pl-[30px] pr-[30px] pb-[0px] pt-[0px]">
                {visibleNavItems.map((item) => {
                  const isActive = location.pathname === item.to;
                  const isLocked = !isAdmin && tierLevel < (item.requiredTier ?? 0);
                  const hasBadge = (item.to === "/community" && communityHasNew) || (item.to === "/journal" && journalDraftCount > 0);
                  return (
                    <button
                      key={item.to}
                      onClick={() => {
                        if (isLocked) { handleLockedClick(); }
                        else { navigate(item.to); closeDrawer(); }
                      }}
                      className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all relative ${
                        isActive
                          ? "bg-primary/15 text-primary"
                          : isLocked
                          ? "text-muted-foreground/40"
                          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                      }`}
                    >
                      <item.icon className="h-5 w-5 shrink-0" />
                      <span className="text-[10px] font-semibold leading-none text-center">{item.label}</span>
                      {isLocked && <span className="absolute top-1.5 right-1.5 text-[8px]">🔒</span>}
                      {hasBadge && !isLocked && (
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Utility strip */}
              <div className="flex items-center gap-1 px-3 py-2 border-t border-sidebar-border flex-wrap">
                <Link
                  to="/pricing"
                  onClick={closeDrawer}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Subscription</span>
                </Link>
                <Link
                  to="/settings"
                  onClick={closeDrawer}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Settings</span>
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    onClick={closeDrawer}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                )}
                <Link
                  to="/welcome"
                  onClick={closeDrawer}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Help</span>
                </Link>
                <button
                  onClick={() => { handleOpenShare(); closeDrawer(); }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Invite</span>
                </button>
                <ModeSwitcher appMode={appMode} setAppMode={setAppMode} />

                {/* User pill — right side */}
                <div className="relative ml-auto">
                  <button
                    ref={userPillRef}
                    onClick={() => {
                      if (!showUserMenu) {
                        recalcUserMenuPos();
                      }
                      setShowUserMenu(!showUserMenu);
                    }}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                  >
                    <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 overflow-hidden border border-border">
                      {user?.avatarUrl ? (
                        user.avatarUrl.startsWith("data:") || user.avatarUrl.startsWith("http") ? (
                          <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-sm leading-none">{user.avatarUrl}</span>
                        )
                      ) : (
                        <span className="text-[10px] font-bold text-primary">{user?.name?.charAt(0)?.toUpperCase() || "?"}</span>
                      )}
                    </div>
                    <span className="hidden sm:inline truncate max-w-[100px]">{user?.name}</span>
                    {user?.isFounder && <Crown className="h-3 w-3 text-red-500 shrink-0" />}
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  </button>

                  {showUserMenu && userMenuPos && createPortal(
                    <>
                      <div className="fixed inset-0 z-[200]" onClick={() => { setShowUserMenu(false); setShowAvatarPicker(false); }} />
                      <div
                        className="fixed w-52 bg-card border border-border rounded-lg shadow-xl z-[201] py-1"
                        style={{ top: userMenuPos.top, right: userMenuPos.right }}
                      >
                        <div className="px-3 py-2 border-b border-border">
                          <p className="text-xs font-medium text-foreground">{user?.name}</p>
                          <p className="text-[10px] text-muted-foreground">{user?.email}</p>
                          {user?.isFounder && (
                            <span className="inline-flex items-center gap-1 bg-red-500/10 border border-red-500/30 rounded-full px-2 py-0.5 mt-1">
                              <Crown className="h-2.5 w-2.5 text-red-500" />
                              <span className="text-[9px] font-bold text-red-500">FOUNDER #{user.founderNumber}</span>
                            </span>
                          )}
                          <p className="text-[10px] text-primary mt-1 font-medium">
                            {subscription?.tierName || "Free"} Plan
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            setShowUserMenu(false);
                            const result = await setAppMode(appMode === "lite" ? "full" : "lite");
                            if (!result.success) {
                              toast({
                                title: "Could not switch mode",
                                description: result.error || "Please try again.",
                                variant: "destructive",
                              });
                            }
                          }}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary w-full text-left"
                        >
                          {appMode === "lite" ? <Zap className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                          {appMode === "lite" ? "Full Mode" : "Learning Mode"}
                        </button>
                        <button
                          onClick={() => { setShowAvatarPicker((v) => !v); }}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary w-full text-left"
                        >
                          <User className="h-4 w-4" />
                          Change Avatar
                        </button>
                        {showAvatarPicker && (
                          <div className="px-3 pb-2 border-t border-border">
                            <p className="text-[10px] text-muted-foreground pt-2 mb-2">Pick a trading avatar:</p>
                            <div className="grid grid-cols-4 gap-1 mb-2">
                              {STOCK_AVATARS.map((av) => (
                                <button
                                  key={av.id}
                                  onClick={async () => {
                                    await setAvatarUrl(av.emoji);
                                    setShowAvatarPicker(false);
                                    setShowUserMenu(false);
                                  }}
                                  className={`flex flex-col items-center gap-0.5 p-1.5 rounded-lg border transition-all hover:bg-secondary text-center ${user?.avatarUrl === av.emoji ? "border-primary bg-primary/10" : "border-border"}`}
                                >
                                  <span className="text-xl">{av.emoji}</span>
                                  <span className="text-[9px] text-muted-foreground">{av.label}</span>
                                </button>
                              ))}
                            </div>
                            <label className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer p-1.5 rounded-lg hover:bg-secondary transition-colors">
                              <User className="h-3.5 w-3.5 shrink-0" />
                              Upload Photo
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  try {
                                    const dataUrl = await resizeImageToBase64(file);
                                    await setAvatarUrl(dataUrl);
                                    setShowAvatarPicker(false);
                                    setShowUserMenu(false);
                                  } catch {}
                                }}
                              />
                            </label>
                          </div>
                        )}
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 w-full text-left border-t border-border"
                        >
                          <LogOut className="h-4 w-4" />
                          Sign Out
                        </button>
                      </div>
                    </>,
                    document.body
                  )}
                </div>
              </div>
            </div>
          </div>

          <style>{`
            @keyframes ai-header-line-pulse {
              0%, 100% { opacity: 0.5; }
              50% { opacity: 1; }
            }
            @keyframes ai-header-dot-glow {
              0%, 100% { box-shadow: 0 0 5px 2px #00C896, 0 0 12px 3px #00C89650; }
              50% { box-shadow: 0 0 10px 4px #00C896, 0 0 24px 6px #00C89670; }
            }
          `}</style>

          <div className="flex flex-col flex-1 min-w-0">
            {/* Header bar: Dashboard only, with scroll-hide */}
            {isDashboard && (
              <div
                className="relative flex items-center gap-2 px-3 py-1.5 shrink-0 h-12 bg-[#1a1c26]"
                style={{
                  borderBottom: "none",
                  transition: "transform 475ms cubic-bezier(0.4, 0, 0.2, 1), margin-bottom 475ms cubic-bezier(0.4, 0, 0.2, 1)",
                  transform: headerVisible ? "translateY(0)" : "translateY(-100%)",
                  marginBottom: headerVisible ? 0 : "-3rem",
                }}
              >
                <button
                  onClick={() => setDrawerOpen((prev) => !prev)}
                  className="relative z-50 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
                  aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
                  aria-expanded={drawerOpen}
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div className="flex-1 flex items-center justify-center relative overflow-hidden min-w-0">
                  {/* Mantra text (visible for first 20 s) */}
                  <div
                    className="absolute inset-0 flex items-center justify-center transition-opacity duration-700"
                    style={{ opacity: mantraVisible ? 1 : 0, pointerEvents: mantraVisible ? "auto" : "none" }}
                  >
                    {mantraEditing ? (
                      <input
                        ref={mantraInputRef}
                        defaultValue={mantraText}
                        onBlur={(e) => commitMantra(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); commitMantra(e.currentTarget.value); }
                          if (e.key === "Escape") setMantraEditing(false);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full max-w-xs bg-transparent border-none outline-none text-center text-lg font-bold text-white caret-white tracking-tight"
                        style={{ textShadow: MANTRA_GLOW }}
                        spellCheck={false}
                        autoComplete="off"
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setMantraEditing(true);
                          if (mantraTimerRef.current) clearTimeout(mantraTimerRef.current);
                          setMantraVisible(true);
                          setTimeout(() => mantraInputRef.current?.focus(), 0);
                        }}
                        className="text-center text-lg font-bold text-white tracking-tight leading-snug px-2 truncate max-w-xs cursor-pointer hover:opacity-80 transition-opacity"
                        style={{ textShadow: MANTRA_GLOW, background: "none", border: "none" }}
                        aria-label="Edit daily mantra"
                      >
                        {mantraText}
                      </button>
                    )}
                  </div>

                  {/* Static title (appears after mantra fades) */}
                  <div
                    className="absolute inset-0 flex items-center justify-center transition-opacity duration-700 pointer-events-none select-none"
                    style={{ opacity: mantraVisible ? 0 : 1 }}
                  >
                    <div style={{
                      background: "rgba(36, 36, 56, 0.55)",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 999,
                      padding: "4px 18px",
                      boxShadow: "0 2px 16px rgba(0,0,0,0.3), 0 0 0 0.5px rgba(255,255,255,0.05)"
                    }}>
                      <span className="text-xl font-extrabold tracking-[0.18em] uppercase text-white" style={{ textShadow: "0 0 8px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.5)" }}>
                        The Trading Mentor
                      </span>
                    </div>
                  </div>
                </div>
                <div className="ml-auto flex items-center gap-2 pr-1">
                  <HeaderGamificationBadges />
                  <AIAssistant />
                </div>

                {/* AI glow line — bottom edge of header */}
                <div
                  className="absolute bottom-0 left-0 right-0 cursor-pointer"
                  style={{ height: 3, zIndex: 20 }}
                  onClick={() => window.dispatchEvent(new Event("ict-open-ai"))}
                  title="Open AI Assistant"
                  role="button"
                  aria-label="Open AI Assistant"
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background: "linear-gradient(90deg, transparent 0%, #00C896 25%, #00C896 75%, transparent 100%)",
                      animation: "ai-header-line-pulse 2.5s ease-in-out infinite",
                      boxShadow: "0 0 5px 1px #00C89660",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: "translateX(-50%) translateY(-50%)",
                      background: "#00C896",
                      borderRadius: 999,
                      padding: "3px 10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 30,
                      animation: "ai-header-dot-glow 2.5s ease-in-out infinite",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span style={{ color: "#020203", fontSize: 9, fontWeight: 900, letterSpacing: "0.2em", lineHeight: 1 }}>AI</span>
                  </div>
                </div>
              </div>
            )}

            <main className="flex-1 overflow-hidden relative">
              <div className="flex h-full">
                <div ref={mainScrollRef} className="flex-1 overflow-auto">
                  <div className={location.pathname === "/" ? "pb-10" : ""}>
                    <ErrorBoundary>
                      <Outlet />
                    </ErrorBoundary>
                  </div>
                </div>

                {isFreeUser && (
                  <div className="hidden xl:block w-72 border-l border-border bg-sidebar overflow-auto shrink-0">
                    <FreeSidebar />
                  </div>
                )}
              </div>
            </main>


          </div>

          {location.pathname === "/" && (
            <div className="fixed bottom-0 left-0 right-0 z-30">
              <KillZoneStrip />
            </div>
          )}

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
                <Crown className="h-5 w-5 text-red-500 shrink-0" />
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
              onNeverShow={neverShowTour}
              state={tourState}
              dispatch={tourDispatch}
            />
          )}
        </div>
        <SpotifyPlayer />
        <FloatingToolkit />
      </TooltipProvider>
    </DrawerContext.Provider>
  );
}
