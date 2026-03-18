import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiGet, apiPost } from "@/lib/api";
import Colors from "@/constants/colors";
import FullModeGate from "@/components/FullModeGate";

const C = Colors.dark;

const COMMUNITY_LAST_VISIT_KEY = "community_last_visit";

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

const CATEGORIES = [
  { value: "all", label: "All" },
  { value: "strategy-talk", label: "#Strategy-Talk" },
  { value: "trade-reviews", label: "#Trade-Reviews" },
  { value: "daily-wins", label: "#Daily-Wins" },
  { value: "indicators", label: "#Indicators" },
  { value: "questions", label: "#Questions" },
  { value: "general", label: "#General" },
];

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function AuthorRow({ name, isFounder, founderNumber, role, time }: {
  name: string;
  isFounder: boolean;
  founderNumber: number | null;
  role: string;
  time?: string;
}) {
  return (
    <View style={s.authorRow}>
      <Text style={s.authorName}>{name}</Text>
      {isFounder && (
        <View style={s.founderBadge}>
          <Ionicons name="diamond" size={8} color="#f59e0b" />
          <Text style={s.founderText}>#{founderNumber}</Text>
        </View>
      )}
      {role === "admin" && (
        <View style={s.adminBadge}>
          <Text style={s.adminText}>ADMIN</Text>
        </View>
      )}
      {time && <Text style={s.timeText}>{time}</Text>}
    </View>
  );
}

function RankBadge({ rank }: { rank: number }) {
  const colors = ["#F59E0B", "#94A3B8", "#CD7F32"];
  const color = colors[rank - 1] ?? C.textSecondary;
  const icon: keyof typeof Ionicons.glyphMap = rank === 1 ? "trophy" : "ribbon-outline";
  return (
    <View style={[hofS.rankBadge, { backgroundColor: color + "18", borderColor: color + "44" }]}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={[hofS.rankText, { color }]}>#{rank}</Text>
    </View>
  );
}

