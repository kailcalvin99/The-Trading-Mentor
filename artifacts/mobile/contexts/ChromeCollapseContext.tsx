import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { Animated } from "react-native";
import { useIdleTimer } from "@/hooks/useIdleTimer";

interface ChromeCollapseContextValue {
  isCollapsed: boolean;
  collapse: () => void;
  restore: () => void;
  resetIdleTimer: () => void;
  headerAnim: Animated.Value;
  headerLayoutAnim: Animated.Value;
  footerAnim: Animated.Value;
  mantraCardHeight: number;
  setMantraCardHeight: (h: number) => void;
}

const ChromeCollapseContext = createContext<ChromeCollapseContextValue | null>(null);

export function ChromeCollapseProvider({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mantraCardHeight, setMantraCardHeight] = useState(0);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const headerLayoutAnim = useRef(new Animated.Value(0)).current;
  const footerAnim = useRef(new Animated.Value(0)).current;

  const collapse = useCallback(() => {
    setIsCollapsed(true);
    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(headerLayoutAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: false,
      }),
      Animated.timing(footerAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerAnim, headerLayoutAnim, footerAnim]);

  const restore = useCallback(() => {
    setIsCollapsed(false);
    Animated.parallel([
      Animated.timing(headerAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(headerLayoutAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(footerAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  }, [headerAnim, headerLayoutAnim, footerAnim]);

  const { resetTimer } = useIdleTimer(collapse, () => {});

  const resetIdleTimer = useCallback(() => {
    if (isCollapsed) {
      restore();
    }
    resetTimer();
  }, [isCollapsed, restore, resetTimer]);

  return (
    <ChromeCollapseContext.Provider value={{ isCollapsed, collapse, restore, resetIdleTimer, headerAnim, headerLayoutAnim, footerAnim, mantraCardHeight, setMantraCardHeight }}>
      {children}
    </ChromeCollapseContext.Provider>
  );
}

export function useChromeCollapse() {
  const ctx = useContext(ChromeCollapseContext);
  if (!ctx) throw new Error("useChromeCollapse must be used within ChromeCollapseProvider");
  return ctx;
}
