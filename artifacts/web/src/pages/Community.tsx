import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  MessageSquare,
  Heart,
  Send,
  ArrowLeft,
  Plus,
  X,
  Crown,
  HelpCircle,
  BarChart3,
  Zap,
  Users,
  Bell,
  BellOff,
  Trophy,
} from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "/api";
const COMMUNITY_LAST_VISIT_KEY = "community_last_visit";

const CATEGORIES = [
  { value: "all", label: "All Posts", icon: Users },
  { value: "strategy-talk", label: "Strategy Talk", icon: Zap },
  { value: "trade-reviews", label: "Trade Reviews", icon: BarChart3 },
  { value: "daily-wins", label: "Daily Wins", icon: Trophy },
  { value: "indicators", label: "Indicators", icon: BarChart3 },
  { value: "questions", label: "Questions", icon: HelpCircle },
  { value: "general", label: "General", icon: MessageSquare },
];

const SUBSCRIBABLE_CATEGORIES = CATEGORIES.filter((c) => c.value !== "all");

interface Post {
  id: number;
  userId: number;
  category: string;
  title: string;
  body: string;
  likeCount: number;
  replyCount: number;
  createdAt: string;
  authorName: string;
  authorRole: string;
  authorIsFounder: boolean;
  authorFounderNumber: number | null;
  liked: boolean;
}

interface Reply {
  id: number;
  postId: number;
  userId: number;
  body: string;
  createdAt: string;
  authorName: string;
  authorRole: string;
  authorIsFounder: boolean;
  authorFounderNumber: number | null;
}

interface PostDetail extends Post {
  replies: Reply[];
}

interface LeaderEntry {
  userId: number;
  name: string;
  isFounder: boolean;
  founderNumber: number | null;
  tradeCount?: number;
  winRate?: number;
  total?: number;
  streak?: number;
}

