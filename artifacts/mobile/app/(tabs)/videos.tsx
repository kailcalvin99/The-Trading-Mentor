import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  TextInput,
  Platform,
  type DimensionValue,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import WebView from "react-native-webview";
import Colors from "@/constants/colors";
import FullModeGate from "@/components/FullModeGate";
import {
  VIDEO_CHAPTERS,
  ALL_VIDEOS,
  DIFFICULTY_COLORS,
  type Video,
  type VideoDifficulty,
} from "@/data/video-data";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/contexts/AuthContext";
import { apiGet, apiPost, getApiUrl, getToken } from "@/lib/api";

const C = Colors.dark;
const { width: SCREEN_WIDTH } = Dimensions.get("window");

function watchedCacheKey(userId?: number | string) {
  return userId ? `ict-video-watched:${userId}` : "ict-video-watched";
}

function useWatchedVideos() {
  const [watched, setWatched] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const cacheKey = watchedCacheKey(user?.id);

  useEffect(() => {
    setWatched(new Set());
    AsyncStorage.getItem(cacheKey).then((raw) => {
      if (raw) {
        try { setWatched(new Set(JSON.parse(raw))); } catch {}
      }
    });

    if (user) {
      apiGet<{ watchedIds: string[] }>("videos/watched")
        .then((data) => {
          if (Array.isArray(data.watchedIds)) {
            const set = new Set<string>(data.watchedIds);
            setWatched(set);
            AsyncStorage.setItem(cacheKey, JSON.stringify([...set]));
          }
        })
        .catch(() => {});
    }
  }, [user, cacheKey]);

  const markWatched = useCallback(async (videoId: string) => {
    const next = new Set<string>([...watched, videoId]);
    setWatched(next);
    await AsyncStorage.setItem(cacheKey, JSON.stringify([...next]));
    if (user) {
      apiPost("videos/watched", { videoId }).catch(() => {});
    }
  }, [watched, user, cacheKey]);

  const unmarkWatched = useCallback(async (videoId: string) => {
    const next = new Set<string>(watched);
    next.delete(videoId);
    setWatched(next);
    await AsyncStorage.setItem(cacheKey, JSON.stringify([...next]));
    if (user) {
      const token = await getToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      fetch(`${getApiUrl()}videos/watched/${videoId}`, {
        method: "DELETE",
        headers,
        credentials: "include",
      }).catch(() => {});
    }
  }, [watched, user]);

  return { watched, markWatched, unmarkWatched };
}

