import { useState, useEffect, useRef, useCallback } from 'react';

const IDLE_TIMEOUT = 30_000; // 30 seconds

type UseIdleTimerOptions = {
  /** Element to watch for activity. If null, idle detection is disabled. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** When true, pause the idle timer (e.g. during output reveal). */
  paused?: boolean;
};

const useIdleTimer = ({ containerRef, paused = false }: UseIdleTimerOptions): boolean => {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    setIsIdle(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setIsIdle(true), IDLE_TIMEOUT);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || paused) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const events = ['keydown', 'click', 'touchstart', 'mousemove'] as const;
    events.forEach(evt => el.addEventListener(evt, resetTimer));

    // Start initial timer
    resetTimer();

    return () => {
      events.forEach(evt => el.removeEventListener(evt, resetTimer));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [containerRef, paused, resetTimer]);

  return isIdle;
};

export default useIdleTimer;
