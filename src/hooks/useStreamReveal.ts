import { useState, useEffect, useRef } from 'react';

type UseStreamRevealOptions = {
  /** Milliseconds between each line appearing */
  staggerMs?: number;
  /** Whether to animate (false = show all instantly) */
  animate?: boolean;
  /** Callback when reveal completes */
  onComplete?: () => void;
};

const useStreamReveal = <T,>(
  items: T[],
  { staggerMs = 40, animate = true, onComplete }: UseStreamRevealOptions = {},
) => {
  const [visibleCount, setVisibleCount] = useState(animate ? 0 : items.length);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const isRevealing = animate && visibleCount < items.length;

  useEffect(() => {
    if (!animate || items.length <= 1) {
      setVisibleCount(items.length);
      onCompleteRef.current?.();
      return;
    }

    setVisibleCount(0);
    lastTimeRef.current = 0;

    const step = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= staggerMs) {
        lastTimeRef.current = timestamp;
        setVisibleCount(prev => {
          const next = prev + 1;
          if (next >= items.length) {
            onCompleteRef.current?.();
          }
          return Math.min(next, items.length);
        });
      }

      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafRef.current);
  }, [items, staggerMs, animate]);

  return { visibleCount, isRevealing };
};

export default useStreamReveal;
