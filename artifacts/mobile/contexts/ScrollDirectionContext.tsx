import React, { createContext, useContext, useRef } from "react";
import { NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { useChromeCollapse } from "./ChromeCollapseContext";

const SCROLL_DOWN_THRESHOLD = 10;
const SCROLL_UP_THRESHOLD = 20;

interface ScrollCollapseControls {
  collapse: () => void;
  restore: () => void;
  isCollapsedRef: React.MutableRefObject<boolean>;
}

const ScrollDirectionContext = createContext<ScrollCollapseControls | null>(null);

export function ScrollDirectionProvider({ children }: { children: React.ReactNode }) {
  const { collapse, restore, isCollapsed } = useChromeCollapse();
  const isCollapsedRef = useRef(isCollapsed);
  isCollapsedRef.current = isCollapsed;

  return (
    <ScrollDirectionContext.Provider value={{ collapse, restore, isCollapsedRef }}>
      {children}
    </ScrollDirectionContext.Provider>
  );
}

export function useScrollCollapseProps() {
  const ctx = useContext(ScrollDirectionContext);
  if (!ctx) throw new Error("useScrollCollapseProps must be used within ScrollDirectionProvider");

  const { collapse, restore, isCollapsedRef } = ctx;
  const lastOffsetY = useRef<number | null>(null);
  const isDragging = useRef(false);

  function onScrollBeginDrag(e: NativeSyntheticEvent<NativeScrollEvent>) {
    isDragging.current = true;
    lastOffsetY.current = e.nativeEvent.contentOffset.y;
  }

  function onScrollEndDrag() {
    isDragging.current = false;
  }

  function onMomentumScrollEnd() {
    isDragging.current = false;
    lastOffsetY.current = null;
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!isDragging.current) return;
    const currentY = e.nativeEvent.contentOffset.y;
    if (lastOffsetY.current === null) {
      lastOffsetY.current = currentY;
      return;
    }
    const delta = currentY - lastOffsetY.current;
    lastOffsetY.current = currentY;

    if (delta > SCROLL_DOWN_THRESHOLD && !isCollapsedRef.current) {
      collapse();
    } else if (delta < -SCROLL_UP_THRESHOLD && isCollapsedRef.current) {
      restore();
    }
  }

  return {
    onScroll,
    onScrollBeginDrag,
    onScrollEndDrag,
    onMomentumScrollEnd,
    scrollEventThrottle: 16,
  };
}
