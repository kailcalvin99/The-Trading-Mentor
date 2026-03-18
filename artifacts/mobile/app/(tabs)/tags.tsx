import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";

const TAGS_KEY = "ict-trade-tags";

const PRESET_TAGS = [
  { label: "OTE", category: "Entry", color: "#00C896" },
  { label: "FVG", category: "Entry", color: "#00C896" },
  { label: "Breaker Block", category: "Entry", color: "#00C896" },
  { label: "Order Block", category: "Entry", color: "#00C896" },
  { label: "Liquidity Grab", category: "Entry", color: "#A78BFA" },
  { label: "BSL Raid", category: "Entry", color: "#A78BFA" },
  { label: "SSL Raid", category: "Entry", color: "#A78BFA" },
  { label: "Kill Zone", category: "Time", color: "#FFB340" },
  { label: "London Open", category: "Time", color: "#FFB340" },
  { label: "NY Open", category: "Time", color: "#FFB340" },
  { label: "Asian Range", category: "Time", color: "#FFB340" },
  { label: "HTF Bias", category: "Analysis", color: "#38BDF8" },
  { label: "Daily Bias", category: "Analysis", color: "#38BDF8" },
  { label: "Turtle Soup", category: "Pattern", color: "#FB7185" },
  { label: "Judas Swing", category: "Pattern", color: "#FB7185" },
  { label: "CISD", category: "Pattern", color: "#FB7185" },
  { label: "SMT Divergence", category: "Pattern", color: "#FB7185" },
  { label: "Winnable", category: "Outcome", color: "#00C896" },
  { label: "Rule Break", category: "Outcome", color: "#FF4444" },
  { label: "Revenge Trade", category: "Outcome", color: "#FF4444" },
  { label: "FOMO", category: "Outcome", color: "#FF4444" },
  { label: "Patient Entry", category: "Discipline", color: "#10B981" },
  { label: "Waited Confirmation", category: "Discipline", color: "#10B981" },
];

const CATEGORIES = ["All", "Entry", "Time", "Analysis", "Pattern", "Outcome", "Discipline", "Custom"];

interface TagEntry {
  id: string;
  label: string;
  category: string;
  color: string;
  count: number;
}

