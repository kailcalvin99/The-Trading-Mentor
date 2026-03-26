import { useState, useEffect, useCallback } from "react";
import {
  Play,
  CheckCircle2,
  Circle,
  X,
  Search,
  Filter,
  Clock,
  ChevronRight,
} from "lucide-react";
import { VIDEO_CHAPTERS, ALL_VIDEOS, DIFFICULTY_COLORS, type Video, type VideoDifficulty } from "../data/video-data";

const API_BASE = import.meta.env.VITE_API_URL || "/api";

function useWatchedVideos() {
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/videos/watched`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data.watchedIds)) {
          setWatched(new Set(data.watchedIds));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const markWatched = useCallback(async (videoId: string) => {
    setWatched((prev) => new Set([...prev, videoId]));
    try {
      await fetch(`${API_BASE}/videos/watched`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoId }),
      });
    } catch {}
  }, []);

  const unmarkWatched = useCallback(async (videoId: string) => {
    setWatched((prev) => {
      const next = new Set(prev);
      next.delete(videoId);
      return next;
    });
    try {
      await fetch(`${API_BASE}/videos/watched/${videoId}`, {
        method: "DELETE",
        credentials: "include",
      });
    } catch {}
  }, []);

  return { watched, loading, markWatched, unmarkWatched };
}

interface VideoPlayerModalProps {
  video: Video;
  isWatched: boolean;
  onClose: () => void;
  onWatched: (id: string) => void;
  onUnwatched: (id: string) => void;
}

function VideoPlayerModal({ video, isWatched, onClose, onWatched, onUnwatched }: VideoPlayerModalProps) {
  const diffColor = DIFFICULTY_COLORS[video.difficulty];
  const chapter = VIDEO_CHAPTERS.find((c) => c.id === video.chapterId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex-1 min-w-0 mr-4">
            <div className="flex items-center gap-2 mb-1">
              {chapter && (
                <span className="text-xs font-bold uppercase tracking-wider" style={{ color: chapter.color }}>
                  {chapter.icon} {chapter.title}
                </span>
              )}
              <span
                className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                style={{ backgroundColor: diffColor + "20", color: diffColor }}
              >
                {video.difficulty}
              </span>
            </div>
            <h2 className="text-base font-bold text-foreground truncate">{video.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-2 rounded-full hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative bg-black" style={{ aspectRatio: "16/9" }}>
          <iframe
            src={`https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full"
            style={{ border: "none" }}
          />
        </div>

        <div className="px-5 py-4 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground leading-relaxed">{video.description}</p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
                {video.duration}
              </span>
              {video.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-medium bg-secondary text-muted-foreground px-2 py-0.5 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={() => isWatched ? onUnwatched(video.id) : onWatched(video.id)}
            className={`shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
              isWatched
                ? "bg-primary/10 text-primary hover:bg-destructive/10 hover:text-destructive"
                : "bg-secondary text-muted-foreground hover:bg-primary/10 hover:text-primary"
            }`}
          >
            {isWatched ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Watched
              </>
            ) : (
              <>
                <Circle className="h-4 w-4" />
                Mark Watched
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

interface VideoCardProps {
  video: Video;
  isWatched: boolean;
  onClick: () => void;
}

function VideoCard({ video, isWatched, onClick }: VideoCardProps) {
  const diffColor = DIFFICULTY_COLORS[video.difficulty];

  return (
    <button
      onClick={onClick}
      className="group relative bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all duration-200 text-left w-full"
    >
      <div className="relative aspect-video bg-black">
        <img
          src={`https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`}
          alt={video.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="bg-white/90 backdrop-blur rounded-full p-3 shadow-lg group-hover:scale-105 transition-transform">
            <Play className="h-5 w-5 text-gray-900 fill-gray-900" />
          </div>
        </div>
        {isWatched && (
          <div className="absolute top-2 right-2 bg-primary rounded-full p-1 shadow">
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
        )}
        <div className="absolute bottom-2 right-2 bg-black/75 text-white text-[10px] font-medium px-1.5 py-0.5 rounded">
          {video.duration}
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span
            className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{ backgroundColor: diffColor + "20", color: diffColor }}
          >
            {video.difficulty}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
          {video.title}
        </h3>
        <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 leading-relaxed">
          {video.description}
        </p>
      </div>
    </button>
  );
}

export default function VideoLibrary({ initialVideoId }: { initialVideoId?: string } = {}) {
  const { watched, loading, markWatched, unmarkWatched } = useWatchedVideos();
  const [selectedChapter, setSelectedChapter] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);

  useEffect(() => {
    if (initialVideoId) {
      const v = ALL_VIDEOS.find((v) => v.id === initialVideoId);
      if (v) setActiveVideo(v);
    }
  }, [initialVideoId]);

  const filteredVideos = ALL_VIDEOS.filter((v) => {
    if (selectedChapter !== "all" && v.chapterId !== selectedChapter) return false;
    if (selectedDifficulty !== "all" && v.difficulty !== selectedDifficulty) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!v.title.toLowerCase().includes(q) && !v.description.toLowerCase().includes(q) && !v.tags.some((t) => t.toLowerCase().includes(q))) {
        return false;
      }
    }
    return true;
  });

  const watchedCount = ALL_VIDEOS.filter((v) => watched.has(v.id)).length;

  const difficulties: VideoDifficulty[] = ["Beginner", "Intermediate", "Advanced"];

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="border-b border-border px-6 py-5 shrink-0 pl-[0px] pr-[0px] pt-[0px] pb-[0px]">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-xl font-bold text-foreground">Video Library</h1>
          <span className="text-muted-foreground text-justify text-[14px]">
            {loading ? "..." : `${watchedCount} / ${ALL_VIDEOS.length} watched`}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {ALL_VIDEOS.length} focused videos across all ICT concepts
        </p>
      </div>
      <div className="border-b border-border px-6 py-3 shrink-0 space-y-3 pl-[0px] pr-[0px] pt-[5px] pb-[5px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-secondary border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedChapter("all")}
            className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors border ${
              selectedChapter === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            All Chapters
          </button>
          {VIDEO_CHAPTERS.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setSelectedChapter(ch.id)}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors border ${
                selectedChapter === ch.id
                  ? "text-white border-transparent"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
              style={selectedChapter === ch.id ? { backgroundColor: ch.color } : {}}
            >
              {ch.icon} {ch.title}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setSelectedDifficulty("all")}
            className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors border ${
              selectedDifficulty === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            All Levels
          </button>
          {difficulties.map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDifficulty(d)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full transition-colors border ${
                selectedDifficulty === d
                  ? "text-white border-transparent"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
              style={selectedDifficulty === d ? { backgroundColor: DIFFICULTY_COLORS[d] } : {}}
            >
              {d}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filteredVideos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">No videos match your search</p>
          </div>
        ) : selectedChapter === "all" && !searchQuery ? (
          <div className="space-y-8">
            {VIDEO_CHAPTERS.map((chapter) => {
              const chVideos = filteredVideos.filter((v) => v.chapterId === chapter.id);
              if (chVideos.length === 0) return null;
              return (
                <div key={chapter.id}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">{chapter.icon}</span>
                    <h2 className="text-sm font-bold text-foreground">{chapter.title}</h2>
                    <span className="text-xs text-muted-foreground">
                      ({chVideos.filter((v) => watched.has(v.id)).length}/{chVideos.length} watched)
                    </span>
                    <div className="flex-1 h-px bg-border ml-1" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {chVideos.map((video) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        isWatched={watched.has(video.id)}
                        onClick={() => setActiveVideo(video)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredVideos.map((video) => (
              <VideoCard
                key={video.id}
                video={video}
                isWatched={watched.has(video.id)}
                onClick={() => setActiveVideo(video)}
              />
            ))}
          </div>
        )}
      </div>
      {activeVideo && (
        <VideoPlayerModal
          video={activeVideo}
          isWatched={watched.has(activeVideo.id)}
          onClose={() => setActiveVideo(null)}
          onWatched={markWatched}
          onUnwatched={unmarkWatched}
        />
      )}
    </div>
  );
}

export { VideoPlayerModal };
export type { Video };
