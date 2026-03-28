import { useEffect, useRef, useCallback } from "react";

const IDLE_TIMEOUT_MS = 60 * 1000;

export function useIdleTimer(onIdle: () => void, onActive: () => void) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isIdleRef = useRef(false);

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isIdleRef.current) {
      isIdleRef.current = false;
      onActive();
    }
    timerRef.current = setTimeout(() => {
      isIdleRef.current = true;
      onIdle();
    }, IDLE_TIMEOUT_MS);
  }, [onIdle, onActive]);

  useEffect(() => {
    reset();
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [reset]);

  return { resetTimer: reset };
}
