import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import OnboardingQuiz, { getSkillLevel, hasCompletedQuiz, type SkillLevel } from "@/components/OnboardingQuiz";
import { NavLink, Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { Calendar, GraduationCap, Shield, BookOpen, BarChart3, HelpCircle, Lock, Crown, Settings, LogOut, CreditCard, User, ChevronDown, LayoutDashboard, Users, Share2, X, Trophy, Copy, Check, Video, Zap, Layers, Flame, Star, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { FreeSidebar, useDailyStreak } from "@/components/CasinoElements";
import AIAssistant from "@/components/AIAssistant";
import { TourGuide } from "@/components/TourGuide";
import { useTourGuideContext } from "@/contexts/TourGuideContext";
import KillZoneStrip from "@/components/KillZoneStrip";
import SpotifyPlayer from "@/components/SpotifyPlayer";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ErrorBoundary from "@/components/ErrorBoundary";

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

  return (
    <div className="flex items-center gap-1.5 ml-auto">
      <div className="flex items-center gap-1.5 bg-card border border-border rounded-full px-2.5 py-1" title={`Level ${level} — ${rank} · ${xpInLevel}/100 XP`}>
        <Star className="h-3 w-3 text-primary" />
        <span className="text-xs font-bold text-foreground">Lv {level}</span>
        <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all duration-1000" style={{ width: `${xpInLevel}%` }} />
        </div>
      </div>
      <div className="flex items-center gap-1.5 bg-card border border-border rounded-full px-2.5 py-1" title={`${streak}-day login streak`}>
        <Flame className={`h-3 w-3 ${streak >= 3 ? "text-red-500" : "text-muted-foreground"}`} />
        <span className="text-xs font-bold text-foreground">{streak}d</span>
      </div>
      <div className="flex items-center gap-1.5 bg-card border border-border rounded-full px-2.5 py-1" title={`${earned}/8 badges earned`}>
        <Trophy className="h-3 w-3 text-red-500" />
        <span className="text-xs font-bold text-foreground">{earned}/8</span>
      </div>
    </div>
  );
}

const API_BASE = import.meta.env.VITE_API_URL || "/api";

const COMMUNITY_LAST_VISIT_KEY = "community_last_visit";
const COMMUNITY_POLL_INTERVAL = 3 * 60 * 1000;

const navItems = [
  { to: "/", label: "Dashboard", mobileLabel: "Home", icon: LayoutDashboard, requiredTier: 0, minSkillLevel: 0 },
  { to: "/academy", label: "ICT Academy", mobileLabel: "Academy", icon: GraduationCap, requiredTier: 0, minSkillLevel: 0 },
  { to: "/videos", label: "Videos", mobileLabel: "Videos", icon: Video, requiredTier: 0, minSkillLevel: 0 },
  { to: "/planner", label: "Mission Control", mobileLabel: "Mission", icon: Calendar, requiredTier: 0, minSkillLevel: 0 },
  { to: "/prop-tracker", label: "Prop Tracker", mobileLabel: "Prop", icon: Trophy, requiredTier: 1, minSkillLevel: 1 },
  { to: "/journal", label: "Smart Journal", mobileLabel: "Journal", icon: BookOpen, requiredTier: 1, minSkillLevel: 1 },
  { to: "/analytics", label: "Analytics", mobileLabel: "Stats", icon: BarChart3, requiredTier: 2, minSkillLevel: 1 },
  { to: "/leaderboard", label: "Leaderboard", mobileLabel: "Rank", icon: Trophy, requiredTier: 2, minSkillLevel: 2 },
  { to: "/community", label: "Community", mobileLabel: "Community", icon: Users, requiredTier: 0, minSkillLevel: 0 },
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

function MobileNavItem({
  to,
  mobileLabel,
  icon: Icon,
  requiredTier,
  userTier,
  onLockedClick,
  badge,
}: {
  to: string;
  mobileLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredTier: number;
  userTier: number;
  onLockedClick: () => void;
  badge?: boolean | number;
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

  const badgeNum = typeof badge === "number" ? badge : badge ? 1 : 0;
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
      <div className="relative">
        <Icon className="h-5 w-5" />
        {badgeNum > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-0.5 flex items-center justify-center rounded-full bg-red-500 border border-background text-[9px] font-bold text-white">
            {badgeNum > 99 ? "99+" : badgeNum}
          </span>
        )}
      </div>
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


function ModeSwitcher({ appMode, setAppMode }: { appMode: "full" | "lite"; setAppMode: (m: "full" | "lite") => Promise<void> }) {
  const isLite = appMode === "lite";
  return (
    <button
      onClick={() => setAppMode(isLite ? "full" : "lite")}
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        isLite
          ? "text-red-500 hover:bg-red-500/10"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary"
      }`}
    >
      {isLite ? <Zap className="h-3.5 w-3.5" /> : <Layers className="h-3.5 w-3.5" />}
      <span className="hidden sm:inline">{isLite ? "Learning" : "Full Mode"}</span>
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

export default function Layout() {
  const { user, subscription, tierLevel, isAdmin, logout, appMode, setAppMode, setAvatarUrl } = useAuth();
  const [quizDone, setQuizDone] = useState(() => hasCompletedQuiz());
  const [showLockToast, setShowLockToast] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
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
    let items = skillLevelNum === SKILL_LEVEL_NUM["none"] ? navItems : navItems.filter((item) => item.minSkillLevel <= skillLevelNum);
    if (appMode === "lite") {
      items = items.filter((item) => LITE_MODE_ALLOWED.includes(item.to));
    }
    return items;
  }, [skillLevelNum, appMode]);

  const isFreeUser = tierLevel === 0;

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

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
    <TooltipProvider delayDuration={300}>
      {!quizDone && (
        <OnboardingQuiz onComplete={() => setQuizDone(true)} />
      )}
      <div className="flex h-screen overflow-hidden">
        {/* Dimming backdrop */}
        <div
          className={`fixed inset-0 z-40 transition-opacity duration-300 bg-black/60 backdrop-blur-[2px] ${drawerOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          onClick={closeDrawer}
        />

        {/* Top-drop drawer — clips and falls from below the header */}
        <div className="fixed top-12 left-0 right-0 z-50 overflow-hidden pointer-events-none">
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
                  onClick={() => setShowUserMenu(!showUserMenu)}
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

                {showUserMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => { setShowUserMenu(false); setShowAvatarPicker(false); }} />
                    <div className="absolute bottom-full right-0 mb-1 w-52 bg-card border border-border rounded-lg shadow-xl z-50 py-1">
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
                        onClick={() => { setAppMode(appMode === "lite" ? "full" : "lite"); setShowUserMenu(false); }}
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
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <div className="relative flex items-center gap-2 px-3 py-1.5 border-b border-border shrink-0 h-12 border-t-[#020203] border-r-[#020203] border-b-[#020203] border-l-[#020203] bg-[#242438]">
            <button
              onClick={() => setDrawerOpen((prev) => !prev)}
              className="relative z-50 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors shrink-0"
              aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={drawerOpen}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex-1 flex items-center justify-center pointer-events-none select-none">
              <span
                className="text-lg font-extrabold tracking-[0.18em] uppercase text-white"
                style={{
                  textShadow: "0 0 8px rgba(255,255,255,0.9), 0 0 20px rgba(255,255,255,0.6), 0 0 40px rgba(255,255,255,0.3)",
                  fontFamily: "inherit",
                }}
              >
                The Trading Mentor
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <AIAssistant />
              <HeaderGamificationBadges />
            </div>
          </div>

          {location.pathname !== "/academy" && location.pathname !== "/videos" && (
            <KillZoneStrip />
          )}

          <main className="flex-1 overflow-auto relative">
            <div className="flex h-full">
              <div className="flex-1 overflow-auto">
                <ErrorBoundary>
                  <Outlet />
                </ErrorBoundary>
              </div>

              {isFreeUser && (
                <div className="hidden xl:block w-72 border-l border-border bg-sidebar overflow-auto shrink-0">
                  <FreeSidebar />
                </div>
              )}
            </div>
          </main>

          <nav className="md:hidden flex items-center border-t border-border bg-sidebar shrink-0" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            {visibleNavItems.map((item) => (
              <MobileNavItem
                key={item.to}
                {...item}
                userTier={tierLevel}
                onLockedClick={handleLockedClick}
                badge={item.to === "/community" ? communityHasNew : item.to === "/journal" ? journalDraftCount : undefined}
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
    </TooltipProvider>
  );
}