function HallOfFame() {
  const [data, setData] = useState<Leaderboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Leaderboard>("community/leaderboard")
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <View style={hofS.center}><ActivityIndicator size="large" color={C.accent} /></View>;
  }

  if (!data || (data.byTradeCount.length === 0 && data.byWinRate.length === 0 && data.byStreak.length === 0)) {
    return (
      <View style={hofS.center}>
        <Ionicons name="trophy-outline" size={44} color={C.textSecondary + "44"} />
        <Text style={hofS.emptyTitle}>Hall of Fame coming soon</Text>
        <Text style={hofS.emptyText}>Keep trading and logging to appear here!</Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
      <View style={hofS.heroBanner}>
        <Ionicons name="trophy" size={28} color="#E53E3E" />
        <View style={{ flex: 1 }}>
          <Text style={hofS.heroTitle}>Hall of Fame</Text>
          <Text style={hofS.heroSub}>Top traders by discipline & performance</Text>
        </View>
      </View>

      {data.byWinRate.length > 0 && (
        <>
          <View style={hofS.sectionHeader}>
            <Ionicons name="trending-up" size={16} color={C.accent} />
            <Text style={hofS.sectionTitle}>HIGHEST WIN RATE</Text>
            <Text style={hofS.sectionSub}>Min. 3 trades</Text>
          </View>
          {data.byWinRate.map((entry, idx) => (
            <View key={entry.userId} style={hofS.card}>
              <View style={hofS.cardLeft}>
                <RankBadge rank={idx + 1} />
                <View style={hofS.avatarCircle}>
                  <Text style={hofS.avatarText}>{entry.name.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View>
                  <View style={hofS.nameRow}>
                    <Text style={hofS.entryName}>{entry.name}</Text>
                    {entry.isFounder && (
                      <View style={s.founderBadge}>
                        <Ionicons name="diamond" size={8} color="#f59e0b" />
                        <Text style={s.founderText}>#{entry.founderNumber}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={hofS.entrySub}>{entry.total} trades logged</Text>
                </View>
              </View>
              <View style={hofS.statBox}>
                <Text style={[hofS.statValue, { color: C.accent }]}>{entry.winRate}%</Text>
                <Text style={hofS.statLabel}>Win Rate</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {data.byStreak.length > 0 && (
        <>
          <View style={[hofS.sectionHeader, { marginTop: 20 }]}>
            <Ionicons name="flame" size={16} color="#F97316" />
            <Text style={[hofS.sectionTitle, { color: "#F97316" }]}>LONGEST WIN STREAK</Text>
            <Text style={hofS.sectionSub}>Consecutive wins</Text>
          </View>
          {data.byStreak.map((entry, idx) => (
            <View key={entry.userId} style={hofS.card}>
              <View style={hofS.cardLeft}>
                <RankBadge rank={idx + 1} />
                <View style={hofS.avatarCircle}>
                  <Text style={hofS.avatarText}>{entry.name.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View>
                  <View style={hofS.nameRow}>
                    <Text style={hofS.entryName}>{entry.name}</Text>
                    {entry.isFounder && (
                      <View style={s.founderBadge}>
                        <Ionicons name="diamond" size={8} color="#f59e0b" />
                        <Text style={s.founderText}>#{entry.founderNumber}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={hofS.entrySub}>{entry.total} trades logged</Text>
                </View>
              </View>
              <View style={hofS.statBox}>
                <Text style={[hofS.statValue, { color: "#F97316" }]}>{entry.streak}</Text>
                <Text style={hofS.statLabel}>Best Streak</Text>
              </View>
            </View>
          ))}
        </>
      )}

      {data.byTradeCount.length > 0 && (
        <>
          <View style={[hofS.sectionHeader, { marginTop: 20 }]}>
            <Ionicons name="book" size={16} color="#818CF8" />
            <Text style={[hofS.sectionTitle, { color: "#818CF8" }]}>MOST ACTIVE</Text>
            <Text style={hofS.sectionSub}>Total journal entries</Text>
          </View>
          {data.byTradeCount.map((entry, idx) => (
            <View key={entry.userId} style={hofS.card}>
              <View style={hofS.cardLeft}>
                <RankBadge rank={idx + 1} />
                <View style={hofS.avatarCircle}>
                  <Text style={hofS.avatarText}>{entry.name.slice(0, 2).toUpperCase()}</Text>
                </View>
                <View>
                  <View style={hofS.nameRow}>
                    <Text style={hofS.entryName}>{entry.name}</Text>
                    {entry.isFounder && (
                      <View style={s.founderBadge}>
                        <Ionicons name="diamond" size={8} color="#f59e0b" />
                        <Text style={s.founderText}>#{entry.founderNumber}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={hofS.entrySub}>Consistent logger</Text>
                </View>
              </View>
              <View style={hofS.statBox}>
                <Text style={[hofS.statValue, { color: "#818CF8" }]}>{entry.tradeCount}</Text>
                <Text style={hofS.statLabel}>Trades</Text>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

export default function CommunityScreenGated() {
  return (
    <FullModeGate>
      <CommunityScreen />
    </FullModeGate>
  );
}

function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState("all");
  const [showHallOfFame, setShowHallOfFame] = useState(false);
  const [selectedPost, setSelectedPost] = useState<PostDetail | null>(null);
  const [showNewPost, setShowNewPost] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");
  const [newCategory, setNewCategory] = useState("strategy-talk");
  const [replyBody, setReplyBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [subscribedCategories, setSubscribedCategories] = useState<string[]>([]);

  useFocusEffect(useCallback(() => {
    AsyncStorage.setItem(COMMUNITY_LAST_VISIT_KEY, Date.now().toString());
    apiGet<{ subscribed: string[] }>("community/subscriptions")
      .then((d) => setSubscribedCategories(d.subscribed))
      .catch(() => {});
  }, []));

  async function toggleSubscription(category: string) {
    try {
      const result = await apiPost<{ subscribed: boolean; category: string }>("community/subscriptions/toggle", { category });
      setSubscribedCategories((prev) =>
        result.subscribed ? [...prev, category] : prev.filter((c) => c !== category)
      );
    } catch {}
  }

  const fetchPosts = useCallback(async () => {
    try {
      const url = activeCategory === "all" ? "community/posts" : `community/posts?category=${activeCategory}`;
      const data = await apiGet<{ posts: Post[] } | Post[]>(url);
      const postsArr = Array.isArray(data) ? data : (data as { posts: Post[] }).posts || [];
      setPosts(postsArr);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    if (!showHallOfFame) {
      setLoading(true);
      fetchPosts();
    }
  }, [fetchPosts, showHallOfFame]);

  async function openThread(postId: number) {
    try {
      const data = await apiGet(`community/posts/${postId}`);
      if (data) setSelectedPost(data as PostDetail);
    } catch {}
  }

  async function handleCreatePost() {
    if (!newTitle.trim() || !newBody.trim() || submitting) return;
    setSubmitting(true);
    try {
      await apiPost("community/posts", { title: newTitle.trim(), body: newBody.trim(), category: newCategory });
      setNewTitle("");
      setNewBody("");
      setShowNewPost(false);
      fetchPosts();
    } catch {} finally {
      setSubmitting(false);
    }
  }

  async function handleReply() {
    if (!replyBody.trim() || !selectedPost || submitting) return;
    setSubmitting(true);
    try {
      await apiPost(`community/posts/${selectedPost.id}/replies`, { body: replyBody.trim() });
      setReplyBody("");
      openThread(selectedPost.id);
      fetchPosts();
    } catch {} finally {
      setSubmitting(false);
    }
  }

  async function toggleLike(postId: number) {
    try {
      const data = await apiPost(`community/posts/${postId}/like`, {});
      const liked = (data as { liked: boolean }).liked;
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, liked, likeCount: liked ? p.likeCount + 1 : Math.max(p.likeCount - 1, 0) } : p
        )
      );
      if (selectedPost && selectedPost.id === postId) {
        setSelectedPost((prev) =>
          prev ? { ...prev, liked, likeCount: liked ? prev.likeCount + 1 : Math.max(prev.likeCount - 1, 0) } : prev
        );
      }
    } catch {}
  }

  if (selectedPost) {
    return (
      <View style={[s.container, { paddingTop: insets.top }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => setSelectedPost(null)} style={s.backBtn}>
            <Ionicons name="arrow-back" size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle} numberOfLines={1}>{selectedPost.title}</Text>
        </View>
        <ScrollView style={s.flex1} contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
          <View style={s.card}>
            <AuthorRow
              name={selectedPost.authorName}
              isFounder={selectedPost.authorIsFounder}
              founderNumber={selectedPost.authorFounderNumber}
              role={selectedPost.authorRole}
              time={timeAgo(selectedPost.createdAt)}
            />
            <Text style={s.postBody}>{selectedPost.body}</Text>
            <View style={s.postActions}>
              <TouchableOpacity style={s.actionBtn} onPress={() => toggleLike(selectedPost.id)}>
                <Ionicons name={selectedPost.liked ? "heart" : "heart-outline"} size={18} color={selectedPost.liked ? "#f87171" : C.textSecondary} />
                <Text style={[s.actionText, selectedPost.liked && { color: "#f87171" }]}>{selectedPost.likeCount}</Text>
              </TouchableOpacity>
              <View style={s.actionBtn}>
                <Ionicons name="chatbubble-outline" size={16} color={C.textSecondary} />
                <Text style={s.actionText}>{selectedPost.replies.length}</Text>
              </View>
            </View>
          </View>

          <Text style={s.repliesHeader}>Replies</Text>
          {selectedPost.replies.length === 0 && (
            <Text style={s.emptyText}>No replies yet</Text>
          )}
          {selectedPost.replies.map((r) => (
            <View key={r.id} style={s.replyCard}>
              <AuthorRow
                name={r.authorName}
                isFounder={r.authorIsFounder}
                founderNumber={r.authorFounderNumber}
                role={r.authorRole}
                time={timeAgo(r.createdAt)}
              />
              <Text style={s.replyBody}>{r.body}</Text>
            </View>
          ))}
        </ScrollView>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
          style={[s.replyBar, { paddingBottom: Math.max(insets.bottom, 12) }]}
        >
          <TextInput
            style={s.replyInput}
            value={replyBody}
            onChangeText={setReplyBody}
            placeholder="Write a reply..."
            placeholderTextColor={C.textSecondary}
            multiline
            maxLength={5000}
          />
          <TouchableOpacity
            style={[s.sendBtn, (!replyBody.trim() || submitting) && { opacity: 0.4 }]}
            onPress={handleReply}
            disabled={!replyBody.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#0A0A0F" />
            ) : (
              <Ionicons name="send" size={16} color="#0A0A0F" />
            )}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    );
  }

  async function handleShare() {
    try {
      await Share.share({
        message: "🚀 I've been using ICT AI Trading Mentor — an AI-powered app that teaches you the ICT methodology step by step. They're in their Founder phase so the first 20 members get a special discount. Check it out: ictmentor.com",
        title: "Join me on ICT AI Trading Mentor",
      });
    } catch {}
  }

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <View style={s.header}>
        <Text style={s.pageTitle}>Community</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <TouchableOpacity
            style={[s.newPostBtn, { backgroundColor: C.backgroundSecondary }, showHallOfFame && { borderWidth: 1, borderColor: "#E53E3E" }]}
            onPress={() => setShowHallOfFame((v) => !v)}
          >
            <Ionicons name="trophy-outline" size={18} color={showHallOfFame ? "#E53E3E" : C.accent} />
          </TouchableOpacity>
          <TouchableOpacity style={[s.newPostBtn, { backgroundColor: C.backgroundSecondary }]} onPress={handleShare}>
            <Ionicons name="share-outline" size={20} color={C.accent} />
          </TouchableOpacity>
          {!showHallOfFame && (
            <TouchableOpacity style={s.newPostBtn} onPress={() => setShowNewPost(true)}>
              <Ionicons name="add" size={20} color="#0A0A0F" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showHallOfFame ? (
        <HallOfFame />
      ) : (
        <>
          <View style={{ flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: C.cardBorder }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, maxHeight: 44 }} contentContainerStyle={{ paddingHorizontal: 12, gap: 6, alignItems: "center" }}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() => setActiveCategory(cat.value)}
                  style={[s.catChip, activeCategory === cat.value && s.catChipActive]}
                >
                  {cat.value !== "all" && subscribedCategories.includes(cat.value) && (
                    <Ionicons name="notifications" size={10} color={activeCategory === cat.value ? "#0A0A0F" : C.accent} />
                  )}
                  <Text style={[s.catChipText, activeCategory === cat.value && s.catChipTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {activeCategory !== "all" && (
              <TouchableOpacity
                style={s.subBell}
                onPress={() => toggleSubscription(activeCategory)}
              >
                <Ionicons
                  name={subscribedCategories.includes(activeCategory) ? "notifications" : "notifications-outline"}
                  size={18}
                  color={subscribedCategories.includes(activeCategory) ? C.accent : C.textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          {loading ? (
            <View style={s.center}>
              <ActivityIndicator size="large" color={C.accent} />
            </View>
          ) : posts.length === 0 ? (
            <View style={s.center}>
              <Ionicons name="chatbubbles-outline" size={40} color={C.textSecondary + "44"} />
              <Text style={s.emptyText}>No posts yet</Text>
            </View>
          ) : (
            <ScrollView
              style={s.flex1}
              contentContainerStyle={{ padding: 12, paddingBottom: 100 }}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => { setRefreshing(true); fetchPosts(); }}
                  tintColor={C.accent}
                />
              }
            >
              {posts.map((post) => (
                <TouchableOpacity key={post.id} style={s.card} activeOpacity={0.7} onPress={() => openThread(post.id)}>
                  <View style={s.cardTop}>
                    <View style={s.catBadge}>
                      <Text style={s.catBadgeText}>{CATEGORIES.find((c) => c.value === post.category)?.label || post.category}</Text>
                    </View>
                    <Text style={s.timeText}>{timeAgo(post.createdAt)}</Text>
                  </View>
                  <Text style={s.postTitle}>{post.title}</Text>
                  <AuthorRow name={post.authorName} isFounder={post.authorIsFounder} founderNumber={post.authorFounderNumber} role={post.authorRole} />
                  <Text style={s.postPreview} numberOfLines={2}>{post.body}</Text>
                  <View style={s.postActions}>
                    <TouchableOpacity style={s.actionBtn} onPress={() => toggleLike(post.id)}>
                      <Ionicons name={post.liked ? "heart" : "heart-outline"} size={16} color={post.liked ? "#f87171" : C.textSecondary} />
                      <Text style={[s.actionText, post.liked && { color: "#f87171" }]}>{post.likeCount}</Text>
                    </TouchableOpacity>
                    <View style={s.actionBtn}>
                      <Ionicons name="chatbubble-outline" size={14} color={C.textSecondary} />
                      <Text style={s.actionText}>{post.replyCount}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </>
      )}

      <Modal visible={showNewPost} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowNewPost(false)}>
        <KeyboardAvoidingView style={[s.modal, { paddingTop: insets.top }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setShowNewPost(false)}>
              <Text style={s.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>New Post</Text>
            <TouchableOpacity
              onPress={handleCreatePost}
              disabled={!newTitle.trim() || !newBody.trim() || submitting}
              style={[s.postSubmitBtn, (!newTitle.trim() || !newBody.trim() || submitting) && { opacity: 0.4 }]}
            >
              {submitting ? <ActivityIndicator size="small" color="#0A0A0F" /> : <Text style={s.postSubmitText}>Post</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={s.flex1} contentContainerStyle={{ padding: 16 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} contentContainerStyle={{ gap: 6 }}>
              {CATEGORIES.filter((c) => c.value !== "all").map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  onPress={() => setNewCategory(cat.value)}
                  style={[s.catChip, newCategory === cat.value && s.catChipActive]}
                >
                  <Text style={[s.catChipText, newCategory === cat.value && s.catChipTextActive]}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TextInput
              style={s.titleInput}
              value={newTitle}
              onChangeText={setNewTitle}
              placeholder="Post title..."
              placeholderTextColor={C.textSecondary}
              maxLength={200}
            />
            <TextInput
              style={s.bodyInput}
              value={newBody}
              onChangeText={setNewBody}
              placeholder="Share your thoughts..."
              placeholderTextColor={C.textSecondary}
              multiline
              maxLength={5000}
              textAlignVertical="top"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.background },
  flex1: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: C.text, marginLeft: 8 },
  pageTitle: { fontSize: 22, fontWeight: "800", color: C.text },
  backBtn: { padding: 4 },
  newPostBtn: { backgroundColor: C.accent, width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  catBar: { maxHeight: 44, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  subBell: { paddingHorizontal: 12, paddingVertical: 10, borderLeftWidth: 1, borderLeftColor: C.cardBorder },
  catChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: C.backgroundSecondary },
  catChipActive: { backgroundColor: C.accent },
  catChipText: { fontSize: 12, fontWeight: "600", color: C.textSecondary },
  catChipTextActive: { color: "#0A0A0F" },
  card: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 12, padding: 14, marginBottom: 8 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  catBadge: { backgroundColor: C.accent + "15", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  catBadgeText: { fontSize: 10, fontWeight: "700", color: C.accent, textTransform: "uppercase" },
  postTitle: { fontSize: 15, fontWeight: "700", color: C.text, marginBottom: 4 },
  postBody: { fontSize: 14, color: C.text + "cc", lineHeight: 20, marginTop: 8 },
  postPreview: { fontSize: 12, color: C.textSecondary, marginTop: 4 },
  postActions: { flexDirection: "row", gap: 16, marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.cardBorder },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionText: { fontSize: 12, color: C.textSecondary },
  authorRow: { flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  authorName: { fontSize: 13, fontWeight: "700", color: C.text },
  founderBadge: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: "#f59e0b15", borderWidth: 1, borderColor: "#f59e0b44", borderRadius: 10, paddingHorizontal: 5, paddingVertical: 1 },
  founderText: { fontSize: 9, fontWeight: "800", color: "#f59e0b" },
  adminBadge: { backgroundColor: C.accent + "15", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
  adminText: { fontSize: 9, fontWeight: "800", color: C.accent },
  timeText: { fontSize: 11, color: C.textSecondary },
  repliesHeader: { fontSize: 14, fontWeight: "700", color: C.text, marginTop: 16, marginBottom: 8 },
  replyCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 10, padding: 12, marginBottom: 6 },
  replyBody: { fontSize: 13, color: C.text + "cc", marginTop: 6, lineHeight: 18 },
  replyBar: { flexDirection: "row", alignItems: "flex-end", gap: 8, paddingHorizontal: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: C.cardBorder, backgroundColor: C.backgroundSecondary },
  replyInput: { flex: 1, backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, color: C.text, maxHeight: 80 },
  sendBtn: { backgroundColor: C.accent, width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  emptyText: { fontSize: 13, color: C.textSecondary, textAlign: "center" },
  modal: { flex: 1, backgroundColor: C.background },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.cardBorder },
  modalTitle: { fontSize: 16, fontWeight: "700", color: C.text },
  cancelText: { fontSize: 15, color: C.textSecondary },
  postSubmitBtn: { backgroundColor: C.accent, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  postSubmitText: { fontSize: 14, fontWeight: "700", color: "#0A0A0F" },
  titleInput: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: "600", color: C.text, marginBottom: 10 },
  bodyInput: { backgroundColor: C.card, borderWidth: 1, borderColor: C.cardBorder, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: C.text, minHeight: 120 },
});

const hofS = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_700Bold", color: C.text, textAlign: "center" },
  emptyText: { fontSize: 13, color: C.textSecondary, textAlign: "center", lineHeight: 20 },
  heroBanner: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#E53E3E18", borderRadius: 14, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: "#E53E3E44" },
  heroTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: C.text },
  heroSub: { fontSize: 12, color: C.textSecondary, marginTop: 2 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_700Bold", color: C.accent, letterSpacing: 1.2, flex: 1 },
  sectionSub: { fontSize: 11, color: C.textSecondary },
  card: { backgroundColor: C.backgroundSecondary, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.cardBorder, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  rankBadge: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  rankText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  avatarCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: C.accent + "20", alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 13, fontFamily: "Inter_700Bold", color: C.accent },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  entryName: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: C.text },
  entrySub: { fontSize: 11, color: C.textSecondary, marginTop: 1 },
  statBox: { alignItems: "flex-end" },
  statValue: { fontSize: 22, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 10, color: C.textSecondary, marginTop: 1 },
});
