import React, { useState, useRef } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useChromeCollapse } from "@/contexts/ChromeCollapseContext";
import PnLCalendarBottomSheet from "@/components/PnLCalendarBottomSheet";
import Colors from "@/constants/colors";

const C = Colors.dark;

export default function FloatingToolkit() {
  const [open, setOpen] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const router = useRouter();
  const { footerAnim } = useChromeCollapse();

  const fanAnim = useRef(new Animated.Value(0)).current;

  const footerTranslateY = footerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 160],
  });

  function toggleOpen() {
    if (open) {
      animateClose(() => setOpen(false));
    } else {
      setOpen(true);
      Animated.spring(fanAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }).start();
    }
  }

  function animateClose(cb?: () => void) {
    Animated.timing(fanAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      if (cb) cb();
    });
  }

  function close() {
    animateClose(() => setOpen(false));
  }

  function handleCalendarPress() {
    animateClose(() => {
      setOpen(false);
      setShowCalendar(true);
    });
  }

  function handleLogTradePress() {
    animateClose(() => {
      setOpen(false);
      router.navigate({ pathname: "/(tabs)/journal", params: { new: "1" } } as never);
    });
  }

  const childOpacity = fanAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1],
  });

  const hubRotate = fanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  const pnlTranslateY = fanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -70],
  });
  const pnlTranslateX = fanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -8],
  });

  const logTradeTranslateY = fanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -130],
  });
  const logTradeTranslateX = fanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -28],
  });

  return (
    <>
      <PnLCalendarBottomSheet
        visible={showCalendar}
        onClose={() => setShowCalendar(false)}
      />

      <Modal
        visible={open}
        transparent
        animationType="none"
        onRequestClose={close}
      >
        <TouchableOpacity
          style={s.backdrop}
          activeOpacity={1}
          onPress={close}
        />

        <Animated.View
          style={[
            s.fanContainer,
            { transform: [{ translateY: footerTranslateY }] },
          ]}
          pointerEvents="box-none"
        >
          <Animated.View
            style={[
              s.childFabWrapper,
              {
                opacity: childOpacity,
                transform: [
                  { translateY: logTradeTranslateY },
                  { translateX: logTradeTranslateX },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={s.childFab}
              onPress={handleLogTradePress}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={16} color="#0A0A0F" />
            </TouchableOpacity>
            <Text style={s.childLabel}>Log Trade</Text>
          </Animated.View>

          <Animated.View
            style={[
              s.childFabWrapper,
              {
                opacity: childOpacity,
                transform: [
                  { translateY: pnlTranslateY },
                  { translateX: pnlTranslateX },
                ],
              },
            ]}
          >
            <TouchableOpacity
              style={s.childFab}
              onPress={handleCalendarPress}
              activeOpacity={0.85}
            >
              <Ionicons name="calendar-outline" size={16} color="#0A0A0F" />
            </TouchableOpacity>
            <Text style={s.childLabel}>P&L Cal</Text>
          </Animated.View>

          <TouchableOpacity
            style={[s.hubFab, s.hubFabOpen]}
            onPress={toggleOpen}
            activeOpacity={0.85}
            accessibilityLabel="Close toolkit"
            accessibilityRole="button"
          >
            <Animated.View style={{ transform: [{ rotate: hubRotate }] }}>
              <Ionicons name="add" size={22} color="#0A0A0F" />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </Modal>

      <Animated.View style={[s.floatingWrapper, { transform: [{ translateY: footerTranslateY }] }]}>
        <TouchableOpacity
          style={[s.hubFab, open && s.hubFabOpen]}
          onPress={toggleOpen}
          activeOpacity={0.85}
          accessibilityLabel="Open toolkit"
          accessibilityRole="button"
        >
          <Animated.View style={{ transform: [{ rotate: hubRotate }] }}>
            <Ionicons name="add" size={22} color="#0A0A0F" />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </>
  );
}

const s = StyleSheet.create({
  floatingWrapper: {
    position: "absolute",
    bottom: 84,
    right: 56,
    zIndex: 99,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  fanContainer: {
    position: "absolute",
    bottom: 84,
    right: 56,
    alignItems: "center",
  },
  childFabWrapper: {
    position: "absolute",
    alignItems: "center",
    bottom: 0,
  },
  childFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  childLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: C.textSecondary,
    marginTop: 3,
    textAlign: "center",
  },
  hubFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.accent,
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    opacity: 0.85,
  },
  hubFabOpen: {
    opacity: 1,
  },
});
