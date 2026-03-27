import { useState, useEffect, useRef } from "react";

export function useScrollDirection() {
  const [scrollDir, setScrollDir] = useState<"up" | "down" | null>(null);
  const lastY = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onScroll() {
      const y = window.scrollY;
      const dir = y < lastY.current ? "up" : "down";
      lastY.current = y;
      setScrollDir(dir);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setScrollDir(null), 1500);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return scrollDir;
}
