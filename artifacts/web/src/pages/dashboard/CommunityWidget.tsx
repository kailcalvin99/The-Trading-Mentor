import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function CommunityWidget() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Array<{ id: number; content?: string | null; authorName?: string | null; likesCount: number; createdAt?: string }>>([]);

  useEffect(() => {
    const apiBase = import.meta.env.VITE_API_URL || "/api";
    fetch(`${apiBase}/community/posts?limit=3`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPosts(data.slice(0, 3));
        else if (Array.isArray(data.posts)) setPosts(data.posts.slice(0, 3));
      })
      .catch(() => {});
  }, []);

  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Users className="h-4 w-4 text-violet-400 shrink-0" />
        <h3 className="text-sm font-semibold text-foreground flex-1">Community</h3>
        <button onClick={() => navigate("/community")} className="text-xs text-primary font-medium">See all ↗</button>
      </div>
      <div className="space-y-3">
        {posts.length === 0 ? (
          <p className="text-xs text-muted-foreground">No posts yet. Be the first to share!</p>
        ) : (
          posts.map((post) => {
            const content = post.content ?? '';
            const excerpt = content.length > 80 ? content.slice(0, 80) + "…" : content;
            return (
              <button key={post.id} className="w-full flex items-start gap-2 text-left hover:opacity-80 transition-opacity" onClick={() => navigate("/community")}>
                <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-violet-400">{post.authorName?.charAt(0)?.toUpperCase() || "?"}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <p className="text-xs font-semibold text-foreground truncate">{post.authorName ?? 'Unknown'}</p>
                    {post.createdAt && (
                      <span className="text-xs text-muted-foreground shrink-0">{timeAgo(post.createdAt)}</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{excerpt}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">❤ {post.likesCount ?? 0}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