interface Leaderboard {
  byTradeCount: LeaderEntry[];
  byWinRate: LeaderEntry[];
  byStreak: LeaderEntry[];
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function AuthorBadge({ name, isFounder, founderNumber, role }: {
  name: string;
  isFounder: boolean;
  founderNumber: number | null;
  role: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-semibold text-sm text-foreground">{name}</span>
      {isFounder && (
        <span className="inline-flex items-center gap-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full px-1.5 py-0.5">
          <Crown className="h-2.5 w-2.5 text-amber-500" />
          <span className="text-[9px] font-bold text-amber-500">#{founderNumber}</span>
        </span>
      )}
      {role === "admin" && (
        <span className="text-[9px] font-bold text-primary bg-primary/10 rounded-full px-1.5 py-0.5">ADMIN</span>
      )}
    </div>
  );
}

function RankMedal({ rank }: { rank: number }) {
  const medals = [
    { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-500", label: "#1" },
    { bg: "bg-slate-400/10", border: "border-slate-400/30", text: "text-slate-400", label: "#2" },
    { bg: "bg-amber-700/10", border: "border-amber-700/30", text: "text-amber-700", label: "#3" },
  ];
  const m = medals[rank - 1];
  if (!m) return <span className="text-xs text-muted-foreground font-medium">#{rank}</span>;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-bold ${m.bg} ${m.border} ${m.text}`}>
      <Trophy className="h-3 w-3" />
      {m.label}
    </span>
  );
}

function HallOfFame() {
  const [data, setData] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/community/leaderboard`, { credentials: "include" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!data || (data.byTradeCount.length === 0 && data.byWinRate.length === 0 && data.byStreak.length === 0)) {
    return (
      <div className="text-center py-16 space-y-2">
        <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto" />
        <p className="text-sm font-semibold text-muted-foreground">Hall of Fame coming soon</p>
        <p className="text-xs text-muted-foreground">Keep trading and logging to appear here!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
        <Trophy className="h-6 w-6 text-red-500 shrink-0" />
        <div>
          <p className="text-sm font-bold text-foreground">Hall of Fame</p>
          <p className="text-xs text-muted-foreground">Top traders by discipline &amp; performance</p>
        </div>
      </div>

      {data.byWinRate.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold uppercase tracking-wide text-primary">Highest Win Rate</span>
            <span className="text-xs text-muted-foreground">Min. 3 trades</span>
          </div>
          {data.byWinRate.map((entry, idx) => (
            <div key={entry.userId} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RankMedal rank={idx + 1} />
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{entry.name.slice(0, 2).toUpperCase()}</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground">{entry.name}</span>
                    {entry.isFounder && (
                      <span className="inline-flex items-center gap-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full px-1.5 py-0.5">
                        <Crown className="h-2.5 w-2.5 text-amber-500" />
                        <span className="text-[9px] font-bold text-amber-500">#{entry.founderNumber}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{entry.total} trades logged</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-primary">{entry.winRate}%</p>
                <p className="text-[10px] text-muted-foreground">Win Rate</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.byStreak.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-orange-500" />
            <span className="text-xs font-bold uppercase tracking-wide text-orange-500">Longest Win Streak</span>
            <span className="text-xs text-muted-foreground">Consecutive wins</span>
          </div>
          {data.byStreak.map((entry, idx) => (
            <div key={entry.userId} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RankMedal rank={idx + 1} />
                <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-orange-500">{entry.name.slice(0, 2).toUpperCase()}</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground">{entry.name}</span>
                    {entry.isFounder && (
                      <span className="inline-flex items-center gap-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full px-1.5 py-0.5">
                        <Crown className="h-2.5 w-2.5 text-amber-500" />
                        <span className="text-[9px] font-bold text-amber-500">#{entry.founderNumber}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{entry.total} trades logged</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-orange-500">{entry.streak}</p>
                <p className="text-[10px] text-muted-foreground">Best Streak</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.byTradeCount.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-bold uppercase tracking-wide text-indigo-400">Most Active</span>
            <span className="text-xs text-muted-foreground">Total journal entries</span>
          </div>
          {data.byTradeCount.map((entry, idx) => (
            <div key={entry.userId} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <RankMedal rank={idx + 1} />
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <span className="text-xs font-bold text-indigo-400">{entry.name.slice(0, 2).toUpperCase()}</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-foreground">{entry.name}</span>
                    {entry.isFounder && (
                      <span className="inline-flex items-center gap-0.5 bg-amber-500/10 border border-amber-500/30 rounded-full px-1.5 py-0.5">
                        <Crown className="h-2.5 w-2.5 text-amber-500" />
                        <span className="text-[9px] font-bold text-amber-500">#{entry.founderNumber}</span>
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">Consistent logger</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-indigo-400">{entry.tradeCount}</p>
                <p className="text-[10px] text-muted-foreground">Trades</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const cat = CATEGORIES.find((c) => c.value === category);
  const label = cat?.label || category;
  const colorMap: Record<string, string> = {
    "strategy-talk": "bg-blue-500/10 text-blue-400 border-blue-500/30",
    "trade-reviews": "bg-purple-500/10 text-purple-400 border-purple-500/30",
    "daily-wins": "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    "wins": "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    "indicators": "bg-purple-500/10 text-purple-400 border-purple-500/30",
    "questions": "bg-amber-500/10 text-amber-400 border-amber-500/30",
    "general": "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${colorMap[category] || colorMap.general || "bg-muted text-muted-foreground border-border"}`}>
      {label}
    </span>
  );
}