function VideoPlayerModal({
  video,
  isWatched,
  onClose,
  onMarkWatched,
  onUnmarkWatched,
}: {
  video: Video;
  isWatched: boolean;
  onClose: () => void;
  onMarkWatched: (id: string) => void;
  onUnmarkWatched: (id: string) => void;
}) {
  const chapter = VIDEO_CHAPTERS.find((c) => c.id === video.chapterId);
  const diffColor = DIFFICULTY_COLORS[video.difficulty as VideoDifficulty];

  const embedHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: #000; }
        iframe { width: 100%; height: 100vh; border: none; }
      </style>
    </head>
    <body>
      <iframe
        src="https://www.youtube.com/embed/${video.youtubeId}?autoplay=1&rel=0&playsinline=1"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowfullscreen
      ></iframe>
    </body>
    </html>
  `;

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={playerStyles.safe} edges={["top"]}>
        <View style={playerStyles.header}>
          <TouchableOpacity onPress={onClose} style={playerStyles.closeBtn}>
            <Ionicons name="chevron-down" size={22} color={C.text} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginHorizontal: 12 }}>
            {chapter && (
              <Text style={[playerStyles.chapterLabel, { color: chapter.color }]}>
                {chapter.icon} {chapter.title}
              </Text>
            )}
            <Text style={playerStyles.videoTitle} numberOfLines={2}>{video.title}</Text>
          </View>
          <TouchableOpacity
            onPress={() => isWatched ? onUnmarkWatched(video.id) : onMarkWatched(video.id)}
            style={[playerStyles.watchedBtn, isWatched && playerStyles.watchedBtnActive]}
          >
            <Ionicons
              name={isWatched ? "checkmark-circle" : "checkmark-circle-outline"}
              size={20}
              color={isWatched ? C.accent : C.textSecondary}
            />
          </TouchableOpacity>
        </View>

        <View style={playerStyles.videoWrapper}>
          <WebView
            source={{ html: embedHtml }}
            style={playerStyles.webview}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            domStorageEnabled
          />
        </View>

        <ScrollView style={playerStyles.infoScroll} contentContainerStyle={{ padding: 16 }}>
          <View style={playerStyles.metaRow}>
            <View style={[playerStyles.diffBadge, { backgroundColor: diffColor + "20" }]}>
              <Text style={[playerStyles.diffText, { color: diffColor }]}>{video.difficulty}</Text>
            </View>
            <Ionicons name="time-outline" size={13} color={C.textSecondary} />
            <Text style={playerStyles.durationText}>{video.duration}</Text>
          </View>
          <Text style={playerStyles.description}>{video.description}</Text>
          <View style={playerStyles.tagsRow}>
            {video.tags.map((tag) => (
              <View key={tag} style={playerStyles.tag}>
                <Text style={playerStyles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const playerStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  closeBtn: { padding: 4 },
  chapterLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
  videoTitle: { fontSize: 14, fontWeight: "700", color: C.text, lineHeight: 20 },
  watchedBtn: { padding: 8, borderRadius: 20, backgroundColor: C.backgroundSecondary, borderWidth: 1, borderColor: C.cardBorder },
  watchedBtnActive: { borderColor: C.accent, backgroundColor: C.accent + "15" },
  videoWrapper: { width: SCREEN_WIDTH, aspectRatio: 16 / 9, backgroundColor: "#000" },
  webview: { flex: 1 },
  infoScroll: { flex: 1 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  diffText: { fontSize: 11, fontWeight: "700" },
  durationText: { fontSize: 12, color: C.textSecondary },
  description: { fontSize: 14, color: C.text, lineHeight: 22, opacity: 0.85 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  tag: { backgroundColor: C.backgroundSecondary, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: C.cardBorder },
  tagText: { fontSize: 11, color: C.textSecondary },
});

function VideoCard({
  video,
  isWatched,
  onPress,
}: {
  video: Video;
  isWatched: boolean;
  onPress: () => void;
}) {
  const diffColor = DIFFICULTY_COLORS[video.difficulty as VideoDifficulty];
  const thumbUri = `https://img.youtube.com/vi/${video.youtubeId}/mqdefault.jpg`;

  return (
    <TouchableOpacity style={cardStyles.card} onPress={onPress} activeOpacity={0.85}>
      <View style={cardStyles.thumbWrapper}>
        <Image source={{ uri: thumbUri }} style={cardStyles.thumbnail} contentFit="cover" />
        <View style={cardStyles.playOverlay}>
          <View style={cardStyles.playBtn}>
            <Ionicons name="play" size={18} color="#1a1a1a" />
          </View>
        </View>
        {isWatched && (
          <View style={cardStyles.watchedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={C.accent} />
          </View>
        )}
        <View style={cardStyles.durationBadge}>
          <Text style={cardStyles.durationText}>{video.duration}</Text>
        </View>
      </View>

      <View style={cardStyles.info}>
        <View style={[cardStyles.diffBadge, { backgroundColor: diffColor + "20" }]}>
          <Text style={[cardStyles.diffText, { color: diffColor }]}>{video.difficulty}</Text>
        </View>
        <Text style={cardStyles.title} numberOfLines={2}>{video.title}</Text>
        <Text style={cardStyles.desc} numberOfLines={2}>{video.description}</Text>
      </View>
    </TouchableOpacity>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.cardBorder,
    overflow: "hidden",
    marginBottom: 12,
  },
  thumbWrapper: { position: "relative", width: "100%" as DimensionValue, aspectRatio: 16 / 9 },
  thumbnail: { width: "100%" as DimensionValue, height: "100%" as DimensionValue },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  watchedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: C.background,
    borderRadius: 10,
    padding: 2,
  },
  durationBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: { fontSize: 10, color: "#fff", fontWeight: "600" },
  info: { padding: 12 },
  diffBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginBottom: 6 },
  diffText: { fontSize: 10, fontWeight: "700" },
  title: { fontSize: 14, fontWeight: "700", color: C.text, lineHeight: 20, marginBottom: 4 },
  desc: { fontSize: 12, color: C.textSecondary, lineHeight: 18 },
});

const DIFFICULTIES: VideoDifficulty[] = ["Beginner", "Intermediate", "Advanced"];

export default function VideosScreenGated() {
  return (
    <FullModeGate>
      <VideosScreen />
    </FullModeGate>
  );
}

