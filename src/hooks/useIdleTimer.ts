import { useState, useEffect, useRef, useCallback } from 'react';

const IDLE_TIMEOUT = 30_000; // 30 seconds
const MOUSEMOVE_THROTTLE = 200; // ms

type UseIdleTimerOptions = {
  /** Element to watch for activity. If null, idle detection is disabled. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** When true, pause the idle timer (e.g. during output reveal). */
  paused?: boolean;
};

const useIdleTimer = ({ containerRef, paused = false }: UseIdleTimerOptions): boolean => {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMoveRef = useRef(0);

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

    const handleActivity = (e: Event) => {
      if (e.type === 'mousemove') {
        const now = Date.now();
        if (now - lastMoveRef.current < MOUSEMOVE_THROTTLE) return;
        lastMoveRef.current = now;
      }
      resetTimer();
    };

    const events = ['keydown', 'click', 'touchstart', 'mousemove'] as const;
    events.forEach(evt => el.addEventListener(evt, handleActivity, { passive: true }));

    resetTimer();

    return () => {
      events.forEach(evt => el.removeEventListener(evt, handleActivity));
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [containerRef, paused, resetTimer]);

  return isIdle;
};

export default useIdleTimer;