export default function Community() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showNewPost, setShowNewPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostDetail | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState("strategy-talk");
  const [titleError, setTitleError] = useState("");
  const [bodyError, setBodyError] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [subscribedCategories, setSubscribedCategories] = useState<string[]>([]);
  const [togglingCategory, setTogglingCategory] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem(COMMUNITY_LAST_VISIT_KEY, new Date().toISOString());
  }, []);

  useEffect(() => {
    const handleFocus = () => {
      localStorage.setItem(COMMUNITY_LAST_VISIT_KEY, new Date().toISOString());
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    fetch(`${API_BASE}/community/subscriptions`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.subscribed)) setSubscribedCategories(data.subscribed);
      })
      .catch(() => {});
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      const url = activeCategory === "all"
        ? `${API_BASE}/community/posts`
        : `${API_BASE}/community/posts?category=${activeCategory}`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setPosts(Array.isArray(data) ? data : data.posts || []);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    setLoading(true);
    fetchPosts();
  }, [fetchPosts]);

  async function openThread(postId: number) {
    try {
      const res = await fetch(`${API_BASE}/community/posts/${postId}`, { credentials: "include" });
      if (res.ok) {
        setSelectedPost(await res.json());
      }
    } catch {}
  }

  async function handleCreatePost() {
    const titleTrimmed = newTitle.trim();
    const bodyTrimmed = newBody.trim();
    let hasError = false;

    if (!titleTrimmed) {
      setTitleError("Title is required");
      hasError = true;
    } else {
      setTitleError("");
    }

    if (!bodyTrimmed) {
      setBodyError("Body is required");
      hasError = true;
    } else {
      setBodyError("");
    }

    if (hasError || submitting) return;

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/community/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: titleTrimmed, body: bodyTrimmed, category: newCategory }),
      });
      if (res.ok) {
        setNewTitle("");
        setNewBody("");
        setTitleError("");
        setBodyError("");
        setShowNewPost(false);
        fetchPosts();
      }
    } catch {
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReply() {
    if (!replyBody.trim() || !selectedPost || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/community/posts/${selectedPost.id}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: replyBody.trim() }),
      });
      if (res.ok) {
        setReplyBody("");
        openThread(selectedPost.id);
        fetchPosts();
      }
    } catch {
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleLike(postId: number) {
    try {
      const res = await fetch(`${API_BASE}/community/posts/${postId}/like`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        const { liked } = await res.json();
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, liked, likeCount: liked ? p.likeCount + 1 : Math.max(p.likeCount - 1, 0) }
              : p
          )
        );
        if (selectedPost && selectedPost.id === postId) {
          setSelectedPost((prev) =>
            prev
              ? { ...prev, liked, likeCount: liked ? prev.likeCount + 1 : Math.max(prev.likeCount - 1, 0) }
              : prev
          );
        }
      }
    } catch {}
  }

  async function toggleSubscription(category: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (togglingCategory === category) return;
    setTogglingCategory(category);
    try {
      const res = await fetch(`${API_BASE}/community/subscriptions/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ category }),
      });
      if (res.ok) {
        const { subscribed } = await res.json();
        setSubscribedCategories((prev) =>
          subscribed ? [...prev, category] : prev.filter((c) => c !== category)
        );
      }
    } catch {
    } finally {
      setTogglingCategory(null);
    }
  }

  if (selectedPost) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        <button
          onClick={() => setSelectedPost(null)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Community
        </button>

        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CategoryBadge category={selectedPost.category} />
            <span className="text-xs text-muted-foreground">{timeAgo(selectedPost.createdAt)}</span>
          </div>
          <h1 className="text-xl font-bold text-foreground">{selectedPost.title}</h1>
          <AuthorBadge
            name={selectedPost.authorName}
            isFounder={selectedPost.authorIsFounder}
            founderNumber={selectedPost.authorFounderNumber}
            role={selectedPost.authorRole}
          />
          <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{selectedPost.body}</p>
          <div className="flex items-center gap-4 pt-2 border-t border-border">
            <button
              onClick={() => toggleLike(selectedPost.id)}
              className={`flex items-center gap-1.5 text-sm transition-colors ${selectedPost.liked ? "text-red-400" : "text-muted-foreground hover:text-red-400"}`}
            >
              <Heart className={`h-4 w-4 ${selectedPost.liked ? "fill-red-400" : ""}`} />
              {selectedPost.likeCount}
            </button>
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MessageSquare className="h-4 w-4" />
              {selectedPost.replies.length} replies
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Replies</h3>
          {selectedPost.replies.length === 0 && (
            <p className="text-sm text-muted-foreground">No replies yet. Be the first to respond!</p>
          )}
          {selectedPost.replies.map((reply) => (
            <div key={reply.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <AuthorBadge
                  name={reply.authorName}
                  isFounder={reply.authorIsFounder}
                  founderNumber={reply.authorFounderNumber}
                  role={reply.authorRole}
                />
                <span className="text-xs text-muted-foreground">{timeAgo(reply.createdAt)}</span>
              </div>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{reply.body}</p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex gap-2">
            <textarea
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Write a reply..."
              className="flex-1 bg-secondary rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary"
              rows={2}
              maxLength={5000}
            />
            <button
              onClick={handleReply}
              disabled={!replyBody.trim() || submitting}
              className="self-end bg-primary text-primary-foreground p-2.5 rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Community</h1>
          <p className="text-sm text-muted-foreground">Connect with fellow ICT traders</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHallOfFame((v) => !v)}
            title={showHallOfFame ? "Back to posts" : "Hall of Fame"}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
              showHallOfFame
                ? "bg-red-500/10 border border-red-500/30 text-red-500"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            <Trophy className="h-4 w-4" />
          </button>
          {!showHallOfFame && (
            <button
              onClick={() => setShowNewPost(true)}
              className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
            >
              <Plus className="h-4 w-4" />
              New Post
            </button>
          )}
        </div>
      </div>

      {showHallOfFame ? (
        <HallOfFame />
      ) : (
      <>
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide flex-wrap">
        <button
          onClick={() => setActiveCategory("all")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
            activeCategory === "all"
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          All Posts
        </button>

        {SUBSCRIBABLE_CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isSubscribed = subscribedCategories.includes(cat.value);
          const isActive = activeCategory === cat.value;
          return (
            <div key={cat.value} className="relative flex items-center">
              <button
                onClick={() => setActiveCategory(cat.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors pr-7 ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {cat.label}
                {isSubscribed && (
                  <span className="absolute top-0 right-5 w-2 h-2 rounded-full bg-primary border border-background" />
                )}
              </button>
              <button
                onClick={(e) => toggleSubscription(cat.value, e)}
                disabled={togglingCategory === cat.value}
                title={isSubscribed ? "Unsubscribe" : "Subscribe for notifications"}
                className={`absolute right-1 p-0.5 rounded-full transition-colors ${
                  isSubscribed
                    ? "text-primary hover:text-primary/70"
                    : "text-muted-foreground/50 hover:text-muted-foreground"
                }`}
              >
                {isSubscribed ? <Bell className="h-3 w-3" /> : <BellOff className="h-3 w-3" />}
              </button>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-6 w-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <MessageSquare className="h-10 w-10 text-muted-foreground/30 mx-auto" />
          <p className="text-sm text-muted-foreground">No posts yet. Start the conversation!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-card border border-border rounded-xl p-4 space-y-2 cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => openThread(post.id)}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <CategoryBadge category={post.category} />
                <span className="text-xs text-muted-foreground">{timeAgo(post.createdAt)}</span>
              </div>
              <h3 className="text-sm font-bold text-foreground">{post.title}</h3>
              <AuthorBadge
                name={post.authorName}
                isFounder={post.authorIsFounder}
                founderNumber={post.authorFounderNumber}
                role={post.authorRole}
              />
              <p className="text-xs text-muted-foreground line-clamp-2">{post.body}</p>
              <div className="flex items-center gap-4 pt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike(post.id);
                  }}
                  className={`flex items-center gap-1 text-xs transition-colors ${post.liked ? "text-red-400" : "text-muted-foreground hover:text-red-400"}`}
                >
                  <Heart className={`h-3.5 w-3.5 ${post.liked ? "fill-red-400" : ""}`} />
                  {post.likeCount}
                </button>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MessageSquare className="h-3.5 w-3.5" />
                  {post.replyCount}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNewPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">New Post</h2>
              <button onClick={() => { setShowNewPost(false); setTitleError(""); setBodyError(""); }} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                className="w-full bg-secondary border border-border rounded-lg p-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {CATEGORIES.filter((c) => c.value !== "all").map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <div>
                <input
                  value={newTitle}
                  onChange={(e) => { setNewTitle(e.target.value); if (e.target.value.trim()) setTitleError(""); }}
                  placeholder="Post title..."
                  maxLength={200}
                  className={`w-full bg-secondary border rounded-lg p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary ${titleError ? "border-red-500 focus:ring-red-500" : "border-border"}`}
                />
                {titleError && <p className="text-xs text-red-500 mt-1">{titleError}</p>}
              </div>
              <div>
                <textarea
                  value={newBody}
                  onChange={(e) => { setNewBody(e.target.value); if (e.target.value.trim()) setBodyError(""); }}
                  placeholder="Share your thoughts, trade analysis, or questions..."
                  maxLength={5000}
                  rows={5}
                  className={`w-full bg-secondary border rounded-lg p-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary ${bodyError ? "border-red-500 focus:ring-red-500" : "border-border"}`}
                />
                {bodyError && <p className="text-xs text-red-500 mt-1">{bodyError}</p>}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowNewPost(false); setTitleError(""); setBodyError(""); }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePost}
                disabled={submitting}
                className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity"
              >
                <Send className="h-4 w-4" />
                Post
              </button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
