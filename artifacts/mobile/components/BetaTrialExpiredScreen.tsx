import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { apiDelete } from "@/lib/api";
import Colors from "@/constants/colors";

const C = Colors.dark;

interface Props {
  onLogout: () => Promise<void>;
  onChoosePlan: () => void;
  discountPct?: number;
}

export function BetaTrialExpiredScreen({ onLogout, onChoosePlan, discountPct = 30 }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await apiDelete("auth/account");
      await onLogout();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to delete account";
      Alert.alert("Error", msg);
      setDeleting(false);
    }
  }

  return (
    <Modal visible animationType="fade" statusBarTranslucent>
      <SafeAreaView style={s.safe} edges={["top", "bottom"]}>
        <View style={s.container}>
          <View style={s.iconWrap}>
            <Ionicons name="flask-outline" size={40} color={C.accent} />
          </View>

          <View style={s.badge}>
            <Ionicons name="warning-outline" size={12} color="#F59E0B" />
            <Text style={s.badgeText}>BETA TRIAL ENDED</Text>
          </View>

          <Text style={s.title}>Your beta trial has ended</Text>
          <Text style={s.body}>
            Thank you for being a beta tester. Your 30-day free trial has expired.
            To continue using the app, please choose a plan — or delete your account if you
            no longer want access.
          </Text>

          <View style={s.discountBadge}>
            <Ionicons name="gift-outline" size={16} color={C.accent} />
            <View style={s.discountTextWrap}>
              <Text style={s.discountTitle}>Beta Thank-You Offer</Text>
              <Text style={s.discountBody}>{discountPct}% off forever — auto-applied when you subscribe</Text>
            </View>
          </View>

          <View style={s.actions}>
            <TouchableOpacity style={s.primaryBtn} onPress={onChoosePlan}>
              <Ionicons name="card-outline" size={18} color="#0A0A0F" />
              <Text style={s.primaryBtnText}>Choose a Plan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={s.deleteBtn}
              onPress={() => setShowDeleteConfirm(true)}
            >
              <Ionicons name="trash-outline" size={16} color="#EF4444" />
              <Text style={s.deleteBtnText}>Delete My Account</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Modal
          visible={showDeleteConfirm}
          transparent
          animationType="fade"
          statusBarTranslucent
        >
          <View style={s.overlay}>
            <View style={s.confirmCard}>
              <View style={s.confirmIcon}>
                <Ionicons name="warning-outline" size={32} color="#EF4444" />
              </View>
              <Text style={s.confirmTitle}>Delete Account?</Text>
              <Text style={s.confirmBody}>
                This will permanently delete your account and all your data — trades, journal
                entries, and progress. This action cannot be undone.
              </Text>
              <View style={s.confirmBtns}>
                <TouchableOpacity
                  style={s.cancelBtn}
                  onPress={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.confirmDeleteBtn, deleting && s.btnDisabled]}
                  onPress={handleDeleteAccount}
                  disabled={deleting}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={s.confirmDeleteBtnText}>Yes, Delete</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#0A0A0F",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: C.backgroundSecondary,
    borderWidth: 1,
    borderColor: C.cardBorder,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245,158,11,0.1)",
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.3)",
    borderRadius: 100,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginBottom: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#F59E0B",
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 40,
  },
  discountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(0,212,170,0.1)",
    borderWidth: 1,
    borderColor: "rgba(0,212,170,0.3)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 24,
    width: "100%",
  },
  discountTextWrap: {
    flex: 1,
  },
  discountTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: C.accent,
    marginBottom: 2,
  },
  discountBody: {
    fontSize: 12,
    color: C.textSecondary,
    lineHeight: 18,
  },
  actions: {
    width: "100%",
    gap: 12,
  },
  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0A0A0F",
  },
  deleteBtn: {
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.4)",
  },
  deleteBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  confirmCard: {
    backgroundColor: C.backgroundSecondary,
    borderRadius: 20,
    padding: 28,
    width: "100%",
    maxWidth: 380,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
  },
  confirmIcon: {
    alignItems: "center",
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: C.text,
    textAlign: "center",
    marginBottom: 10,
  },
  confirmBody: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmBtns: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.cardBorder,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: C.textSecondary,
  },
  confirmDeleteBtn: {
    flex: 1,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  btnDisabled: {
    opacity: 0.6,
  },
  confirmDeleteBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
});