export default function TagsScreen() {
  const { colors: C, isDark } = useTheme();
  const [tags, setTags] = useState<TagEntry[]>([]);
  const [filterCat, setFilterCat] = useState("All");
  const [newTagText, setNewTagText] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    const raw = await AsyncStorage.getItem(TAGS_KEY);
    if (raw) {
      try {
        setTags(JSON.parse(raw));
      } catch {
        initDefaults();
      }
    } else {
      initDefaults();
    }
  }, []);

  useFocusEffect(load);

  function initDefaults() {
    const defaults: TagEntry[] = PRESET_TAGS.map((t) => ({
      id: t.label.toLowerCase().replace(/\s+/g, "-"),
      label: t.label,
      category: t.category,
      color: t.color,
      count: 0,
    }));
    setTags(defaults);
    AsyncStorage.setItem(TAGS_KEY, JSON.stringify(defaults));
  }

  async function incrementTag(id: string) {
    const next = tags.map((t) => t.id === id ? { ...t, count: t.count + 1 } : t);
    setTags(next);
    await AsyncStorage.setItem(TAGS_KEY, JSON.stringify(next));
  }

  async function resetCount(id: string) {
    Alert.alert("Reset Count", "Set this tag's count back to 0?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reset",
        style: "destructive",
        onPress: async () => {
          const next = tags.map((t) => t.id === id ? { ...t, count: 0 } : t);
          setTags(next);
          await AsyncStorage.setItem(TAGS_KEY, JSON.stringify(next));
        },
      },
    ]);
  }

  async function addCustomTag() {
    const label = newTagText.trim();
    if (!label) return;
    const id = `custom-${Date.now()}`;
    const newTag: TagEntry = { id, label, category: "Custom", color: "#8B8BA0", count: 0 };
    const next = [...tags, newTag];
    setTags(next);
    await AsyncStorage.setItem(TAGS_KEY, JSON.stringify(next));
    setNewTagText("");
    setAdding(false);
  }

  async function deleteTag(id: string) {
    Alert.alert("Delete Tag", "Remove this custom tag?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const next = tags.filter((t) => t.id !== id);
          setTags(next);
          await AsyncStorage.setItem(TAGS_KEY, JSON.stringify(next));
        },
      },
    ]);
  }

  const filtered = filterCat === "All" ? tags : tags.filter((t) => t.category === filterCat);
  const sortedFiltered = [...filtered].sort((a, b) => b.count - a.count);

  const totalTagged = tags.reduce((sum, t) => sum + t.count, 0);
  const topTag = tags.reduce((top, t) => (t.count > (top?.count ?? -1) ? t : top), tags[0]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: C.background }]} edges={["bottom"]}>
      <View style={[styles.statsRow, { borderBottomColor: C.cardBorder }]}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: C.accent }]}>{totalTagged}</Text>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>Total Tagged</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: C.cardBorder }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: C.text }]}>{topTag?.label ?? "—"}</Text>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>Top Tag</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: C.cardBorder }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: C.text }]}>{tags.length}</Text>
          <Text style={[styles.statLabel, { color: C.textSecondary }]}>Total Tags</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={[styles.catBar, { borderBottomColor: C.cardBorder }]}
        contentContainerStyle={styles.catBarContent}
      >
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat}
            onPress={() => setFilterCat(cat)}
            style={[
              styles.catChip,
              {
                backgroundColor: filterCat === cat ? C.accent : C.backgroundTertiary,
                borderColor: filterCat === cat ? C.accent : C.cardBorder,
              },
            ]}
          >
            <Text style={[styles.catChipLabel, { color: filterCat === cat ? "#000" : C.textSecondary }]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView contentContainerStyle={styles.list}>
        {sortedFiltered.map((tag) => (
          <View
            key={tag.id}
            style={[styles.tagRow, { backgroundColor: C.card, borderColor: C.cardBorder }]}
          >
            <View style={[styles.colorDot, { backgroundColor: tag.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.tagLabel, { color: C.text }]}>{tag.label}</Text>
              <Text style={[styles.tagCat, { color: C.textTertiary }]}>{tag.category}</Text>
            </View>
            <Text style={[styles.tagCount, { color: tag.count > 0 ? C.accent : C.textTertiary }]}>
              {tag.count}×
            </Text>
            <TouchableOpacity onPress={() => incrementTag(tag.id)} style={[styles.tagBtn, { backgroundColor: C.accent + "20" }]}>
              <Ionicons name="add" size={18} color={C.accent} />
            </TouchableOpacity>
            {tag.category === "Custom" ? (
              <TouchableOpacity onPress={() => deleteTag(tag.id)} style={[styles.tagBtn, { backgroundColor: "#FF444420" }]}>
                <Ionicons name="trash-outline" size={16} color="#FF4444" />
              </TouchableOpacity>
            ) : (
              tag.count > 0 && (
                <TouchableOpacity onPress={() => resetCount(tag.id)} style={[styles.tagBtn, { backgroundColor: C.backgroundTertiary }]}>
                  <Ionicons name="refresh-outline" size={16} color={C.textSecondary} />
                </TouchableOpacity>
              )
            )}
          </View>
        ))}

        {adding ? (
          <View style={[styles.addRow, { backgroundColor: C.card, borderColor: C.accent }]}>
            <TextInput
              autoFocus
              value={newTagText}
              onChangeText={setNewTagText}
              placeholder="Tag name..."
              placeholderTextColor={C.textTertiary}
              style={[styles.addInput, { color: C.text }]}
              onSubmitEditing={addCustomTag}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={addCustomTag} style={[styles.addConfirm, { backgroundColor: C.accent }]}>
              <Ionicons name="checkmark" size={18} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setAdding(false); setNewTagText(""); }}>
              <Ionicons name="close" size={18} color={C.textSecondary} />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setAdding(true)}
            style={[styles.addTagBtn, { borderColor: C.cardBorder }]}
          >
            <Ionicons name="add-circle-outline" size={18} color={C.textSecondary} />
            <Text style={[styles.addTagText, { color: C.textSecondary }]}>Add Custom Tag</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    paddingVertical: 14,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  statDivider: {
    width: 1,
    marginVertical: 6,
  },
  catBar: {
    borderBottomWidth: 1,
  },
  catBarContent: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 8,
    flexDirection: "row",
  },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  catChipLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  list: {
    padding: 14,
    gap: 8,
    paddingBottom: 40,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  tagLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  tagCat: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  tagCount: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    minWidth: 30,
    textAlign: "right",
  },
  tagBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  addInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  addConfirm: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  addTagBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
    justifyContent: "center",
  },
  addTagText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
