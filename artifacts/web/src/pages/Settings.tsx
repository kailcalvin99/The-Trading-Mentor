import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useTourGuideContext } from "@/contexts/TourGuideContext";
import { toast } from "@/hooks/use-toast";
import { clearQuizData, getSkillLevel } from "@/components/OnboardingQuiz";
import {
  Settings as SettingsIcon,
  User,
  TrendingUp,
  Shield,
  Save,
  Eye,
  EyeOff,
  Loader2,
  Copy,
  Check,
  Lock,
  Zap,
  Trash2,
  AlertTriangle,
  Map,
  Brain,
  RotateCcw,
  Layers,
  LayoutDashboard,
  Tag,
  Plus,
  X,
  Camera,
  Globe,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

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

function AvatarPickerModal({
  currentAvatar,
  onClose,
  onSelect,
}: {
  currentAvatar?: string | null;
  onClose: () => void;
  onSelect: (val: string) => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const b64 = await resizeImageToBase64(file);
      await onSelect(b64);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-80" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">Choose Avatar</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2 mb-4">
          {STOCK_AVATARS.map((a) => (
            <button
              key={a.id}
              onClick={() => onSelect(a.emoji)}
              className={`w-full aspect-square rounded-xl text-2xl flex items-center justify-center border transition-all ${
                currentAvatar === a.emoji
                  ? "border-primary bg-primary/10 ring-2 ring-primary"
                  : "border-border hover:border-primary/50 bg-secondary"
              }`}
              title={a.label}
            >
              {a.emoji}
            </button>
          ))}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        <div className="flex gap-2">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-lg border border-border hover:bg-secondary transition-colors"
          >
            <Camera className="h-3.5 w-3.5" />
            {uploading ? "Uploading…" : "Upload Photo"}
          </button>
          {currentAvatar && (
            <button
              onClick={() => onSelect("")}
              className="px-3 py-2 text-xs rounded-lg border border-border hover:bg-secondary transition-colors text-muted-foreground"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

const SESSION_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "london", label: "London Session" },
  { value: "new-york", label: "New York Session" },
  { value: "london-ny-overlap", label: "London/NY Overlap" },
  { value: "asian", label: "Asian Session" },
  { value: "all", label: "All Sessions" },
];

const ENTRY_STYLE_OPTIONS = [
  { value: "", label: "Select..." },
  { value: "conservative", label: "Conservative" },
  { value: "silver-bullet", label: "Silver Bullet" },
];

interface ProfileData {
  name: string;
  email: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  bio: string;
  twitterHandle: string;
  discordHandle: string;
  isPublic: boolean;
}

interface SocialProfileData {
  bio: string;
  twitterHandle: string;
  discordHandle: string;
  isPublic: boolean;
  avatarUrl: string | null;
}

interface TradingDefaultsData {
  [key: string]: unknown;
  defaultSession: string;
  preferredEntryStyle: string;
  defaultPairs: string;
}

interface RiskRulesData {
  [key: string]: unknown;
  startingBalance: string;
  maxDailyLossPct: string;
  maxTotalDrawdownPct: string;
}

export default function Settings() {
  const { user, refreshUser, tierLevel, appMode, setAppMode, setAvatarUrl } = useAuth();
  const { resetTour } = useTourGuideContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingSocialProfile, setSavingSocialProfile] = useState(false);
  const [savingTrading, setSavingTrading] = useState(false);
  const [savingRisk, setSavingRisk] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [clearingTrades, setClearingTrades] = useState(false);
  const [currentSkillLevel] = useState(() => getSkillLevel());
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  const [socialProfile, setSocialProfile] = useState<SocialProfileData>({
    bio: "",
    twitterHandle: "",
    discordHandle: "",
    isPublic: false,
    avatarUrl: null,
  });

  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    bio: "",
    twitterHandle: "",
    discordHandle: "",
    isPublic: false,
  });

  const [tradingDefaults, setTradingDefaults] = useState<TradingDefaultsData>({
    defaultSession: "",
    preferredEntryStyle: "",
    defaultPairs: "",
  });

  const [riskRules, setRiskRules] = useState<RiskRulesData>({
    startingBalance: "50000",
    maxDailyLossPct: "2",
    maxTotalDrawdownPct: "10",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (user?.avatarUrl !== undefined) {
      setSocialProfile((prev) => ({ ...prev, avatarUrl: user.avatarUrl ?? null }));
    }
  }, [user?.avatarUrl]);

  async function loadSettings() {
    try {
      const res = await fetch(`${API_BASE}/user/settings`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setProfile({
          name: data.profile.name || "",
          email: data.profile.email || "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
          bio: data.profile.bio || "",
          twitterHandle: data.profile.twitterHandle || "",
          discordHandle: data.profile.discordHandle || "",
          isPublic: data.profile.isPublic ?? false,
        });
        setSocialProfile({
          bio: data.profile.bio || "",
          twitterHandle: data.profile.twitterHandle || "",
          discordHandle: data.profile.discordHandle || "",
          isPublic: data.profile.isPublic ?? false,
          avatarUrl: user?.avatarUrl ?? null,
        });
        setTradingDefaults({
          defaultSession: data.tradingDefaults.defaultSession || "",
          preferredEntryStyle: data.tradingDefaults.preferredEntryStyle || "",
          defaultPairs: data.tradingDefaults.defaultPairs || "",
        });
        setRiskRules({
          startingBalance: data.riskRules.startingBalance?.toString() || "50000",
          maxDailyLossPct: data.riskRules.maxDailyLossPct?.toString() || "2",
          maxTotalDrawdownPct: data.riskRules.maxTotalDrawdownPct?.toString() || "10",
        });
      }
    } catch {
      toast({ title: "Error", description: "Failed to load settings", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  async function saveSection(section: string, data: Record<string, unknown>, setSaving: (v: boolean) => void) {
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/user/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ section, data }),
      });
      const result = await res.json();
      if (res.ok) {
        toast({ title: "Saved", description: result.message || "Settings updated successfully" });
        if (section === "profile") {
          setProfile((p) => ({ ...p, currentPassword: "", newPassword: "", confirmPassword: "" }));
          await refreshUser();
        }
      } else {
        toast({ title: "Error", description: result.error || "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  function handleSaveProfile() {
    if (profile.newPassword && profile.newPassword !== profile.confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match", variant: "destructive" });
      return;
    }
    if (profile.newPassword && !profile.currentPassword) {
      toast({ title: "Error", description: "Enter your current password to change it", variant: "destructive" });
      return;
    }
    const data: Record<string, unknown> = {};
    if (profile.name) data.name = profile.name;
    if (profile.email) data.email = profile.email;
    if (profile.currentPassword && profile.newPassword) {
      data.currentPassword = profile.currentPassword;
      data.newPassword = profile.newPassword;
    }
    data.bio = profile.bio;
    data.twitterHandle = profile.twitterHandle;
    data.discordHandle = profile.discordHandle;
    data.isPublic = profile.isPublic;
    saveSection("profile", data, setSavingProfile);
  }

  async function handleSaveSocialProfile() {
    await saveSection(
      "socialProfile",
      {
        bio: socialProfile.bio,
        twitterHandle: socialProfile.twitterHandle,
        discordHandle: socialProfile.discordHandle,
        isPublic: socialProfile.isPublic,
        avatarUrl: socialProfile.avatarUrl,
      },
      setSavingSocialProfile
    );
    await refreshUser();
  }

  async function handleAvatarSelect(val: string) {
    const newUrl = val || null;
    setSocialProfile((prev) => ({ ...prev, avatarUrl: newUrl }));
    await setAvatarUrl(newUrl);
    setShowAvatarPicker(false);
  }

  function handleSaveTrading() {
    saveSection("tradingDefaults", tradingDefaults, setSavingTrading);
  }

  function handleSaveRisk() {
    saveSection("riskRules", riskRules, setSavingRisk);
  }

  async function handleClearAllTrades() {
    setClearingTrades(true);
    try {
      const res = await fetch(`${API_BASE}/trades/all`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        toast({ title: "Journal cleared", description: "All trades have been deleted." });
        setClearConfirm(false);
      } else {
        toast({ title: "Error", description: "Failed to clear trades", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to clear trades", variant: "destructive" });
    } finally {
      setClearingTrades(false);
    }
  }

  function handleRetakeQuiz() {
    clearQuizData();
    navigate("/");
    window.location.reload();
  }

  const isPremium = tierLevel >= 2;

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-20">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your profile, trading defaults, and risk rules</p>
        </div>
      </div>

      <div className="space-y-6">
        {showAvatarPicker && (
          <AvatarPickerModal
            currentAvatar={socialProfile.avatarUrl}
            onClose={() => setShowAvatarPicker(false)}
            onSelect={handleAvatarSelect}
          />
        )}

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Public Profile</h2>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAvatarPicker(true)}
                className="relative w-14 h-14 rounded-full bg-primary/10 border-2 border-border flex items-center justify-center overflow-hidden hover:border-primary/50 transition-colors shrink-0"
                title="Change avatar"
              >
                {socialProfile.avatarUrl ? (
                  socialProfile.avatarUrl.startsWith("data:") || socialProfile.avatarUrl.startsWith("http") ? (
                    <img src={socialProfile.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl leading-none">{socialProfile.avatarUrl}</span>
                  )
                ) : (
                  <span className="text-2xl leading-none">{user?.name?.charAt(0)?.toUpperCase() || "?"}</span>
                )}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity rounded-full">
                  <Camera className="h-4 w-4 text-white" />
                </div>
              </button>
              <div>
                <p className="text-sm font-medium text-foreground">Avatar</p>
                <p className="text-xs text-muted-foreground">Click to change your avatar</p>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Bio</label>
              <textarea
                value={socialProfile.bio}
                onChange={(e) => setSocialProfile({ ...socialProfile, bio: e.target.value.slice(0, 160) })}
                placeholder="A short bio shown on the leaderboard..."
                maxLength={160}
                rows={3}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right">{socialProfile.bio.length}/160</p>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Twitter / X Handle</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">@</span>
                <input
                  type="text"
                  value={socialProfile.twitterHandle}
                  onChange={(e) => setSocialProfile({ ...socialProfile, twitterHandle: e.target.value.replace(/^@/, "").slice(0, 64) })}
                  placeholder="yourhandle"
                  className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Discord Handle</label>
              <input
                type="text"
                value={socialProfile.discordHandle}
                onChange={(e) => setSocialProfile({ ...socialProfile, discordHandle: e.target.value.slice(0, 64) })}
                placeholder="username or username#1234"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3 bg-background">
              <div>
                <p className="text-sm font-medium text-foreground">Make Profile Public</p>
                <p className="text-xs text-muted-foreground mt-0.5">Appear on the Leaderboard; hidden posts show as Anonymous</p>
              </div>
              <button
                onClick={() => setSocialProfile({ ...socialProfile, isPublic: !socialProfile.isPublic })}
                className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                  socialProfile.isPublic ? "bg-primary" : "bg-muted"
                }`}
                role="switch"
                aria-checked={socialProfile.isPublic}
              >
                <span
                  className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                    socialProfile.isPublic ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={handleSaveSocialProfile}
                disabled={savingSocialProfile}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {savingSocialProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Public Profile
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Profile</h2>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Bio</label>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                placeholder="Tell the community about your trading journey..."
                rows={3}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">{profile.bio.length}/500 characters</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Twitter / X Handle</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
                  <input
                    type="text"
                    value={profile.twitterHandle}
                    onChange={(e) => setProfile({ ...profile, twitterHandle: e.target.value.replace(/^@/, "") })}
                    placeholder="yourhandle"
                    className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Discord Handle</label>
                <input
                  type="text"
                  value={profile.discordHandle}
                  onChange={(e) => setProfile({ ...profile, discordHandle: e.target.value })}
                  placeholder="username#0000"
                  className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border">
              <div>
                <p className="text-sm font-medium text-foreground">Public Profile</p>
                <p className="text-xs text-muted-foreground">Allow others to see your trading stats on the leaderboard</p>
              </div>
              <button
                type="button"
                onClick={() => setProfile({ ...profile, isPublic: !profile.isPublic })}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${profile.isPublic ? "bg-primary" : "bg-secondary border border-border"}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${profile.isPublic ? "translate-x-6" : "translate-x-1"}`}
                />
              </button>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground mb-3">Leave password fields blank to keep your current password</p>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      value={profile.currentPassword}
                      onChange={(e) => setProfile({ ...profile, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={profile.newPassword}
                      onChange={(e) => setProfile({ ...profile, newPassword: e.target.value })}
                      placeholder="Enter new password (min 6 characters)"
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm pr-10 focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm New Password</label>
                  <input
                    type="password"
                    value={profile.confirmPassword}
                    onChange={(e) => setProfile({ ...profile, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            </div>
            <div className="pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={savingProfile}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {savingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Profile
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Trading Defaults</h2>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Default Session</label>
              <p className="text-xs text-muted-foreground mb-1.5">Your preferred trading session</p>
              <select
                value={tradingDefaults.defaultSession}
                onChange={(e) => setTradingDefaults({ ...tradingDefaults, defaultSession: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {SESSION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Preferred Entry Style</label>
              <p className="text-xs text-muted-foreground mb-1.5">Your default trade entry approach</p>
              <select
                value={tradingDefaults.preferredEntryStyle}
                onChange={(e) => setTradingDefaults({ ...tradingDefaults, preferredEntryStyle: e.target.value })}
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {ENTRY_STYLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Default Pairs to Watch</label>
              <p className="text-xs text-muted-foreground mb-1.5">Comma-separated list of instruments you trade regularly</p>
              <input
                type="text"
                value={tradingDefaults.defaultPairs}
                onChange={(e) => setTradingDefaults({ ...tradingDefaults, defaultPairs: e.target.value })}
                placeholder="e.g. NQ1!, MNQ1!, ES1!, EUR/USD"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="pt-2">
              <button
                onClick={handleSaveTrading}
                disabled={savingTrading}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {savingTrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Trading Defaults
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Risk Rules</h2>
          </div>
          <div className="px-5 py-5 space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Starting Balance ($)</label>
              <p className="text-xs text-muted-foreground mb-1.5">Your prop account starting balance</p>
              <input
                type="number"
                value={riskRules.startingBalance}
                onChange={(e) => setRiskRules({ ...riskRules, startingBalance: e.target.value })}
                placeholder="50000"
                min="0"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Max Daily Loss (%)</label>
              <p className="text-xs text-muted-foreground mb-1.5">Maximum percentage you can lose in a single day</p>
              <input
                type="number"
                value={riskRules.maxDailyLossPct}
                onChange={(e) => setRiskRules({ ...riskRules, maxDailyLossPct: e.target.value })}
                placeholder="2"
                min="0"
                max="100"
                step="0.5"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Max Total Drawdown (%)</label>
              <p className="text-xs text-muted-foreground mb-1.5">Maximum total drawdown before account is breached</p>
              <input
                type="number"
                value={riskRules.maxTotalDrawdownPct}
                onChange={(e) => setRiskRules({ ...riskRules, maxTotalDrawdownPct: e.target.value })}
                placeholder="10"
                min="0"
                max="100"
                step="0.5"
                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="pt-2">
              <button
                onClick={handleSaveRisk}
                disabled={savingRisk}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {savingRisk ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Risk Rules
              </button>
            </div>
          </div>
        </div>

        <TradingViewWebhookCard isPremium={isPremium} />

        <TagManagementCard />

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Skill Assessment</h2>
          </div>
          <div className="px-5 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  Current Level:{" "}
                  <span className="capitalize text-primary font-semibold">
                    {currentSkillLevel || "Not assessed"}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Retaking the quiz will reset your skill level and clear your Academy progress so you can start fresh.
                </p>
              </div>
              <button
                onClick={handleRetakeQuiz}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/30 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors shrink-0"
              >
                <RotateCcw className="h-4 w-4" />
                Retake Assessment
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <Map className="h-5 w-5 text-primary" />
            <h2 className="text-sm font-bold text-foreground">Platform Tour</h2>
          </div>
          <div className="px-5 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Take the Tour Again</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Restart the guided video tour from the beginning. It walks through 5 key platform features with video explanations.
                </p>
              </div>
              <button
                onClick={resetTour}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary border border-primary/30 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors shrink-0"
              >
                <Map className="h-4 w-4" />
                Start Tour
              </button>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            {appMode === "lite" ? <Zap className="h-5 w-5 text-amber-500" /> : <Layers className="h-5 w-5 text-primary" />}
            <h2 className="text-sm font-bold text-foreground">App Mode</h2>
            <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full border ${appMode === "lite" ? "text-amber-500 bg-amber-500/10 border-amber-500/30" : "text-primary bg-primary/10 border-primary/30"}`}>
              {appMode === "lite" ? "LEARNING" : "FULL"}
            </span>
          </div>
          <div className="px-5 py-5">
            <p className="text-sm text-muted-foreground mb-4">
              {appMode === "lite"
                ? "You are in Learning Mode — showing only the essentials. Switch to Full Mode to unlock Tilt Detection, Pre-Trade Checklist, advanced analytics, and all extra features."
                : "You are in Full Mode — all features are active. Switch to Learning Mode for a simpler experience with just the core tools."}
            </p>
            {appMode === "lite" && (
              <button
                onClick={() => {
                  setAppMode("full");
                  toast({ title: "Full Mode activated", description: "All features are now unlocked." });
                }}
                className="w-full mb-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 transition-colors"
              >
                <Layers className="h-4 w-4" />
                Switch to Full Mode
              </button>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setAppMode("lite")}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-medium transition-colors ${
                  appMode === "lite"
                    ? "bg-amber-500/10 border-amber-500/40 text-amber-500"
                    : "border-border text-muted-foreground hover:border-border hover:bg-secondary"
                }`}
              >
                <Zap className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-bold">Learning Mode</div>
                  <div className="text-xs opacity-70 mt-0.5">Dashboard, Academy, Risk, Journal</div>
                </div>
              </button>
              <button
                onClick={() => setAppMode("full")}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-medium transition-colors ${
                  appMode === "full"
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "border-border text-muted-foreground hover:border-border hover:bg-secondary"
                }`}
              >
                <Layers className="h-5 w-5" />
                <div className="text-center">
                  <div className="font-bold">Full Mode</div>
                  <div className="text-xs opacity-70 mt-0.5">All features unlocked</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <DashboardWidgetsCard />

        <div className="bg-card border border-red-500/30 rounded-xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-4 border-b border-red-500/30">
            <Trash2 className="h-5 w-5 text-red-500" />
            <h2 className="text-sm font-bold text-foreground">Danger Zone</h2>
          </div>
          <div className="px-5 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">Clear all journal trades</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently deletes every trade in the journal. Use this to wipe test data before going live.
                </p>
              </div>
              {!clearConfirm ? (
                <button
                  onClick={() => setClearConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/30 rounded-lg text-sm font-medium hover:bg-red-500/20 transition-colors shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                  Clear All Trades
                </button>
              ) : (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 text-xs text-red-400 font-medium">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Are you sure? This cannot be undone.
                  </div>
                  <button
                    onClick={() => setClearConfirm(false)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearAllTrades}
                    disabled={clearingTrades}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {clearingTrades ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                    Yes, delete all
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const DASHBOARD_WIDGET_DEFS = [
  { id: "mascot", label: "Mascot Greeting", desc: "ICT trading tip mascot at the top" },
  { id: "slotmachine", label: "Daily Mission", desc: "Today's session, action and goal" },
  { id: "sessions", label: "Market Sessions Clock", desc: "Live countdowns for each trading session" },
  { id: "tradeplan", label: "Today's Trade Plan", desc: "Daily trade plan note, resets each day" },
  { id: "notes", label: "Notes Scratch-pad", desc: "Persistent notes between sessions" },
  { id: "checklist", label: "Pre-Trade Checklist", desc: "4-point ICT criteria before entering a trade" },
  { id: "riskshield", label: "Risk Shield Mini-widget", desc: "Daily P&L, drawdown %, and position size shortcut" },
  { id: "swipemode", label: "Start Swipe Mode", desc: "Quick-launch for flashcard review mode" },
  { id: "achievements", label: "Achievement Badges", desc: "Your earned trading achievement badges" },
] as const;

type DashboardWidgetId = typeof DASHBOARD_WIDGET_DEFS[number]["id"];

const DASHBOARD_DEFAULT_VISIBLE: Record<DashboardWidgetId, boolean> = {
  mascot: true,
  slotmachine: true,
  sessions: true,
  tradeplan: true,
  notes: true,
  checklist: true,
  riskshield: true,
  swipemode: true,
  achievements: true,
};

function DashboardWidgetsCard() {
  const [prefs, setPrefs] = useState<Record<DashboardWidgetId, boolean>>(() => {
    try {
      const raw = localStorage.getItem("dashboard-widget-prefs-v2");
      if (raw) {
        return { ...DASHBOARD_DEFAULT_VISIBLE, ...JSON.parse(raw) };
      }
    } catch {}
    return { ...DASHBOARD_DEFAULT_VISIBLE };
  });

  function toggleWidget(id: DashboardWidgetId) {
    const next = { ...prefs, [id]: !prefs[id] };
    setPrefs(next);
    localStorage.setItem("dashboard-widget-prefs-v2", JSON.stringify(next));
  }

  function resetAll() {
    setPrefs({ ...DASHBOARD_DEFAULT_VISIBLE });
    localStorage.setItem("dashboard-widget-prefs-v2", JSON.stringify(DASHBOARD_DEFAULT_VISIBLE));
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <LayoutDashboard className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-sm font-bold text-foreground">Dashboard Widgets</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Choose which widgets appear on your dashboard</p>
        </div>
        <button
          onClick={resetAll}
          className="ml-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Reset all
        </button>
      </div>
      <div className="px-5 py-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DASHBOARD_WIDGET_DEFS.map(({ id, label, desc }) => (
            <label
              key={id}
              className="flex items-start gap-3 p-3 rounded-xl border border-border cursor-pointer hover:bg-secondary/50 transition-colors select-none"
            >
              <div
                onClick={() => toggleWidget(id)}
                className={`w-9 h-5 rounded-full relative transition-colors duration-200 shrink-0 mt-0.5 ${
                  prefs[id] ? "bg-primary" : "bg-muted"
                }`}
              >
                <div
                  className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200 ${
                    prefs[id] ? "translate-x-4" : "translate-x-0"
                  }`}
                />
              </div>
              <div onClick={() => toggleWidget(id)}>
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-3">Changes are saved automatically and applied immediately to your dashboard.</p>
      </div>
    </div>
  );
}

interface ApiTag {
  id: number;
  name: string;
  color: string;
  emoji?: string;
  category?: string;
}

function TagManagementCard() {
  const [tags, setTags] = useState<ApiTag[]>([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#8B8BA0");
  const [newCategory, setNewCategory] = useState("Custom");
  const [loadingTags, setLoadingTags] = useState(true);

  useEffect(() => {
    loadTags();
  }, []);

  async function loadTags() {
    try {
      const res = await fetch(`${API_BASE}/tags`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTags(data.tags || []);
      }
    } catch {}
    setLoadingTags(false);
  }

  async function addTag() {
    const name = newName.trim();
    if (!name) return;
    try {
      const res = await fetch(`${API_BASE}/tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, color: newColor, category: newCategory }),
      });
      if (res.ok) {
        const data = await res.json();
        setTags([...tags, data.tag]);
        setNewName("");
        toast({ title: "Tag created" });
      } else {
        const err = await res.json();
        toast({ title: err.error || "Failed to create tag", variant: "destructive" });
      }
    } catch {
      toast({ title: "Failed to create tag", variant: "destructive" });
    }
  }

  async function deleteTag(id: number) {
    try {
      await fetch(`${API_BASE}/tags/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      setTags(tags.filter((t) => t.id !== id));
      toast({ title: "Tag deleted" });
    } catch {}
  }

  const TAG_COLORS = ["#00C896", "#A78BFA", "#FFB340", "#38BDF8", "#FB7185", "#10B981", "#FF4444", "#8B8BA0"];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <Tag className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-sm font-bold text-foreground">Trade Tags</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Manage your custom tags for trade journaling</p>
        </div>
      </div>
      <div className="px-5 py-5 space-y-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTag()}
            placeholder="New tag name..."
            className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex gap-1 items-center">
            {TAG_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                className="w-5 h-5 rounded-full transition-all"
                style={{
                  backgroundColor: c,
                  outline: newColor === c ? "2px solid currentColor" : "none",
                  outlineOffset: "2px",
                }}
              />
            ))}
          </div>
          <button
            onClick={addTag}
            disabled={!newName.trim()}
            className="flex items-center gap-1 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>

        {loadingTags ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading tags...
          </div>
        ) : tags.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No custom tags yet. Add one above to get started.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-background text-sm group"
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: tag.color }}
                />
                <span className="text-foreground">{tag.name}</span>
                {tag.category && (
                  <span className="text-xs text-muted-foreground">({tag.category})</span>
                )}
                <button
                  onClick={() => deleteTag(tag.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TradingViewWebhookCard({ isPremium }: { isPremium: boolean }) {
  const [webhookUrl, setWebhookUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isPremium) {
      loadWebhookInfo();
    }
  }, [isPremium]);

  async function loadWebhookInfo() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/webhook/tradingview/info`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setWebhookUrl(data.webhookUrl);
      }
    } catch {}
    setLoading(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!isPremium) {
    return (
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <Zap className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-sm font-bold text-foreground">TradingView Webhook</h2>
          <span className="ml-auto text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">PREMIUM</span>
        </div>
        <div className="px-5 py-8 text-center">
          <Lock className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Upgrade to Premium</p>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Connect TradingView alerts to automatically create draft trades. Upgrade your plan to unlock this feature.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <Zap className="h-5 w-5 text-primary" />
        <h2 className="text-sm font-bold text-foreground">TradingView Webhook</h2>
      </div>
      <div className="px-5 py-5 space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Your Webhook URL</label>
          <p className="text-xs text-muted-foreground mb-2">
            Paste this URL into your TradingView alert to automatically create draft trades.
          </p>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={webhookUrl}
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm font-mono text-muted-foreground select-all focus:outline-none focus:ring-1 focus:ring-primary"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors shrink-0"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </div>

        <div className="border-t border-border pt-4">
          <p className="text-sm font-medium text-foreground mb-3">Setup Instructions</p>
          <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
            <li>Open a chart in <span className="text-foreground font-medium">TradingView</span> and click the <span className="text-foreground font-medium">Alert</span> button (clock icon)</li>
            <li>Set your alert conditions (price level, indicator signal, etc.)</li>
            <li>In the <span className="text-foreground font-medium">Notifications</span> tab, enable <span className="text-foreground font-medium">Webhook URL</span></li>
            <li>Paste your webhook URL from above into the URL field</li>
            <li>
              Set the alert message body to JSON:
              <pre className="mt-1.5 bg-background border border-border rounded-lg p-3 text-xs font-mono overflow-x-auto">
{`{
  "ticker": "{{ticker}}",
  "side": "{{strategy.order.action}}",
  "price": "{{close}}"
}`}
              </pre>
            </li>
            <li>Click <span className="text-foreground font-medium">Create</span> — trades will appear as drafts in your journal</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