function VideosScreen() {
  const [selectedChapter, setSelectedChapter] = useState<string>("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const { watched, markWatched, unmarkWatched } = useWatchedVideos();

  const filteredVideos = ALL_VIDEOS.filter((v) => {
    if (selectedChapter !== "all" && v.chapterId !== selectedChapter) return false;
    if (selectedDifficulty !== "all" && v.difficulty !== selectedDifficulty) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      if (!v.title.toLowerCase().includes(q) && !v.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const watchedCount = ALL_VIDEOS.filter((v) => watched.has(v.id)).length;

  const showChapterGroups = selectedChapter === "all" && !searchQuery.trim() && selectedDifficulty === "all";

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={C.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search videos..."
            placeholderTextColor={C.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color={C.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.progressText}>{watchedCount}/{ALL_VIDEOS.length}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity
          style={[styles.chip, selectedChapter === "all" && styles.chipActive]}
          onPress={() => setSelectedChapter("all")}
        >
          <Text style={[styles.chipText, selectedChapter === "all" && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {VIDEO_CHAPTERS.map((ch) => (
          <TouchableOpacity
            key={ch.id}
            style={[styles.chip, selectedChapter === ch.id && { backgroundColor: ch.color, borderColor: ch.color }]}
            onPress={() => setSelectedChapter(ch.id)}
          >
            <Text style={[styles.chipText, selectedChapter === ch.id && { color: "#fff" }]}>
              {ch.icon} {ch.title}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        <TouchableOpacity
          style={[styles.chip, selectedDifficulty === "all" && styles.chipActive]}
          onPress={() => setSelectedDifficulty("all")}
        >
          <Text style={[styles.chipText, selectedDifficulty === "all" && styles.chipTextActive]}>All Levels</Text>
        </TouchableOpacity>
        {DIFFICULTIES.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.chip, selectedDifficulty === d && { backgroundColor: DIFFICULTY_COLORS[d], borderColor: DIFFICULTY_COLORS[d] }]}
            onPress={() => setSelectedDifficulty(d)}
          >
            <Text style={[styles.chipText, selectedDifficulty === d && { color: "#fff" }]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredVideos.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={40} color={C.textTertiary} />
            <Text style={styles.emptyText}>No videos found</Text>
          </View>
        ) : showChapterGroups ? (
          VIDEO_CHAPTERS.map((chapter) => {
            const chVideos = filteredVideos.filter((v) => v.chapterId === chapter.id);
            if (chVideos.length === 0) return null;
            const chWatched = chVideos.filter((v) => watched.has(v.id)).length;
            return (
              <View key={chapter.id} style={styles.chapterSection}>
                <View style={styles.chapterHeader}>
                  <Text style={styles.chapterIcon}>{chapter.icon}</Text>
                  <Text style={styles.chapterTitle}>{chapter.title}</Text>
                  <Text style={[styles.chapterProgress, { color: chapter.color }]}>{chWatched}/{chVideos.length}</Text>
                </View>
                {chVideos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    isWatched={watched.has(video.id)}
                    onPress={() => setActiveVideo(video)}
                  />
                ))}
              </View>
            );
          })
        ) : (
          filteredVideos.map((video) => (
            <VideoCard
              key={video.id}
              video={video}
              isWatched={watched.has(video.id)}
              onPress={() => setActiveVideo(video)}
            />
          ))
        )}
      </ScrollView>

      {activeVideo && (
        <VideoPlayerModal
          video={activeVideo}
          isWatched={watched.has(activeVideo.id)}
          onClose={() => setActiveVideo(null)}
          onMarkWatched={markWatched}
          onUnmarkWatched={unmarkWatched}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: C.backgroundSecondary,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: C.text,
    padding: 0,
  },
  progressText: { fontSize: 12, color: C.textSecondary, fontWeight: "600", minWidth: 40, textAlign: "right" },
  filterRow: { flexGrow: 0, paddingBottom: 4 },
  filterContent: { paddingHorizontal: 16, gap: 8, paddingBottom: 4 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.cardBorder,
    backgroundColor: C.backgroundSecondary,
  },
  chipActive: { backgroundColor: C.accent, borderColor: C.accent },
  chipText: { fontSize: 12, fontWeight: "600", color: C.textSecondary },
  chipTextActive: { color: "#0A0A0F" },
  list: { flex: 1 },
  listContent: { padding: 16, paddingBottom: 40 },
  chapterSection: { marginBottom: 24 },
  chapterHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  chapterIcon: { fontSize: 18 },
  chapterTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: C.text },
  chapterProgress: { fontSize: 12, fontWeight: "700" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 14, color: C.textSecondary },
});
