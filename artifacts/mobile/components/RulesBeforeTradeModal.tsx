import React, { useState, useEffect, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { apiGet, apiPatch } from "@/lib/api";

const C = Colors.dark;

const DEFAULT_RULES = [
  "I only trade during kill zones",
  "I have identified my bias on HTF",
  "Liquidity has been swept",
  "No revenge trading",
  "Stop loss is set before entry",
  "I am not in a emotional state",
  "No red news events active",
  "My risk per trade is within limits",
];

interface RulesBeforeTradeModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  initialEditMode?: boolean;
  requireConfirmToClose?: boolean;
}

export default function RulesBeforeTradeModal({
  visible,
  onClose,
  onConfirm,
  initialEditMode = false,
  requireConfirmToClose = false,
}: RulesBeforeTradeModalProps) {
  const [rules, setRules] = useState<string[]>([]);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [editMode, setEditMode] = useState(initialEditMode);
  const [newRuleText, setNewRuleText] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiGet<{ tradingRules: string[] | null }>("user/settings");
      const loaded = data.tradingRules && data.tradingRules.length > 0
        ? data.tradingRules
        : DEFAULT_RULES;
      setRules(loaded);
    } catch {
      setRules(DEFAULT_RULES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setChecked({});
      setEditMode(initialEditMode);
      setNewRuleText("");
      loadRules();
    }
  }, [visible, loadRules, initialEditMode]);

  async function saveRules(updatedRules: string[]) {
    setSaving(true);
    try {
      await apiPatch("user/settings", { section: "tradingRules", data: { rules: updatedRules } });
      setRules(updatedRules);
    } catch {
      Alert.alert("Error", "Failed to save rules. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function toggleCheck(index: number) {
    setChecked((prev) => ({ ...prev, [index]: !prev[index] }));
  }

  function addRule() {
    const trimmed = newRuleText.trim();
    if (!trimmed) return;
    const updated = [...rules, trimmed];
    setNewRuleText("");
    saveRules(updated);
  }

  function removeRule(index: number) {
    if (rules.length <= 1) {
      Alert.alert("Cannot Remove", "You must have at least one rule in your list.");
      return;
    }
    const updated = rules.filter((_, i) => i !== index);
    saveRules(updated);
    setChecked((prev) => {
      const next: Record<number, boolean> = {};
      Object.entries(prev).forEach(([k, v]) => {
        const ki = parseInt(k);
        if (ki < index) next[ki] = v;
        else if (ki > index) next[ki - 1] = v;
      });
      return next;
    });
  }

  function moveRuleUp(index: number) {
    if (index === 0) return;
    const updated = [...rules];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    saveRules(updated);
    setChecked((prev) => {
      const next = { ...prev };
      const tmp = next[index - 1];
      next[index - 1] = next[index];
      next[index] = tmp;
      return next;
    });
  }

  function moveRuleDown(index: number) {
    if (index === rules.length - 1) return;
    const updated = [...rules];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    saveRules(updated);
    setChecked((prev) => {
      const next = { ...prev };
      const tmp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = tmp;
      return next;
    });
  }

  const allChecked = rules.length > 0 && rules.every((_, i) => checked[i]);

  const canClose = !requireConfirmToClose;

  function handleRequestClose() {
    if (canClose) onClose();
  }

  function handleConfirm() {
    if (!allChecked) return;
    onConfirm();
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleRequestClose}
    >
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.handle} />

          <View style={s.header}>
            <Ionicons name="shield-checkmark-outline" size={18} color={C.accent} />
            <Text style={s.title}>Rules Before I Trade</Text>
            <TouchableOpacity
              onPress={handleRequestClose}
              disabled={!canClose}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name="close"
                size={22}
                color={canClose ? C.textTertiary : C.cardBorder}
              />
            </TouchableOpacity>
          </View>

          <Text style={s.subtitle}>
            {requireConfirmToClose
              ? "Check off every rule to unlock trading — this cannot be skipped."
              : "Check off each rule to confirm your discipline before entering the market."}
          </Text>

          <View style={s.editRow}>
            <TouchableOpacity
              style={s.editToggleBtn}
              onPress={() => setEditMode((v) => !v)}
            >
              <Ionicons
                name={editMode ? "checkmark-done-outline" : "create-outline"}
                size={14}
                color={C.accent}
              />
              <Text style={s.editToggleText}>{editMode ? "Done Editing" : "Edit Rules"}</Text>
            </TouchableOpacity>
            {saving && <ActivityIndicator size="small" color={C.accent} />}
          </View>

          {loading ? (
            <View style={s.loadingBox}>
              <ActivityIndicator color={C.accent} size="large" />
              <Text style={s.loadingText}>Loading rules...</Text>
            </View>
          ) : (
            <ScrollView
              style={s.rulesList}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            >
              {rules.map((rule, index) => {
                const done = !!checked[index];
                return (
                  <View key={index} style={[s.ruleRow, done && !editMode && s.ruleRowDone]}>
                    {!editMode && (
                      <TouchableOpacity
                        style={s.checkBtn}
                        onPress={() => toggleCheck(index)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      >
                        <Ionicons
                          name={done ? "checkmark-circle" : "ellipse-outline"}
                          size={24}
                          color={done ? "#00C896" : C.textTertiary}
                        />
                      </TouchableOpacity>
                    )}
                    {editMode && (
                      <View style={s.reorderBtns}>
                        <TouchableOpacity
                          onPress={() => moveRuleUp(index)}
                          disabled={index === 0}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        >
                          <Ionicons
                            name="chevron-up"
                            size={16}
                            color={index === 0 ? C.cardBorder : C.textSecondary}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => moveRuleDown(index)}
                          disabled={index === rules.length - 1}
                          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                        >
                          <Ionicons
                            name="chevron-down"
                            size={16}
                            color={index === rules.length - 1 ? C.cardBorder : C.textSecondary}
                          />
                        </TouchableOpacity>
                      </View>
                    )}
                    <Text
                      style={[
                        s.ruleText,
                        done && !editMode && s.ruleTextDone,
                        editMode && { flex: 1 },
                      ]}
                    >
                      {rule}
                    </Text>
                    {editMode && (
                      <TouchableOpacity
                        onPress={() => removeRule(index)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        style={s.removeBtn}
                        disabled={rules.length <= 1}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={18}
                          color={rules.length <= 1 ? C.cardBorder : "#EF4444"}
                        />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}

              {editMode && (
                <View style={s.addRuleRow}>
                  <TextInput
                    style={s.addRuleInput}
                    placeholder="Add a new rule..."
                    placeholderTextColor={C.textTertiary}
                    value={newRuleText}
                    onChangeText={setNewRuleText}
                    onSubmitEditing={addRule}
                    returnKeyType="done"
                    maxLength={200}
                  />
                  <TouchableOpacity
                    style={[s.addRuleBtn, !newRuleText.trim() && s.addRuleBtnDisabled]}
                    onPress={addRule}
                    disabled={!newRuleText.trim()}
                  >
                    <Ionicons name="add" size={20} color={newRuleText.trim() ? "#0A0A0F" : C.textTertiary} />
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          )}

          {!editMode && allChecked && (
            <View style={s.allDoneRow}>
              <Ionicons name="shield-checkmark" size={18} color="#00C896" />
              <Text style={s.allDoneText}>All rules acknowledged — you're ready!</Text>
            </View>
          )}

          {!editMode && (
            <TouchableOpacity
              style={[s.confirmBtn, !allChecked && s.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={!allChecked}
              activeOpacity={allChecked ? 0.85 : 1}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={allChecked ? "#0A0A0F" : C.textTertiary}
              />
              <Text style={[s.confirmBtnText, !allChecked && s.confirmBtnTextDisabled]}>
                {allChecked
                  ? "I'm Ready to Trade"
                  : `Check all ${rules.length} rules to continue`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: C.backgroundSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: C.cardBorder,
    maxHeight: "88%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.cardBorder,
    alignSelf: "center",
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: C.text,
  },
  subtitle: {
    fontSize: 12,
    color: C.textTertiary,
    fontFamily: "Inter_400Regular",
    marginBottom: 12,
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  editToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.accent + "50",
    backgroundColor: C.accent + "12",
  },
  editToggleText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: C.accent,
  },
  loadingBox: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: C.textSecondary,
    fontFamily: "Inter_400Regular",
  },
  rulesList: {
    maxHeight: 360,
    marginBottom: 8,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: C.cardBorder,
  },
  ruleRowDone: {
    opacity: 0.7,
  },
  checkBtn: {
    padding: 2,
  },
  reorderBtns: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    marginRight: 2,
  },
  ruleText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: C.text,
    lineHeight: 20,
  },
  ruleTextDone: {
    textDecorationLine: "line-through",
    color: C.textSecondary,
  },
  removeBtn: {
    padding: 4,
  },
  addRuleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  addRuleInput: {
    flex: 1,
    backgroundColor: C.backgroundTertiary,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
    fontFamily: "Inter_400Regular",
  },
  addRuleBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  addRuleBtnDisabled: {
    backgroundColor: C.backgroundTertiary,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  allDoneRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    marginBottom: 4,
  },
  allDoneText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: "#00C896",
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 8,
  },
  confirmBtnDisabled: {
    backgroundColor: C.backgroundTertiary,
    borderWidth: 1,
    borderColor: C.cardBorder,
  },
  confirmBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: "#0A0A0F",
  },
  confirmBtnTextDisabled: {
    color: C.textTertiary,
  },
});
